'use strict';

const router = require('express').Router();
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { imageFileFilter } = require('../utils/cloudinaryUpload');
const {
  getOffer,
  uploadOffer,
  deleteOffer,
} = require('../controllers/adminController');

// Multer: memory storage, 10 MB limit, explicit safe image types only
// (no image/svg+xml — SVGs can carry embedded scripts).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

// Admin routes require auth + admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/',                               getOffer);
router.post('/upload', upload.single('image'), uploadOffer);
router.delete('/',                            deleteOffer);

module.exports = router;
