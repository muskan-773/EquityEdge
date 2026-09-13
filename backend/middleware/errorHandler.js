/**
 * CENTRALIZED ERROR HANDLING
 *
 * Architecture: Every controller wraps logic in try/catch and calls next(error).
 * This single middleware handles ALL errors in one place.
 *
 * Why centralized error handling?
 * Without it, every controller does its own res.status(500).json({ message: err.message }).
 * That's:
 * 1. Duplicated code across every controller
 * 2. Inconsistent response shapes (some return { message }, others return { error })
 * 3. Risk of leaking stack traces to clients in production
 *
 * With centralized handling:
 * - ONE place to change response format
 * - ONE place to add logging
 * - Guaranteed consistent JSON shape for every error
 * - Stack traces hidden in production
 *
 * Response shape (always):
 * { success: false, message: "...", errors: [...] }
 *
 * Interview Q: "How does Express know this is an error handler?"
 * A: Express identifies error-handling middleware by the FOUR-argument
 *    signature: (err, req, res, next). Regular middleware has three.
 *    Express routes errors to the nearest error handler downstream.
 *
 * Interview Q: "What is the difference between operational and programming errors?"
 * A: Operational errors are expected failures: invalid input, not found,
 *    unauthorized. isOperational=true on AppError. Programming errors are
 *    bugs: null reference, type errors. We handle them differently —
 *    programming errors might warrant a restart (process.exit) in production.
 */

class AppError extends Error {
  /**
   * AppError wraps operational errors with an HTTP status code.
   * Instead of: res.status(404).json({ message: 'Stock not found' })
   * We do:     throw new AppError('Stock not found', 404)
   * And the centralized handler formats the response.
   *
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);                  // Sets this.message
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;       // Flag: this is an expected error, not a bug

    // Captures the call stack without including this constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handles Mongoose CastError (invalid ObjectId format)
 * e.g., GET /api/orders/not-a-valid-id
 * Mongoose throws CastError: Cast to ObjectId failed for value "not-a-valid-id"
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handles Mongoose duplicate key error (code 11000)
 * e.g., registering with an email that already exists
 * MongoDB throws: E11000 duplicate key error collection: users index: email_1
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `${field} '${value}' is already taken. Please use a different value.`;
  return new AppError(message, 409); // 409 Conflict
};

/**
 * Handles Mongoose validation errors
 * e.g., saving a User without a required field
 * Mongoose throws ValidationError with multiple sub-errors
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handles invalid JWT signature
 * e.g., token was tampered with
 */
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

/**
 * Handles expired JWT
 * e.g., token is older than JWT_EXPIRES_IN
 */
const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please log in again.', 401);

// ─── Main Error Handler Middleware ────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status code set
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    // In development: send full error details including stack trace
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  // In production: handle specific error types cleanly
  let error = { ...err, message: err.message };

  // Mongoose: invalid ObjectId (e.g., /api/orders/abc123xyz)
  if (err.name === 'CastError') error = handleCastErrorDB(err);

  // MongoDB: duplicate key (e.g., duplicate email on register)
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);

  // Mongoose: validation failed (e.g., missing required field)
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);

  // JWT: bad signature
  if (err.name === 'JsonWebTokenError') error = handleJWTError();

  // JWT: expired token
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Operational errors (AppError): send the message to client
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // Programming or unknown errors: don't leak error details
  // Log it server-side, send generic message to client
  console.error('PROGRAMMING ERROR:', err);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong on our end. Please try again later.',
  });
};

module.exports = errorHandler;
module.exports.AppError = AppError;
