/**
 * SERVER ENTRY POINT — server.js
 *
 * Responsibilities (only):
 * 1. Load environment variables
 * 2. Connect to MongoDB
 * 3. Create the HTTP server around the Express app
 * 4. Attach Socket.IO
 * 5. Start listening on PORT
 * 6. Start the price simulator
 *
 * The Express app config lives in app.js.
 * Tests import app.js — they never touch this file.
 */

require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const app = require('./app');
const PriceSimulator = require('./services/priceSimulator');

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ── HTTP server + Socket.IO ───────────────────────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.DASHBOARD_URL || 'http://localhost:3001',
    ],
    methods: ['GET', 'POST'],
  },
});

// Inject io into Express so controllers can emit events
app.set('io', io);

// ── Start listening ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   EquityEdge API Server                  ║
  ║   Running on port: ${PORT}                  ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}        ║
  ║   Docs: http://localhost:${PORT}/api/docs  ║
  ╚══════════════════════════════════════════╝
  `);

  const simulator = new PriceSimulator(io);
  simulator.start();
});
