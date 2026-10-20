/** Users: public profiles, own-profile updates, a user's posts. */

const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { badRequest, notFound, conflict } = require('../utils/errors');
const { validate, str } = require('../utils/validate');
const { queryPosts } = require('../services/post.service');
const { uploadImage } = require('../services/upload.service');
const {
  toUserResponse,
  toPublicUser,
} = require('../services/user.service');

/** Ensures :id is a positive integer before touching the DB. */
function parseUserId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Invalid user id.');
  return id;
}

/**
 * GET /api/users/:id  (public)
 * Public profile plus the user's post count.
 */
const getUserById = asyncHandler(async (req, res) => {
  const id = parseUserId(req.params.id);

  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.username, u.bio, u.profile_image, u.created_at,
            (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS post_count
     FROM users u
     WHERE u.id = ?`,
    [id]
  );
  if (rows.length === 0) throw notFound('User not found.');

  res.json({
    user: {
      ...toPublicUser(rows[0]),
      postCount: Number(rows[0].post_count),
    },
  });
});

/**
 * PUT /api/users/profile  (authenticated)
 * Updates the CURRENT user's profile. The id always comes from the
 * verified JWT, so nobody can edit someone else's profile.
 * Accepts JSON fields plus an optional multipart "profile_image" file.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const invalid = validate(body, {
    name: 'name',
    username: 'username',
    bio: 'bio',
  });
  if (invalid) throw badRequest(invalid.firstMessage);

  const name = str(body.name);
  const username = str(body.username);
  const bio = str(body.bio);

  // Uniqueness check with a friendly error (DB constraint is the backstop).
  const [dups] = await pool.execute(
    'SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1',
    [username, req.userId]
  );
  if (dups.length > 0) throw conflict('That username is already taken.');

  // Optional new profile picture (multipart upload → Cloudinary).
  let profileImage = undefined;
  if (req.file) {
    profileImage = await uploadImage(req.file.buffer, 'avatars');
  } else if (body.remove_profile_image === 'true') {
    profileImage = null;
  }

  const sets = ['name = ?', 'username = ?', 'bio = ?'];
  const params = [name, username, bio];
  if (profileImage !== undefined) {
    sets.push('profile_image = ?');
    params.push(profileImage);
  }
  params.push(req.userId);

  await pool.execute(
    `UPDATE users SET ${sets.join(', ')} WHERE id = ?`,
    params
  );

  const [rows] = await pool.execute(
    'SELECT id, name, username, email, bio, profile_image, created_at FROM users WHERE id = ?',
    [req.userId]
  );
  res.json({ message: 'Profile updated.', user: toUserResponse(rows[0]) });
});

/**
 * GET /api/users/:id/posts  (public)
 * All posts by one user, newest first, with counts and likedByMe.
 */
const getUserPosts = asyncHandler(async (req, res) => {
  const id = parseUserId(req.params.id);

  const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
  if (users.length === 0) throw notFound('User not found.');

  const posts = await queryPosts(pool, {
    where: 'p.user_id = ?',
    params: [id],
    userId: req.userId || -1,
    limit: 100,
  });

  res.json({ posts });
});

module.exports = { getUserById, updateProfile, getUserPosts };
