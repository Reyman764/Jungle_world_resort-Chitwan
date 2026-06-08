'use strict';

const router = require('express').Router();
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getOffer,
  uploadOffer,
  deleteOffer,
} = require('../controllers/adminController');

// Multer: memory storage, 10 MB limit, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// Admin routes require auth + admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/',                               getOffer);
router.post('/upload', upload.single('image'), uploadOffer);
router.delete('/',                            deleteOffer);

module.exports = router;
