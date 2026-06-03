'use strict';

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// ── Create Sequelize instance ─────────────────────────────
let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // required for Supabase
      },
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'jungle_world',
    process.env.DB_USER || 'jungle_user',
    process.env.DB_PASSWORD || '',
    {
      host:    process.env.DB_HOST || 'localhost',
      port:    parseInt(process.env.DB_PORT) || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    }
  );
}

// ── Import Models ─────────────────────────────────────────
const User                 = require('./User')(sequelize, DataTypes);
const Package              = require('./Package')(sequelize, DataTypes);
const Booking              = require('./Booking')(sequelize, DataTypes);
const Payment              = require('./Payment')(sequelize, DataTypes);
const Review               = require('./Review')(sequelize, DataTypes);
const VerificationSession  = require('./VerificationSession')(sequelize, DataTypes);
const VerificationToken    = require('./VerificationToken')(sequelize, DataTypes);   // ← NEW
const BookingAuditLog      = require('./BookingAuditLog')(sequelize, DataTypes);
const SiteSetting          = require('./SiteSetting')(sequelize, DataTypes);

// ── Associations ──────────────────────────────────────────

// User → Bookings (one-to-many)
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Package → Bookings (one-to-many)
Package.hasMany(Booking, { foreignKey: 'package_id', as: 'bookings' });
Booking.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });

// Booking → Payments (one-to-many)
Booking.hasMany(Payment, { foreignKey: 'booking_id', as: 'payments' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// Booking → Review (one-to-one)
Booking.hasOne(Review, { foreignKey: 'booking_id', as: 'review' });
Review.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// User → Reviews (one-to-many)
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Booking → AuditLogs (one-to-many)
Booking.hasMany(BookingAuditLog, { foreignKey: 'booking_id', as: 'audit_logs' });
BookingAuditLog.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// User → AuditLogs (one-to-many, nullable)
User.hasMany(BookingAuditLog, { foreignKey: 'changed_by_id', as: 'audit_logs' });
BookingAuditLog.belongsTo(User, { foreignKey: 'changed_by_id', as: 'changer' });

// ── Export ────────────────────────────────────────────────
module.exports = {
  sequelize,
  Sequelize,
  User,
  Package,
  Booking,
  Payment,
  Review,
  VerificationSession,
  VerificationToken,
  BookingAuditLog,
  SiteSetting,
};
