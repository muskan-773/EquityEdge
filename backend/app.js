/**
 * EXPRESS APPLICATION FACTORY — app.js
 *
 * This file configures and exports the Express app WITHOUT starting
 * an HTTP server or connecting to MongoDB.
 *
 * WHY SEPARATE app.js FROM server.js?
 * This is the most important architectural decision for testability.
 *
 * server.js  = starts the HTTP server, connects DB, starts simulator
 * app.js     = configures Express middleware and routes only
 *
 * Tests do:  const app = require('./app')  → supertest wraps it, no port needed
 * Production does: require('./server')     → starts everything
 *
 * Interview Q: "How do you test an Express app without starting a server?"
 * A: supertest can wrap an Express app directly without calling .listen().
 *    It internally creates a temporary server bound to a random port for the
 *    duration of each request, then closes it. To make this work, the app
 *    config (middleware, routes) must be exportable without side effects like
 *    server.listen() or database connections. Separating app.js achieves this.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const stockRoutes = require('./routes/stockRoutes');
const orderRoutes = require('./routes/orderRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');
const { swaggerUi, swaggerSpec } = require('./config/swagger');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.DASHBOARD_URL || 'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting (disabled in test environment) ──────────────────────────────
/**
 * Why skip rate limiting in tests?
 * Tests make many rapid requests from the same IP — they SHOULD hit 429
 * if rate limiting is on, which would mask the actual behaviour we're testing.
 * Rate limiting is a production/staging concern, not a unit test concern.
 *
 * In CI, you can set NODE_ENV=test to automatically disable it.
 */
if (process.env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' },
  });

  app.use('/api', limiter);
  app.use('/api/auth', authLimiter);
}

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ── NoSQL injection prevention ────────────────────────────────────────────────
app.use(mongoSanitize());

// ── HTTP logging (not in test — keeps test output clean) ─────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/stocks',       stockRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/portfolio',    portfolioRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/watchlist',    watchlistRoutes);

// ── Swagger docs ──────────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EquityEdge API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── 404 catch-all ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ── Centralised error handler (MUST be last) ─────────────────────────────────
app.use(errorHandler);

module.exports = app;
