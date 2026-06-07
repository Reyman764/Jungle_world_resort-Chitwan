'use strict';

module.exports = (sequelize, DataTypes) => {
  const BookingAuditLog = sequelize.define('BookingAuditLog', {
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
    changed_by_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    changed_by: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: 'System',
    },
    changed_by_role: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    field_name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    old_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    new_value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    risk_level: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  }, {
    tableName: 'booking_audit_logs',
    timestamps: true,
    underscored: true,
    updatedAt: false,   // Audit rows are immutable — no updated_at
    indexes: [
      { fields: ['booking_id'] },
      { fields: ['changed_by_id'] },
      { fields: ['created_at'] },
      { fields: ['action'] },
    ],
  });

  return BookingAuditLog;
};
