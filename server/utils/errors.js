/**
 * Small helper to throw HTTP errors with a consistent shape so the
 * centralized error handler can respond with the right status code.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

const badRequest = (message) => new ApiError(400, message);
const unauthorized = (message = 'Authentication required.') =>
  new ApiError(401, message);
const forbidden = (message = 'You are not allowed to do that.') =>
  new ApiError(403, message);
const notFound = (message = 'Resource not found.') =>
  new ApiError(404, message);
const conflict = (message) => new ApiError(409, message);
const serviceUnavailable = (message) => new ApiError(503, message);

module.exports = {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serviceUnavailable,
};
