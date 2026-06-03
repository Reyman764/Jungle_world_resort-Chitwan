'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('packages', 'short_id', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
      comment: 'Frontend key: glance, closeup, explore',
    });

    await queryInterface.addColumn('packages', 'discount_label', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Badge text e.g. 15% Off',
    });

    await queryInterface.addColumn('packages', 'urgency_text', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Scarcity badge e.g. 2 rooms left',
    });

    await queryInterface.addColumn('packages', 'price_foreigner_discount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn('packages', 'price_saarc_discount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn('packages', 'price_nepali_discount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.createTable('site_settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      value: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.bulkInsert('site_settings', [{
      id: uuidv4(),
      key: 'promo',
      value: JSON.stringify({
        label: 'Early Bird Discount Expires In',
        ends_at: '2026-09-30',
      }),
      created_at: new Date(),
      updated_at: new Date(),
    }]);

    await queryInterface.sequelize.query(`
      UPDATE packages SET short_id = 'glance' WHERE slug = 'chitwan-at-a-glance';
      UPDATE packages SET short_id = 'closeup' WHERE slug = 'close-up-chitwan';
      UPDATE packages SET short_id = 'explore' WHERE slug = 'explore-chitwan';
      UPDATE packages SET urgency_text = '2 rooms left' WHERE slug = 'chitwan-at-a-glance';
      UPDATE packages SET discount_label = '15% Off' WHERE slug = 'close-up-chitwan';
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('site_settings');
    await queryInterface.removeColumn('packages', 'price_nepali_discount');
    await queryInterface.removeColumn('packages', 'price_saarc_discount');
    await queryInterface.removeColumn('packages', 'price_foreigner_discount');
    await queryInterface.removeColumn('packages', 'urgency_text');
    await queryInterface.removeColumn('packages', 'discount_label');
    await queryInterface.removeColumn('packages', 'short_id');
  },
};
