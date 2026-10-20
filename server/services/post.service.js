/**
 * Shared post query used by the feed, single-post and user-posts
 * endpoints. Includes author info, like/comment counts and — when the
 * request carries a valid token — whether the current user liked the
 * post ("likedByMe").
 */

const SELECT_POSTS = `
  SELECT
    p.id, p.content, p.image_url, p.created_at, p.updated_at,
    u.id           AS author_id,
    u.name         AS author_name,
    u.username     AS author_username,
    u.profile_image AS author_profile_image,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)     AS like_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)  AS comment_count,
    EXISTS (SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS liked_by_me
  FROM posts p
  INNER JOIN users u ON u.id = p.user_id
`;

const FEED_ORDER = ' ORDER BY p.created_at DESC, p.id DESC';

/**
 * Converts a raw DB row into the JSON shape returned by the API.
 */
function mapPostRow(row) {
  return {
    id: row.id,
    content: row.content,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.author_id,
      name: row.author_name,
      username: row.author_username,
      profileImage: row.author_profile_image,
    },
    likeCount: Number(row.like_count),
    commentCount: Number(row.comment_count),
    likedByMe: Boolean(Number(row.liked_by_me)),
  };
}

/**
 * Runs the shared query. Pass userId = -1 for anonymous requests.
 */
async function queryPosts(db, { where = '', params = [], userId = -1, limit = null }) {
  const sql =
    SELECT_POSTS +
    (where ? ` WHERE ${where}` : '') +
    FEED_ORDER +
    (limit ? ' LIMIT ?' : '');
  const queryParams = [userId, ...params];
  if (limit) queryParams.push(limit);
  const [rows] = await db.execute(sql, queryParams);
  return rows.map(mapPostRow);
}

module.exports = { SELECT_POSTS, FEED_ORDER, mapPostRow, queryPosts };
