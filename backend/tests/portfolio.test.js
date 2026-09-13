/**
 * PORTFOLIO TESTS
 *
 * Tests for: GET /api/portfolio, GET /api/portfolio/holdings
 *
 * What we verify:
 * ✅ Empty portfolio returns zeros (no error)
 * ✅ Portfolio summary calculations are correct
 * ✅ investedValue, currentValue, P&L are computed accurately
 * ✅ Multiple holdings are all included
 * ✅ cashBalance reflects the user's real balance
 * ✅ Holdings endpoint returns enriched data (currentPrice, P&L)
 * ✅ Authentication is required
 *
 * Calculation logic we're testing (from portfolioController.js):
 *   investedValue = averageBuyPrice × quantity
 *   currentValue  = currentPrice × quantity
 *   profitLoss    = currentValue - investedValue
 *   totalPLPercent = (profitLoss / investedValue) × 100
 */

const request = require('supertest');
const app = require('../app');
const Stock = require('../models/Stock');
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

// ── GET /api/portfolio ────────────────────────────────────────────────────────
describe('GET /api/portfolio', () => {
  test('requires authentication', async () => {
    const res = await request(app).get('/api/portfolio');
    expect(res.statusCode).toBe(401);
  });

  test('returns zero values for a fresh user with no holdings', async () => {
    const { token } = await createTestUser({ cashBalance: 1000000 });

    const res = await authedRequest(token).get('/api/portfolio');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.cashBalance).toBe(1000000);
    expect(res.body.data.summary.investedValue).toBe(0);
    expect(res.body.data.summary.currentValue).toBe(0);
    expect(res.body.data.summary.totalProfitLoss).toBe(0);
    expect(res.body.data.summary.holdingsCount).toBe(0);
    expect(res.body.data.holdings).toHaveLength(0);
  });

  test('correctly calculates portfolio values after a buy', async () => {
    const { token } = await createTestUser({ cashBalance: 100000 });
    await createTestStock({ symbol: 'TCS', currentPrice: 500, previousClose: 490 });

    // Buy 10 shares at ₹500
    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 10 });

    const res = await authedRequest(token).get('/api/portfolio');

    expect(res.statusCode).toBe(200);
    const summary = res.body.data.summary;

    // cashBalance = 100000 - (10 × 500) = 95000
    expect(summary.cashBalance).toBe(95000);

    // investedValue = 10 × 500 = 5000
    expect(summary.investedValue).toBe(5000);

    // currentValue = 10 × currentPrice (should be 500 as we seeded it)
    expect(summary.currentValue).toBe(5000);

    // totalPortfolioValue = cashBalance + currentValue = 95000 + 5000 = 100000
    expect(summary.totalPortfolioValue).toBe(100000);

    // holdingsCount = 1 stock
    expect(summary.holdingsCount).toBe(1);
  });

  test('calculates P&L correctly when current price differs from buy price', async () => {
    const { token } = await createTestUser({ cashBalance: 100000 });
    await createTestStock({ symbol: 'TCS', currentPrice: 500, previousClose: 490 });

    // Buy 10 shares at ₹500
    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 10 });

    // Simulate price moving to ₹550 (10% gain)
    await Stock.updateOne({ symbol: 'TCS' }, { currentPrice: 550 });

    const res = await authedRequest(token).get('/api/portfolio');
    const summary = res.body.data.summary;

    // investedValue = 10 × 500 = 5000 (buy price, unchanged)
    expect(summary.investedValue).toBe(5000);

    // currentValue = 10 × 550 = 5500
    expect(summary.currentValue).toBe(5500);

    // totalProfitLoss = 5500 - 5000 = +500
    expect(summary.totalProfitLoss).toBe(500);

    // totalPLPercent = (500 / 5000) × 100 = 10%
    expect(summary.totalPLPercent).toBeCloseTo(10, 1);
  });

  test('sums values across multiple holdings', async () => {
    const { token } = await createTestUser({ cashBalance: 200000 });
    await createTestStock({ symbol: 'TCS',  currentPrice: 1000 });
    await createTestStock({ symbol: 'INFY', currentPrice: 500  });

    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 5 }); // ₹5000

    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'INFY', orderType: 'BUY', quantity: 10 }); // ₹5000

    const res = await authedRequest(token).get('/api/portfolio');
    const summary = res.body.data.summary;

    expect(summary.holdingsCount).toBe(2);
    expect(summary.investedValue).toBe(10000); // 5000 + 5000
    expect(summary.cashBalance).toBe(190000);  // 200000 - 10000
  });
});

// ── GET /api/portfolio/holdings ───────────────────────────────────────────────
describe('GET /api/portfolio/holdings', () => {
  test('returns empty array when user has no holdings', async () => {
    const { token } = await createTestUser();

    const res = await authedRequest(token).get('/api/portfolio/holdings');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.holdings).toHaveLength(0);
    expect(res.body.count).toBe(0);
  });

  test('enriches holdings with currentPrice and P&L from stock data', async () => {
    const { token } = await createTestUser({ cashBalance: 100000 });
    await createTestStock({ symbol: 'TCS', currentPrice: 500 });

    await authedRequest(token)
      .post('/api/orders')
      .send({ symbol: 'TCS', orderType: 'BUY', quantity: 10 });

    // Simulate price increase
    await Stock.updateOne({ symbol: 'TCS' }, { currentPrice: 600 });

    const res = await authedRequest(token).get('/api/portfolio/holdings');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.holdings).toHaveLength(1);

    const holding = res.body.data.holdings[0];
    expect(holding.symbol).toBe('TCS');
    expect(holding.quantity).toBe(10);
    expect(holding.averageBuyPrice).toBe(500);
    expect(holding.currentPrice).toBe(600);
    expect(holding.currentValue).toBe(6000);     // 10 × 600
    expect(holding.profitLoss).toBe(1000);        // (600-500) × 10
    expect(holding.profitLossPercent).toBe(20);   // 1000/5000 × 100
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/portfolio/holdings');
    expect(res.statusCode).toBe(401);
  });
});
