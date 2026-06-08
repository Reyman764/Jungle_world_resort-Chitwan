'use strict';

module.exports = (sequelize, DataTypes) => {
  const StaffAuditLog = sequelize.define('StaffAuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    staff_id: {
      type: DataTypes.UUID,
      allowNull: false,
      // References users.id — staffAuthService stores staff in the users table
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    performed_by_staff_id: {
      type: DataTypes.UUID,
      allowNull: true,
      // References users.id (nullable)
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
  }, {
    tableName: 'staff_audit_logs',
    timestamps: true,
    underscored: true,
    updatedAt: false,
  });

  return StaffAuditLog;
};
