'use strict';

const BOOKING_STATUS = {
  DRAFT:        'draft',
  CONFIRMED:    'confirmed',
  CHECKED_IN:   'checked_in',
  CHECKED_OUT:  'checked_out',
  CANCELLED:    'cancelled',
  NO_SHOW:      'no_show',
};

const PAYMENT_STATUS = {
  PENDING:   'pending',
  PARTIAL:   'partial',
  COMPLETED: 'completed',
  REFUNDED:  'refunded',
  FAILED:    'failed',
};

const PAYMENT_METHOD = {
  STRIPE:       'stripe',
  KHALTI:       'khalti',
  BANK_TRANSFER:'bank_transfer',
  PAY_AT_HOTEL: 'pay_at_hotel',
  CASH:         'cash',
};

const GUEST_CATEGORY = {
  FOREIGNER: 'foreigner',
  SAARC:     'saarc',
  NEPALI:    'nepali',
};

const CURRENCY = {
  foreigner: 'USD',
  saarc:     'INR',
  nepali:    'NPR',
};

const USER_ROLE = {
  GUEST: 'guest',
  ADMIN: 'admin',
  STAFF: 'staff',
};

// Tax rates
const TAX = {
  SERVICE_CHARGE: 0.10, // 10%
  VAT:            0.13, // 13%
};

module.exports = {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  GUEST_CATEGORY,
  CURRENCY,
  USER_ROLE,
  TAX,
};
