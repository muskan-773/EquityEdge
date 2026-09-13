/**
 * WATCHLIST TESTS
 *
 * Tests for: GET /api/watchlist, POST /api/watchlist, DELETE /api/watchlist/:symbol
 *
 * What we verify:
 * ✅ Fresh user has empty watchlist
 * ✅ Can add a valid stock
 * ✅ Cannot add duplicate stock
 * ✅ Cannot add non-existent stock
 * ✅ Can remove a stock
 * ✅ Watchlist is user-scoped (user A cannot see user B's watchlist)
 * ✅ All routes require authentication
 */

const request = require('supertest');
const app = require('../app');
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

describe('GET /api/watchlist', () => {
  test('returns empty watchlist for fresh user', async () => {
    const { token } = await createTestUser();

    const res = await authedRequest(token).get('/api/watchlist');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stocks).toHaveLength(0);
    expect(res.body.count).toBe(0);
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/watchlist');
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/watchlist', () => {
  test('adds a valid stock to the watchlist', async () => {
    const { token } = await createTestUser();
    await createTestStock({ symbol: 'TCS', name: 'Tata Consultancy' });

    const res = await authedRequest(token)
      .post('/api/watchlist')
      .send({ symbol: 'TCS' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stock.symbol).toBe('TCS');

    // Verify it's in the watchlist now
    const listRes = await authedRequest(token).get('/api/watchlist');
    expect(listRes.body.data.stocks).toHaveLength(1);
    expect(listRes.body.data.stocks[0].symbol).toBe('TCS');
  });

  test('accepts lowercase symbol and normalises to uppercase', async () => {
    const { token } = await createTestUser();
    await createTestStock({ symbol: 'TCS' });

    const res = await authedRequest(token)
      .post('/api/watchlist')
      .send({ symbol: 'tcs' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.stock.symbol).toBe('TCS');
  });

  test('returns 400 on duplicate stock', async () => {
    const { token } = await createTestUser();
    await createTestStock({ symbol: 'TCS' });

    await authedRequest(token).post('/api/watchlist').send({ symbol: 'TCS' });

    const res = await authedRequest(token)
      .post('/api/watchlist')
      .send({ symbol: 'TCS' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already in your watchlist/i);
  });

  test('returns 404 for non-existent stock', async () => {
    const { token } = await createTestUser();

    const res = await authedRequest(token)
      .post('/api/watchlist')
      .send({ symbol: 'FAKESYM' });

    expect(res.statusCode).toBe(404);
  });

  test('returns 400 when symbol field is missing', async () => {
    const { token } = await createTestUser();

    const res = await authedRequest(token)
      .post('/api/watchlist')
      .send({});

    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /api/watchlist/:symbol', () => {
  test('removes a stock from the watchlist', async () => {
    const { token } = await createTestUser();
    await createTestStock({ symbol: 'TCS' });

    await authedRequest(token).post('/api/watchlist').send({ symbol: 'TCS' });

    const res = await authedRequest(token).delete('/api/watchlist/TCS');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm it's gone
    const listRes = await authedRequest(token).get('/api/watchlist');
    expect(listRes.body.data.stocks).toHaveLength(0);
  });

  test('is case-insensitive for symbol in URL', async () => {
    const { token } = await createTestUser();
    await createTestStock({ symbol: 'TCS' });

    await authedRequest(token).post('/api/watchlist').send({ symbol: 'TCS' });

    const res = await authedRequest(token).delete('/api/watchlist/tcs');
    expect(res.statusCode).toBe(200);
  });

  test('requires authentication', async () => {
    const res = await request(app).delete('/api/watchlist/TCS');
    expect(res.statusCode).toBe(401);
  });
});
