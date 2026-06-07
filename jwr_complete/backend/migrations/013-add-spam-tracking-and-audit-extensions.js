'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const bookings = await queryInterface.describeTable('bookings');

    if (!bookings.is_spam) {
      await queryInterface.addColumn('bookings', 'is_spam', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!bookings.spam_reason) {
      await queryInterface.addColumn('bookings', 'spam_reason', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
    if (!bookings.marked_spam_at) {
      await queryInterface.addColumn('bookings', 'marked_spam_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!bookings.marked_spam_by) {
      await queryInterface.addColumn('bookings', 'marked_spam_by', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    const auditLogs = await queryInterface.describeTable('booking_audit_logs');
    if (!auditLogs.reason) {
      await queryInterface.addColumn('booking_audit_logs', 'reason', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
    if (!auditLogs.risk_level) {
      await queryInterface.addColumn('booking_audit_logs', 'risk_level', {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
    }

    try {
      await queryInterface.addIndex('bookings', ['is_spam', 'created_at'], {
        name: 'bookings_is_spam_created_at',
      });
    } catch (_) { /* already exists */ }
  },

  async down(queryInterface) {
    try { await queryInterface.removeIndex('bookings', 'bookings_is_spam_created_at'); } catch (_) {}
    await queryInterface.removeColumn('booking_audit_logs', 'risk_level');
    await queryInterface.removeColumn('booking_audit_logs', 'reason');
    await queryInterface.removeColumn('bookings', 'marked_spam_by');
    await queryInterface.removeColumn('bookings', 'marked_spam_at');
    await queryInterface.removeColumn('bookings', 'spam_reason');
    await queryInterface.removeColumn('bookings', 'is_spam');
  },
};
