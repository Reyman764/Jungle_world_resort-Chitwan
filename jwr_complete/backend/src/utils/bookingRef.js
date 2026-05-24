'use strict';

/**
 * Generates a unique booking reference like: JWR-20240515-4F2K
 */
function generateBookingReference() {
  const date   = new Date();
  const year   = date.getFullYear();
  const month  = String(date.getMonth() + 1).padStart(2, '0');
  const day    = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
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
