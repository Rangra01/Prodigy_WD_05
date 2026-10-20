/** /api/comments routes (deletion only; creation lives under posts). */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { deleteComment } = require('../controllers/comment.controller');

const router = express.Router();

router.delete('/:id', requireAuth, deleteComment);

module.exports = router;
