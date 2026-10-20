/** /api/posts routes — feed, CRUD, likes and comments. */

const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const postController = require('../controllers/post.controller');
const commentController = require('../controllers/comment.controller');

const router = express.Router();

// Feed + single post (public; optionalAuth personalises likedByMe).
router.get('/', optionalAuth, postController.getPosts);
router.get('/:id', optionalAuth, postController.getPost);

// Own-post management.
router.post('/', requireAuth, upload.single('image'), postController.createPost);
router.put('/:id', requireAuth, postController.updatePost);
router.delete('/:id', requireAuth, postController.deletePost);

// Likes.
router.post('/:id/like', requireAuth, postController.likePost);
router.delete('/:id/like', requireAuth, postController.unlikePost);

// Comments.
router.get('/:id/comments', commentController.getComments);
router.post('/:id/comments', requireAuth, commentController.createComment);

module.exports = router;
