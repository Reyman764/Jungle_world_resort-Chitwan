'use strict';

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    booking_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'bookings', key: 'id' },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    payment_method: {
      type: DataTypes.ENUM('stripe', 'khalti', 'bank_transfer', 'cash'),
      allowNull: false,
    },
    // External transaction ID from payment gateway
    transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    // Raw response from payment gateway (for debugging)
    gateway_response: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending',
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    refund_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refund_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['booking_id'] },
      { fields: ['status'] },
      { unique: true, fields: ['transaction_id'], where: { transaction_id: { [require('sequelize').Op.ne]: null } } },
    ],
  });

  return Payment;
};
