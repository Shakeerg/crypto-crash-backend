const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  type: { type: String, required: true },
  usdAmount: { type: Number, required: true },
  cryptoAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  roundId: { type: Number, required: true },
  multiplier: { type: Number }, // For cashout transactions
  priceAtTime: { type: Number }, // Made optional
  transactionHash: { type: String }, // Made optional
  transactionType: { type: String }, // Made optional
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);