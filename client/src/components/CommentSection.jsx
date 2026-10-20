import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatTimeAgo } from '../services/formatTime';
import Avatar from './Avatar';

/**
 * Comments of one post: loads the list, lets the signed-in user add a
 * comment and delete their own.
 */
export default function CommentSection({ postId, onCountChange }) {
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/posts/${postId}/comments`)
      .then((data) => {
        if (!cancelled) setComments(data.comments);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleAdd = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Comment cannot be empty.');
      return;
    }
    setPosting(true);
    setError('');
    try {
      const data = await api.post(`/posts/${postId}/comments`, { content: trimmed });
      setComments((list) => [...list, data.comment]);
      setText('');
      onCountChange?.(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    setError('');
    try {
      await api.del(`/comments/${commentId}`);
      setComments((list) => list.filter((c) => c.id !== commentId));
      onCountChange?.(-1);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="comments">
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="muted center">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="muted center">No comments yet. Be the first!</p>
      ) : (
        comments.map((comment) => (
          <div className="comment" key={comment.id}>
            <Link to={`/profile/${comment.author.id}`}>
              <Avatar user={comment.author} size={32} />
            </Link>
            <div className="comment-bubble">
              <div className="comment-top">
                <Link
                  to={`/profile/${comment.author.id}`}
                  className="comment-author"
                >
                  @{comment.author.username}
                </Link>
                <span className="post-meta">{formatTimeAgo(comment.createdAt)}</span>
                {user?.id === comment.author.id && (
                  <button
                    type="button"
                    className="comment-delete"
                    onClick={() => handleDelete(comment.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="comment-text">{comment.content}</p>
            </div>
          </div>
        ))
      )}

      <form className="comment-form" onSubmit={handleAdd}>
        <input
          className="input"
          placeholder="Write a comment…"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn-sm" disabled={posting}>
          {posting ? '…' : 'Send'}
        </button>
      </form>
    </section>
  );
}
