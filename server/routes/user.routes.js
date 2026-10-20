/** /api/users routes. */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  getUserById,
  updateProfile,
  getUserPosts,
} = require('../controllers/user.controller');

const router = express.Router();

// Own-profile update (never trusts a client-supplied user id).
router.put('/profile', requireAuth, upload.single('profile_image'), updateProfile);

// Public profile + that user's posts.
router.get('/:id', getUserById);
router.get('/:id/posts', getUserPosts);

module.exports = router;
