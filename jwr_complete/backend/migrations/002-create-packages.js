'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('packages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      duration_nights: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      duration_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      price_foreigner: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      price_saarc: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      price_nepali: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      includes: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      badge: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      is_popular: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('packages');
  },
};
