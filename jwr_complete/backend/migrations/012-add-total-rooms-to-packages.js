'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('packages', 'total_rooms', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'When set, urgency text is auto-computed from live confirmed bookings instead of the manual urgency_text field',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('packages', 'total_rooms');
  },
};
