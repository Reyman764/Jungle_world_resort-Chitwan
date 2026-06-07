'use strict';

const STAFF_ROLES = ['staff', 'manager', 'admin'];
const STAFF_STATUSES = ['pending', 'active', 'inactive', 'suspended'];

module.exports = (sequelize, DataTypes) => {
  const StaffAccount = sequelize.define('StaffAccount', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'staff',
      validate: {
        isIn: [STAFF_ROLES],
      },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [STAFF_STATUSES],
      },
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'staff_accounts', key: 'id' },
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_login_ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  }, {
    tableName: 'staff_accounts',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['email'] },
      { fields: ['role'] },
      { fields: ['status'] },
      { fields: ['created_by'] },
    ],
  });

  // ── Instance methods ──────────────────────────────────────

  /** Exclude sensitive fields when serialising */
  StaffAccount.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.password_hash;
    delete values.permissions;
    return values;
  };

  // ── Class methods ─────────────────────────────────────────

  StaffAccount.findByEmail = function findByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return Promise.resolve(null);
    return this.findOne({ where: { email: normalized } });
  };

  StaffAccount.findActive = function findActive(options = {}) {
    return this.findAll({
      where: { status: 'active' },
      ...options,
    });
  };

  return StaffAccount;
};
