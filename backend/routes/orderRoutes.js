const express = require('express');
const { body } = require('express-validator');
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * All order routes require authentication.
 * router.use(protect) applies the middleware to ALL routes in this file.
 *
 * @swagger
 * tags:
 *   name: Orders
 *   description: Buy/sell order management
 */
router.use(protect);

const placeOrderValidation = [
  body('symbol')
    .trim()
    .notEmpty().withMessage('Stock symbol is required')
    .isLength({ max: 10 }).withMessage('Invalid stock symbol')
    .matches(/^[A-Za-z0-9]+$/).withMessage('Symbol must be alphanumeric'),

  body('orderType')
    .notEmpty().withMessage('Order type is required')
    .isIn(['BUY', 'SELL']).withMessage('Order type must be BUY or SELL'),

  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1 }).withMessage('Quantity must be a positive whole number'),
];

router.post('/', placeOrderValidation, validate, orderController.placeOrder);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.delete('/:id', orderController.cancelOrder);

module.exports = router;
