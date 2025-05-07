const GameRound = require('../models/gameRound');
const { cashOut, startGameRound } = require('./gameService');

const calculateMultiplier = (startedAt, growthFactor = 0.1) => {
  return 1 + ((Date.now() - startedAt) / 1000) * growthFactor;
};

const startGameLoop = (io) => {
  const startNewRound = async () => {
    try {
      console.log('Starting new round...');
      const round = await startGameRound();
      const roundId = round.roundId;
      console.log(`Round ${roundId} started with status: pending`);
      io.emit('roundStart', { roundId, status: 'pending' });

      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds for pending phase

      round.status = 'active';
      round.startedAt = new Date();
      await round.save();
      console.log(`Round ${roundId} status updated to active`);
      io.emit('roundStart', { roundId, status: 'active' });

      let multiplier = 1;
      const growthFactor = 0.1;
      const interval = setInterval(async () => {
        try {
          multiplier = calculateMultiplier(round.startedAt, growthFactor);
          console.log(`Round ${roundId} multiplier: ${multiplier.toFixed(2)}`);
          io.emit('multiplierUpdate', { roundId, multiplier });

          if (multiplier >= round.crashPoint) {
            clearInterval(interval);
            round.status = 'crashed';
            round.crashedAt = new Date();
            await round.save();
            console.log(`Round ${roundId} crashed at ${round.crashPoint}`);
            io.emit('roundCrash', { roundId, crashPoint: round.crashPoint });
            setTimeout(startNewRound, 5000);
          }
        } catch (error) {
          console.error('Error in game loop:', error);
          clearInterval(interval);
          io.emit('error', { message: 'Game loop error, restarting round' });
          setTimeout(startNewRound, 5000);
        }
      }, 100);
    } catch (error) {
      console.error('Error starting new round:', error);
      io.emit('error', { message: 'Failed to start round, retrying' });
      setTimeout(startNewRound, 5000);
    }
  };

  startNewRound();
};

const handleWebSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New WebSocket client connected:', socket.id);
    socket.on('cashout', async ({ playerId, roundId }) => {
      try {
        console.log(`Cashout request: playerId=${playerId}, roundId=${roundId}`);
        const round = await GameRound.findOne({ roundId });
        console.log('Round lookup result:', round);
        if (!round) throw new Error('Round not found');
        if (round.status !== 'active') throw new Error('Round not active');

        const multiplier = calculateMultiplier(round.startedAt);
        const result = await cashOut(playerId, roundId, multiplier);
        io.emit('playerCashout', {
          playerId,
          roundId,
          multiplier,
          payoutCrypto: result.payoutCrypto,
          payoutUsd: result.payoutUsd
        });
      } catch (error) {
        console.error('Cashout error:', error.message);
        socket.emit('error', { message: error.message });
      }
    });
    socket.on('disconnect', () => {
      console.log('WebSocket client disconnected:', socket.id);
    });
  });

  startGameLoop(io);
};

module.exports = { handleWebSocket };