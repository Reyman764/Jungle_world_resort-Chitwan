'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('users');

    if (!tableInfo.must_change_password) {
      await queryInterface.addColumn('users', 'must_change_password', {
        type:         Sequelize.BOOLEAN,
        allowNull:    false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('users');
    if (tableInfo.must_change_password) {
      await queryInterface.removeColumn('users', 'must_change_password');
    }
  },
};
