/**
 * ASYNC HANDLER (catchAsync)
 *
 * Without this, every async controller needs:
 *
 *   exports.register = async (req, res, next) => {
 *     try {
 *       // ... logic
 *     } catch (err) {
 *       next(err);  // <-- routes error to centralized handler
 *     }
 *   };
 *
 * That try/catch block is identical in every function — pure boilerplate.
 *
 * WITH catchAsync:
 *
 *   exports.register = catchAsync(async (req, res, next) => {
 *     // ... logic (no try/catch needed)
 *   });
 *
 * How it works:
 * catchAsync returns a new function. When Express calls that function with
 * (req, res, next), it executes the original fn. If the Promise rejects
 * (any error is thrown), .catch(next) passes it to Express's error handler.
 *
 * Interview Q: "How does this pattern work?"
 * A: catchAsync is a higher-order function — it takes a function and returns
 *    a function. The returned function wraps the original in a Promise chain.
 *    Rejected promises are caught by .catch(next), which calls Express's
 *    next() with the error, routing it to the centralized error handler.
 *    This is a clean application of functional composition.
 *
 * Interview Q: "Why not just use a global unhandledRejection handler?"
 * A: process.on('unhandledRejection') catches truly unhandled rejections but
 *    by then Express can no longer send an HTTP response — the request
 *    handler has already returned. We need the error to flow back through
 *    Express middleware so we can respond to the client.
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    // fn(req, res, next) returns a Promise (because fn is async)
    // If it rejects, .catch(next) passes the error to Express
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
