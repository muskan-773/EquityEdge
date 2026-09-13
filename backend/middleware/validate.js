const { validationResult } = require('express-validator');

/**
 * VALIDATION RUNNER MIDDLEWARE
 *
 * express-validator works in two steps:
 * Step 1: Define validation rules as an array of middleware (in routes files)
 * Step 2: Run this `validate` middleware to check results and respond if invalid
 *
 * Usage in a route:
 *   router.post('/register',
 *     [body('email').isEmail(), body('password').isLength({ min: 6 })],  // Step 1
 *     validate,                                                           // Step 2
 *     authController.register                                             // Controller
 *   );
 *
 * Why express-validator over writing manual checks?
 * - Declarative: rules read like a description of valid data
 * - Composable: mix and chain validators easily
 * - Battle-tested: handles edge cases (whitespace, unicode, etc.)
 * - Consistent: all validation errors have the same shape
 *
 * Interview Q: "Why validate on the backend even if the frontend validates?"
 * A: Frontend validation is for user experience (instant feedback).
 *    It can be bypassed trivially with curl, Postman, or DevTools.
 *    Backend validation is the ONLY validation that matters for security.
 *    Never trust the client. Always validate on the server.
 *
 * Response shape when validation fails:
 * {
 *   "success": false,
 *   "message": "Validation failed",
 *   "errors": [
 *     { "field": "email", "message": "Must be a valid email" },
 *     { "field": "password", "message": "Password must be at least 6 characters" }
 *   ]
 * }
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Map express-validator errors to a cleaner format
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  next();
};

module.exports = validate;
