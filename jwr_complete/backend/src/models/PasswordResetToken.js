'use strict';

module.exports = (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define('PasswordResetToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    staff_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'staff_accounts', key: 'id' },
    },
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'bcrypt hash of the raw reset token',
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
    tableName: 'password_reset_tokens',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['staff_id'] },
      { fields: ['expires_at'] },
    ],
  });

  return PasswordResetToken;
};
