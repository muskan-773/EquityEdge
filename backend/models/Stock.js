const mongoose = require('mongoose');

/**
 * STOCK MODEL
 *
 * Represents a tradeable equity instrument on the platform.
 * All prices are simulated — this is a paper-trading platform.
 *
 * Key design decisions:
 *
 * 1. SYMBOL as the primary lookup key (indexed)
 *    Stocks are universally identified by their ticker symbol (e.g., "TCS",
 *    "INFY"). Orders and Holdings reference stocks by symbol (string), not
 *    ObjectId. Why? Because:
 *    - Symbols are human-readable (useful for UI display)
 *    - They're stable identifiers in the financial domain
 *    - Avoids an extra JOIN-like lookup when displaying order history
 *
 * 2. priceHistory array (capped at last 100 data points)
 *    We store a rolling price history to render the stock chart.
 *    In a real system, this would be a separate time-series collection.
 *    For our scale, embedding the last 100 points in the document is fine
 *    and avoids an extra collection.
 *
 * 3. previousClose
 *    Needed to calculate the day's change percentage:
 *    dayChange = ((currentPrice - previousClose) / previousClose) * 100
 *    This mirrors how real market data works.
 *
 * Interview Q: "Why not store historical prices in a separate collection?"
 * A: For our scale (20 simulated stocks, 100 data points each), embedding
 *    works fine. MongoDB documents can be up to 16MB. If we were storing
 *    tick data for thousands of stocks, we'd use a time-series collection
 *    or a dedicated time-series database like InfluxDB. That's a real
 *    engineering tradeoff worth mentioning.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Stock:
 *       type: object
 *       properties:
 *         symbol:
 *           type: string
 *           example: TCS
 *         name:
 *           type: string
 *           example: Tata Consultancy Services
 *         currentPrice:
 *           type: number
 *         previousClose:
 *           type: number
 *         dayChange:
 *           type: number
 *         dayChangePercent:
 *           type: number
 *         sector:
 *           type: string
 *         exchange:
 *           type: string
 */
const pricePointSchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false } // Don't create _id for subdocuments — saves space
);

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: [true, 'Stock symbol is required'],
      unique: true,
      uppercase: true,   // Always stored as uppercase: "tcs" → "TCS"
      trim: true,
      match: [/^[A-Z0-9]{1,10}$/, 'Invalid stock symbol format'],
    },

    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },

    // Current market price (updated by the price simulator)
    currentPrice: {
      type: Number,
      required: true,
      min: [0.01, 'Price must be positive'],
    },

    // Price at start of trading day (for day change calculation)
    previousClose: {
      type: Number,
      required: true,
      min: [0.01, 'Previous close must be positive'],
    },

    // Absolute price change today: currentPrice - previousClose
    dayChange: {
      type: Number,
      default: 0,
    },

    // Percentage change today
    dayChangePercent: {
      type: Number,
      default: 0,
    },

    // High and low for the current trading day
    dayHigh: {
      type: Number,
      default: 0,
    },

    dayLow: {
      type: Number,
      default: 0,
    },

    // Total shares traded today (simulated)
    volume: {
      type: Number,
      default: 0,
    },

    // Business sector for UI grouping and filtering
    sector: {
      type: String,
      enum: [
        'Technology',
        'Finance',
        'Healthcare',
        'Energy',
        'Consumer Goods',
        'Automobile',
        'Telecom',
        'Infrastructure',
        'FMCG',
        'Metals',
      ],
      default: 'Technology',
    },

    // Exchange listed on
    exchange: {
      type: String,
      enum: ['NSE', 'BSE'],
      default: 'NSE',
    },

    // Market capitalization category (for display only)
    marketCap: {
      type: String,
      enum: ['Large Cap', 'Mid Cap', 'Small Cap'],
      default: 'Large Cap',
    },

    // Rolling price history for charts (last 100 data points)
    // The price simulator appends to this array every 5 seconds
    priceHistory: {
      type: [pricePointSchema],
      default: [],
    },

    // Whether this stock is active (can be bought/sold)
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// symbol unique index is created by `unique: true` above.
// This is the primary lookup path: GET /api/stocks/:symbol

// Compound index for filtered listing: GET /api/stocks?sector=Technology
stockSchema.index({ sector: 1, isActive: 1 });

// Index for exchange-based filtering
stockSchema.index({ exchange: 1, isActive: 1 });

// ─── Virtual: formatted day change string ─────────────────────────────────────
/**
 * Virtuals are computed properties that are NOT stored in MongoDB.
 * They exist only when the document is in memory.
 *
 * Interview Q: "What is a Mongoose virtual?"
 * A: A virtual is a document property that is computed on-the-fly from
 * other fields. It's never persisted to MongoDB. Useful for derived
 * data like formatted strings, full names, etc.
 */
stockSchema.virtual('formattedChange').get(function () {
  const sign = this.dayChange >= 0 ? '+' : '';
  return `${sign}${this.dayChange.toFixed(2)} (${sign}${this.dayChangePercent.toFixed(2)}%)`;
});

// ─── Instance Method: Update Price ───────────────────────────────────────────
/**
 * Called by the price simulator to update the stock's price.
 * Keeps history trimmed to 100 data points.
 */
stockSchema.methods.updatePrice = function (newPrice) {
  const previousPrice = this.currentPrice;

  this.currentPrice = parseFloat(newPrice.toFixed(2));
  this.dayChange = parseFloat((this.currentPrice - this.previousClose).toFixed(2));
  this.dayChangePercent = parseFloat(
    ((this.dayChange / this.previousClose) * 100).toFixed(2)
  );

  if (this.currentPrice > this.dayHigh) this.dayHigh = this.currentPrice;
  if (this.currentPrice < this.dayLow || this.dayLow === 0) this.dayLow = this.currentPrice;

  // Append to price history, keep last 100 points
  this.priceHistory.push({ price: this.currentPrice, timestamp: new Date() });
  if (this.priceHistory.length > 100) {
    this.priceHistory.shift(); // Remove oldest point
  }

  return this;
};

const Stock = mongoose.model('Stock', stockSchema);

module.exports = Stock;
