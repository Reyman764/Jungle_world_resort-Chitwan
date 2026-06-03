'use strict';

module.exports = (sequelize, DataTypes) => {
  const SiteSetting = sequelize.define('SiteSetting', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  }, {
    tableName: 'site_settings',
    timestamps: true,
    underscored: true,
  });

  return SiteSetting;
};
