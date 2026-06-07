'use strict';

module.exports = (sequelize, DataTypes) => {
  const StaffToken = sequelize.define('StaffToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    staff_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    token_type: {
      type: DataTypes.ENUM('email_verification', 'password_reset'),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'staff_tokens',
    timestamps: true,
    underscored: true,
  });

  return StaffToken;
};
