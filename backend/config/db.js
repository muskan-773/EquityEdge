const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGO_URI environment variable.
 *
 * Why async/await here?
 * mongoose.connect() returns a Promise. Using async/await makes
 * the error handling predictable and the code readable.
 *
 * Why process.exit(1) on failure?
 * If the database is unreachable at startup, the entire server is
 * useless — it cannot serve any data-dependent request. Failing fast
 * is safer than letting the server run in a broken state.
 *
 * Interview Q: "What happens if MongoDB goes down while the server is running?"
 * A: Mongoose has a built-in connection pool. It will automatically
 * attempt to reconnect with exponential backoff. You can listen to
 * the 'disconnected' and 'reconnected' events to log or alert.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options are defaults in Mongoose 8.x, but explicit is better
      // for clarity and future-proofing
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Exit with failure code — Node.js convention: 0 = success, 1 = failure
    process.exit(1);
  }
};

module.exports = connectDB;
