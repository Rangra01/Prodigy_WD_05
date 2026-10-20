import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Avatar from './Avatar';

const MAX_POST_LENGTH = 1000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // matches server limit

/**
 * "What's on your mind?" box. Posts text and/or an image (multipart
 * upload). Calls onPosted(newPost) so the feed can prepend it.
 */
export default function PostComposer({ onPosted }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed && !imageFile) {
      setError('Write something or add an image first.');
      return;
    }
    if (trimmed.length > MAX_POST_LENGTH) {
      setError(`Posts are limited to ${MAX_POST_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      let data;
      if (imageFile) {
        const form = new FormData();
        form.append('content', trimmed);
        form.append('image', imageFile);
        data = await api.post('/posts', form, true);
      } else {
        data = await api.post('/posts', { content: trimmed });
      }

      setContent('');
      clearImage();
      onPosted?.(data.post);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card composer" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="composer-row">
        <Avatar user={user} size={44} />
        <div className="composer-body">
          <label className="label" htmlFor="composer-content">
            Create a post
          </label>
          <textarea
            id="composer-content"
            className="textarea"
            placeholder={`What's on your mind, ${user?.name?.split(' ')[0] || 'friend'}?`}
            value={content}
            maxLength={MAX_POST_LENGTH + 200}
            onChange={(e) => setContent(e.target.value)}
          />

          {imagePreview && (
            <div className="composer-preview">
              <img src={imagePreview} alt="Selected preview" />
              <button
                type="button"
                className="preview-remove"
                onClick={clearImage}
                title="Remove image"
              >
                ✕
              </button>
            </div>
          )}

          <div className="composer-actions">
            <div className="composer-tools">
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
                🖼 Add image
              </span>
              <span
                className={
                  content.length > MAX_POST_LENGTH ? 'char-count over' : 'char-count'
                }
              >
                {content.length}/{MAX_POST_LENGTH}
              </span>
            </div>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
