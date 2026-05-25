'use strict';

module.exports = (sequelize, DataTypes) => {
  const VerificationSession = sequelize.define('VerificationSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email_otp_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    email_otp_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    phone_otp_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone_otp_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    phone_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    tableName: 'verification_sessions',
    timestamps: true,
    underscored: true,
  });

  return VerificationSession;
};
