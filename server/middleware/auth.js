/**
 * JWT authentication middleware.
 *
 * The token is issued as an HTTP-only cookie (primary, CSRF-safe via
 * SameSite=Lax + origin checks) and is also accepted as a
 * "Authorization: Bearer <token>" header so the API can be tested
 * with curl/Postman. The authenticated user id ALWAYS comes from the
 * verified token — never from a client-submitted field.
 */
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { unauthorized } = require('../utils/errors');

const TOKEN_COOKIE = 'token';

/** Reads the JWT from the Authorization header or the auth cookie. */
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies && req.cookies[TOKEN_COOKIE]) return req.cookies[TOKEN_COOKIE];
  return null;
}

/** Verifies a token and returns its payload, or null when invalid. */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/** Builds the options shared by cookie issuance and clearing. */
function tokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 1 day, matches JWT expiry
  };
}

/** Creates a signed JWT for a user id. */
function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

/** Requires a valid token; rejects with 401 otherwise. */
const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw unauthorized('You must be logged in to do that.');

  const payload = verifyToken(token);
  if (!payload) {
    throw unauthorized('Your session is invalid or has expired. Please log in again.');
  }

  req.userId = Number(payload.sub);
  next();
});

/**
 * Attaches req.userId when a valid token is present but does NOT
 * reject the request — used for public endpoints that personalise
 * their response (e.g. "likedByMe" in the feed).
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.userId = Number(payload.sub);
  }
  next();
}

module.exports = {
  TOKEN_COOKIE,
  extractToken,
  signToken,
  tokenCookieOptions,
  requireAuth,
  optionalAuth,
};
