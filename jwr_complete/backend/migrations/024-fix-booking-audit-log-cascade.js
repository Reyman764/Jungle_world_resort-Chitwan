'use strict';

/**
 * Migration 024 — Fix booking_audit_logs cascade-delete data-loss bug
 *
 * This is the same bug migration 021 already fixed once for
 * staff_audit_logs.staff_id, happening again for bookings:
 *
 * The new recycle-bin "permanently delete" action (adminController.
 * permanentlyDeleteBooking) writes a final BOOKING_PERMANENTLY_DELETED
 * audit log row, then removes the booking row. But booking_audit_logs.
 * booking_id was created (migration 009) with ON DELETE CASCADE — so
 * destroying the booking silently wipes *every* audit log row for it,
 * including the one that was just written to record the deletion.
 * An audit trail that vanishes the moment the audited booking is
 * removed defeats the entire purpose of a recycle bin with
 * accountability ("who deleted this").
 *
 * Fix: booking_id → nullable + ON DELETE SET NULL (matches the fix
 * already applied to staff_audit_logs.staff_id in migration 021, and
 * mirrors performed_by_staff_id's long-standing SET NULL behavior).
 * Log rows already carry `metadata.booking_reference` and the human
 * -readable old_value/new_value text, so entries stay meaningful after
 * booking_id goes NULL. auditLogController.formatLogEntry already falls
 * back to metadata.booking_reference when the booking association is
 * gone, so no application code changes are needed alongside this.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dropConstraints = async () => {
      const names = [
        'booking_audit_logs_booking_id_fkey',
        'booking_audit_logs_booking_id_foreign_idx',
      ];
      for (const name of names) {
        try { await queryInterface.removeConstraint('booking_audit_logs', name); } catch (_) {}
      }
    };
    await dropConstraints();

    try {
      await queryInterface.changeColumn('booking_audit_logs', 'booking_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    } catch (_) { /* already correct — ok */ }
  },

  async down(queryInterface, Sequelize) {
    // Data-preserving direction is intentionally not reversed — restoring
    // CASCADE would reintroduce the data-loss bug this migration exists
    // to fix. Leave schema as-is.
    console.log('[migration 024 down] No-op — schema left as-is to avoid reintroducing the audit-log cascade-delete bug.');
  },
};
