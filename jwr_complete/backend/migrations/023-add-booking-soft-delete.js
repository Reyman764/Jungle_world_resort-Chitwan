'use strict';

/**
 * Migration 023 — Booking recycle bin (soft delete)
 *
 * Problem: DELETE /api/admin/bookings/:id hard-deletes the booking row
 * (plus its payments, reviews, and audit log — see adminController.deleteBooking).
 * Any staff/admin/manager can call it, and once called there is zero trace
 * of the booking ever existing, who removed it, or when. A staff member
 * could delete a draft, partial, or fully-paid booking to hide it, and
 * nothing in the system would show that it happened.
 *
 * Fix: add soft-delete columns to `bookings`. Deleting a booking now sets
 * these columns instead of removing the row. Only admins can permanently
 * erase a booking (from the recycle bin) or restore it back to normal.
 *
 * - deleted_at:       NULL = active/normal booking. Non-null = in the
 *                     recycle bin. This is the single source of truth
 *                     every other query in the app filters on.
 * - deleted_by_id:    FK → users.id of whoever deleted it. ON DELETE
 *                     SET NULL (matches marked_spam_by / changed_by_id
 *                     elsewhere) so removing a staff account later
 *                     doesn't cascade-wipe this trail.
 * - deleted_by_name:  Point-in-time snapshot of the deleter's display
 *                     name, so the recycle bin still shows "who did this"
 *                     even after deleted_by_id goes NULL.
 * - deleted_by_role:  Snapshot of their role at time of deletion
 *                     (staff / manager / admin) for the same reason.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const bookings = await queryInterface.describeTable('bookings');

    if (!bookings.deleted_at) {
      await queryInterface.addColumn('bookings', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!bookings.deleted_by_id) {
      await queryInterface.addColumn('bookings', 'deleted_by_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
    if (!bookings.deleted_by_name) {
      await queryInterface.addColumn('bookings', 'deleted_by_name', {
        type: Sequelize.STRING(150),
        allowNull: true,
      });
    }
    if (!bookings.deleted_by_role) {
      await queryInterface.addColumn('bookings', 'deleted_by_role', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }

    // Every list/stat/lookup query filters `WHERE deleted_at IS NULL` (or
    // the recycle bin's `WHERE deleted_at IS NOT NULL`) — index it.
    try {
      await queryInterface.addIndex('bookings', ['deleted_at'], {
        name: 'bookings_deleted_at_idx',
      });
    } catch (_) { /* already exists */ }
  },

  async down(queryInterface) {
    try { await queryInterface.removeIndex('bookings', 'bookings_deleted_at_idx'); } catch (_) {}
    await queryInterface.removeColumn('bookings', 'deleted_by_role');
    await queryInterface.removeColumn('bookings', 'deleted_by_name');
    await queryInterface.removeColumn('bookings', 'deleted_by_id');
    await queryInterface.removeColumn('bookings', 'deleted_at');
  },
};
