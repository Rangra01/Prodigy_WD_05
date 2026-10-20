/**
 * Lightweight CSRF protection for the cookie-based JWT setup.
 *
 * Combined with SameSite=Lax cookies, every state-changing request
 * must also come from an allowed origin (the client URL). Browsers
 * always send Origin on cross-origin POST/PUT/DELETE, so a request
 * from an attacker's site is rejected. Requests without an Origin
 * header (curl, Postman, server-to-server) are allowed — they cannot
 * carry the victim's cookies automatically.
 */
function csrfGuard(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  const origin = req.headers.origin;
  if (!origin) return next(); // non-browser client — cookie theft isn't applicable

  const allowed = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (allowed.includes(origin.replace(/\/+$/, ''))) return next();

  return res
    .status(403)
    .json({ error: 'Request blocked: origin is not allowed (CSRF protection).' });
}

module.exports = csrfGuard;
