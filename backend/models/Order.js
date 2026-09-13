const mongoose = require('mongoose');

/**
 * ORDER MODEL
 *
 * An Order represents a user's intent to buy or sell a stock.
 * In real markets, orders can be pending, partially filled, rejected, etc.
 * For this paper-trading platform, all orders are MARKET orders that
 * execute immediately at the current price. Status transitions:
 *
 *   PENDING → EXECUTED  (immediate, market order)
 *   PENDING → REJECTED  (insufficient balance, invalid symbol, etc.)
 *   PENDING → CANCELLED (user cancels before execution — future feature)
 *
 * Key design decisions:
 *
 * 1. WHY STORE ORDER + TRANSACTION SEPARATELY?
 *    An Order is the intent. A Transaction is the confirmation.
 *    This mirrors real brokerage systems. The order is created first, then
 *    processing happens, then a transaction record is created.
 *    If processing fails, the order is REJECTED and no transaction is created.
 *    This gives you a complete audit trail.
 *
 * 2. EXECUTION PRICE vs ORDER PRICE
 *    We store both the price at which the order was placed AND the price
 *    at which it was executed. In a real market, these differ because of
 *    slippage. In our simulation they're the same but the field exists
 *    for realism.
 *
 * 3. TOTAL VALUE
 *    Stored explicitly for quick display without re-calculation.
 *    Avoids multiplying quantity × price on every read.
 *
 * Interview Q: "What is the difference between an Order and a Transaction?"
 * A: An Order is the request to trade. A Transaction is the confirmed
 *    record of a completed trade. In real systems, one order can produce
 *    multiple transactions (partial fills). Here we have 1:1 for simplicity.
 *
 * Interview Q: "Why store orderType (BUY/SELL) as an enum?"
 * A: Enums enforce a closed set of valid values at the database level.
 *    They prevent garbage data like "buy", "Buy", "BUY123" from being stored.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *         symbol:
 *           type: string
 *         stockName:
 *           type: string
 *         orderType:
 *           type: string
 *           enum: [BUY, SELL]
 *         quantity:
 *           type: number
 *         price:
 *           type: number
 *         totalValue:
 *           type: number
 *         status:
 *           type: string
 *           enum: [PENDING, EXECUTED, REJECTED, CANCELLED]
 *         createdAt:
 *           type: string
 *           format: date-time
 */
const orderSchema = new mongoose.Schema(
  {
    // Which user placed this order
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user'],
      index: true, // Frequent query: "get all orders for this user"
    },

    // Stock ticker symbol (e.g., "TCS", "INFY")
    // Denormalized string (not a ref) for fast display without population
    symbol: {
      type: String,
      required: [true, 'Stock symbol is required'],
      uppercase: true,
      trim: true,
    },

    // Denormalized stock name for display in order history
    // Avoids needing to join with Stock collection every time
    stockName: {
      type: String,
      required: true,
      trim: true,
    },

    // Direction of the trade
    orderType: {
      type: String,
      enum: {
        values: ['BUY', 'SELL'],
        message: 'Order type must be BUY or SELL',
      },
      required: [true, 'Order type is required'],
    },

    // Number of shares to buy or sell
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },

    // Price at which the order was REQUESTED (market price at request time)
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be positive'],
    },

    // Price at which the order was EXECUTED
    // For market orders, same as price. Separate field for extensibility.
    executionPrice: {
      type: Number,
      min: [0.01, 'Execution price must be positive'],
    },

    // quantity × price (stored for quick display)
    totalValue: {
      type: Number,
      required: true,
      min: [0.01, 'Total value must be positive'],
    },

    // Lifecycle status of the order
    status: {
      type: String,
      enum: ['PENDING', 'EXECUTED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
    },

    // Human-readable reason if rejected (e.g., "Insufficient balance")
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt = when order was placed
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Most common query: "Get all orders for user X, sorted by newest"
orderSchema.index({ user: 1, createdAt: -1 });

// Filter by status: "Get all pending orders for user X"
orderSchema.index({ user: 1, status: 1 });

// Filter by symbol: "Get all orders for TCS by user X"
orderSchema.index({ user: 1, symbol: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
