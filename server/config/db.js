/**
 * MySQL connection pool (mysql2/promise).
 * All queries in the app go through this pool and use parameterized
 * statements — never string interpolation — to avoid SQL injection.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'social_media_db',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  // Store/read timestamps in UTC so clients can format them locally.
  timezone: 'Z',
});

// If an idle pooled connection dies (e.g. MySQL restarts), log it and
// let mysql2 replace it instead of crashing the process.
pool.on('error', (err) => {
  console.error('[db] Idle connection error:', err.message);
});

/** Verifies the database is reachable at startup. */
async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

module.exports = { pool, testConnection };
