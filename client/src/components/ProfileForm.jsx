import { useRef, useState } from 'react';
import { api } from '../services/api';
import Avatar from './Avatar';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_BIO_LENGTH = 160;

/**
 * Edit-your-own-profile form (name, username, bio, picture).
 * Sends multipart FormData so an optional image upload and the text
 * fields go in a single request.
 */
export default function ProfileForm({ currentUser, onSaved, onCancel }) {
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: currentUser.name || '',
    username: currentUser.username || '',
    bio: currentUser.bio || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Image must be 5 MB or smaller.');
      return;
    }
    setImageFile(file);
    setRemoveImage(false);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const username = form.username.trim();
    const bio = form.bio.trim();

    if (name.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setError('Username must be 3–30 letters, numbers or underscores.');
      return;
    }
    if (bio.length > MAX_BIO_LENGTH) {
      setError(`Bio must be ${MAX_BIO_LENGTH} characters or fewer.`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const hasImage = Boolean(imageFile);
      const wantsRemove = removeImage && !hasImage;

      let data;
      if (hasImage || wantsRemove) {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('username', username);
        fd.append('bio', bio);
        if (hasImage) fd.append('profile_image', imageFile);
        if (wantsRemove) fd.append('remove_profile_image', 'true');
        data = await api.put('/users/profile', fd, true);
      } else {
        data = await api.put('/users/profile', { name, username, bio });
      }

      onSaved?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const previewUser = {
    ...currentUser,
    ...form,
    profileImage: imageFile ? imagePreview : removeImage ? null : currentUser.profileImage,
  };

  return (
    <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
      <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Edit profile</h2>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Avatar user={previewUser} size={64} />
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="file-input"
            onChange={handleFileChange}
          />
          <span
            className="file-button"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fileInputRef.current?.click();
            }}
          >
            Change picture
          </span>
          {(currentUser.profileImage || imageFile) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleRemoveImage}
            >
              Remove picture
            </button>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="label" htmlFor="pf-name">
          Name
        </label>
        <input
          id="pf-name"
          className="input"
          value={form.name}
          onChange={setField('name')}
          required
        />
      </div>

      <div className="form-group">
        <label className="label" htmlFor="pf-username">
          Username
        </label>
        <input
          id="pf-username"
          className="input"
          value={form.username}
          onChange={setField('username')}
          required
        />
      </div>

      <div className="form-group">
        <label className="label" htmlFor="pf-bio">
          Bio
        </label>
        <textarea
          id="pf-bio"
          className="textarea"
          style={{ minHeight: 64 }}
          value={form.bio}
          maxLength={MAX_BIO_LENGTH + 50}
          onChange={setField('bio')}
          placeholder="Tell people a little about yourself…"
        />
        <p className="form-hint">{form.bio.length}/{MAX_BIO_LENGTH} characters</p>
      </div>

      <div className="composer-tools">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
