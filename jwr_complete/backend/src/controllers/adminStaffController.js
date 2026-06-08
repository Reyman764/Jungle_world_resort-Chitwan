'use strict';

/**
 * Admin Staff Controller
 *
 * Allows admins and managers to list, update roles, and update
 * statuses of staff accounts. All operations are on the User model
 * (staff / admin roles).
 */

const { User, StaffAuditLog } = require('../models');
const staffAuthService = require('../services/staffAuthService');
const { Op } = require('sequelize');

const STAFF_ROLES    = ['staff', 'admin'];
const STAFF_STATUSES = ['pending', 'active', 'inactive', 'suspended'];

// ── Helpers ────────────────────────────────────────────────────

function publicUser(user) {
  return {
    id:                   user.id,
    email:                user.email,
    first_name:           user.first_name,
    last_name:            user.last_name,
    role:                 user.role,
    status:               user.account_status ?? 'active',
    last_login:           user.last_login,
    created_at:           user.created_at,
    must_change_password: user.must_change_password ?? false,
  };
}

async function logAdminAction(staffId, action, details, performedBy) {
  try {
    await StaffAuditLog.create({
      staff_id:              staffId,
      action,
      details:               typeof details === 'string' ? details : JSON.stringify(details),
      performed_by_staff_id: performedBy,
    });
  } catch (err) {
    console.error('[adminStaff] audit log failed:', err.message);
  }
}

// ── Controller ─────────────────────────────────────────────────

class AdminStaffController {
  // ── GET /api/admin/staff ──────────────────────────────────────
  /**
   * Return all staff/admin accounts with their status and last login.
   */
  async getStaff(req, res, next) {
    try {
      const users = await User.findAll({
        where: { role: { [Op.in]: STAFF_ROLES } },
        attributes: {
          exclude: ['password_hash', 'refresh_token', 'password_reset_token', 'google_id'],
        },
        order: [['created_at', 'ASC']],
      });

      return res.json({ success: true, staff: users.map(publicUser) });
    } catch (err) {
      next(err);
    }
  }

  // ── PATCH /api/admin/staff/:id/role ──────────────────────────
  /**
   * Change a staff member's role.
   * Body: { role: 'staff' | 'admin' }
   */
  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminId = req.user?.id;

      if (!role || !STAFF_ROLES.includes(role)) {
        return res.status(400).json({
          error: `Role must be one of: ${STAFF_ROLES.join(', ')}`,
        });
      }

      const target = await User.findOne({
        where: { id, role: { [Op.in]: STAFF_ROLES } },
      });

      if (!target) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      // Prevent demoting yourself
      if (target.id === adminId && role !== 'admin') {
        return res.status(400).json({ error: 'You cannot change your own admin role' });
      }

      const oldRole = target.role;
      await target.update({ role });

      await logAdminAction(
        target.id,
        'ROLE_CHANGED',
        `Role changed from ${oldRole} to ${role}`,
        adminId
      );

      return res.json({
        success: true,
        message: `Role updated to ${role}`,
        staff:   publicUser(target),
      });
    } catch (err) {
      next(err);
    }
  }

  // ── PATCH /api/admin/staff/:id/status ────────────────────────
  /**
   * Change a staff member's account status.
   * Body: { status: 'pending' | 'active' | 'inactive' | 'suspended' }
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const adminId = req.user?.id;

      if (!status || !STAFF_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `Status must be one of: ${STAFF_STATUSES.join(', ')}`,
        });
      }

      const target = await User.findOne({
        where: { id, role: { [Op.in]: STAFF_ROLES } },
      });

      if (!target) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      // Prevent suspending yourself
      if (target.id === adminId && ['inactive', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'You cannot deactivate your own account' });
      }

      const oldStatus = target.account_status ?? 'active';
      await target.update({ account_status: status });

      await logAdminAction(
        target.id,
        'STATUS_CHANGED',
        `Status changed from ${oldStatus} to ${status}`,
        adminId
      );

      return res.json({
        success: true,
        message: `Status updated to ${status}`,
        staff:   publicUser(target),
      });
    } catch (err) {
      next(err);
    }
  }

  // ── GET /api/admin/staff/:id/logs ────────────────────────────
  /**
   * Fetch audit log entries for a specific staff member.
   */
  async getStaffLogs(req, res, next) {
    try {
      const { id } = req.params;
      const limit  = Math.min(parseInt(req.query.limit) || 50, 200);

      const target = await User.findOne({
        where: { id, role: { [Op.in]: STAFF_ROLES } },
        attributes: ['id', 'email', 'first_name', 'last_name'],
      });

      if (!target) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      const logs = await StaffAuditLog.findAll({
        where:  { staff_id: id },
        order:  [['created_at', 'DESC']],
        limit,
      });

      return res.json({ success: true, staff: publicUser(target), logs });
    } catch (err) {
      next(err);
    }
  }
  // ── POST /api/admin/staff ─────────────────────────────────────
  /**
   * Admin creates a staff account with temporary password.
   * Account is immediately active; staff must change password on first login.
   * Body: { email, password, firstName, lastName, role }
   */
  async createStaff(req, res, next) {
    try {
      const { email, password, firstName, lastName, role = 'staff' } = req.body;
      const adminId = req.user?.id;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
      }

      const result = await staffAuthService.createStaffByAdmin({
        email,
        password,
        firstName,
        lastName,
        role,
        createdByAdminId: adminId,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.status(201).json({
        success: true,
        message: result.message,
        staff:   result.staff,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── DELETE /api/admin/staff/:id ────────────────────────────
  /**
   * Admin permanently deletes a staff account.
   */
  async deleteStaff(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      if (id === adminId) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }

      const target = await User.findOne({
        where: { id, role: { [Op.in]: STAFF_ROLES } },
      });

      if (!target) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      await logAdminAction(
        target.id,
        'STAFF_ACCOUNT_DELETED',
        `Account permanently deleted by admin (${target.email})`,
        adminId
      );

      await target.destroy();

      return res.json({ success: true, message: 'Staff account deleted' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminStaffController();
