'use strict';

const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  listAdminPackages,
  updatePackage,
  updatePromoSettings,
} = require('../controllers/packageController');

router.use(authenticateToken);
router.use(requireRole(['admin', 'manager']));

router.get('/', listAdminPackages);
router.patch('/promo', updatePromoSettings);
router.patch('/:id', updatePackage);

module.exports = router;
