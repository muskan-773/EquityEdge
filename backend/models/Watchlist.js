const mongoose = require('mongoose');

/**
 * WATCHLIST MODEL
 *
 * Stores the list of stocks a user is monitoring.
 * A user has ONE watchlist document. The stocks are stored as an array
 * of objects inside that document.
 *
 * Key design decisions:
 *
 * 1. ONE DOCUMENT PER USER (embedded array)
 *    Instead of a separate document for each watchlist item, we embed
 *    all watched stocks in a single user-owned document.
 *
 *    Why? Watchlist operations are always:
 *    - "Get ALL items for user X" → reads one document
 *    - "Add item for user X" → $push to one document
 *    - "Remove item for user X" → $pull from one document
 *    There is no query like "find all users watching TCS" — that would
 *    favor a separate collection. Our access pattern perfectly fits embedding.
 *
 * 2. MAX 50 ITEMS
 *    Prevents unreasonably large documents. Most traders watch fewer than 20.
 *
 * 3. NOTE ON ALTERNATIVE DESIGN
 *    Alternative: A separate WatchlistItem collection where each row is
 *    (userId, symbol). Pros: easier to query "who watches TCS". Cons:
 *    needs a JOIN-like .find({ user }) query for every page load.
 *    For our access pattern, embedding is clearly better.
 *
 * Interview Q: "When would you choose a separate collection over embedding?"
 * A: When the sub-documents grow unboundedly, when you need to query the
 *    sub-documents independently of the parent, or when the same sub-document
 *    is referenced from multiple parent documents.
 *    For a watchlist, embedding is ideal because: bounded size, always
 *    accessed with the user, never referenced from other documents.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Watchlist:
 *       type: object
 *       properties:
 *         user:
 *           type: string
 *         stocks:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               symbol:
 *                 type: string
 *               name:
 *                 type: string
 *               addedAt:
 *                 type: string
 *                 format: date-time
 */
const watchlistItemSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    // Denormalized stock name — avoids populating Stock on every watchlist load
    name: {
      type: String,
      required: true,
      trim: true,
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // No _id for array sub-documents — symbol serves as identifier
);

const watchlistSchema = new mongoose.Schema(
  {
    // One watchlist per user — enforced by unique index below
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Creates a unique index
    },

    stocks: {
      type: [watchlistItemSchema],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 50;
        },
        message: 'Watchlist cannot contain more than 50 stocks',
      },
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// user unique index created by `unique: true` above.
// This is the only query pattern: "Get watchlist for user X" — covered.

const Watchlist = mongoose.model('Watchlist', watchlistSchema);

module.exports = Watchlist;
