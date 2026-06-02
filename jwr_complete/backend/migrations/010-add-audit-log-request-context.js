'use strict';

async function addColumnIfMissing(queryInterface, table, column, definition) {
  const description = await queryInterface.describeTable(table);
  if (!description[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
}

async function removeColumnIfPresent(queryInterface, table, column) {
  const description = await queryInterface.describeTable(table);
  if (description[column]) {
    await queryInterface.removeColumn(table, column);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await addColumnIfMissing(queryInterface, 'booking_audit_logs', 'user_agent', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await addColumnIfMissing(queryInterface, 'booking_audit_logs', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await removeColumnIfPresent(queryInterface, 'booking_audit_logs', 'metadata');
    await removeColumnIfPresent(queryInterface, 'booking_audit_logs', 'user_agent');
  },
};
