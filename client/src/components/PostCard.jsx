import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatTimeAgo } from '../services/formatTime';
import Avatar from './Avatar';
import CommentSection from './CommentSection';

const MAX_POST_LENGTH = 1000;

/**
 * One post in the feed: author, content, optional image, like and
 * comment actions. Owners can edit and delete their own posts.
 */
export default function PostCard({ post, onChanged, onDelete }) {
  const { user } = useAuth();
  const isOwner = user?.id === post.author.id;

  const [showComments, setShowComments] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);

  const likeCount = post.likeCount ?? 0;
  const commentCount = post.commentCount ?? 0;

  const handleLike = async () => {
    setBusy(true);
    setError('');
    try {
      const data = post.likedByMe
        ? await api.del(`/posts/${post.id}/like`)
        : await api.post(`/posts/${post.id}/like`);
      onChanged?.({ ...post, likedByMe: data.liked, likeCount: data.likeCount });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    const trimmed = editText.trim();
    if (!trimmed) {
      setError('Post content cannot be empty.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api.put(`/posts/${post.id}`, { content: trimmed });
      setEditing(false);
      onChanged?.(data.post);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This also removes its likes and comments.')) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.del(`/posts/${post.id}`);
      onDelete?.(post.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <article className="card post-card">
      {error && <div className="alert alert-error">{error}</div>}

      <header className="post-header">
        <Link to={`/profile/${post.author.id}`}>
          <Avatar user={post.author} size={44} />
        </Link>
        <div className="post-author">
          <Link to={`/profile/${post.author.id}`} className="post-author-name">
            {post.author.name}
          </Link>
          <div className="post-meta">
            @{post.author.username} · {formatTimeAgo(post.createdAt)}
            {post.updatedAt && post.updatedAt !== post.createdAt ? ' · edited' : ''}
          </div>
        </div>
        {isOwner && !editing && (
          <div className="post-menu">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditText(post.content);
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleDelete}
              disabled={busy}
            >
              Delete
            </button>
          </div>
        )}
      </header>

      {editing ? (
        <form onSubmit={handleSaveEdit}>
          <textarea
            className="textarea"
            value={editText}
            maxLength={MAX_POST_LENGTH}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
          <div className="composer-actions">
            <span className="char-count">
              {editText.trim().length}/{MAX_POST_LENGTH}
            </span>
            <div className="composer-tools">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-sm" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <>
          {post.content && <p className="post-content">{post.content}</p>}
          {post.imageUrl && (
            <img
              className="post-image"
              src={post.imageUrl}
              alt=""
              loading="lazy"
            />
          )}
        </>
      )}

      <footer className="post-actions">
        <button
          type="button"
          className={`action-btn${post.likedByMe ? ' liked' : ''}`}
          onClick={handleLike}
          disabled={busy}
          aria-pressed={post.likedByMe}
        >
          {post.likedByMe ? '♥' : '♡'} {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
        </button>
        <button
          type="button"
          className="action-btn"
          onClick={() => setShowComments((open) => !open)}
          aria-expanded={showComments}
        >
          💬 {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
        </button>
      </footer>

      {showComments && (
        <CommentSection
          postId={post.id}
          onCountChange={(delta) =>
            onChanged?.({ ...post, commentCount: Math.max(0, commentCount + delta) })
          }
        />
      )}
    </article>
  );
}
