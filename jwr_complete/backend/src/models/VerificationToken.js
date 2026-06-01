'use strict';

/**
 * backend/src/models/VerificationToken.js
 *
 * Sequelize model for the verification_tokens table.
 * Used by the /api/otp endpoints to store & validate 6-digit booking OTPs.
 */

module.exports = (sequelize, DataTypes) => {
  const VerificationToken = sequelize.define('VerificationToken', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },
    email: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      validate:  { isEmail: true },
    },
    /** bcrypt hash of the 6-digit OTP — never store plaintext */
    code: {
      type:      DataTypes.STRING(255),
      allowNull: false,
    },
    expires_at: {
      type:      DataTypes.DATE,
      allowNull: false,
      comment:   '10 minutes from creation',
    },
    verified_at: {
      type:      DataTypes.DATE,
      allowNull: true,
      comment:   'Set when code is successfully used',
    },
    attempts: {
      type:         DataTypes.INTEGER,
      defaultValue: 0,
      allowNull:    false,
      comment:      'Incremented on each wrong guess; capped at 5',
    },
    is_valid: {
      type:         DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull:    false,
      comment:      'Set to false after use or on new code generation',
    },
    ip_address: {
      type:      DataTypes.STRING(45),   // supports IPv6
      allowNull: true,
    },
  }, {
    tableName:  'verification_tokens',
    timestamps: true,
    underscored: true,   // created_at, updated_at
  });

  return VerificationToken;
};
