'use strict';

const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getAuditLogs,
  getDashboardStats,
  getMonthlyTrend,
  exportBookingsCSV,
  deleteUser,
} = require('../controllers/adminController');
const { listAuditLogs } = require('../controllers/auditLogController');
const adminStaffController = require('../controllers/adminStaffController');

// All admin routes require authentication + staff/admin/manager role
router.use(authenticateToken);
router.use(requireRole(['admin', 'manager', 'staff']));

// ── Stats + audit (no :id wildcard) ───────────────────────
router.get('/audit-logs',    listAuditLogs);
router.get('/stats',         getDashboardStats);
router.get('/stats/monthly', getMonthlyTrend);
router.get('/export/csv',    exportBookingsCSV);

// ── Staff management (must come before /:id wildcard) ─────
router.get(
  '/staff',
  requireRole(['admin', 'manager']),
  adminStaffController.getStaff.bind(adminStaffController)
);
router.post(
  '/staff',
  requireRole(['admin']),
  adminStaffController.createStaff.bind(adminStaffController)
);
router.patch(
  '/staff/:id/role',
  requireRole(['admin']),
  adminStaffController.updateRole.bind(adminStaffController)
);
router.patch(
  '/staff/:id/status',
  requireRole(['admin', 'manager']),
  adminStaffController.updateStatus.bind(adminStaffController)
);
router.get(
  '/staff/:id/logs',
  requireRole(['admin', 'manager']),
  adminStaffController.getStaffLogs.bind(adminStaffController)
);
router.delete(
  '/staff/:id',
  requireRole(['admin']),
  adminStaffController.deleteStaff.bind(adminStaffController)
);

// ── Booking CRUD ──────────────────────────────────────────
router.get('/',                getBookings);
router.delete('/users/:id',    deleteUser);
router.delete('/bookings/:id', deleteBooking);
router.get('/:id/audit-logs',  getAuditLogs);
router.patch('/:id',           updateBooking);
router.get('/:id',             getBookingById);

module.exports = router;
