'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
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
        onDelete: 'RESTRICT',
      },
      amount:          { type: Sequelize.DECIMAL(10,2), allowNull: false },
      currency:        { type: Sequelize.STRING(3),     allowNull: false, defaultValue: 'USD' },
      payment_method: {
        type: Sequelize.ENUM('stripe','khalti','bank_transfer','cash'),
        allowNull: false,
      },
      transaction_id:   { type: Sequelize.STRING(255), allowNull: true },
      gateway_response: { type: Sequelize.JSONB,       allowNull: true },
      status: {
        type: Sequelize.ENUM('pending','completed','failed','refunded'),
        defaultValue: 'pending',
        allowNull: false,
      },
      payment_date:  { type: Sequelize.DATE,          allowNull: true },
      refund_amount: { type: Sequelize.DECIMAL(10,2), allowNull: true },
      refund_date:   { type: Sequelize.DATE,          allowNull: true },
      refund_reason: { type: Sequelize.TEXT,          allowNull: true },
      notes:         { type: Sequelize.TEXT,          allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('payments', ['booking_id']);
    await queryInterface.addIndex('payments', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  },
};
