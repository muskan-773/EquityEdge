const User = require('../models/User');
const Watchlist = require('../models/Watchlist');
const { signToken } = require('../config/jwt');
const catchAsync = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

/**
 * AUTH CONTROLLER
 *
 * Handles: register, login, logout, getMe
 *
 * Controller responsibility: HTTP handling.
 * It reads req, calls models, and writes res.
 * It does NOT contain business logic that belongs in models.
 *
 * Notice: no try/catch here — catchAsync handles that.
 * Notice: no password hashing here — the User model pre-save hook handles that.
 * Notice: no jwt.sign here — the jwt utility handles that.
 * Each function does one thing. This is clean separation.
 */

// ─── Helper: create and send token response ───────────────────────────────────
/**
 * Reused by both register and login.
 * Creates token, formats response, sends to client.
 *
 * Interview Q: "Why extract this as a helper instead of repeating it?"
 * A: DRY (Don't Repeat Yourself). If we later add a cookie strategy
 *    or change the response shape, we change it in ONE place, not two.
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Never send password hash to client
  const userResponse = user.toSafeObject();

  res.status(statusCode).json({
    success: true,
    token,
    data: { user: userResponse },
  });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ritesh Kumar
 *               email:
 *                 type: string
 *                 example: ritesh@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Create user — the pre-save hook in User.js hashes the password
  // If email is duplicate, MongoDB throws error code 11000
  // The errorHandler middleware converts that to a 409 response
  const user = await User.create({ name, email, password });

  // Create an empty watchlist for the new user immediately
  // This ensures GET /api/watchlist never returns "not found" for new users
  await Watchlist.create({ user: user._id, stocks: [] });

  createSendToken(user, 201, res);
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive a JWT token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // ── Step 1: Check email + password provided ─────────────────────────────
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // ── Step 2: Find user by email, explicitly select password ─────────────
  // `select: false` on the password field means we must explicitly ask for it.
  // This is intentional — password is excluded from all other queries.
  const user = await User.findOne({ email }).select('+password');

  // ── Step 3: Verify password ─────────────────────────────────────────────
  // IMPORTANT: We check both "user exists" and "password correct" together
  // in a SINGLE response. If we returned "email not found" and "wrong password"
  // separately, attackers could enumerate valid emails (user enumeration attack).
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  // ── Step 4: Issue token ─────────────────────────────────────────────────
  createSendToken(user, 200, res);
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout (client-side token invalidation)
 *     tags: [Auth]
 */
exports.logout = (req, res) => {
  /**
   * JWT logout explanation for interviews:
   *
   * JWT is stateless — the server doesn't store tokens. There's nothing to
   * "delete" on the server. Logout means the CLIENT removes the token from
   * storage (localStorage/sessionStorage).
   *
   * This endpoint exists to:
   * 1. Give the frontend a consistent API (POST /logout)
   * 2. Signal success so the frontend clears its state
   * 3. In the future, support a token blacklist (Redis set of invalidated tokens)
   *
   * Interview Q: "How do you truly invalidate a JWT?"
   * A: You can't with a stateless JWT alone. Options:
   *    1. Short expiry (15 min) + refresh tokens
   *    2. Token blacklist in Redis (check on every request)
   *    3. Rotate JWT_SECRET (invalidates ALL tokens — nuclear option)
   *    For this project, we use option 1's spirit with 7-day expiry
   *    and client-side deletion.
   */
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please delete your token.',
  });
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Not authenticated
 */
exports.getMe = catchAsync(async (req, res, next) => {
  // req.user is set by the protect middleware — no extra DB query needed
  // User was already fetched in authMiddleware
  res.status(200).json({
    success: true,
    data: { user: req.user.toSafeObject() },
  });
});
