import { useState } from 'react';

// A few dark-blue shades for deterministic initials avatars.
const COLORS = ['#1e3a8a', '#312e81', '#1e40af', '#3730a3', '#0f172a'];

function colorFor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  }
  return COLORS[hash % COLORS.length];
}

function initialsFor(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Round avatar: shows the profile picture when available, otherwise
 * deterministic colored initials. Falls back to initials if the image
 * fails to load.
 */
export default function Avatar({ user, size = 40 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const name = user?.name || user?.username || '?';
  const showImage = user?.profileImage && !imgFailed;

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        backgroundColor: colorFor(user?.username || name),
      }}
      title={name}
      role="img"
      aria-label={name}
    >
      {showImage ? (
        <img
          src={user.profileImage}
          alt={name}
          onError={() => setImgFailed(true)}
        />
      ) : (
        initialsFor(name)
      )}
    </div>
  );
}
