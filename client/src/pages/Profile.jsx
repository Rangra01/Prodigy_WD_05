import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { formatJoinDate } from '../services/formatTime';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../hooks/usePageTitle';
import Avatar from '../components/Avatar';
import Loader from '../components/Loader';
import PostCard from '../components/PostCard';
import ProfileForm from '../components/ProfileForm';

/**
 * Public profile page: avatar, name, username, bio, stats and the
 * user's posts. The owner also gets an edit form.
 */
export default function Profile() {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  usePageTitle('Profile');

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [loadedId, setLoadedId] = useState(null);

  const isOwn = currentUser?.id === profile?.id;

  // Reset local state when navigating to a different profile
  // (adjust-state-during-render pattern from react.dev).
  if (loadedId !== id) {
    setLoadedId(id);
    setProfile(null);
    setPosts([]);
    setError('');
    setStatus('loading');
    setEditing(false);
  }

  const fetchProfile = useCallback(async () => {
    const [profileData, postsData] = await Promise.all([
      api.get(`/users/${id}`),
      api.get(`/users/${id}/posts`),
    ]);
    return { nextProfile: profileData.user, nextPosts: postsData.posts };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    // Initial status is already 'loading'.
    fetchProfile()
      .then(({ nextProfile, nextPosts }) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setPosts(nextPosts);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  const handleRetry = async () => {
    setStatus('loading');
    setError('');
    try {
      const { nextProfile, nextPosts } = await fetchProfile();
      setProfile(nextProfile);
      setPosts(nextPosts);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleSaved = (updatedUser) => {
    setProfile((prev) => ({ ...prev, ...updatedUser }));
    updateUser(updatedUser); // keep the navbar in sync
    setEditing(false);
  };

  const handlePostChanged = (updated) =>
    setPosts((list) => list.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));

  const handlePostDelete = (postId) =>
    setPosts((list) => list.filter((p) => p.id !== postId));

  if (status === 'loading') return <Loader label="Loading profile…" />;

  if (status === 'error') {
    return (
      <main className="page">
        <div className="card center">
          <div className="alert alert-error">{error}</div>
          <button type="button" className="btn" onClick={handleRetry}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="card profile-header">
        <Avatar user={profile} size={88} />
        <div className="profile-info">
          <h1 className="profile-name">{profile.name}</h1>
          <div className="profile-username">@{profile.username}</div>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <div className="profile-stats">
            <span>
              <strong>{profile.postCount ?? posts.length}</strong>{' '}
              {(profile.postCount ?? posts.length) === 1 ? 'post' : 'posts'}
            </span>
            <span>Joined {formatJoinDate(profile.createdAt)}</span>
          </div>
          {isOwn && (
            <div className="profile-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setEditing((open) => !open)}
              >
                {editing ? 'Close editor' : 'Edit profile'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isOwn && editing && (
        <ProfileForm
          currentUser={currentUser}
          onSaved={handleSaved}
          onCancel={() => setEditing(false)}
        />
      )}

      <h2 className="page-title" style={{ marginBottom: 16 }}>
        {isOwn ? 'Your posts' : `Posts by ${profile.name}`}
      </h2>

      {posts.length === 0 ? (
        <div className="card empty-state">
          <p>
            {isOwn
              ? "You haven't posted anything yet."
              : `${profile.name} hasn't posted anything yet.`}
          </p>
        </div>
      ) : (
        <div className="stack">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onChanged={handlePostChanged}
              onDelete={handlePostDelete}
            />
          ))}
        </div>
      )}
    </main>
  );
}
