const mongoose = require('mongoose');
const Order = require('../models/Order');
const Holding = require('../models/Holding');
const Transaction = require('../models/Transaction');
const Stock = require('../models/Stock');
const User = require('../models/User');
const catchAsync = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

/**
 * ORDER CONTROLLER
 *
 * Implements the full paper-trading workflow: BUY and SELL.
 *
 * TRANSACTION STRATEGY — Replica Set Aware:
 * MongoDB multi-document ACID transactions require a replica set or sharded
 * cluster. On a standalone MongoDB instance (local dev), sessions throw:
 * "Transaction numbers are only allowed on a replica set member or mongos".
 *
 * We use a helper `withOptionalSession()` that:
 * 1. Tries to start a session + transaction (works on Atlas/replica set)
 * 2. On standalone: catches the error and re-runs without session
 *
 * This gives us ACID guarantees in production (Atlas) while remaining
 * runnable in local dev and CI without a replica set setup.
 *
 * Interview Q: "What is the trade-off of skipping transactions on standalone?"
 * A: Without a transaction, if the server crashes between deducting the
 *    balance (step 3) and creating the transaction record (step 5), the
 *    data is inconsistent — money gone but no record. In production on
 *    Atlas, transactions guarantee atomicity. For a learning project on
 *    local standalone, this is an acceptable trade-off to maintain
 *    developer ergonomics.
 *
 * Interview Q: "What is average cost basis?"
 * A: newAvgPrice = ((oldQty × oldAvg) + (newQty × newPrice)) / (oldQty + newQty)
 *    Example: 10 shares at ₹100, then 5 more at ₹130
 *    newAvg = (1000 + 650) / 15 = ₹110
 */

// ─── Core order execution logic (session-agnostic) ────────────────────────────
/**
 * Runs the order placement logic with an optional Mongoose session.
 * When session is null, operations run without transaction guarantees.
 * When session is provided, all operations are atomic.
 */
const executeOrder = async (req, res, next, session) => {
  const { symbol, orderType, quantity } = req.body;
  const userId = req.user._id;

  const stock = await Stock.findOne({ symbol: symbol.toUpperCase(), isActive: true });
  if (!stock) {
    return next(new AppError(`Stock '${symbol.toUpperCase()}' not found or is not tradeable`, 404));
  }

  const executionPrice = stock.currentPrice;
  const totalValue = parseFloat((executionPrice * quantity).toFixed(2));

  const sessionOpts = session ? { session } : {};

  // ── Create Order with PENDING status ─────────────────────────────────────
  const orderData = [{
    user: userId,
    symbol: stock.symbol,
    stockName: stock.name,
    orderType,
    quantity,
    price: executionPrice,
    executionPrice,
    totalValue,
    status: 'PENDING',
  }];

  const [order] = await Order.create(orderData, sessionOpts);

  const user = await User.findById(userId).session(session || null);

  // ── BUY ───────────────────────────────────────────────────────────────────
  if (orderType === 'BUY') {
    if (user.cashBalance < totalValue) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }

      order.status = 'REJECTED';
      order.rejectionReason = `Insufficient balance. Required: ₹${totalValue.toFixed(2)}, Available: ₹${user.cashBalance.toFixed(2)}`;
      await order.save();

      return next(new AppError(
        `Insufficient balance. Required ₹${totalValue.toFixed(2)}, available ₹${user.cashBalance.toFixed(2)}`,
        400
      ));
    }

    user.cashBalance = parseFloat((user.cashBalance - totalValue).toFixed(2));
    await user.save(sessionOpts);

    const existingHolding = await Holding.findOne({ user: userId, symbol: stock.symbol }).session(session || null);

    if (existingHolding) {
      const totalQty = existingHolding.quantity + quantity;
      const newAvgPrice = parseFloat(
        ((existingHolding.quantity * existingHolding.averageBuyPrice + quantity * executionPrice) / totalQty).toFixed(2)
      );
      existingHolding.quantity = totalQty;
      existingHolding.averageBuyPrice = newAvgPrice;
      existingHolding.investedValue = parseFloat((totalQty * newAvgPrice).toFixed(2));
      await existingHolding.save(sessionOpts);
    } else {
      await Holding.create([{
        user: userId,
        symbol: stock.symbol,
        stockName: stock.name,
        quantity,
        averageBuyPrice: executionPrice,
        investedValue: totalValue,
      }], sessionOpts);
    }
  }

  // ── SELL ──────────────────────────────────────────────────────────────────
  if (orderType === 'SELL') {
    const holding = await Holding.findOne({ user: userId, symbol: stock.symbol }).session(session || null);

    if (!holding || holding.quantity < quantity) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }

      order.status = 'REJECTED';
      order.rejectionReason = `Insufficient shares. Requested: ${quantity}, Available: ${holding ? holding.quantity : 0}`;
      await order.save();

      return next(new AppError(
        `Insufficient shares. You have ${holding ? holding.quantity : 0} shares of ${stock.symbol}, requested ${quantity}`,
        400
      ));
    }

    user.cashBalance = parseFloat((user.cashBalance + totalValue).toFixed(2));
    await user.save(sessionOpts);

    holding.quantity -= quantity;

    if (holding.quantity === 0) {
      await Holding.deleteOne({ _id: holding._id }, sessionOpts);
    } else {
      holding.investedValue = parseFloat((holding.quantity * holding.averageBuyPrice).toFixed(2));
      await holding.save(sessionOpts);
    }
  }

  // ── Create Transaction ────────────────────────────────────────────────────
  const updatedUser = await User.findById(userId).session(session || null);

  await Transaction.create([{
    user: userId,
    order: order._id,
    symbol: stock.symbol,
    stockName: stock.name,
    transactionType: orderType,
    quantity,
    price: executionPrice,
    totalValue,
    balanceAfter: updatedUser.cashBalance,
  }], sessionOpts);

  // ── Mark order EXECUTED ───────────────────────────────────────────────────
  order.status = 'EXECUTED';
  await order.save(sessionOpts);

  if (session) {
    await session.commitTransaction();
    session.endSession();
  }

  // ── Emit Socket.IO event ──────────────────────────────────────────────────
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${userId}`).emit('portfolio:updated', {
      cashBalance: updatedUser.cashBalance,
      lastOrder: { symbol: stock.symbol, orderType, quantity, price: executionPrice, totalValue },
    });
  }

  return res.status(201).json({
    success: true,
    message: `${orderType} order for ${quantity} shares of ${stock.symbol} executed at ₹${executionPrice}`,
    data: {
      order: {
        _id: order._id,
        symbol: order.symbol,
        stockName: order.stockName,
        orderType: order.orderType,
        quantity: order.quantity,
        price: order.price,
        totalValue: order.totalValue,
        status: order.status,
        createdAt: order.createdAt,
      },
      cashBalance: updatedUser.cashBalance,
    },
  });
};

// ─── POST /api/orders ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place a buy or sell order (market order, executed immediately)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, orderType, quantity]
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: TCS
 *               orderType:
 *                 type: string
 *                 enum: [BUY, SELL]
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 5
 *     responses:
 *       201:
 *         description: Order executed successfully
 *       400:
 *         description: Insufficient balance or shares
 *       404:
 *         description: Stock not found
 */
exports.placeOrder = catchAsync(async (req, res, next) => {
  // Try with a Mongoose session first (requires replica set / Atlas)
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    // Could not start session — proceed without transaction
    session = null;
  }

  try {
    return await executeOrder(req, res, next, session);
  } catch (error) {
    if (session) {
      try { await session.abortTransaction(); } catch {}
      try { session.endSession(); } catch {}

      // "Transaction numbers are only allowed on a replica set member or mongos"
      // This means we're on a standalone MongoDB — retry without session
      if (error.code === 20 || (error.message && error.message.includes('Transaction numbers'))) {
        return await executeOrder(req, res, next, null);
      }
    }
    throw error;
  }
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders for the authenticated user
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, EXECUTED, REJECTED, CANCELLED]
 *       - in: query
 *         name: orderType
 *         schema:
 *           type: string
 *           enum: [BUY, SELL]
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
 */
exports.getOrders = catchAsync(async (req, res, next) => {
  const { status, orderType, limit = 20, page = 1 } = req.query;

  const query = { user: req.user._id };
  if (status) query.status = status.toUpperCase();
  if (orderType) query.orderType = orderType.toUpperCase();

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Order.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: { orders },
  });
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get a specific order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
exports.getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

  if (!order) return next(new AppError('Order not found', 404));

  res.status(200).json({ success: true, data: { order } });
});

// ─── DELETE /api/orders/:id ───────────────────────────────────────────────────
/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Cancel a pending order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

  if (!order) return next(new AppError('Order not found', 404));

  if (order.status !== 'PENDING') {
    return next(new AppError(`Cannot cancel an order with status '${order.status}'`, 400));
  }

  order.status = 'CANCELLED';
  await order.save();

  res.status(200).json({ success: true, message: 'Order cancelled successfully', data: { order } });
});
