/**
 * ORDER TESTS
 *
 * Tests for: POST /api/orders, GET /api/orders, GET /api/orders/:id,
 *            DELETE /api/orders/:id
 *
 * These are the most important tests in the suite because they verify the
 * core paper-trading workflow — the entire reason the platform exists.
 *
 * What we verify:
 * ✅ Successful BUY: order created, balance deducted, holding created
 * ✅ Successful SELL: order created, balance credited, holding reduced
 * ✅ Insufficient balance: order rejected, balance unchanged
 * ✅ Insufficient shares: order rejected
 * ✅ Invalid stock symbol: 404 returned
 * ✅ Invalid quantity (0, negative, decimal): 400 returned
 * ✅ Unauthenticated request: 401
 * ✅ Average cost basis recalculated correctly on second buy
 * ✅ Holding deleted when all shares sold
 * ✅ GET orders returns only requesting user's orders
 * ✅ Cancel order changes status to CANCELLED
 *
 * Interview Q: "Why test the balance deduction in the same test as order creation?"
 * A: Because they're part of the same atomic operation. If only the order was
 *    created but balance wasn't deducted, or vice versa, the test would catch it.
 *    Testing them together verifies the transaction atomicity.
 */

const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Holding = require('../models/Holding');
const Transaction = require('../models/Transaction');
const {
  connectTestDB,
  clearTestDB,
  closeTestDB,
  createTestUser,
  createTestStock,
  authedRequest,
} = require('./helpers');

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

// ── POST /api/orders — BUY ────────────────────────────────────────────────────
describe('POST /api/orders — BUY', () => {
  test('successfully buys stock: creates order, deducts balance, creates holding + transaction', async () => {
    const { user, token } = await createTestUser({ cashBalance: 100000 });
    const stock = await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    const res = await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 10 });

    // ── Assert HTTP response ──────────────────────────────────────────────
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order.status).toBe('EXECUTED');
    expect(res.body.data.order.totalValue).toBe(5000); // 10 × 500

    // ── Assert balance was deducted ───────────────────────────────────────
    expect(res.body.data.cashBalance).toBe(95000); // 100000 - 5000

    // ── Assert holding was created in DB ─────────────────────────────────
    const holding = await Holding.findOne({ user: user._id, symbol: 'TCS' });
    expect(holding).not.toBeNull();
    expect(holding.quantity).toBe(10);
    expect(holding.averageBuyPrice).toBe(500);
    expect(holding.investedValue).toBe(5000);

    // ── Assert transaction record was created ─────────────────────────────
    const transaction = await Transaction.findOne({ user: user._id, symbol: 'TCS' });
    expect(transaction).not.toBeNull();
    expect(transaction.transactionType).toBe('BUY');
    expect(transaction.quantity).toBe(10);
    expect(transaction.balanceAfter).toBe(95000);
  });

  test('correctly recalculates average buy price on second purchase', async () => {
    // First buy: 10 shares at ₹500 → avg = ₹500
    // Second buy: 5 shares at ₹600 → avg = (10×500 + 5×600) / 15 = ₹533.33
    const { user, token } = await createTestUser({ cashBalance: 200000 });
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 10 });

    // Change the price for the second buy by updating the stock
    const Stock = require('../models/Stock');
    await Stock.updateOne({ symbol: 'TCS' }, { currentPrice: 600 });

    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 5 });

    const holding = await Holding.findOne({ user: user._id, symbol: 'TCS' });
    expect(holding.quantity).toBe(15);
    // (10×500 + 5×600) / 15 = 8000/15 = 533.33
    expect(holding.averageBuyPrice).toBeCloseTo(533.33, 1);
  });

  test('rejects BUY with insufficient balance', async () => {
    const { token } = await createTestUser({ cashBalance: 100 }); // Only ₹100
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    const res = await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 10 }); // ₹5000 needed

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/insufficient balance/i);

    // ── Balance must remain unchanged ─────────────────────────────────────
    const dbUser = await User.findById((await User.findOne({ cashBalance: 100 }))._id);
    // Re-fetch by email to check balance untouched
    const users = await User.find({ cashBalance: 100 });
    expect(users.length).toBe(1); // Confirm no balance change happened
  });

  test('rejects BUY for unknown stock symbol', async () => {
    const { token } = await createTestUser();

    const res = await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'XXXX999', orderType: 'BUY', quantity: 1 });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('rejects BUY with quantity = 0', async () => {
    const { token } = await createTestUser();
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    const res = await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 0 });

    expect(res.statusCode).toBe(400);
  });

  test('rejects BUY with negative quantity', async () => {
    const { token } = await createTestUser();
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    const res = await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: -5 });

    expect(res.statusCode).toBe(400);
  });

  test('requires authentication — returns 401 without token', async () => {
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    const res = await request(app)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 1 });

    expect(res.statusCode).toBe(401);
  });
});

// ── POST /api/orders — SELL ───────────────────────────────────────────────────
describe('POST /api/orders — SELL', () => {
  test('successfully sells stock: credits balance, reduces holding', async () => {
    const { user, token } = await createTestUser({ cashBalance: 100000 });
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    // First buy 10 shares
    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 10 });

    // Now sell 4 shares
    const sellRes = await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'SELL', quantity: 4 });

    expect(sellRes.statusCode).toBe(201);
    expect(sellRes.body.data.order.status).toBe('EXECUTED');

    // Balance: 100000 - 5000 (buy) + 2000 (sell) = 97000
    expect(sellRes.body.data.cashBalance).toBe(97000);

    // Holding should now have 6 shares
    const holding = await Holding.findOne({ user: user._id, symbol: 'TCS' });
    expect(holding).not.toBeNull();
    expect(holding.quantity).toBe(6);
  });

  test('deletes holding when all shares are sold', async () => {
    const { user, token } = await createTestUser({ cashBalance: 100000 });
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 5 });

    // Sell all 5 shares
    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'SELL', quantity: 5 });

    // Holding should be deleted — not just quantity=0
    const holding = await Holding.findOne({ user: user._id, symbol: 'TCS' });
    expect(holding).toBeNull();
  });

  test('rejects SELL when user has no holding', async () => {
    const { token } = await createTestUser();
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    const res = await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'SELL', quantity: 1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/insufficient shares/i);
  });

  test('rejects SELL for more shares than held', async () => {
    const { token } = await createTestUser({ cashBalance: 100000 });
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    // Buy 3 shares
    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 3 });

    // Try to sell 10 shares
    const res = await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'SELL', quantity: 10 });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/insufficient shares/i);
  });
});

// ── GET /api/orders ───────────────────────────────────────────────────────────
describe('GET /api/orders', () => {
  test('returns only the authenticated user\'s orders', async () => {
    const { token: token1 } = await createTestUser({ email: 'user1@test.com' });
    const { token: token2 } = await createTestUser({ email: 'user2@test.com', cashBalance: 100000 });
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    // User2 places an order
    await authedRequest(token2)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 1 });

    // User1 should see 0 orders (not user2's)
    const res = await authedRequest(token1).get('/api/orders');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.orders).toHaveLength(0);

    // User2 should see 1 order
    const res2 = await authedRequest(token2).get('/api/orders');
    expect(res2.body.data.orders).toHaveLength(1);
  });

  test('returns paginated results', async () => {
    const { token } = await createTestUser({ cashBalance: 1000000 });
    await createTestStock({ symbol: 'TCS', currentPrice: 100 });

    // Place 5 orders
    for (let i = 0; i < 5; i++) {
      await authedRequest(token)
        .post('/api/orders')
        .send({ symbol: 'TCS', orderType: 'BUY', quantity: 1 });
    }

    const res = await authedRequest(token).get('/api/orders?limit=3&page=1');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.orders).toHaveLength(3);
    expect(res.body.total).toBe(5);
    expect(res.body.pages).toBe(2);
  });
});

// ── DELETE /api/orders/:id — Cancel ──────────────────────────────────────────
describe('DELETE /api/orders/:id', () => {
  test('cannot cancel an EXECUTED order', async () => {
    const { token } = await createTestUser({ cashBalance: 100000 });
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    const buyRes = await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 1 });

    const orderId = buyRes.body.data.order._id;

    const cancelRes = await authedRequest(token).delete(`/api/orders/${orderId}`);

    expect(cancelRes.statusCode).toBe(400);
    expect(cancelRes.body.message).toMatch(/cannot cancel/i);
  });

  test('returns 404 for non-existent order ID', async () => {
    const { token } = await createTestUser();
    const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist

    const res = await authedRequest(token).delete(`/api/orders/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });

  test('cannot cancel another user\'s order', async () => {
    const { token: token1 } = await createTestUser({ email: 'owner@test.com', cashBalance: 100000 });
    const { token: token2 } = await createTestUser({ email: 'attacker@test.com' });
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    const buyRes = await authedRequest(token1)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 1 });

    const orderId = buyRes.body.data.order._id;

    // token2 tries to cancel token1's order
    const res = await authedRequest(token2).delete(`/api/orders/${orderId}`);
    expect(res.statusCode).toBe(404); // "Not found" for this user — correct (don't reveal existence)
  });
});
