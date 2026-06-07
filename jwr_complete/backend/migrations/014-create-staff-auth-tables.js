'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const users = await queryInterface.describeTable('users');

    if (!users.account_status) {
      await queryInterface.addColumn('users', 'account_status', {
        type: Sequelize.ENUM('pending', 'active', 'inactive', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Staff/admin account lifecycle status',
      });
    }

    await queryInterface.createTable('staff_tokens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'bcrypt hash of the raw token',
      },
      token_type: {
        type: Sequelize.ENUM('email_verification', 'password_reset'),
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('staff_tokens', ['staff_id']);
    await queryInterface.addIndex('staff_tokens', ['token_type']);
    await queryInterface.addIndex('staff_tokens', ['expires_at']);

    await queryInterface.createTable('staff_audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      details: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      performed_by_staff_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('staff_audit_logs', ['staff_id']);
    await queryInterface.addIndex('staff_audit_logs', ['action']);
    await queryInterface.addIndex('staff_audit_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('staff_audit_logs');
    await queryInterface.dropTable('staff_tokens');
    await queryInterface.removeColumn('users', 'account_status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_account_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_staff_tokens_token_type";');
  },
};
