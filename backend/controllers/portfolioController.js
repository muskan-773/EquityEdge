const Holding = require('../models/Holding');
const Stock = require('../models/Stock');
const User = require('../models/User');
const catchAsync = require('../middleware/asyncHandler');

/**
 * PORTFOLIO CONTROLLER
 *
 * The portfolio is derived data — it is COMPUTED from holdings and current
 * stock prices. Nothing in the portfolio is stored independently.
 *
 * Why compute at query time instead of storing portfolio totals?
 * Because stock prices change every few seconds. If we stored totalValue in
 * a separate Portfolio document, it would be stale the moment a price moves.
 * Computing it on demand ensures freshness.
 *
 * The portfolio summary calculates:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ cashBalance     — from User model (updated on every trade)  │
 * │ investedValue   — sum of (avgPrice × qty) for all holdings  │
 * │ currentValue    — sum of (currentPrice × qty)               │
 * │ totalValue      — cashBalance + currentValue                 │
 * │ totalProfitLoss — currentValue - investedValue              │
 * │ totalPLPercent  — (totalProfitLoss / investedValue) × 100   │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Interview Q: "How do you calculate today's P&L vs total P&L?"
 * A: Total P&L = currentValue - investedValue (since first buy).
 *    Today's P&L = sum of (dayChange × qty) for each holding.
 *    dayChange = stock.currentPrice - stock.previousClose.
 *    We get previousClose from the Stock document.
 *
 * Interview Q: "Why do you fetch all stock prices in one query?"
 * A: The user might have 10 different stocks in their portfolio.
 *    Instead of making 10 separate DB queries (N+1 problem), we:
 *    1. Get all unique symbols from holdings
 *    2. Make ONE query: Stock.find({ symbol: { $in: symbols } })
 *    This reduces 10 round-trips to 1.
 *
 * Interview Q: "What is the N+1 query problem?"
 * A: When you fetch N items and then make N individual queries for related
 *    data. Example: get 10 holdings, then for each one query the stock price
 *    = 1 + 10 = 11 queries. The fix is to use $in queries or populate() to
 *    batch the lookups.
 */

// ─── GET /api/portfolio ───────────────────────────────────────────────────────
/**
 * @swagger
 * /api/portfolio:
 *   get:
 *     summary: Get portfolio summary with P&L
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portfolio summary
 */
exports.getPortfolio = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // ── Step 1: Fetch holdings and user balance in parallel ──────────────────
  // Promise.all runs both queries simultaneously instead of sequentially
  // Sequential: 100ms + 80ms = 180ms
  // Parallel:   max(100ms, 80ms) = 100ms
  const [holdings, user] = await Promise.all([
    Holding.find({ user: userId }).lean(),
    User.findById(userId).select('cashBalance name'),
  ]);

  // ── Step 2: Batch fetch current prices (solve N+1 problem) ───────────────
  let stockPriceMap = {};

  if (holdings.length > 0) {
    const symbols = holdings.map((h) => h.symbol);

    // ONE query for ALL symbols — not one per holding
    const stocks = await Stock.find(
      { symbol: { $in: symbols } },
      { symbol: 1, currentPrice: 1, previousClose: 1, dayChange: 1 } // Projection: only needed fields
    ).lean();

    // Build a map: { "TCS": { currentPrice: 3842, previousClose: 3810, dayChange: 32 } }
    // O(n) map vs O(n²) nested loop for lookups
    stockPriceMap = stocks.reduce((map, stock) => {
      map[stock.symbol] = stock;
      return map;
    }, {});
  }

  // ── Step 3: Enrich holdings with real-time calculations ───────────────────
  let totalInvestedValue = 0;
  let totalCurrentValue = 0;
  let totalDayPL = 0;

  const enrichedHoldings = holdings.map((holding) => {
    const stockData = stockPriceMap[holding.symbol] || {};
    const currentPrice = stockData.currentPrice || holding.averageBuyPrice;
    const previousClose = stockData.previousClose || holding.averageBuyPrice;

    const currentValue = parseFloat((currentPrice * holding.quantity).toFixed(2));
    const profitLoss = parseFloat(
      ((currentPrice - holding.averageBuyPrice) * holding.quantity).toFixed(2)
    );
    const profitLossPercent =
      holding.averageBuyPrice > 0
        ? parseFloat(
            (
              ((currentPrice - holding.averageBuyPrice) / holding.averageBuyPrice) *
              100
            ).toFixed(2)
          )
        : 0;
    const dayPL = parseFloat(
      ((currentPrice - previousClose) * holding.quantity).toFixed(2)
    );

    totalInvestedValue += holding.investedValue;
    totalCurrentValue += currentValue;
    totalDayPL += dayPL;

    return {
      ...holding,
      currentPrice,
      currentValue,
      profitLoss,
      profitLossPercent,
      dayPL,
      dayChangePercent: stockData.dayChange
        ? parseFloat(((stockData.dayChange / previousClose) * 100).toFixed(2))
        : 0,
    };
  });

  // ── Step 4: Compute portfolio summary ─────────────────────────────────────
  const cashBalance = user.cashBalance;
  const totalPortfolioValue = parseFloat(
    (cashBalance + totalCurrentValue).toFixed(2)
  );
  const totalProfitLoss = parseFloat(
    (totalCurrentValue - totalInvestedValue).toFixed(2)
  );
  const totalPLPercent =
    totalInvestedValue > 0
      ? parseFloat(((totalProfitLoss / totalInvestedValue) * 100).toFixed(2))
      : 0;

  res.status(200).json({
    success: true,
    data: {
      summary: {
        cashBalance: parseFloat(cashBalance.toFixed(2)),
        investedValue: parseFloat(totalInvestedValue.toFixed(2)),
        currentValue: parseFloat(totalCurrentValue.toFixed(2)),
        totalPortfolioValue,
        totalProfitLoss,
        totalPLPercent,
        todayProfitLoss: parseFloat(totalDayPL.toFixed(2)),
        holdingsCount: holdings.length,
      },
      holdings: enrichedHoldings,
    },
  });
});

// ─── GET /api/portfolio/holdings ──────────────────────────────────────────────
/**
 * @swagger
 * /api/portfolio/holdings:
 *   get:
 *     summary: Get just the holdings list (without full summary)
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 */
exports.getHoldings = catchAsync(async (req, res, next) => {
  // Lightweight version — same holdings enrichment but no portfolio totals
  // Useful for the holdings page component that doesn't need the full summary
  const userId = req.user._id;

  const holdings = await Holding.find({ user: userId }).lean();

  if (holdings.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: { holdings: [] },
    });
  }

  const symbols = holdings.map((h) => h.symbol);
  const stocks = await Stock.find(
    { symbol: { $in: symbols } },
    { symbol: 1, currentPrice: 1, previousClose: 1, dayChangePercent: 1 }
  ).lean();

  const stockPriceMap = stocks.reduce((map, s) => {
    map[s.symbol] = s;
    return map;
  }, {});

  const enrichedHoldings = holdings.map((holding) => {
    const stockData = stockPriceMap[holding.symbol] || {};
    const currentPrice = stockData.currentPrice || holding.averageBuyPrice;
    const currentValue = parseFloat((currentPrice * holding.quantity).toFixed(2));
    const profitLoss = parseFloat(
      ((currentPrice - holding.averageBuyPrice) * holding.quantity).toFixed(2)
    );
    const profitLossPercent =
      holding.averageBuyPrice > 0
        ? parseFloat(
            (((currentPrice - holding.averageBuyPrice) / holding.averageBuyPrice) * 100).toFixed(2)
          )
        : 0;

    return {
      ...holding,
      currentPrice,
      currentValue,
      profitLoss,
      profitLossPercent,
      dayChangePercent: stockData.dayChangePercent || 0,
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedHoldings.length,
    data: { holdings: enrichedHoldings },
  });
});
