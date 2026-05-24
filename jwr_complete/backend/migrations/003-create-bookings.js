'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      booking_reference: {
        type: Sequelize.STRING(25),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      package_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'packages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      guest_name:        { type: Sequelize.STRING(255), allowNull: false },
      guest_email:       { type: Sequelize.STRING(255), allowNull: false },
      guest_phone:       { type: Sequelize.STRING(20),  allowNull: true },
      guest_nationality: { type: Sequelize.STRING(50),  allowNull: true },
      guest_category: {
        type: Sequelize.ENUM('foreigner', 'saarc', 'nepali'),
        allowNull: false,
        defaultValue: 'foreigner',
      },
      check_in_date:  { type: Sequelize.DATEONLY, allowNull: false },
      check_out_date: { type: Sequelize.DATEONLY, allowNull: false },
      num_adults:   { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      num_children: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      special_requests: { type: Sequelize.TEXT, allowNull: true },
      currency:      { type: Sequelize.STRING(3),     allowNull: false, defaultValue: 'USD' },
      base_price:    { type: Sequelize.DECIMAL(10,2), allowNull: false },
      service_charge:{ type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      vat:           { type: Sequelize.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
      total_price:   { type: Sequelize.DECIMAL(10,2), allowNull: false },
      paid_amount:   { type: Sequelize.DECIMAL(10,2), defaultValue: 0 },
      balance_due:   { type: Sequelize.DECIMAL(10,2), defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('draft','confirmed','checked_in','checked_out','cancelled','no_show'),
        defaultValue: 'draft',
        allowNull: false,
      },
      payment_status: {
        type: Sequelize.ENUM('pending','partial','completed','refunded','failed'),
        defaultValue: 'pending',
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.ENUM('stripe','khalti','bank_transfer','pay_at_hotel','cash'),
        allowNull: true,
      },
      cancellation_reason: { type: Sequelize.TEXT,         allowNull: true },
      cancelled_at:        { type: Sequelize.DATE,         allowNull: true },
      refund_amount:       { type: Sequelize.DECIMAL(10,2),allowNull: true },
      source:      { type: Sequelize.STRING(50),  defaultValue: 'direct' },
      utm_campaign:{ type: Sequelize.STRING(100), allowNull: true },
      admin_notes: { type: Sequelize.TEXT,        allowNull: true },
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

    await queryInterface.addIndex('bookings', ['booking_reference'], { unique: true });
    await queryInterface.addIndex('bookings', ['user_id']);
    await queryInterface.addIndex('bookings', ['package_id']);
    await queryInterface.addIndex('bookings', ['check_in_date', 'check_out_date']);
    await queryInterface.addIndex('bookings', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bookings');
  },
};
