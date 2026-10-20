/**
 * Image upload service. Uses Cloudinary when configured; otherwise
 * returns a clear 503 so the client can show a helpful message while
 * the rest of the app keeps working (text posts, initials avatars).
 */
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { serviceUnavailable } = require('../utils/errors');

const UPLOAD_FOLDERS = {
  posts: 'social-media/posts',
  avatars: 'social-media/avatars',
};

/**
 * Uploads an in-memory image buffer to Cloudinary.
 * @param {Buffer} buffer - raw image bytes from multer
 * @param {'posts'|'avatars'} folder
 * @returns {Promise<string>} secure CDN URL of the stored image
 */
function uploadImage(buffer, folder = 'posts') {
  if (!isCloudinaryConfigured) {
    throw serviceUnavailable(
      'Image uploads are not enabled on this server. Set the CLOUDINARY_* variables in server/.env to enable them.'
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: UPLOAD_FOLDERS[folder] || UPLOAD_FOLDERS.posts, resource_type: 'image' },
      (error, result) => {
        if (error) {
          console.error('[upload] Cloudinary error:', error.message || error);
          return reject(
            new Error('Image upload failed. Please try again in a moment.')
          );
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { uploadImage, isCloudinaryConfigured };
