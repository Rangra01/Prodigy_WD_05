/**
 * Lightweight input validation helpers.
 * Deliberately dependency-free so the rules stay easy to read and
 * unit-test (see server/tests/validate.test.js).
 */

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
// Pragmatic email check: something@something.tld (no spaces, no commas).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const rules = {
  name(value) {
    const v = String(value ?? '').trim();
    if (!v) return 'Name is required.';
    if (v.length < 2 || v.length > 50) return 'Name must be 2–50 characters.';
    return null;
  },
  username(value) {
    const v = String(value ?? '').trim();
    if (!v) return 'Username is required.';
    if (!USERNAME_REGEX.test(v))
      return 'Username must be 3–30 characters (letters, numbers, underscore only).';
    return null;
  },
  email(value) {
    const v = String(value ?? '').trim();
    if (!v) return 'Email is required.';
    if (v.length > 100) return 'Email must be at most 100 characters.';
    if (!EMAIL_REGEX.test(v)) return 'Please enter a valid email address.';
    return null;
  },
  password(value) {
    const v = String(value ?? '');
    if (!v) return 'Password is required.';
    if (v.length < 6) return 'Password must be at least 6 characters.';
    if (v.length > 72) return 'Password must be at most 72 characters.';
    return null;
  },
  bio(value) {
    if (value === undefined || value === null || value === '') return null;
    const v = String(value).trim();
    if (v.length > 160) return 'Bio must be at most 160 characters.';
    return null;
  },
  postContent(value) {
    const v = String(value ?? '').trim();
    if (!v) return 'Post content cannot be empty.';
    if (v.length > 1000) return 'Post must be at most 1000 characters.';
    return null;
  },
  commentContent(value) {
    const v = String(value ?? '').trim();
    if (!v) return 'Comment cannot be empty.';
    if (v.length > 500) return 'Comment must be at most 500 characters.';
    return null;
  },
};

/**
 * Validates an object against a map of field names → rule names.
 * Returns { errors: { field: message }, firstMessage } or null when
 * everything passes.
 *
 * Example: validate({ email }, { email: 'email' })
 */
function validate(data, shape) {
  const errors = {};
  for (const [field, ruleName] of Object.entries(shape)) {
    const rule = rules[ruleName];
    if (!rule) throw new Error(`Unknown validation rule: ${ruleName}`);
    const message = rule(data[field]);
    if (message) errors[field] = message;
  }
  if (Object.keys(errors).length === 0) return null;
  return {
    errors,
    firstMessage: Object.values(errors)[0],
  };
}

/** Trimmed string body field, or '' when missing. */
const str = (value) => (typeof value === 'string' ? value.trim() : '');

module.exports = { validate, rules, str, USERNAME_REGEX, EMAIL_REGEX };
