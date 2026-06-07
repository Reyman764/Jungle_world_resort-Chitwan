'use strict';

const router = require('express').Router();
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  listGalleryImages,
  uploadGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
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

router.use(authenticateToken);
router.use(requireRole(['admin', 'manager']));

router.get('/',                                listGalleryImages);
router.post('/upload', upload.single('image'), uploadGalleryImage);
router.patch('/:id',                           updateGalleryImage);
router.delete('/:id',                          deleteGalleryImage);

module.exports = router;
