const express = require('express');
const portfolioController = require('../controllers/portfolioController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Portfolio
 *   description: Portfolio summary and holdings
 */
router.use(protect);

// GET /api/portfolio        — full summary with P&L + enriched holdings
router.get('/', portfolioController.getPortfolio);

// GET /api/portfolio/holdings — holdings list only (lighter payload)
router.get('/holdings', portfolioController.getHoldings);

module.exports = router;
