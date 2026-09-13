const mongoose = require('mongoose');

/**
 * HOLDING MODEL
 *
 * A Holding represents the current position a user holds in a stock.
 * One document per (user, symbol) pair — enforced by a unique compound index.
 *
 * Key design decisions:
 *
 * 1. ONE HOLDING DOCUMENT PER USER PER STOCK
 *    When a user buys TCS 10 times, we don't create 10 documents.
 *    We UPDATE a single holding document: quantity increases, and we
 *    recalculate the average buy price.
 *
 *    This is called "average cost basis" accounting:
 *    newAvgPrice = ((oldQty × oldAvg) + (newQty × newPrice)) / (oldQty + newQty)
 *
 * 2. AVERAGE BUY PRICE (averageBuyPrice)
 *    This is the weighted average of all buy prices.
 *    Example: Buy 10 shares at ₹100, then 5 more at ₹130
 *    Average = (10×100 + 5×130) / 15 = ₹110
 *    P&L = (currentPrice - averageBuyPrice) × quantity
 *
 * 3. WHY NOT COMPUTE P&L HERE?
 *    P&L requires currentPrice, which changes every few seconds.
 *    We store only the static fields (quantity, averageBuyPrice).
 *    P&L is computed in the portfolio controller at query time by
 *    joining with the current stock prices.
 *
 * 4. COMPOUND UNIQUE INDEX on (user, symbol)
 *    Prevents accidentally creating duplicate holdings for the same stock.
 *    Also the primary query path for any holding lookup.
 *
 * Interview Q: "How do you calculate average buy price after multiple purchases?"
 * A: Weighted average: newAvg = ((oldQty × oldAvg) + (addedQty × newPrice))
 *    / (oldQty + addedQty). This is the standard cost-basis method.
 *
 * Interview Q: "What happens when quantity reaches 0 after selling?"
 * A: We delete the holding document. An empty holding is meaningless data.
 *    The transaction history still preserves the full trade record.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Holding:
 *       type: object
 *       properties:
 *         symbol:
 *           type: string
 *         stockName:
 *           type: string
 *         quantity:
 *           type: number
 *         averageBuyPrice:
 *           type: number
 *         investedValue:
 *           type: number
 */
const holdingSchema = new mongoose.Schema(
  {
    // Owner of this holding
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Holding must belong to a user'],
    },

    symbol: {
      type: String,
      required: [true, 'Stock symbol is required'],
      uppercase: true,
      trim: true,
    },

    // Denormalized for display (avoids population on portfolio load)
    stockName: {
      type: String,
      required: true,
      trim: true,
    },

    // Number of shares currently held
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
    },

    // Weighted average of all buy prices for this stock
    // Updated on every BUY; not changed on SELL
    averageBuyPrice: {
      type: Number,
      required: true,
      min: [0.01, 'Average buy price must be positive'],
    },

    // quantity × averageBuyPrice — stored for quick portfolio total
    // Updated on every BUY and SELL
    investedValue: {
      type: Number,
      required: true,
      min: [0, 'Invested value cannot be negative'],
    },
  },
  {
    timestamps: true,
    // Expose virtuals when converting to JSON (for API responses)
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * Unique compound index on (user, symbol)
 * Purpose 1: Enforces one holding per user per stock (data integrity)
 * Purpose 2: Primary query path — "Get user X's holding for TCS" uses this index
 *
 * Interview Q: "Why a compound index instead of two separate indexes?"
 * A: Queries always filter by BOTH user AND symbol together. A compound
 *    index covers this pattern in a single B-tree lookup. Two separate
 *    indexes would require MongoDB to intersect two index scans — slower.
 */
holdingSchema.index({ user: 1, symbol: 1 }, { unique: true });

// ─── Virtual: Profit/Loss (computed at read time with current price) ──────────
// NOTE: currentPrice must be set externally before this virtual is useful.
// The portfolio controller manually attaches currentPrice to each holding.
holdingSchema.virtual('currentValue').get(function () {
  if (!this._currentPrice) return null;
  return parseFloat((this._currentPrice * this.quantity).toFixed(2));
});

holdingSchema.virtual('profitLoss').get(function () {
  if (!this._currentPrice) return null;
  return parseFloat(
    ((this._currentPrice - this.averageBuyPrice) * this.quantity).toFixed(2)
  );
});

holdingSchema.virtual('profitLossPercent').get(function () {
  if (!this._currentPrice || this.averageBuyPrice === 0) return null;
  return parseFloat(
    (((this._currentPrice - this.averageBuyPrice) / this.averageBuyPrice) * 100).toFixed(2)
  );
});

const Holding = mongoose.model('Holding', holdingSchema);

module.exports = Holding;
