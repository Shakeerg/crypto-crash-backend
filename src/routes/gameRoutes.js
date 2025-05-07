const express = require('express');
const router = express.Router();
const gameService = require('../services/gameService');
const Player = require('../models/player');
const { convertCryptoToUsd } = require('../services/cryptoService');

router.post('/bet', async (req, res) => {
  try {
    console.log('Bet request received:', req.body);
    const { playerId, usdAmount, currency, roundId } = req.body;
    const result = await gameService.placeBet(playerId, usdAmount, currency, roundId);
    res.json(result);
  } catch (error) {
    console.error('Bet endpoint error:', error.message, 'Request:', req.body);
    res.status(400).json({ error: error.message });
  }
});

router.post('/cashout', async (req, res) => {
  try {
    console.log('Cashout request received:', req.body);
    const { playerId, roundId, multiplier } = req.body;
    const result = await gameService.cashOut(playerId, roundId, multiplier);
    res.json(result);
  } catch (error) {
    console.error('Cashout endpoint error:', error.message, 'Request:', req.body);
    res.status(400).json({ error: error.message });
  }
});

router.get('/balance/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const player = await Player.findOne({ playerId });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    const balances = await Promise.all(
      player.balances.map(async (balance) => {
        const usdEquivalent = await convertCryptoToUsd(balance.amount, balance.currency);
        return {
          currency: balance.currency,
          cryptoAmount: balance.amount,
          usdEquivalent
        };
      })
    );
    res.json({ playerId, balances });
  } catch (error) {
    console.error('Balance endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

module.exports = router;