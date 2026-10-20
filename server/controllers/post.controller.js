/** Posts: feed, single post, create/update/delete, likes. */

const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { badRequest, notFound, forbidden } = require('../utils/errors');
const { str } = require('../utils/validate');
const { queryPosts } = require('../services/post.service');
const { uploadImage } = require('../services/upload.service');

const MAX_POST_LENGTH = 1000;

/** Ensures :id is a positive integer before touching the DB. */
function parsePostId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Invalid post id.');
  return id;
}

/** Loads a post row or throws 404. */
async function getPostRow(postId) {
  const [rows] = await pool.execute('SELECT id, user_id FROM posts WHERE id = ?', [
    postId,
  ]);
  if (rows.length === 0) throw notFound('Post not found.');
  return rows[0];
}

/** Throws 403 unless the post belongs to the authenticated user. */
function assertOwnership(post, req) {
  if (post.user_id !== req.userId) {
    throw forbidden('You can only modify your own posts.');
  }
}

/** Re-fetches one post in API shape (with counts / likedByMe). */
async function fetchPostForResponse(postId, userId) {
  const posts = await queryPosts(pool, {
    where: 'p.id = ?',
    params: [postId],
    userId: userId || -1,
    limit: 1,
  });
  return posts[0];
}

/**
 * GET /api/posts  (public)
 * Home feed: newest first. Personalised "likedByMe" when a valid
 * token is sent; anonymous requests are still allowed.
 */
const getPosts = asyncHandler(async (req, res) => {
  const posts = await queryPosts(pool, {
    userId: req.userId || -1,
    limit: 50,
  });
  res.json({ posts });
});

/**
 * GET /api/posts/:id  (public)
 */
const getPost = asyncHandler(async (req, res) => {
  const postId = parsePostId(req.params.id);
  await getPostRow(postId); // 404 when missing
  const post = await fetchPostForResponse(postId, req.userId);
  res.json({ post });
});

/**
 * POST /api/posts  (authenticated)
 * Text post with an optional image (multipart field "image").
 */
const createPost = asyncHandler(async (req, res) => {
  const content = str(req.body?.content);
  const file = req.file;

  if (!content && !file) {
    throw badRequest('A post needs some text or an image.');
  }
  if (content.length > MAX_POST_LENGTH) {
    throw badRequest(`Post must be at most ${MAX_POST_LENGTH} characters.`);
  }

  const imageUrl = file ? await uploadImage(file.buffer, 'posts') : null;
  const [result] = await pool.execute(
    'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
    [req.userId, content, imageUrl]
  );

  const post = await fetchPostForResponse(result.insertId, req.userId);
  res.status(201).json({ message: 'Post created.', post });
});

/**
 * PUT /api/posts/:id  (authenticated, owner only)
 * Edits the text of own post. Ownership comes from the DB row, the
 * user id from the verified JWT.
 */
const updatePost = asyncHandler(async (req, res) => {
  const postId = parsePostId(req.params.id);
  const post = await getPostRow(postId);
  assertOwnership(post, req);

  const content = str(req.body?.content);
  if (!content) throw badRequest('Post content cannot be empty.');
  if (content.length > MAX_POST_LENGTH) {
    throw badRequest(`Post must be at most ${MAX_POST_LENGTH} characters.`);
  }

  await pool.execute('UPDATE posts SET content = ? WHERE id = ?', [
    content,
    postId,
  ]);

  const updated = await fetchPostForResponse(postId, req.userId);
  res.json({ message: 'Post updated.', post: updated });
});

/**
 * DELETE /api/posts/:id  (authenticated, owner only)
 * Likes and comments are removed automatically via FK cascade.
 */
const deletePost = asyncHandler(async (req, res) => {
  const postId = parsePostId(req.params.id);
  const post = await getPostRow(postId);
  assertOwnership(post, req);

  await pool.execute('DELETE FROM posts WHERE id = ?', [postId]);
  res.json({ message: 'Post deleted.' });
});

/** Current like count of a post. */
async function countLikes(postId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM likes WHERE post_id = ?',
    [postId]
  );
  return Number(rows[0].count);
}

/**
 * POST /api/posts/:id/like  (authenticated)
 * Idempotent: liking twice is a no-op thanks to the unique constraint.
 */
const likePost = asyncHandler(async (req, res) => {
  const postId = parsePostId(req.params.id);
  await getPostRow(postId);

  try {
    await pool.execute('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [
      req.userId,
      postId,
    ]);
  } catch (err) {
    // ER_DUP_ENTRY = already liked → still report the current state.
    if (err.code !== 'ER_DUP_ENTRY') throw err;
  }

  res.json({ liked: true, likeCount: await countLikes(postId) });
});

/**
 * DELETE /api/posts/:id/like  (authenticated)
 * Idempotent: unliking when not liked is a no-op.
 */
const unlikePost = asyncHandler(async (req, res) => {
  const postId = parsePostId(req.params.id);
  await getPostRow(postId);

  await pool.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [
    req.userId,
    postId,
  ]);

  res.json({ liked: false, likeCount: await countLikes(postId) });
});

module.exports = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
};
