/**
 * TEST SETUP FILE
 *
 * This file runs once before all test suites (configured in package.json jest config).
 *
 * What it does:
 * 1. Loads .env.test environment variables
 * 2. Sets NODE_ENV = 'test' (disables morgan logging in server.js)
 *
 * Why a separate test DB?
 * Tests create and delete real documents. If we used the dev DB,
 * tests would pollute development data and tests could fail
 * depending on the state of dev data. Isolation is essential.
 *
 * Each test file connects/disconnects its own mongoose connection
 * using beforeAll/afterAll. We don't do it globally here because
 * jest --runInBand runs suites sequentially — each suite manages
 * its own connection lifecycle cleanly.
 *
 * Interview Q: "How do you isolate test data from dev data?"
 * A: Use a separate MongoDB database for tests. Set MONGO_URI_TEST
 *    in .env.test, connect in beforeAll, drop all collections in
 *    beforeEach (for test isolation), disconnect in afterAll.
 *    With --runInBand, tests run serially so there's no race condition
 *    on the shared test DB connection.
 */

// Load test-specific env file if it exists; fall back to .env
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
// Fallback to main .env if .env.test doesn't exist
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

// Force test environment — suppresses morgan, changes error verbosity
process.env.NODE_ENV = 'test';

// Use a dedicated test database to avoid polluting dev data
// Override MONGO_URI with test DB name
if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('_test')) {
  process.env.MONGO_URI = process.env.MONGO_URI.replace(
    /\/(\w+)(\?|$)/,
    '/equityedge_test$2'
  );
}
