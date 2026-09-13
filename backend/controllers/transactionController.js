const Transaction = require('../models/Transaction');
const catchAsync = require('../middleware/asyncHandler');

/**
 * TRANSACTION CONTROLLER
 *
 * Transactions are read-only from the API perspective.
 * They are written only by the orderController.
 * Users can query their transaction history but cannot create,
 * update, or delete transaction records — this is intentional.
 * The transaction log is the immutable audit trail.
 */

// ─── GET /api/transactions ────────────────────────────────────────────────────
/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get transaction history for the authenticated user
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [BUY, SELL]
 *       - in: query
 *         name: symbol
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Transaction history with pagination
 */
exports.getTransactions = catchAsync(async (req, res, next) => {
  const { type, symbol, limit = 20, page = 1 } = req.query;

  const query = { user: req.user._id };

  if (type) query.transactionType = type.toUpperCase();
  if (symbol) query.symbol = symbol.toUpperCase();

  const skip = (Number(page) - 1) * Number(limit);

  // Run count and data queries in parallel
  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Transaction.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: transactions.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: { transactions },
  });
});
