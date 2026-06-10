'use strict';

/**
 * Migration 020: Add index on verification_tokens(email, is_valid)
 *
 * The OTP send/verify flow does:
 *   SELECT ... WHERE email = ? AND is_valid = true AND expires_at > NOW()
 * This composite index makes those queries fast under load.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Composite index for OTP lookup (most frequent query pattern)
    await queryInterface.addIndex('verification_tokens', ['email', 'is_valid', 'expires_at'], {
      name: 'idx_vt_email_valid_expires',
      concurrently: true,
    }).catch(() => {}); // ignore if already exists
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('verification_tokens', 'idx_vt_email_valid_expires').catch(() => {});
  },
};
