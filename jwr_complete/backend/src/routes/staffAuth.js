'use strict';

/**
 * Staff Authentication Routes
 * Base path: /api/staff/auth
 *
 * PUBLIC  → no middleware
 * PRIVATE → authenticateStaffToken middleware
 */

const router = require('express').Router();
const staffAuthController  = require('../controllers/staffAuthController');
const { authenticateStaffToken } = require('../middleware/auth');

// ── Public routes ─────────────────────────────────────────────

/**
 * POST /api/staff/auth/signup  — DISABLED
 * Staff accounts are created by admins only via /api/admin/staff
 */
router.post('/signup', (_req, res) =>
  res.status(410).json({
    error: 'Self-registration is disabled. Contact an administrator to create your account.',
  })
);

/**
 * GET /api/staff/auth/verify-email?token=xxx
 * Verify email from the link in the verification email.
 */
router.get('/verify-email', staffAuthController.verifyEmail.bind(staffAuthController));

/**
 * POST /api/staff/auth/login
 * Authenticate and receive a JWT token.
 * Body: { email, password }
 */
router.post('/login', staffAuthController.login.bind(staffAuthController));

/**
 * POST /api/staff/auth/request-password-reset
 * Request a password reset link (always returns 200 for security).
 * Body: { email }
 */
router.post('/request-password-reset', staffAuthController.requestPasswordReset.bind(staffAuthController));

/**
 * POST /api/staff/auth/reset-password
 * Reset password using the token from the email link.
 * Body: { token, password }
 */
router.post('/reset-password', staffAuthController.resetPassword.bind(staffAuthController));

// ── Protected routes ──────────────────────────────────────────

/**
 * POST /api/staff/auth/force-change-password
 * Set new password when must_change_password is true (first login).
 * Does not require old password — only valid when the flag is set.
 */
router.post(
  '/force-change-password',
  authenticateStaffToken,
  staffAuthController.forceChangePassword.bind(staffAuthController)
);

/**
 * POST /api/staff/auth/change-password
 * Change password for the currently authenticated staff member.
 * Body: { oldPassword, newPassword }
 */
router.post(
  '/change-password',
  authenticateStaffToken,
  staffAuthController.changePassword.bind(staffAuthController)
);

/**
 * GET /api/staff/auth/me
 * Return the currently authenticated staff member's profile.
 */
router.get(
  '/me',
  authenticateStaffToken,
  staffAuthController.getCurrentStaff.bind(staffAuthController)
);

module.exports = router;
