'use strict';

const router = require('express').Router();
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { imageFileFilter } = require('../utils/cloudinaryUpload');
const {
  listGalleryImages,
  uploadGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
} = require('../controllers/adminController');

// Multer: memory storage, 10 MB limit, explicit safe image types only
// (no image/svg+xml — SVGs can carry embedded scripts).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

router.use(authenticateToken);
router.use(requireRole(['admin', 'manager']));

router.get('/',                                listGalleryImages);
router.post('/upload', upload.single('image'), uploadGalleryImage);
router.patch('/:id',                           updateGalleryImage);
router.delete('/:id',                          deleteGalleryImage);

module.exports = router;
