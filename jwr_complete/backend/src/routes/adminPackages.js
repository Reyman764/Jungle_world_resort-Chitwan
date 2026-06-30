'use strict';

const router = require('express').Router();
const multer = require('multer');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { imageFileFilter } = require('../utils/cloudinaryUpload');
const {
  listAdminPackages,
  updatePackage,
  updatePromoSettings,
  uploadPackageImage,
  getCurrencyRatesHandler,
  updateCurrencyRatesHandler,
} = require('../controllers/packageController');

// Multer: store upload in memory (max 5 MB), explicit safe image types only
// (no image/svg+xml — SVGs can carry embedded scripts).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
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
