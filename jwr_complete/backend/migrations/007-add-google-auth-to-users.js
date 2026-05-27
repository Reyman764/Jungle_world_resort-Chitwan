'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'google_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    });

    await queryInterface.addColumn('users', 'auth_provider', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'local',
    });

    await queryInterface.addIndex('users', ['google_id'], {
      unique: true,
      name: 'users_google_id_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('users', 'users_google_id_unique');
    await queryInterface.removeColumn('users', 'auth_provider');
    await queryInterface.removeColumn('users', 'google_id');
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
