const express = require('express');
const { body } = require('express-validator');
const watchlistController = require('../controllers/watchlistController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Watchlist
 *   description: User's stock watchlist
 */
router.use(protect);

const addToWatchlistValidation = [
  body('symbol')
    .trim()
    .notEmpty().withMessage('Stock symbol is required')
    .isLength({ max: 10 }).withMessage('Invalid stock symbol'),
];

router.get('/', watchlistController.getWatchlist);
router.post('/', addToWatchlistValidation, validate, watchlistController.addToWatchlist);
router.delete('/:symbol', watchlistController.removeFromWatchlist);

module.exports = router;
