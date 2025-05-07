const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  usdAmount: { type: Number, required: true },
  cryptoAmount: { type: Number, required: true },
  currency: { type: String, required: true, enum: ['BTC', 'ETH'] },
  cashoutMultiplier: { type: Number },
  payoutCrypto: { type: Number },
  payoutUsd: { type: Number }
});

const gameRoundSchema = new mongoose.Schema({
  roundId: { type: Number, required: true, unique: true },
  seed: { type: String, required: true },
  hash: { type: String, required: true },
  crashPoint: { type: Number, required: true },
  status: { type: String, required: true, enum: ['pending', 'active', 'crashed'], default: 'pending' },
  startedAt: { type: Date },
  crashedAt: { type: Date },
  bets: [betSchema]
}, { timestamps: true });

module.exports = mongoose.model('GameRound', gameRoundSchema);