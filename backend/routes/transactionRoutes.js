const express = require('express');
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Immutable trade history
 */
router.use(protect);

router.get('/', transactionController.getTransactions);

module.exports = router;
