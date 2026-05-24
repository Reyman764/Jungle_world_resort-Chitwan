'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reviews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rating:              { type: Sequelize.INTEGER, allowNull: false },
      title:               { type: Sequelize.STRING(255), allowNull: true },
      comment:             { type: Sequelize.TEXT,        allowNull: true },
      rating_cleanliness:  { type: Sequelize.INTEGER, allowNull: true },
      rating_staff:        { type: Sequelize.INTEGER, allowNull: true },
      rating_activities:   { type: Sequelize.INTEGER, allowNull: true },
      rating_food:         { type: Sequelize.INTEGER, allowNull: true },
      rating_value:        { type: Sequelize.INTEGER, allowNull: true },
      is_published: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      admin_reply:   { type: Sequelize.TEXT,       allowNull: true },
      guest_country: { type: Sequelize.STRING(100), allowNull: true },
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

    await queryInterface.addIndex('reviews', ['user_id']);
    await queryInterface.addIndex('reviews', ['is_published']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reviews');
  },
};
