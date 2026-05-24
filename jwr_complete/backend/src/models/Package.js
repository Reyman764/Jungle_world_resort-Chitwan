'use strict';

module.exports = (sequelize, DataTypes) => {
  const Package = sequelize.define('Package', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      // e.g. 'chitwan-at-a-glance', 'close-up-chitwan', 'explore-chitwan'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    duration_nights: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    duration_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Prices per person (adult)
    price_foreigner: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Price in USD for international guests',
    },
    price_saarc: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Price in INR for SAARC guests',
    },
    price_nepali: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Price in NPR for Nepali guests',
    },
    // What is included
    includes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of included activities/amenities',
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    badge: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'e.g. "1N · 2D"',
    },
    is_popular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  }, {
    tableName: 'packages',
    timestamps: true,
    underscored: true,
  });

  return Package;
};
