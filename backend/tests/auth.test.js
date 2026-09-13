/**
 * AUTH TESTS
 *
 * Tests for: POST /api/auth/register, POST /api/auth/login,
 *            POST /api/auth/logout, GET /api/auth/me
 *
 * What we verify:
 * - Successful registration returns 201 + token + user (no password)
 * - Duplicate email returns 409
 * - Missing/invalid fields return 400 with errors array
 * - Successful login returns 200 + token
 * - Wrong password returns 401
 * - Protected routes reject missing tokens (401)
 * - Protected routes reject tampered tokens (401)
 * - GET /me returns the authenticated user
 *
 * Tools:
 * - supertest: makes real HTTP requests against our Express app
 * - jest: test runner, assertions (expect)
 *
 * Pattern: AAA — Arrange, Act, Assert
 */

const request = require('supertest');
const app = require('../app');
const {
  connectTestDB,
  clearTestDB,
  closeTestDB,
  createTestUser,
  authedRequest,
} = require('./helpers');

// ── Lifecycle ─────────────────────────────────────────────────────────────────
beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  await clearTestDB(); // Fresh slate for every test — full isolation
});

afterAll(async () => {
  await closeTestDB();
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  const validUser = {
    name: 'Ritesh Kumar',
    email: 'ritesh@test.com',
    password: 'Password1',
  };

  test('registers a new user and returns 201 + token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.data.user.email).toBe(validUser.email.toLowerCase());
    expect(res.body.data.user.name).toBe(validUser.name);
  });

  test('does NOT return password hash in response', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser);

    expect(res.body.data.user.password).toBeUndefined();
  });

  test('new user starts with cashBalance = 1000000', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser);

    expect(res.body.data.user.cashBalance).toBe(1000000);
  });

  test('returns 409 on duplicate email', async () => {
    // Register once
    await request(app).post('/api/auth/register').send(validUser);

    // Register again with same email
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already taken/i);
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: 'Password1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('name');
  });

  test('returns 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'Password1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
  });

  test('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: 'Ab1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  test('returns 400 when password has no uppercase/number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: 'alllowercase' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Register a user to log in as
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Login Test', email: 'login@test.com', password: 'Password1' });
  });

  test('returns 200 + token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'Password1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.data.user.email).toBe('login@test.com');
  });

  test('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'WrongPassword1' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    // Should NOT reveal which field was wrong (prevents user enumeration)
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('returns 401 on non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Password1' });

    expect(res.statusCode).toBe(401);
    // Same generic message — cannot tell if email exists
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Password1' });

    expect(res.statusCode).toBe(400);
  });
});

// ── GET /api/auth/me (Protected Route) ───────────────────────────────────────
describe('GET /api/auth/me', () => {
  test('returns 200 + user data with valid token', async () => {
    const { token } = await createTestUser({ email: 'me@test.com' });

    const res = await authedRequest(token).get('/api/auth/me');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('me@test.com');
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 with tampered/invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt');

    expect(res.statusCode).toBe(401);
  });

  test('returns 401 with malformed Bearer header', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'NotBearer sometoken');

    expect(res.statusCode).toBe(401);
  });
});
