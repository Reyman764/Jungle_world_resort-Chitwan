'use strict';

/**
 * Staff Authentication Controller
 *
 * Handles HTTP layer for staff auth endpoints.
 * Delegates all business logic to staffAuthService.
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const staffAuthService = require('../services/staffAuthService');

const JWT_SECRET   = process.env.JWT_SECRET   || 'change-me-in-production';
const JWT_EXPIRES  = process.env.JWT_EXPIRES_IN || '7d';

// ── Helpers ────────────────────────────────────────────────────

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function clientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    null
  );
}

function generateJwt(staff) {
  return jwt.sign(
    { id: staff.id, email: staff.email, role: staff.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ── Controller ─────────────────────────────────────────────────

class StaffAuthController {
  // ── POST /signup ─────────────────────────────────────────────
  /**
   * Create a new pending staff account and send verification email.
   * Body: { email, password, firstName, lastName }
   */
  async signup(req, res, next) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // ── Validation ──────────────────────────────────────────
      if (!email || !password || !firstName) {
        return res.status(400).json({ error: 'Email, password, and first name are required' });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }
      if (String(password).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      if (String(firstName).trim().length < 1) {
        return res.status(400).json({ error: 'First name is required' });
      }

      const result = await staffAuthService.createStaffAccount({
        email,
        password,
        firstName: firstName.trim(),
        lastName:  lastName ? String(lastName).trim() : '',
      });

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.status(201).json({
        success:  true,
        message:  result.message,
        staffId:  result.staffId,
        email:    result.email,
        status:   result.status,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── GET /verify-email?token=xxx ──────────────────────────────
  /**
   * Verify staff email address from the link sent in the email.
   * Query: token
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.query;

      if (!token || String(token).trim().length < 20) {
        return res.status(400).json({ error: 'A valid verification token is required' });
      }

      const result = await staffAuthService.verifyEmail(token.trim());

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.json({ success: true, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  // ── POST /login ──────────────────────────────────────────────
  /**
   * Authenticate a staff member, return JWT + staff info.
   * Body: { email, password }
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const ip = clientIp(req);
      const result = await staffAuthService.login({ email, password, ipAddress: ip });

      if (!result.success) {
        return res.status(401).json({ error: result.message });
      }

      const token = generateJwt(result.staff);

      return res.json({
        success:             true,
        message:             result.message,
        token,
        access_token:        token,   // legacy alias used by some clients
        must_change_password: result.staff.must_change_password ?? false,
        staff:               result.staff,
        user:                result.staff, // legacy alias for AdminDashboard
      });
    } catch (err) {
      next(err);
    }
  }

  // ── POST /request-password-reset ─────────────────────────────
  /**
   * Send a password reset link to an email address.
   * Always returns 200 (don't reveal whether email exists).
   * Body: { email }
   */
  async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }

      // Service always returns success for security
      const result = await staffAuthService.requestPasswordReset(email);
      return res.json({ success: true, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  // ── POST /reset-password ──────────────────────────────────────
  /**
   * Reset password using a valid token from the email link.
   * Body: { token, password }
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Reset token is required' });
      }
      if (!password || String(password).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const result = await staffAuthService.resetPassword({ token, newPassword: password });

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.json({ success: true, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  // ── POST /change-password (protected) ────────────────────────
  /**
   * Change password for authenticated staff member.
   * Body: { oldPassword, newPassword }
   * Requires: authenticateStaffToken middleware (sets req.staffUser)
   */
  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      const staffId = req.staffUser?.id || req.user?.id;
      const ip      = clientIp(req);

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      if (String(newPassword).length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      if (!staffId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const result = await staffAuthService.changePassword({
        staffId,
        oldPassword,
        newPassword,
        ipAddress: ip,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.json({ success: true, message: result.message });
    } catch (err) {
      next(err);
    }
  }

  // ── POST /force-change-password (protected) ──────────────────
  /**
   * Set a new password for a must_change_password account — no old password required.
   * Only works when the authenticated staff member has must_change_password = true.
   * Body: { newPassword }
   */
  async forceChangePassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      const staffId = req.staffUser?.id || req.user?.id;

      if (!staffId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      if (!newPassword || String(newPassword).length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }

      const { User }  = require('../models');
      const bcrypt    = require('bcryptjs');
      const staff     = await User.findByPk(staffId);

      if (!staff) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (!staff.must_change_password) {
        return res.status(400).json({ error: 'No forced password change is required for this account' });
      }

      const BCRYPT_ROUNDS = staffAuthService.BCRYPT_ROUNDS || 12;
      const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await staff.update({ password_hash, must_change_password: false });

      staffAuthService.logAuditEvent(
        staff.id, 'PASSWORD_FORCE_CHANGED',
        'Password changed on first login (temporary password replaced)',
        staff.id, clientIp(req)
      );

      return res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
      next(err);
    }
  }


  /**
   * Return current authenticated staff member's info.
   * Requires: authenticateStaffToken middleware
   */
  async getCurrentStaff(req, res, next) {
    try {
      const staffId = req.staffUser?.id || req.user?.id;

      if (!staffId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const staff = await User.findByPk(staffId, {
        attributes: { exclude: ['password_hash', 'refresh_token', 'password_reset_token'] },
      });

      if (!staff) {
        return res.status(404).json({ error: 'Staff account not found' });
      }

      return res.json({
        success: true,
        staff:   staffAuthService.publicStaffInfo(staff),
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StaffAuthController();
