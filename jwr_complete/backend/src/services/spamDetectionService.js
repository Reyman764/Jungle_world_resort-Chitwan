'use strict';

const { Op } = require('sequelize');
const { Booking, User, BookingAuditLog } = require('../models');

async function getRecentBookingsByEmail(email, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return Booking.findAll({
    where: {
      guest_email: email.toLowerCase().trim(),
      created_at: { [Op.gte]: since },
      status: { [Op.ne]: 'cancelled' },
      deleted_at: null,
    },
  });
}

async function hasOverlappingBookings(email, checkIn, checkOut) {
  const count = await Booking.count({
    where: {
      guest_email: email.toLowerCase().trim(),
      status: { [Op.in]: ['draft', 'confirmed', 'checked_in'] },
      check_in_date: { [Op.lt]: checkOut },
      check_out_date: { [Op.gt]: checkIn },
      deleted_at: null,
    },
  });
  return count > 0;
}

function calculateRiskScore(factors) {
  let score = 0;
  for (const f of factors) {
    if (f.level === 'high') score += 40;
    else if (f.level === 'medium') score += 25;
    else score += 10;
  }
  return Math.min(score, 100);
}

async function analyzeBookingForSpam(bookingData, ipAddress) {
  const email = (bookingData.guest_email || '').toLowerCase().trim();
  const factors = [];
  const reasons = [];

  const recent = await getRecentBookingsByEmail(email, 24);
  if (recent.length > 2) {
    factors.push({ level: 'high' });
    reasons.push(`Same email used for ${recent.length + 1} bookings in 24h`);
  }

  if (bookingData.check_in_date && bookingData.check_out_date) {
    try {
      if (await hasOverlappingBookings(email, bookingData.check_in_date, bookingData.check_out_date)) {
        factors.push({ level: 'medium' });
        reasons.push('Overlapping dates with existing booking');
      }
    } catch (overlapErr) {
      console.warn('[spam] overlap check failed:', overlapErr.message);
    }
  }

  const user = await User.findOne({ where: { email } });
  if (user && !user.is_verified) {
    factors.push({ level: 'low' });
    reasons.push('Unverified email');
  }

  if (ipAddress) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ipCount = await BookingAuditLog.count({
      where: {
        ip_address: ipAddress,
        action: { [Op.in]: ['BOOKING_CREATED', 'CREATED'] },
        created_at: { [Op.gte]: since },
      },
      distinct: true,
      col: 'booking_id',
    });
    if (ipCount >= 5) {
      factors.push({ level: 'high' });
      reasons.push(`Suspicious IP activity (${ipCount} bookings)`);
    }
  }

  const score = calculateRiskScore(factors);
  const riskLevel = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  const isSpam = riskLevel === 'high' || (riskLevel === 'medium' && reasons.length >= 2);

  return { isSpam, riskLevel, reasons, score };
}

module.exports = {
  analyzeBookingForSpam,
  getRecentBookingsByEmail,
  hasOverlappingBookings,
  calculateRiskScore,
};
