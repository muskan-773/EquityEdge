const { verifyToken } = require('../config/jwt');
const User = require('../models/User');
const catchAsync = require('./asyncHandler');
const { AppError } = require('./errorHandler');

/**
 * AUTHENTICATION MIDDLEWARE
 *
 * This runs BEFORE any protected route handler.
 * It does three things:
 * 1. Extract the token from the Authorization header
 * 2. Verify the token's signature and expiry
 * 3. Find the user and attach to req.user
 *
 * Flow:
 *   Request → authMiddleware → controller (if auth passes)
 *                           → 401 error (if auth fails)
 *
 * Token format in HTTP header:
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * We follow the Bearer token standard (RFC 6750).
 *
 * Interview Q: "Why do you check if the user still exists in the DB?"
 * A: The token contains only a user ID. If an account is deleted after
 *    the token was issued, the token is still mathematically valid —
 *    jwt.verify() would pass. Checking the DB ensures we're not serving
 *    requests for deleted accounts. It's an extra DB query but necessary
 *    for security correctness.
 *
 * Interview Q: "What is the difference between authentication and authorization?"
 * A: Authentication = "who are you?" (verify identity via token/password).
 *    Authorization = "what are you allowed to do?" (can user X access resource Y?).
 *    This middleware handles authentication. An `authorize` middleware (not
 *    needed here since all users have equal permissions) would handle authorization.
 *
 * Interview Q: "Where do you store the JWT on the client?"
 * A: Options are localStorage, sessionStorage, or httpOnly cookies.
 *    localStorage is convenient but vulnerable to XSS attacks.
 *    httpOnly cookies are immune to XSS (JS can't read them) but
 *    vulnerable to CSRF. For this project we use Bearer tokens in
 *    localStorage + axios interceptor, which is the standard React SPA pattern.
 *    In a high-security production system, httpOnly cookies with CSRF tokens
 *    would be the better choice.
 */
const protect = catchAsync(async (req, res, next) => {
  // ── Step 1: Extract token ─────────────────────────────────────────────────
  let token;

  // Standard Bearer token format
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    // Split "Bearer eyJ..." → ["Bearer", "eyJ..."] → take index 1
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to access this route.', 401)
    );
  }

  // ── Step 2: Verify token ──────────────────────────────────────────────────
  // verifyToken throws JsonWebTokenError or TokenExpiredError on failure
  // Both are caught by catchAsync → errorHandler
  const decoded = verifyToken(token);
  // decoded = { id: 'user_object_id', iat: 1234567890, exp: 1235172690 }

  // ── Step 3: Check user still exists ──────────────────────────────────────
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The account belonging to this token no longer exists.', 401)
    );
  }

  // ── Step 4: Attach user to request ───────────────────────────────────────
  // Every downstream controller can now access req.user
  req.user = currentUser;

  next();
});

module.exports = { protect };
