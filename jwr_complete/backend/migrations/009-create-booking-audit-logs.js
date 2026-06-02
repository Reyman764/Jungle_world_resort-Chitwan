'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('booking_audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Which booking this log entry belongs to',
      },
      changed_by_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Staff member who made the change',
      },
      changed_by: {
        type: Sequelize.STRING(150),
        allowNull: false,
        defaultValue: 'System',
        comment: 'Display name of who made the change (snapshot)',
      },
      changed_by_role: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Role of the staff member at time of change',
      },
      action: {
        type: Sequelize.STRING(80),
        allowNull: false,
        comment: 'e.g. BOOKING_STATUS_CHANGED, PAYMENT_STATUS_CHANGED, PAID_AMOUNT_UPDATED, NOTES_UPDATED',
      },
      field_name: {
        type: Sequelize.STRING(80),
        allowNull: false,
        comment: 'The DB column that changed',
      },
      old_value: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Serialised previous value',
      },
      new_value: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Serialised new value',
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IPv4 or IPv6 of the request',
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser or client user agent snapshot',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Extra immutable context about the change',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      // No updated_at – audit rows are immutable
    });

    await queryInterface.addIndex('booking_audit_logs', ['booking_id']);
    await queryInterface.addIndex('booking_audit_logs', ['changed_by_id']);
    await queryInterface.addIndex('booking_audit_logs', ['created_at']);
    await queryInterface.addIndex('booking_audit_logs', ['action']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('booking_audit_logs');
  },
};
