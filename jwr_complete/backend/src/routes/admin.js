'use strict';

const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getBookings,
  getBookingById,
  updateBooking,
  getAuditLogs,
  getDashboardStats,
} = require('../controllers/adminController');

// All admin routes require authentication + staff/admin/manager role
router.use(authenticateToken);
router.use(requireRole(['admin', 'manager', 'staff']));

router.get('/',                   getBookings);
router.get('/stats',              getDashboardStats);
router.get('/:id/audit-logs',     getAuditLogs);   // ← NEW: audit history
router.get('/:id',                getBookingById);
router.patch('/:id',              updateBooking);

module.exports = router;
