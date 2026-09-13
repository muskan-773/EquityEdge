/**
 * STOCK TESTS
 *
 * Tests for: GET /api/stocks, GET /api/stocks/:symbol, GET /api/stocks/meta/sectors
 *
 * What we verify:
 * - List endpoint returns all active stocks
 * - Search query filters correctly
 * - Sector filter works
 * - Detail endpoint returns priceHistory
 * - 404 on unknown symbol
 * - Inactive stocks are excluded
 * - Routes are public (no auth required)
 */

const request = require('supertest');
const app = require('../app');
const {
  connectTestDB,
  clearTestDB,
  closeTestDB,
  createTestStock,
} = require('./helpers');

beforeAll(async () => {
  await connectTestDB();
  await clearTestDB();

  // Seed test stocks — done once for the whole suite (read-only tests)
  await Promise.all([
    createTestStock({ symbol: 'TCS',    name: 'Tata Consultancy', sector: 'Technology',  currentPrice: 3800, isActive: true  }),
    createTestStock({ symbol: 'INFY',   name: 'Infosys Limited',  sector: 'Technology',  currentPrice: 1480, isActive: true  }),
    createTestStock({ symbol: 'SBIN',   name: 'State Bank',       sector: 'Finance',     currentPrice:  790, isActive: true  }),
    createTestStock({ symbol: 'HIDDEN', name: 'Hidden Corp',      sector: 'Technology',  currentPrice:  100, isActive: false }),
  ]);
});

afterAll(async () => {
  await clearTestDB();
  await closeTestDB();
});

// ── GET /api/stocks ───────────────────────────────────────────────────────────
describe('GET /api/stocks', () => {
  test('returns 200 and list of active stocks only', async () => {
    const res = await request(app).get('/api/stocks');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stocks).toBeDefined();
    // 3 active stocks seeded; HIDDEN should not appear
    expect(res.body.count).toBe(3);
    const symbols = res.body.data.stocks.map((s) => s.symbol);
    expect(symbols).not.toContain('HIDDEN');
  });

  test('is a public endpoint — no auth token required', async () => {
    const res = await request(app).get('/api/stocks');
    expect(res.statusCode).toBe(200);
  });

  test('filters by sector', async () => {
    const res = await request(app).get('/api/stocks?sector=Technology');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.stocks.length).toBe(2);
    res.body.data.stocks.forEach((s) => {
      expect(s.sector).toBe('Technology');
    });
  });

  test('filters by search (symbol match)', async () => {
    const res = await request(app).get('/api/stocks?search=TCS');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.stocks.length).toBe(1);
    expect(res.body.data.stocks[0].symbol).toBe('TCS');
  });

  test('filters by search (name partial match, case-insensitive)', async () => {
    const res = await request(app).get('/api/stocks?search=infosys');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.stocks.length).toBe(1);
    expect(res.body.data.stocks[0].symbol).toBe('INFY');
  });

  test('returns empty array (not 404) when no stocks match search', async () => {
    const res = await request(app).get('/api/stocks?search=ZZZNOMATCH');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.stocks).toHaveLength(0);
  });

  test('does NOT include priceHistory in list response', async () => {
    const res = await request(app).get('/api/stocks');

    const stock = res.body.data.stocks[0];
    // priceHistory is excluded from list via .select('-priceHistory')
    expect(stock.priceHistory).toBeUndefined();
  });
});

// ── GET /api/stocks/:symbol ───────────────────────────────────────────────────
describe('GET /api/stocks/:symbol', () => {
  test('returns 200 + stock details for valid symbol', async () => {
    const res = await request(app).get('/api/stocks/TCS');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stock.symbol).toBe('TCS');
    expect(res.body.data.stock.currentPrice).toBe(3800);
  });

  test('is case-insensitive — /api/stocks/tcs works', async () => {
    const res = await request(app).get('/api/stocks/tcs');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.stock.symbol).toBe('TCS');
  });

  test('returns 404 for unknown symbol', async () => {
    const res = await request(app).get('/api/stocks/XXXX999');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('returns 404 for inactive stock', async () => {
    const res = await request(app).get('/api/stocks/HIDDEN');

    expect(res.statusCode).toBe(404);
  });
});

// ── GET /api/stocks/meta/sectors ─────────────────────────────────────────────
describe('GET /api/stocks/meta/sectors', () => {
  test('returns list of sectors with count', async () => {
    const res = await request(app).get('/api/stocks/meta/sectors');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.sectors)).toBe(true);

    const sectors = res.body.data.sectors.map((s) => s.sector);
    expect(sectors).toContain('Technology');
    expect(sectors).toContain('Finance');
  });

  test('sector counts are correct', async () => {
    const res = await request(app).get('/api/stocks/meta/sectors');

    const techSector = res.body.data.sectors.find((s) => s.sector === 'Technology');
    expect(techSector.count).toBe(2); // TCS + INFY (HIDDEN is inactive)
  });
});
