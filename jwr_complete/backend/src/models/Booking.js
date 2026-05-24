'use strict';

module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    booking_reference: {
      type: DataTypes.STRING(25),
      allowNull: false,
      unique: true,
      comment: 'e.g. JWR-20240515-0847',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    package_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'packages', key: 'id' },
    },

    // ── Guest Details ────────────────────────────────────
    guest_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    guest_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { isEmail: true },
    },
    guest_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    guest_nationality: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    guest_category: {
      type: DataTypes.ENUM('foreigner', 'saarc', 'nepali'),
      allowNull: false,
      defaultValue: 'foreigner',
    },

    // ── Stay Details ─────────────────────────────────────
    check_in_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    check_out_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    num_adults: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1, max: 20 },
    },
    num_children: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 20 },
    },
    special_requests: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ── Pricing ───────────────────────────────────────────
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      comment: 'USD, INR, or NPR',
    },
    base_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    service_charge: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    vat: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paid_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    balance_due: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    // ── Status ────────────────────────────────────────────
    status: {
      type: DataTypes.ENUM(
        'draft',
        'confirmed',
        'checked_in',
        'checked_out',
        'cancelled',
        'no_show'
      ),
      defaultValue: 'draft',
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'partial', 'completed', 'refunded', 'failed'),
      defaultValue: 'pending',
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM('stripe', 'khalti', 'bank_transfer', 'pay_at_hotel', 'cash'),
      allowNull: true,
    },

    // ── Cancellation ──────────────────────────────────────
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    // ── Tracking ──────────────────────────────────────────
    source: {
      type: DataTypes.STRING(50),
      defaultValue: 'direct',
      comment: 'direct, google, facebook, referral, etc.',
    },
    utm_campaign: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'bookings',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['booking_reference'] },
      { fields: ['user_id'] },
      { fields: ['package_id'] },
      { fields: ['check_in_date', 'check_out_date'] },
      { fields: ['status'] },
      { fields: ['payment_status'] },
    ],
  });

  return Booking;
};
