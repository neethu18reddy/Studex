/**
 * Higher-order function to wrap async route handlers/controllers.
 * Catches any rejected promises and forwards them to Express next(error) middleware.
 *
 * @param {Function} fn - Async controller function (req, res, next)
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
