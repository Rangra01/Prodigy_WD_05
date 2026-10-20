/** Comments: list, create, delete (own comments only). */

const { pool } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { badRequest, notFound, forbidden } = require('../utils/errors');
const { validate, str } = require('../utils/validate');

const MAX_COMMENT_LENGTH = 500;

const COMMENT_SELECT = `
  SELECT
    c.id, c.content, c.created_at,
    u.id       AS author_id,
    u.username AS author_username,
    u.name     AS author_name,
    u.profile_image AS author_profile_image
  FROM comments c
  INNER JOIN users u ON u.id = c.user_id
`;

function mapCommentRow(row) {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      username: row.author_username,
      name: row.author_name,
      profileImage: row.author_profile_image,
    },
  };
}

/** Ensures :id is a positive integer before touching the DB. */
function parseId(raw, label) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`Invalid ${label} id.`);
  return id;
}

/** Throws 404 when the post does not exist. */
async function assertPostExists(postId) {
  const [rows] = await pool.execute('SELECT id FROM posts WHERE id = ?', [postId]);
  if (rows.length === 0) throw notFound('Post not found.');
}

/**
 * GET /api/posts/:id/comments  (public)
 * Oldest comment first.
 */
const getComments = asyncHandler(async (req, res) => {
  const postId = parseId(req.params.id, 'post');
  await assertPostExists(postId);

  const [rows] = await pool.execute(
    `${COMMENT_SELECT} WHERE c.post_id = ? ORDER BY c.created_at ASC, c.id ASC`,
    [postId]
  );
  res.json({ comments: rows.map(mapCommentRow) });
});

/**
 * POST /api/posts/:id/comments  (authenticated)
 */
const createComment = asyncHandler(async (req, res) => {
  const postId = parseId(req.params.id, 'post');
  await assertPostExists(postId);

  const invalid = validate(req.body || {}, { content: 'commentContent' });
  if (invalid) throw badRequest(invalid.firstMessage);
  const content = str(req.body.content);

  const [result] = await pool.execute(
    'INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)',
    [req.userId, postId, content]
  );

  const [rows] = await pool.execute(`${COMMENT_SELECT} WHERE c.id = ?`, [
    result.insertId,
  ]);
  res.status(201).json({ message: 'Comment added.', comment: mapCommentRow(rows[0]) });
});

/**
 * DELETE /api/comments/:id  (authenticated, author only)
 */
const deleteComment = asyncHandler(async (req, res) => {
  const commentId = parseId(req.params.id, 'comment');

  const [rows] = await pool.execute(
    'SELECT id, user_id FROM comments WHERE id = ?',
    [commentId]
  );
  if (rows.length === 0) throw notFound('Comment not found.');
  if (rows[0].user_id !== req.userId) {
    throw forbidden('You can only delete your own comments.');
  }

  await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);
  res.json({ message: 'Comment deleted.' });
});

module.exports = { getComments, createComment, deleteComment };
