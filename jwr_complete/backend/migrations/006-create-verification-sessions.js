'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('verification_sessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      email_otp_hash: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      email_otp_expires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      email_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      phone_otp_hash: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      phone_otp_expires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      phone_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('verification_sessions', ['email'], {
      name: 'verification_sessions_email_idx',
    });
    await queryInterface.addIndex('verification_sessions', ['expires_at'], {
      name: 'verification_sessions_expires_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('verification_sessions');
  },
};
