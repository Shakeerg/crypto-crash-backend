const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const NodeCache = require('node-cache');
const GameRound = require('./src/models/GameRound');
const Player = require('./src/models/Player');
const Transaction = require('./src/models/Transaction');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const cache = new NodeCache({ stdTTL: 600 });

app.use(cors({
  origin: 'http://localhost:8080',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

let currentRound = null;
let currentMultiplier = 1;
let roundInterval = null;

async function fetchCryptoPrice(currency) {
  const cacheKey = `${currency}_price`;
  const cachedPrice = cache.get(cacheKey);
  if (cachedPrice) return cachedPrice;

  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${currency === 'BTC' ? 'bitcoin' : 'ethereum'}&vs_currencies=usd`);
    const price = response.data[currency.toLowerCase() === 'btc' ? 'bitcoin' : 'ethereum'].usd;
    cache.set(cacheKey, price);
    return price;
  } catch (error) {
    console.error(`Error fetching ${currency} price:`, error.message);
    throw new Error('Unable to fetch crypto price');
  }
}

function generateCrashPoint() {
  const e = 2 ** 32;
  const h = parseInt(require('crypto').randomBytes(4).toString('hex'), 16);
  const crashPoint = (e - h) / (e - 1);
  return Math.max(1, crashPoint * 100);
}

async function startNewRound() {
  console.log('Starting new round...');
  let attempt = 1;
  const maxAttempts = 5;

  while (attempt <= maxAttempts) {
    try {
      console.log(`Attempt ${attempt}: Creating new game round...`);
      const latestRound = await GameRound.findOne().sort({ roundId: -1 });
      const roundId = latestRound ? latestRound.roundId + 1 : 1;
      console.log('Generated roundId:', roundId);

      const seed = require('crypto').randomBytes(32).toString('hex');
      const hash = require('crypto').randomBytes(32).toString('hex');
      const crashPoint = generateCrashPoint();
      console.log('Crash point:', crashPoint);

      const gameRound = new GameRound({ roundId, seed, hash, crashPoint, status: 'pending' });
      await gameRound.save();
      console.log(`Round ${roundId} saved to database`);

      currentRound = gameRound;
      currentMultiplier = 1;

      io.emit('roundStart', { roundId: currentRound.roundId, status: currentRound.status });
      console.log(`Round ${roundId} started with status: ${currentRound.status}`);

      setTimeout(() => {
        currentRound.status = 'active';
        currentRound.save();
        console.log(`Round ${roundId} status updated to active`);
        startMultiplier();
      }, 10000);

      break;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt === maxAttempts) {
        console.error('Max attempts reached. Could not start new round.');
        io.emit('error', { message: 'Failed to start new round after multiple attempts' });
      }
      attempt++;
    }
  }
}

function startMultiplier() {
  if (!currentRound || currentRound.status !== 'active') return;

  roundInterval = setInterval(async () => {
    currentMultiplier += 0.01;
    io.emit('multiplierUpdate', { multiplier: currentMultiplier });
    console.log(`Round ${currentRound.roundId} multiplier: ${currentMultiplier.toFixed(2)}`);

    if (currentMultiplier >= currentRound.crashPoint) {
      clearInterval(roundInterval);
      currentRound.status = 'crashed';
      await currentRound.save();
      console.log(`Round ${currentRound.roundId} crashed at ${currentRound.crashPoint}`);
      io.emit('roundCrash', { crashPoint: currentRound.crashPoint });

      setTimeout(startNewRound, 5000);
    }
  }, 100);
}

async function placeBet(playerId, usdAmount, currency, roundId) {
  console.log(`placeBet called: playerId=${playerId}, usdAmount=${usdAmount}, currency=${currency}, roundId=${roundId}`);

  const player = await Player.findOne({ playerId });
  if (!player) throw new Error('Player not found');
  console.log('Player found:', player);

  const round = await GameRound.findOne({ roundId });
  if (!round) throw new Error('Round not found');
  console.log('Round found:', round);

  if (round.status !== 'pending') {
    throw new Error('Can only place bet during pending phase');
  }

  const existingBet = round.bets.find(bet => bet.playerId === playerId);
  if (existingBet) {
    throw new Error('Player has already placed a bet in this round');
  }

  const price = await fetchCryptoPrice(currency);
  const cryptoAmount = usdAmount / price;
  console.log('Crypto conversion:', { cryptoAmount, price });

  const balance = player.balances.find(b => b.currency === currency);
  if (!balance || balance.amount < cryptoAmount) {
    throw new Error('Insufficient balance');
  }

  balance.amount -= cryptoAmount;
  await player.save();

  round.bets.push({ playerId, usdAmount, cryptoAmount, currency });
  await round.save();

  const transaction = new Transaction({
    playerId,
    type: 'bet',
    usdAmount,
    cryptoAmount,
    currency,
    roundId
  });
  await transaction.save();

  return { cryptoAmount, price };
}

async function cashout(playerId, roundId, multiplier) {
  const round = await GameRound.findOne({ roundId });
  if (!round) throw new Error('Round not found');
  console.log('Round lookup result:', round);

  if (round.status !== 'active') {
    throw new Error('Round not active');
  }

  const bet = round.bets.find(b => b.playerId === playerId);
  if (!bet) {
    throw new Error('No active bet');
  }

  if (bet.cashoutMultiplier) {
    throw new Error('Player has already cashed out');
  }

  if (multiplier > currentMultiplier) {
    throw new Error('Requested multiplier exceeds current multiplier');
  }

  bet.cashoutMultiplier = multiplier;
  const payoutUsd = bet.usdAmount * multiplier;
  const price = await fetchCryptoPrice(bet.currency);
  const payoutCrypto = payoutUsd / price;

  bet.payoutUsd = payoutUsd;
  bet.payoutCrypto = payoutCrypto;
  await round.save();

  const player = await Player.findOne({ playerId });
  const balance = player.balances.find(b => b.currency === bet.currency);
  balance.amount += payoutCrypto;
  await player.save();

  const transaction = new Transaction({
    playerId,
    type: 'cashout',
    usdAmount: payoutUsd,
    cryptoAmount: payoutCrypto,
    currency: bet.currency,
    roundId,
    multiplier
  });
  await transaction.save();

  io.emit('playerCashout', { playerId, multiplier, payoutUsd });
  return { payoutCrypto, payoutUsd };
}

app.post('/api/game/bet', async (req, res) => {
  const { playerId, usdAmount, currency, roundId } = req.body;
  console.log('Bet request received:', req.body);
  try {
    if (!playerId || !usdAmount || !currency || !roundId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await placeBet(playerId, usdAmount, currency, roundId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Bet error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/game/cashout', async (req, res) => {
  const { playerId, roundId, multiplier } = req.body;
  try {
    if (!playerId || !roundId || !multiplier) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await cashout(playerId, roundId, multiplier);
    res.status(200).json(result);
  } catch (error) {
    console.error('Cashout error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/game/balance/:playerId', async (req, res) => {
  const { playerId } = req.params;
  try {
    const player = await Player.findOne({ playerId });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const balances = await Promise.all(
      player.balances.map(async (balance) => {
        const price = await fetchCryptoPrice(balance.currency);
        return {
          currency: balance.currency,
          cryptoAmount: balance.amount,
          usdEquivalent: balance.amount * price
        };
      })
    );
    res.status(200).json({ playerId, balances });
  } catch (error) {
    console.error('Balance error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/game/currentRound', (req, res) => {
  if (!currentRound) {
    return res.status(404).json({ error: 'No active round' });
  }
  res.status(200).json({
    roundId: currentRound.roundId,
    status: currentRound.status,
    multiplier: currentMultiplier > 1 ? currentMultiplier : null
  });
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('cashout', async ({ playerId, roundId }) => {
    console.log(`Cashout request: playerId=${playerId}, roundId=${roundId}`);
    try {
      await cashout(playerId, roundId, currentMultiplier);
    } catch (error) {
      console.error('Cashout error:', error.message);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startNewRound();
});

process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  if (roundInterval) clearInterval(roundInterval);
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});