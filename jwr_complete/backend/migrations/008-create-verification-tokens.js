'use strict';

/**
 * backend/migrations/008-create-verification-tokens.js
 *
 * Creates the verification_tokens table used by /api/otp endpoints.
 *
 * Run:  npm run migrate
 * Undo: npm run migrate:undo
 *
 * For Supabase direct SQL, see the companion file:
 *   docs/supabase_verification_tokens.sql
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('verification_tokens', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey:   true,
        allowNull:    false,
      },
      email: {
        type:      Sequelize.STRING(255),
        allowNull: false,
      },
      code: {
        type:      Sequelize.STRING(255),   // bcrypt hash of 6-digit OTP
        allowNull: false,
      },
      expires_at: {
        type:      Sequelize.DATE,
        allowNull: false,
      },
      verified_at: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
      attempts: {
        type:         Sequelize.INTEGER,
        defaultValue: 0,
        allowNull:    false,
      },
      is_valid: {
        type:         Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull:    false,
      },
      ip_address: {
        type:      Sequelize.STRING(45),
        allowNull: true,
      },
      created_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Fast lookup by email (most common query pattern)
    await queryInterface.addIndex('verification_tokens', ['email'], {
      name: 'vt_email_idx',
    });

    // Fast cleanup of expired rows
    await queryInterface.addIndex('verification_tokens', ['expires_at'], {
      name: 'vt_expires_idx',
    });

    // Partial index: only index valid tokens (keeps index tiny after rows expire)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS vt_valid_email_idx
        ON verification_tokens (email, created_at DESC)
       WHERE is_valid = TRUE;
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('verification_tokens');
  },
};
