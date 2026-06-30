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
      allowNull: true,
      // References users.id (nullable — ON DELETE SET NULL). When a staff
      // account is permanently deleted, its audit history is kept with
      // staff_id cleared rather than being cascade-deleted; the `details`
      // text retains the staff member's email for context.
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
