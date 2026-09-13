/**
 * STOCK SEED SCRIPT
 *
 * Usage:  node scripts/seedStocks.js
 * or:     npm run seed
 *
 * This script:
 * 1. Connects to MongoDB
 * 2. Deletes all existing stocks (idempotent — safe to re-run)
 * 3. Inserts 20 realistic Indian large-cap stocks
 * 4. Disconnects and exits
 *
 * Why seed data matters for a demo:
 * Without real market data (which requires paid APIs like NSE data feed),
 * we need realistic starting prices so the simulation looks credible.
 * All prices approximate real values as of 2024 for familiarity.
 *
 * DISCLAIMER: These are SIMULATED prices for educational/paper-trading use only.
 * They are NOT real-time market data.
 *
 * Interview Q: "How would you use real market data in production?"
 * A: NSE India provides a data feed via NSEBIZ or vendors like Refinitiv.
 *    Alternatively, Yahoo Finance API or Alpha Vantage (free tier) could
 *    be used. The architecture wouldn't change — only the data source for
 *    the price simulator would swap from random walk to API polling.
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

// When running as a script, resolve .env from the parent directory
// If that fails, try loading from current directory
if (!process.env.MONGO_URI) {
  require('dotenv').config();
}

const Stock = require('../models/Stock');

// ─── Stock Data ───────────────────────────────────────────────────────────────
const stocksData = [
  // ── Technology ──────────────────────────────────────────────────────────────
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    currentPrice: 3842.50,
    previousClose: 3810.00,
    sector: 'Technology',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'INFY',
    name: 'Infosys Limited',
    currentPrice: 1478.30,
    previousClose: 1492.00,
    sector: 'Technology',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'WIPRO',
    name: 'Wipro Limited',
    currentPrice: 462.80,
    previousClose: 458.50,
    sector: 'Technology',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'HCLTECH',
    name: 'HCL Technologies',
    currentPrice: 1632.10,
    previousClose: 1618.75,
    sector: 'Technology',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'TECHM',
    name: 'Tech Mahindra',
    currentPrice: 1289.45,
    previousClose: 1274.20,
    sector: 'Technology',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },

  // ── Finance ──────────────────────────────────────────────────────────────────
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Limited',
    currentPrice: 1598.75,
    previousClose: 1612.30,
    sector: 'Finance',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Limited',
    currentPrice: 1074.20,
    previousClose: 1058.90,
    sector: 'Finance',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    currentPrice: 788.45,
    previousClose: 794.80,
    sector: 'Finance',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'KOTAKBANK',
    name: 'Kotak Mahindra Bank',
    currentPrice: 1742.60,
    previousClose: 1728.35,
    sector: 'Finance',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'AXISBANK',
    name: 'Axis Bank Limited',
    currentPrice: 1089.30,
    previousClose: 1076.15,
    sector: 'Finance',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },

  // ── Consumer Goods / FMCG ───────────────────────────────────────────────────
  {
    symbol: 'HINDUNILVR',
    name: 'Hindustan Unilever',
    currentPrice: 2387.90,
    previousClose: 2362.40,
    sector: 'FMCG',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'ITC',
    name: 'ITC Limited',
    currentPrice: 432.15,
    previousClose: 428.70,
    sector: 'FMCG',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },

  // ── Automobile ───────────────────────────────────────────────────────────────
  {
    symbol: 'MARUTI',
    name: 'Maruti Suzuki India',
    currentPrice: 12458.00,
    previousClose: 12302.50,
    sector: 'Automobile',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Limited',
    currentPrice: 978.30,
    previousClose: 962.45,
    sector: 'Automobile',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },

  // ── Energy ───────────────────────────────────────────────────────────────────
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    currentPrice: 2847.65,
    previousClose: 2823.90,
    sector: 'Energy',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'ONGC',
    name: 'Oil & Natural Gas Corp',
    currentPrice: 268.40,
    previousClose: 272.15,
    sector: 'Energy',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },

  // ── Healthcare ───────────────────────────────────────────────────────────────
  {
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical',
    currentPrice: 1624.80,
    previousClose: 1608.35,
    sector: 'Healthcare',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
  {
    symbol: 'DRREDDY',
    name: "Dr. Reddy's Laboratories",
    currentPrice: 5892.50,
    previousClose: 5847.20,
    sector: 'Healthcare',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },

  // ── Telecom ──────────────────────────────────────────────────────────────────
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Limited',
    currentPrice: 1432.70,
    previousClose: 1418.90,
    sector: 'Telecom',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },

  // ── Metals ───────────────────────────────────────────────────────────────────
  {
    symbol: 'TATASTEEL',
    name: 'Tata Steel Limited',
    currentPrice: 162.45,
    previousClose: 165.80,
    sector: 'Metals',
    exchange: 'NSE',
    marketCap: 'Large Cap',
  },
];

// ─── Seed Function ────────────────────────────────────────────────────────────
const seedStocks = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Delete existing stocks (idempotent — safe to re-run)
    const deleted = await Stock.deleteMany({});
    console.log(`✓ Cleared ${deleted.deletedCount} existing stocks`);

    // Process each stock: calculate initial day stats and add a starting
    // price history point so the chart has at least one data point
    const processedStocks = stocksData.map((stock) => {
      const dayChange = parseFloat(
        (stock.currentPrice - stock.previousClose).toFixed(2)
      );
      const dayChangePercent = parseFloat(
        ((dayChange / stock.previousClose) * 100).toFixed(2)
      );

      return {
        ...stock,
        dayChange,
        dayChangePercent,
        dayHigh: stock.currentPrice,
        dayLow: stock.currentPrice,
        volume: Math.floor(Math.random() * 5000000) + 500000, // Simulated volume
        priceHistory: [{ price: stock.previousClose, timestamp: new Date(Date.now() - 86400000) },
                       { price: stock.currentPrice, timestamp: new Date() }],
      };
    });

    const inserted = await Stock.insertMany(processedStocks);
    console.log(`✓ Inserted ${inserted.length} stocks`);

    // Print summary
    console.log('\nSeeded stocks:');
    inserted.forEach((s) => {
      const sign = s.dayChange >= 0 ? '+' : '';
      console.log(
        `  ${s.symbol.padEnd(12)} ₹${s.currentPrice.toFixed(2).padStart(10)}  ${sign}${s.dayChangePercent.toFixed(2)}%`
      );
    });

    console.log('\n✓ Seed complete');
  } catch (error) {
    console.error('✗ Seed failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
    process.exit(0);
  }
};

seedStocks();
