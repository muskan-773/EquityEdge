const Stock = require('../models/Stock');
const catchAsync = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

/**
 * STOCK CONTROLLER
 *
 * Handles read-only stock data endpoints.
 * Stocks are written only by the price simulator service — never via HTTP.
 * Users can only READ stock data through these endpoints.
 *
 * Why read-only for users?
 * In a real exchange, stock prices come from a market data feed.
 * In our system, the PriceSimulator service updates prices.
 * Users have no business writing to stock data.
 *
 * Caching note (interview talking point):
 * GET /api/stocks is called every time the market page loads.
 * In production, you'd cache this response in Redis with a TTL of 1-2 seconds.
 * We haven't added Redis here to keep the stack simple — but it's worth
 * mentioning in an interview as a "what would you add next" improvement.
 */

// ─── GET /api/stocks ──────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/stocks:
 *   get:
 *     summary: Get all active stocks
 *     tags: [Stocks]
 *     parameters:
 *       - in: query
 *         name: sector
 *         schema:
 *           type: string
 *         description: Filter by sector (e.g., Technology, Finance)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by symbol or company name
 *       - in: query
 *         name: exchange
 *         schema:
 *           type: string
 *           enum: [NSE, BSE]
 *         description: Filter by exchange
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field e.g. "dayChangePercent" or "-currentPrice"
 *     responses:
 *       200:
 *         description: List of stocks
 */
exports.getAllStocks = catchAsync(async (req, res, next) => {
  const { sector, search, exchange, sort } = req.query;

  // Build query object dynamically
  const query = { isActive: true };

  // Sector filter: ?sector=Technology
  if (sector) {
    query.sector = sector;
  }

  // Exchange filter: ?exchange=NSE
  if (exchange && ['NSE', 'BSE'].includes(exchange.toUpperCase())) {
    query.exchange = exchange.toUpperCase();
  }

  // Search: case-insensitive partial match on symbol OR company name
  // $or: [{ symbol: /tcs/i }, { name: /tcs/i }]
  // Interview Q: "What is a regex query in MongoDB?"
  // A: MongoDB supports regex patterns in queries. The 'i' flag makes it
  //    case-insensitive. For production, you'd use a text index + $text
  //    operator for better performance on large collections.
  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [{ symbol: searchRegex }, { name: searchRegex }];
  }

  // Build Mongoose query
  let stockQuery = Stock.find(query)
    .select('-priceHistory') // Exclude priceHistory from list view — it's large
    .lean();                 // .lean() returns plain JS objects, not Mongoose docs
                             // Faster for read-only operations — no overhead of
                             // hydrating Mongoose document methods

  // Sorting: ?sort=dayChangePercent (ascending) or ?sort=-dayChangePercent (desc)
  if (sort) {
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const allowedSortFields = ['currentPrice', 'dayChangePercent', 'volume', 'symbol'];

    if (allowedSortFields.includes(sortField)) {
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      stockQuery = stockQuery.sort({ [sortField]: sortOrder });
    }
  } else {
    // Default sort: alphabetical by symbol
    stockQuery = stockQuery.sort({ symbol: 1 });
  }

  const stocks = await stockQuery;

  res.status(200).json({
    success: true,
    count: stocks.length,
    data: { stocks },
  });
});

// ─── GET /api/stocks/:symbol ──────────────────────────────────────────────────
/**
 * @swagger
 * /api/stocks/{symbol}:
 *   get:
 *     summary: Get a single stock with price history
 *     tags: [Stocks]
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Stock ticker symbol (e.g., TCS)
 *     responses:
 *       200:
 *         description: Stock details with price history
 *       404:
 *         description: Stock not found
 */
exports.getStockBySymbol = catchAsync(async (req, res, next) => {
  // toUpperCase: handle both /api/stocks/tcs and /api/stocks/TCS
  const symbol = req.params.symbol.toUpperCase();

  // Include priceHistory for the detail/chart view
  const stock = await Stock.findOne({ symbol, isActive: true });

  if (!stock) {
    return next(new AppError(`Stock with symbol '${symbol}' not found`, 404));
  }

  res.status(200).json({
    success: true,
    data: { stock },
  });
});

// ─── GET /api/stocks/sectors ──────────────────────────────────────────────────
/**
 * @swagger
 * /api/stocks/meta/sectors:
 *   get:
 *     summary: Get list of available sectors
 *     tags: [Stocks]
 */
exports.getSectors = catchAsync(async (req, res, next) => {
  // aggregate: group by sector, count stocks in each
  // Interview Q: "What is MongoDB aggregation?"
  // A: Aggregation pipelines process documents in stages. Each stage
  //    transforms the data: $match filters, $group aggregates, $sort orders.
  //    It's MongoDB's equivalent of SQL GROUP BY + aggregate functions.
  const sectors = await Stock.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$sector',
        count: { $sum: 1 },
        avgChange: { $avg: '$dayChangePercent' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        sector: '$_id',
        count: 1,
        avgChange: { $round: ['$avgChange', 2] },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: { sectors },
  });
});
