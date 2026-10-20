/**
 * Social Media Platform — Express server entry point.
 *
 * Order matters: security middleware → body parsing → CSRF guard →
 * rate limiting → routes → static client build (production) →
 * centralized error handling.
 */
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./config/db');
const { isCloudinaryConfigured } = require('./config/cloudinary');
const csrfGuard = require('./middleware/csrf');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const postRoutes = require('./routes/post.routes');
const commentRoutes = require('./routes/comment.routes');

// ---------------------------------------------------------------------------
// Configuration & startup checks
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_URLS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const missing = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'].filter(
  (key) => !process.env[key]
);
if (missing.length > 0) {
  console.error(
    `\n[config] Missing required environment variables: ${missing.join(', ')}\n` +
      '         Copy server/.env.example to server/.env and fill in the values.\n'
  );
  process.exit(1);
}

const app = express();

// Behind a reverse proxy (nginx, Heroku, ...) set TRUST_PROXY=1 so
// express-rate-limit sees the real client IP in X-Forwarded-For.
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(
  helmet({
    // The API is consumed from another origin in development; images
    // may also be served from the Cloudinary CDN.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: CLIENT_URLS,
    credentials: true, // allow the HTTP-only auth cookie
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// CSRF: state-changing requests must come from an allowed origin.
app.use(csrfGuard);

// General API rate limit (auth routes have their own stricter limit).
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down and try again later.' },
  })
);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uploadsConfigured: isCloudinaryConfigured,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// ---------------------------------------------------------------------------
// Production: serve the built React client from client/dist
// ---------------------------------------------------------------------------
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback for any non-API GET request (Express 5 friendly).
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function start() {
  try {
    await testConnection();
  } catch (err) {
    console.error('[db] Could not connect to MySQL:', err.message);
    console.error(
      '      Check DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME in server/.env\n' +
        '      and make sure the schema is applied:  mysql < database/schema.sql'
    );
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n✔ API server running at http://localhost:${PORT}`);
    console.log(`  Allowed client origins: ${CLIENT_URLS.join(', ')}`);
    console.log(
      `  Image uploads (Cloudinary): ${isCloudinaryConfigured ? 'enabled' : 'disabled (text-only posts)'}`
    );
  });
}

start();
