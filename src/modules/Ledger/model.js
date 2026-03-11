const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

const Ledger = mongoose.model('Ledger', ledgerSchema);

module.exports = Ledger;
