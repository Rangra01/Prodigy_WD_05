/**
 * Centralized error handling. All controllers forward errors here so
 * responses stay consistent: { error: "<message>" }.
 * Stack traces and internal details are logged server-side only.
 */
const { ApiError } = require('../utils/errors');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Body parser: malformed JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }

  // Multer: upload limits / unexpected field
  if (err && err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Image is too large (maximum 5 MB).'
        : 'Invalid image upload.';
    return res.status(400).json({ error: message });
  }

  // MySQL duplicate key (email/username uniqueness)
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res
      .status(409)
      .json({ error: 'That email or username is already taken.' });
  }

  const status = err.statusCode || err.status || 500;

  // Intentional 5xx errors (e.g. 503 service not configured) carry a
  // safe, user-facing message — only unexpected 500s are masked.
  if (status >= 500 && !(err instanceof ApiError)) {
    // Log full error internally, never expose it to clients.
    console.error('[error]', err);
    return res
      .status(500)
      .json({ error: 'Something went wrong on the server. Please try again.' });
  }

  return res.status(status).json({ error: err.message || 'Request failed.' });
}

module.exports = { errorHandler, notFoundHandler };
