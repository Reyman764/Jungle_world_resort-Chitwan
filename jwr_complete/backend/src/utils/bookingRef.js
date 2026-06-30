'use strict';

const { randomInt } = require('crypto');

const REF_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a unique booking reference like: JWR-20240515-4F2K9X
 *
 * The trailing segment is the only thing standing between a stranger
 * and someone else's booking details (GET /api/bookings/:reference is
 * public/unauthenticated), so it's generated with a CSPRNG rather than
 * Math.random() and uses 6 characters (36^6 ≈ 2.2 billion combinations
 * per day) instead of 4 (36^4 ≈ 1.7 million) to make guessing/enumeration
 * impractical even before rate limiting is factored in.
 */
function generateBookingReference() {
  const date   = new Date();
  const year   = date.getFullYear();
  const month  = String(date.getMonth() + 1).padStart(2, '0');
  const day    = String(date.getDate()).padStart(2, '0');
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += REF_CHARS[randomInt(0, REF_CHARS.length)];
  }
  return `JWR-${year}${month}${day}-${random}`;
}

/**
 * Calculate price breakdown for a booking
 */
function calculatePrice({ unitPrice, adults, children }) {
  const childPrice   = Math.round(unitPrice * 0.5);
  const base         = unitPrice * adults + childPrice * children;
  const serviceCharge= Math.round(base * 0.10);
  const vat          = Math.round(base * 0.13);
  const total        = base + serviceCharge + vat;

  return {
    unitPrice,
    childPrice,
    base,
    serviceCharge,
    vat,
    total,
  };
}

module.exports = { generateBookingReference, calculatePrice };
