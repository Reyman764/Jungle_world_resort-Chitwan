'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('staff_accounts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'staff',
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'staff_accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_login_ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      permissions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
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

    await queryInterface.addIndex('staff_accounts', ['email'], { unique: true });
    await queryInterface.addIndex('staff_accounts', ['role']);
    await queryInterface.addIndex('staff_accounts', ['status']);
    await queryInterface.addIndex('staff_accounts', ['created_by']);

    await queryInterface.createTable('password_reset_tokens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'staff_accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token_hash: {
        type: Sequelize.STRING(255),
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

    await queryInterface.addIndex('password_reset_tokens', ['staff_id']);
    await queryInterface.addIndex('password_reset_tokens', ['expires_at']);

    // Point staff_audit_logs at staff_accounts (replaces users FK from migration 014)
    const tables = await queryInterface.showAllTables();
    if (tables.includes('staff_audit_logs')) {
      try {
        await queryInterface.removeConstraint('staff_audit_logs', 'staff_audit_logs_staff_id_fkey');
      } catch (_) { /* constraint name may vary */ }
      try {
        await queryInterface.removeConstraint('staff_audit_logs', 'staff_audit_logs_performed_by_staff_id_fkey');
      } catch (_) { /* ignore */ }

      await queryInterface.changeColumn('staff_audit_logs', 'staff_id', {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'staff_accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      await queryInterface.changeColumn('staff_audit_logs', 'performed_by_staff_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'staff_accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('password_reset_tokens');
    await queryInterface.dropTable('staff_accounts');
  },
};
