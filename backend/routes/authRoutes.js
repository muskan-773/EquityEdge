const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * AUTH ROUTES
 *
 * Route design:
 * - Routes are thin: they define the URL, HTTP method, validation rules,
 *   and which controller function handles the request.
 * - All logic is in controllers. Routes are pure routing configuration.
 *
 * Validation rules are defined HERE (in routes) not in controllers.
 * Why? The route is the API contract. Defining validation at the route
 * level makes it clear what inputs this endpoint accepts.
 *
 * @swagger
 * tags:
 *   name: Auth
 *   description: User registration, login, and profile
 */

// ─── Validation rule sets ─────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(), // Converts "User@Example.COM" → "user@example.com"

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', registerValidation, validate, authController.register);

// POST /api/auth/login
router.post('/login', loginValidation, validate, authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me — protected route (requires valid JWT)
router.get('/me', protect, authController.getMe);

module.exports = router;
