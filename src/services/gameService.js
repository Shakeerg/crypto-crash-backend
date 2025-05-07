const GameRound = require('../models/gameRound');
const Player = require('../models/player');
const Transaction = require('../models/transaction');
const { generateCrashPoint } = require('../utils/provablyFair');
const { convertUsdToCrypto, convertCryptoToUsd } = require('./cryptoService');
const crypto = require('crypto');

const placeBet = async (playerId, usdAmount, currency, roundId) => {
  console.log(`placeBet called: playerId=${playerId}, usdAmount=${usdAmount}, currency=${currency}, roundId=${roundId}`);
  if (usdAmount <= 0) {
    console.error('Invalid bet amount:', usdAmount);
    throw new Error('Invalid bet amount');
  }

  const player = await Player.findOne({ playerId });
  if (!player) {
    console.error('Player not found:', playerId);
    throw new Error('Player not found');
  }
  console.log('Player found:', player);

  const round = await GameRound.findOne({ roundId });
  if (!round) {
    console.error('Round not found:', roundId);
    throw new Error('Round not found');
  }
  if (round.status !== 'pending') {
    console.error('Round not pending:', round.status);
    throw new Error('Invalid round');
  }
  console.log('Round found:', round);

  const { cryptoAmount, price } = await convertUsdToCrypto(usdAmount, currency);
  console.log('Crypto conversion:', { cryptoAmount, price });

  const balance = player.balances.find(b => b.currency === currency);
  if (!balance || balance.amount < cryptoAmount) {
    console.error('Insufficient balance:', { currency, balance: balance?.amount, required: cryptoAmount });
    throw new Error('Insufficient balance');
  }

  await Player.updateOne(
    { playerId, 'balances.currency': currency },
    { $inc: { 'balances.$.amount': -cryptoAmount } }
  );

  round.bets.push({
    playerId,
    usdAmount,
    cryptoAmount,
    currency
  });
  await round.save();

  const transaction = new Transaction({
    playerId,
    roundId,
    usdAmount,
    cryptoAmount,
    currency,
    transactionType: 'bet',
    transactionHash: crypto.randomBytes(32).toString('hex'),
    priceAtTime: price
  });
  await transaction.save();

  return { cryptoAmount, price };
};

const cashOut = async (playerId, roundId, multiplier) => {
  const round = await GameRound.findOne({ roundId });
  if (!round || round.status !== 'active') throw new Error('Round not active');
  const bet = round.bets.find(b => b.playerId === playerId && !b.cashoutMultiplier);
  if (!bet) throw new Error('No active bet');

  const payoutCrypto = bet.cryptoAmount * multiplier;
  const payoutUsd = await convertCryptoToUsd(payoutCrypto, bet.currency);
  const price = payoutUsd / payoutCrypto;

  bet.cashoutMultiplier = multiplier;
  bet.payoutCrypto = payoutCrypto;
  bet.payoutUsd = payoutUsd;
  await round.save();

  await Player.updateOne(
    { playerId, 'balances.currency': bet.currency },
    { $inc: { 'balances.$.amount': payoutCrypto } }
  );

  const transaction = new Transaction({
    playerId,
    roundId,
    usdAmount: payoutUsd,
    cryptoAmount: payoutCrypto,
    currency: bet.currency,
    transactionType: 'cashout',
    transactionHash: crypto.randomBytes(32).toString('hex'),
    priceAtTime: price
  });
  await transaction.save();

  return { payoutCrypto, payoutUsd };
};

const startGameRound = async (attempt = 1, maxAttempts = 5) => {
  if (attempt > maxAttempts) {
    throw new Error('Max retry attempts reached for starting game round');
  }

  try {
    console.log(`Attempt ${attempt}: Creating new game round...`);
    const latestRound = await GameRound.findOne({}, { roundId: 1 }).sort({ roundId: -1 }).lean();
    let roundId = latestRound ? latestRound.roundId + 1 : 1;

    const existingRound = await GameRound.findOne({ roundId });
    if (existingRound) {
      console.warn(`Round ${roundId} already exists, incrementing...`);
      roundId = existingRound.roundId + 1;
    }
    console.log(`Generated roundId: ${roundId}`);

    const { seed, hash, crashPoint } = generateCrashPoint(roundId);
    console.log(`Crash point: ${crashPoint}`);
    const round = new GameRound({
      roundId,
      seed,
      hash,
      crashPoint,
      status: 'pending'
    });
    await round.save();
    console.log(`Round ${roundId} saved to database`);
    return round;
  } catch (error) {
    if (error.code === 11000) {
      console.warn(`Duplicate roundId detected, retrying (attempt ${attempt})...`);
      return startGameRound(attempt + 1, maxAttempts);
    }
    console.error('Error starting game round:', error);
    throw error;
  }
};

module.exports = { placeBet, cashOut, startGameRound };