/**
 * Cloudinary setup. Image uploads only work when all three
 * CLOUDINARY_* variables are present in server/.env — the rest of the
 * app (text posts, initials avatars) works fine without them.
 */
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

module.exports = { cloudinary, isCloudinaryConfigured };
