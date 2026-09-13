const mongoose = require('mongoose');

/**
 * TRANSACTION MODEL
 *
 * A Transaction is the immutable record of a COMPLETED trade.
 * Once created, it is never modified. It forms the complete audit trail
 * of every trade a user has made.
 *
 * Order vs Transaction:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ORDER             │  TRANSACTION                               │
 * │  "I want to buy"   │  "The buy happened"                        │
 * │  Can be rejected   │  Only created on success                   │
 * │  Mutable (status)  │  Immutable (append-only)                   │
 * │  Short lifecycle   │  Permanent record                          │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Key design decisions:
 *
 * 1. IMMUTABLE RECORD
 *    Once a transaction is created, it should never be updated.
 *    (In a real brokerage, trades are immutable by law — audit trail.)
 *
 * 2. BALANCE SNAPSHOT
 *    We store the cash balance AFTER the trade. This lets users see how
 *    their balance changed over time. Useful for a "trade history" feature.
 *
 * 3. ORDER REFERENCE
 *    Each transaction references its source order. This creates a full
 *    traceability chain: Transaction → Order → User.
 *
 * Interview Q: "Why store balanceAfter in the transaction?"
 * A: It creates a ledger-like audit trail. You can reconstruct the
 *    user's balance at any point in time by replaying transactions.
 *    It also makes the trade history page more useful — users can see
 *    "my balance was ₹5,43,200 after this trade."
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         symbol:
 *           type: string
 *         stockName:
 *           type: string
 *         transactionType:
 *           type: string
 *           enum: [BUY, SELL]
 *         quantity:
 *           type: number
 *         price:
 *           type: number
 *         totalValue:
 *           type: number
 *         balanceAfter:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 */
const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must belong to a user'],
      index: true,
    },

    // Reference to the order that generated this transaction
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Transaction must reference an order'],
    },

    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    stockName: {
      type: String,
      required: true,
      trim: true,
    },

    transactionType: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: [true, 'Transaction type is required'],
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },

    // Price at which the trade was executed
    price: {
      type: Number,
      required: true,
      min: [0.01, 'Price must be positive'],
    },

    // quantity × price
    totalValue: {
      type: Number,
      required: true,
    },

    // User's cash balance immediately after this transaction
    // This creates a running ledger of balance changes
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true, // createdAt = exact time of trade execution

    // Transactions are immutable — prevent accidental updates
    // We enforce this at the application level (no update routes),
    // not at the DB level, for simplicity.
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary query: "Get transaction history for user X, newest first"
transactionSchema.index({ user: 1, createdAt: -1 });

// Filter by type: "Get all BUY transactions for user X"
transactionSchema.index({ user: 1, transactionType: 1 });

// Filter by symbol: "Get all transactions for TCS by user X"
transactionSchema.index({ user: 1, symbol: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
