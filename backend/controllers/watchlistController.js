const Watchlist = require('../models/Watchlist');
const Stock = require('../models/Stock');
const catchAsync = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

/**
 * WATCHLIST CONTROLLER
 *
 * One watchlist document per user.
 * Stocks are stored as an embedded array within that document.
 *
 * GET  /api/watchlist      — return user's watchlist enriched with current prices
 * POST /api/watchlist      — add a stock to the watchlist
 * DELETE /api/watchlist/:symbol — remove a stock
 */

// ─── GET /api/watchlist ───────────────────────────────────────────────────────
/**
 * @swagger
 * /api/watchlist:
 *   get:
 *     summary: Get the user's watchlist with current prices
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Watchlist with live prices
 */
exports.getWatchlist = catchAsync(async (req, res, next) => {
  const watchlist = await Watchlist.findOne({ user: req.user._id }).lean();

  if (!watchlist || watchlist.stocks.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: { stocks: [] },
    });
  }

  // Batch-fetch current prices for all watched stocks (solve N+1)
  const symbols = watchlist.stocks.map((s) => s.symbol);
  const stockData = await Stock.find(
    { symbol: { $in: symbols } },
    { symbol: 1, currentPrice: 1, dayChange: 1, dayChangePercent: 1, previousClose: 1 }
  ).lean();

  const priceMap = stockData.reduce((map, s) => {
    map[s.symbol] = s;
    return map;
  }, {});

  // Merge watchlist items with live prices
  const enrichedStocks = watchlist.stocks.map((item) => {
    const live = priceMap[item.symbol] || {};
    return {
      symbol: item.symbol,
      name: item.name,
      addedAt: item.addedAt,
      currentPrice: live.currentPrice || null,
      dayChange: live.dayChange || 0,
      dayChangePercent: live.dayChangePercent || 0,
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedStocks.length,
    data: { stocks: enrichedStocks },
  });
});

// ─── POST /api/watchlist ──────────────────────────────────────────────────────
/**
 * @swagger
 * /api/watchlist:
 *   post:
 *     summary: Add a stock to the watchlist
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol]
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: TCS
 *     responses:
 *       200:
 *         description: Stock added to watchlist
 *       400:
 *         description: Already in watchlist or max limit reached
 *       404:
 *         description: Stock not found
 */
exports.addToWatchlist = catchAsync(async (req, res, next) => {
  const symbol = req.body.symbol.toUpperCase();

  // Verify the stock exists
  const stock = await Stock.findOne({ symbol, isActive: true });
  if (!stock) {
    return next(new AppError(`Stock '${symbol}' not found`, 404));
  }

  const watchlist = await Watchlist.findOne({ user: req.user._id });

  if (!watchlist) {
    return next(new AppError('Watchlist not found. Please re-register.', 404));
  }

  // Check for duplicate
  const alreadyWatching = watchlist.stocks.some((s) => s.symbol === symbol);
  if (alreadyWatching) {
    return next(new AppError(`${symbol} is already in your watchlist`, 400));
  }

  // Check max limit
  if (watchlist.stocks.length >= 50) {
    return next(
      new AppError('Watchlist is full. Remove some stocks before adding new ones.', 400)
    );
  }

  // $push operator appends to the array in MongoDB
  // Alternative: watchlist.stocks.push(...) then watchlist.save()
  // Using $push avoids loading the full document just to push one item
  watchlist.stocks.push({ symbol, name: stock.name });
  await watchlist.save();

  res.status(200).json({
    success: true,
    message: `${symbol} added to watchlist`,
    data: {
      stock: {
        symbol,
        name: stock.name,
        currentPrice: stock.currentPrice,
        dayChangePercent: stock.dayChangePercent,
      },
    },
  });
});

// ─── DELETE /api/watchlist/:symbol ────────────────────────────────────────────
/**
 * @swagger
 * /api/watchlist/{symbol}:
 *   delete:
 *     summary: Remove a stock from the watchlist
 *     tags: [Watchlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock removed
 *       404:
 *         description: Stock not in watchlist
 */
exports.removeFromWatchlist = catchAsync(async (req, res, next) => {
  const symbol = req.params.symbol.toUpperCase();

  // $pull removes all array elements matching the condition
  // This is atomic — no need to load the document first
  const result = await Watchlist.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { stocks: { symbol } } },
    { new: true } // Return updated document
  );

  if (!result) {
    return next(new AppError('Watchlist not found', 404));
  }

  res.status(200).json({
    success: true,
    message: `${symbol} removed from watchlist`,
  });
});
