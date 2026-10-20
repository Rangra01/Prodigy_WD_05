/** Authentication: register, login, current user, logout. */

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { badRequest, unauthorized, conflict } = require('../utils/errors');
const { validate, str } = require('../utils/validate');
const {
  signToken,
  TOKEN_COOKIE,
  tokenCookieOptions,
} = require('../middleware/auth');
const {
  FULL_USER_FIELDS,
  toUserResponse,
} = require('../services/user.service');

/**
 * POST /api/auth/register
 * Creates an account, hashes the password and returns the session.
 */
const register = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const invalid = validate(body, {
    name: 'name',
    username: 'username',
    email: 'email',
    password: 'password',
  });
  if (invalid) throw badRequest(invalid.firstMessage);

  const name = str(body.name);
  const username = str(body.username);
  const email = str(body.email).toLowerCase();

  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1',
    [email, username]
  );
  if (existing.length > 0) {
    throw conflict('An account with that email or username already exists.');
  }

  const passwordHash = await bcrypt.hash(String(body.password), 10);
  const [result] = await pool.execute(
    'INSERT INTO users (name, username, email, password_hash) VALUES (?, ?, ?, ?)',
    [name, username, email, passwordHash]
  );

  const [rows] = await pool.execute(
    `SELECT ${FULL_USER_FIELDS} FROM users WHERE id = ?`,
    [result.insertId]
  );
  const user = toUserResponse(rows[0]);

  const token = signToken(user.id);
  res.cookie(TOKEN_COOKIE, token, tokenCookieOptions());

  res.status(201).json({ message: 'Account created successfully.', user, token });
});

/**
 * POST /api/auth/login
 * Verifies credentials and starts a session.
 */
const login = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = str(body.email).toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) throw badRequest('Email and password are required.');

  const [rows] = await pool.execute(
    'SELECT id, password_hash FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  if (rows.length === 0) throw unauthorized('Invalid email or password.');

  const match = await bcrypt.compare(password, rows[0].password_hash);
  if (!match) throw unauthorized('Invalid email or password.');

  const [userRows] = await pool.execute(
    `SELECT ${FULL_USER_FIELDS} FROM users WHERE id = ?`,
    [rows[0].id]
  );
  const user = toUserResponse(userRows[0]);

  const token = signToken(user.id);
  res.cookie(TOKEN_COOKIE, token, tokenCookieOptions());

  res.json({ message: 'Logged in successfully.', user, token });
});

/**
 * GET /api/auth/me
 * Restores the session on page load using the cookie (or Bearer token).
 */
const me = asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT ${FULL_USER_FIELDS} FROM users WHERE id = ?`,
    [req.userId]
  );
  if (rows.length === 0) {
    throw unauthorized('Your account no longer exists. Please log in again.');
  }
  res.json({ user: toUserResponse(rows[0]) });
});

/**
 * POST /api/auth/logout
 * Clears the HTTP-only auth cookie server-side.
 */
const logout = asyncHandler(async (req, res) => {
  res.clearCookie(TOKEN_COOKIE, { ...tokenCookieOptions(), maxAge: 0 });
  res.json({ message: 'Logged out successfully.' });
});

module.exports = { register, login, me, logout };
