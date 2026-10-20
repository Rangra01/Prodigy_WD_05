/**
 * Multer upload middleware: accepts one optional image into memory,
 * max 5 MB. The buffer is handed to Cloudinary by the upload service.
 */
const multer = require('multer');

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = /^image\/(png|jpe?g|gif|webp)$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.test(file.mimetype)) return cb(null, true);
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        'Only image files are allowed (PNG, JPG, GIF, WebP).'
      )
    );
  },
});

module.exports = { upload, MAX_IMAGE_SIZE };
