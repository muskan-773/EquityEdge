const express = require('express');
const stockController = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * STOCK ROUTES
 *
 * Design decision: Stock listing (GET /api/stocks) is PUBLIC.
 * Why? A market page that requires login to just view prices creates
 * unnecessary friction. Users should be able to browse stocks before deciding
 * to sign up. Authentication is only required for trading actions.
 *
 * Individual stock detail is also public for the same reason.
 *
 * @swagger
 * tags:
 *   name: Stocks
 *   description: Stock market data (simulated)
 */

// Public routes — no authentication required
router.get('/', stockController.getAllStocks);
router.get('/meta/sectors', stockController.getSectors);

// Route ordering matters in Express:
// /meta/sectors must be defined BEFORE /:symbol
// Otherwise Express would try to find a stock with symbol "meta"
// and then try to find "sectors" as a sub-path of that route.
router.get('/:symbol', stockController.getStockBySymbol);

module.exports = router;
