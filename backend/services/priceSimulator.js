const Stock = require('../models/Stock');

/**
 * PRICE SIMULATOR SERVICE
 *
 * Simulates stock price movement using a Geometric Brownian Motion (GBM)
 * inspired random walk. This is the same mathematical model used in the
 * Black-Scholes options pricing formula.
 *
 * WHY GBM?
 * A simple random walk (price ± random) can go negative. GBM applies
 * the change as a PERCENTAGE of the current price, so prices stay positive
 * and the movement looks more realistic (larger absolute moves for higher
 * priced stocks).
 *
 * Formula:
 *   newPrice = currentPrice × e^(drift + volatility × randomNormal)
 *   Simplified: newPrice = currentPrice × (1 + change%)
 *   where change% is a small random number within ±(volatility × 2%)
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  PriceSimulator                                                     │
 * │    start()                                                          │
 * │      └── setInterval (every TICK_INTERVAL_MS)                       │
 * │            └── updatePrices()                                       │
 * │                  ├── For each stock: generate new price              │
 * │                  ├── stock.updatePrice() — updates in memory         │
 * │                  ├── Stock.bulkWrite() — saves all to DB in 1 op    │
 * │                  └── io.emit('prices:update', allPrices)            │
 * │                        └── All connected clients receive new prices  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * WHY bulkWrite instead of save() in a loop?
 * If we have 20 stocks and call stock.save() 20 times, that's 20 separate
 * MongoDB write operations per tick. bulkWrite batches them into ONE network
 * round-trip. For high-frequency data, this is crucial.
 *
 * WHY emit to ALL clients (broadcast), not per-user?
 * Stock prices are the same for everyone. There's no point in per-user rooms
 * for market data — only for portfolio updates. Broadcast is more efficient.
 *
 * Interview Q: "What is Socket.IO and how is it different from WebSocket?"
 * A: Socket.IO is a library built on top of WebSocket with fallbacks
 *    (long-polling for environments where WebSocket is blocked) and
 *    additional features: rooms, namespaces, automatic reconnection,
 *    event-based API. Native WebSocket is lower-level and requires
 *    implementing these features yourself.
 *
 * Interview Q: "What is the difference between emit and broadcast?"
 * A: io.emit() sends to ALL connected clients.
 *    socket.emit() sends to that specific client only.
 *    socket.broadcast.emit() sends to all EXCEPT that specific client.
 *    io.to(room).emit() sends to all clients in a named room.
 *
 * Interview Q: "How would this scale to thousands of users?"
 * A: Socket.IO supports a Redis adapter. In a multi-server deployment,
 *    the Redis adapter syncs events across server instances via pub/sub.
 *    Without it, each server instance has its own set of connected clients
 *    and they'd receive different price updates. That's a real production
 *    concern worth mentioning.
 */

class PriceSimulator {
  constructor(io) {
    this.io = io;              // Socket.IO server instance
    this.intervalId = null;    // Reference to setInterval (needed to stop it)
    this.TICK_INTERVAL_MS = 5000; // Emit price updates every 5 seconds
    this.MAX_CHANGE_PERCENT = 0.8; // Max ±0.8% change per tick (realistic intraday)
  }

  /**
   * Starts the simulation loop and sets up Socket.IO connection handler.
   */
  start() {
    console.log('Price Simulator: Starting...');

    // Handle client connections
    this.io.on('connection', (socket) => {
      console.log(`Socket.IO: Client connected [${socket.id}]`);

      // Allow clients to join their personal room for portfolio updates
      // Client sends: socket.emit('join', userId)
      socket.on('join', (userId) => {
        if (userId) {
          socket.join(`user:${userId}`);
          console.log(`Socket.IO: User ${userId} joined their room`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`Socket.IO: Client disconnected [${socket.id}]`);
      });
    });

    // Start the price update tick
    this.intervalId = setInterval(() => {
      this.updatePrices();
    }, this.TICK_INTERVAL_MS);

    console.log(
      `Price Simulator: Running. Tick every ${this.TICK_INTERVAL_MS / 1000}s`
    );
  }

  /**
   * Stops the simulation (useful for testing and graceful shutdown)
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Price Simulator: Stopped');
    }
  }

  /**
   * Generates a new price using a simplified random walk.
   * @param {number} currentPrice
   * @returns {number} new price
   */
  generateNewPrice(currentPrice) {
    // Random change between -MAX_CHANGE_PERCENT and +MAX_CHANGE_PERCENT
    // Math.random() returns [0, 1)
    // (Math.random() - 0.5) gives [-0.5, 0.5)
    // Multiply by 2 × MAX_CHANGE_PERCENT gives the full range
    const changePercent =
      (Math.random() - 0.5) * 2 * this.MAX_CHANGE_PERCENT;
    const newPrice = currentPrice * (1 + changePercent / 100);

    // Floor at 1% of original price — prevents stocks from going to near-zero
    return Math.max(newPrice, currentPrice * 0.01);
  }

  /**
   * Fetches all active stocks, generates new prices, saves to DB, emits via Socket.IO.
   * Called on every tick.
   */
  async updatePrices() {
    try {
      const stocks = await Stock.find({ isActive: true });

      if (stocks.length === 0) return;

      // Prepare bulk write operations and price map for Socket.IO emit
      const bulkOps = [];
      const priceUpdates = {};

      for (const stock of stocks) {
        const newPrice = this.generateNewPrice(stock.currentPrice);
        stock.updatePrice(newPrice); // Updates in-memory fields

        priceUpdates[stock.symbol] = {
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          dayChange: stock.dayChange,
          dayChangePercent: stock.dayChangePercent,
          dayHigh: stock.dayHigh,
          dayLow: stock.dayLow,
        };

        // Build bulk update operation — one per stock
        bulkOps.push({
          updateOne: {
            filter: { _id: stock._id },
            update: {
              $set: {
                currentPrice: stock.currentPrice,
                dayChange: stock.dayChange,
                dayChangePercent: stock.dayChangePercent,
                dayHigh: stock.dayHigh,
                dayLow: stock.dayLow,
              },
              $push: {
                // $each + $slice: push new item AND trim array to last 100
                // This is more efficient than push + a separate $pop
                priceHistory: {
                  $each: [{ price: stock.currentPrice, timestamp: new Date() }],
                  $slice: -100, // Keep only the LAST 100 items
                },
              },
            },
          },
        });
      }

      // Execute all updates in a single MongoDB round-trip
      await Stock.bulkWrite(bulkOps, { ordered: false });

      // Broadcast new prices to ALL connected clients
      this.io.emit('prices:update', priceUpdates);
    } catch (error) {
      // Don't crash the server on a tick failure — just log and continue
      console.error('Price Simulator tick error:', error.message);
    }
  }
}

module.exports = PriceSimulator;
