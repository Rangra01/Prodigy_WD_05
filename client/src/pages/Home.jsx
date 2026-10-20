import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import usePageTitle from '../hooks/usePageTitle';
import Loader from '../components/Loader';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';

/**
 * Home feed: every user's posts, newest first, with a composer on
 * top. Includes loading, empty and error states plus a refresh button.
 */
export default function Home() {
  usePageTitle('Home');

  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');

  // Fetches the feed and returns the posts; callers update state.
  const fetchFeed = useCallback(
    () => api.get('/posts').then((data) => data.posts),
    []
  );

  useEffect(() => {
    let cancelled = false;
    // Initial status is already 'loading'.
    fetchFeed()
      .then((nextPosts) => {
        if (cancelled) return;
        setPosts(nextPosts);
        setStatus('ready');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchFeed]);

  const handleRefresh = async () => {
    setStatus('loading');
    setError('');
    try {
      setPosts(await fetchFeed());
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handlePosted = (post) => setPosts((list) => [post, ...list]);

  const handleChanged = (updated) =>
    setPosts((list) =>
      list.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );

  const handleDelete = (postId) =>
    setPosts((list) => list.filter((p) => p.id !== postId));

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Home</h1>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={handleRefresh}
          disabled={status === 'loading'}
        >
          ↻ Refresh
        </button>
      </div>

      <PostComposer onPosted={handlePosted} />

      {status === 'loading' && <Loader label="Loading feed…" />}

      {status === 'error' && (
        <div className="card center">
          <div className="alert alert-error">{error}</div>
          <button type="button" className="btn" onClick={handleRefresh}>
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && posts.length === 0 && (
        <div className="card empty-state">
          <h2>No posts yet</h2>
          <p>Be the first — share something with everyone above!</p>
        </div>
      )}

      {status === 'ready' && posts.length > 0 && (
        <div className="stack">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onChanged={handleChanged}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </main>
  );
}
