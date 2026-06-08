'use strict';

/**
 * Migration 017 – Fix staff_audit_logs foreign keys
 *
 * Migration 015 accidentally re-pointed staff_audit_logs.staff_id
 * and staff_audit_logs.performed_by_staff_id to staff_accounts.id.
 * The staffAuthService uses the users table exclusively, so the FK
 * must reference users.id.  This migration drops the incorrect
 * constraints and re-adds them pointing at users.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Drop any FK constraints pointing at staff_accounts
    const dropConstraints = async () => {
      const names = [
        'staff_audit_logs_staff_id_fkey',
        'staff_audit_logs_performed_by_staff_id_fkey',
        // Sequelize sometimes generates these patterns
        'staff_audit_logs_staff_id_foreign_idx',
        'staff_audit_logs_performed_by_staff_id_foreign_idx',
      ];
      for (const name of names) {
        try { await queryInterface.removeConstraint('staff_audit_logs', name); } catch (_) {}
      }
    };

    await dropConstraints();

    // 2. Re-add FK referencing users.id (safe – may already be there or absent)
    try {
      await queryInterface.changeColumn('staff_audit_logs', 'staff_id', {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    } catch (_) { /* already correct or column changed by other means – ok */ }

    try {
      await queryInterface.changeColumn('staff_audit_logs', 'performed_by_staff_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    } catch (_) { /* same – ok */ }
  },

  async down(queryInterface, _Sequelize) {
    // No destructive rollback needed
    console.log('[migration 017 down] No-op — schema left as-is.');
  },
};
