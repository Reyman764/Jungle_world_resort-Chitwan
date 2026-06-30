'use strict';

/**
 * Migration 021 — Clean up legacy/dead tables + fix an audit-log data-loss bug.
 *
 * 1) Drop `password_reset_tokens` and `staff_accounts`.
 *    These belonged to an earlier staff-auth design that stored staff in
 *    their own `staff_accounts` table. The app was migrated to store staff
 *    in the `users` table instead (see staffAuthService.js, StaffToken,
 *    StaffAuditLog), and migration 017's comment documents the FK mix-up
 *    this caused. Nothing in the codebase has referenced StaffAccount or
 *    PasswordResetToken since — they're dead tables left over from that
 *    migration.
 *
 * 2) Drop `verification_sessions`.
 *    Backed a parallel email-OTP implementation (VerificationSession +
 *    verifyController.sendEmailOtp/confirmEmailOtp) that the frontend
 *    never called. The booking flow's OTP step uses the `verification_tokens`
 *    table (routes/otp.js) exclusively. Dead table, removed alongside the
 *    dead controller code.
 *
 * 3) Fix staff_audit_logs.staff_id: ON DELETE CASCADE → ON DELETE SET NULL.
 *    Bug: permanently deleting a staff account (adminStaffController.deleteStaff)
 *    writes a final "account deleted" audit log row and then deletes the
 *    user. Because staff_id cascaded, deleting the user silently deleted
 *    *every* audit log row for that staff member — including the one
 *    that was just written to record the deletion. An audit trail that
 *    disappears when the audited account is removed defeats its purpose.
 *    SET NULL (matching performed_by_staff_id's existing behavior) keeps
 *    the log rows; the human-readable `details` text already includes the
 *    staff member's email, so the entries stay meaningful after the
 *    account is gone.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1 & 2: drop dead tables (children first for FK safety) ──────────
    await queryInterface.dropTable('password_reset_tokens').catch(() => {});
    await queryInterface.dropTable('staff_accounts').catch(() => {});
    await queryInterface.dropTable('verification_sessions').catch(() => {});

    // ── 3: staff_audit_logs.staff_id → nullable + ON DELETE SET NULL ────
    const dropConstraints = async () => {
      const names = [
        'staff_audit_logs_staff_id_fkey',
        'staff_audit_logs_staff_id_foreign_idx',
      ];
      for (const name of names) {
        try { await queryInterface.removeConstraint('staff_audit_logs', name); } catch (_) {}
      }
    };
    await dropConstraints();

    try {
      await queryInterface.changeColumn('staff_audit_logs', 'staff_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    } catch (_) { /* already correct — ok */ }
  },

  async down(queryInterface, Sequelize) {
    // Restore CASCADE behavior on staff_id (data-preserving direction is
    // intentionally not reversed — the dropped legacy tables are not
    // recreated, since nothing in the app can populate them).
    try {
      await queryInterface.removeConstraint('staff_audit_logs', 'staff_audit_logs_staff_id_fkey');
    } catch (_) {}
    try {
      await queryInterface.changeColumn('staff_audit_logs', 'staff_id', {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    } catch (_) {}
  },
};
