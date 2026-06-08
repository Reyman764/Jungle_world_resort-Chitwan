'use strict';

const router = require('express').Router();
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  listAdminPackages,
  updatePackage,
  updatePromoSettings,
  uploadPackageImage,
  getCurrencyRatesHandler,
  updateCurrencyRatesHandler,
} = require('../controllers/packageController');

// Multer: store upload in memory (max 5 MB, images only)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

router.use(authenticateToken);
router.use(requireRole(['admin', 'manager']));

router.get('/', listAdminPackages);
router.patch('/promo', updatePromoSettings);

// Currency rates — must be before /:id to avoid collision
router.get('/currency-rates',   getCurrencyRatesHandler);
router.patch('/currency-rates', updateCurrencyRatesHandler);

router.patch('/:id', updatePackage);
router.post('/:id/image', upload.single('image'), uploadPackageImage);

module.exports = router;
