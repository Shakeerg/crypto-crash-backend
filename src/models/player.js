const mongoose = require('mongoose');

const balanceSchema = new mongoose.Schema({
  currency: { type: String, required: true, enum: ['BTC', 'ETH'] },
  amount: { type: Number, required: true, default: 0 }
});

const playerSchema = new mongoose.Schema({
  playerId: { type: String, required: true, unique: true },
  balances: [balanceSchema]
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);