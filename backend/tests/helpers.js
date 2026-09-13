/**
 * TEST HELPERS
 *
 * Shared utilities used across all test suites.
 * Centralising them here prevents duplication and makes
 * tests easier to read — the "arrange" step is one line.
 */

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Stock = require('../models/Stock');
const Watchlist = require('../models/Watchlist');

// ── DB lifecycle helpers ──────────────────────────────────────────────────────

/**
 * Connect to the test database.
 * Call in beforeAll() of each test suite.
 */
const connectTestDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
};

/**
 * Drop all collections to reset state between tests.
 * Call in beforeEach() for full isolation, or in afterAll() for speed.
 *
 * Interview Q: "Why drop collections instead of dropping the database?"
 * A: Dropping the DB also removes indexes which Mongoose would recreate
 *    on next connection. Dropping collections is faster and preserves
 *    the index definitions that Mongoose creates at startup.
 */
const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}))
  );
};

/**
 * Disconnect cleanly after all tests in a suite.
 * Call in afterAll().
 */
const closeTestDB = async () => {
  await mongoose.connection.close();
};

// ── Data factories ────────────────────────────────────────────────────────────

/**
 * Creates a registered user directly in the DB and returns
 * { user, token } ready to use in tests.
 *
 * Using the API route (POST /auth/register) for registration tests,
 * but the factory for all other tests where the user is just a fixture.
 */
const createTestUser = async (overrides = {}) => {
  const { signToken } = require('../config/jwt');

  const userData = {
    name: overrides.name || 'Test User',
    email: overrides.email || 'test@equityedge.com',
    password: overrides.password || 'Password1',
    cashBalance: overrides.cashBalance !== undefined ? overrides.cashBalance : 1000000,
  };

  const user = await User.create(userData);
  await Watchlist.create({ user: user._id, stocks: [] });

  const token = signToken(user._id);
  return { user, token };
};

/**
 * Creates a test stock directly in the DB.
 */
const createTestStock = async (overrides = {}) => {
  const stockData = {
    symbol: overrides.symbol || 'TESTCO',
    name: overrides.name || 'Test Company Limited',
    currentPrice: overrides.currentPrice || 500,
    previousClose: overrides.previousClose || 490,
    dayChange: overrides.dayChange || 10,
    dayChangePercent: overrides.dayChangePercent || 2.04,
    sector: overrides.sector || 'Technology',
    exchange: 'NSE',
    marketCap: 'Large Cap',
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
  };

  return Stock.create(stockData);
};

// ── Request helper ────────────────────────────────────────────────────────────

/**
 * Authenticated supertest request factory.
 * Usage: authedRequest(token).get('/api/portfolio')
 */
const authedRequest = (token) => {
  return {
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
    put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  };
};

module.exports = {
  connectTestDB,
  clearTestDB,
  closeTestDB,
  createTestUser,
  createTestStock,
  authedRequest,
};
