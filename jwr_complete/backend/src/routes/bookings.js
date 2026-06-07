'use strict';

const router = require('express').Router();
const { body }  = require('express-validator');
const { validate } = require('../middleware/validate');
const { createBooking, getBookingByReference } = require('../controllers/bookingController');
const { rateLimiterMiddleware } = require('../middleware/rateLimiter');

// ── Validation rules for booking creation ─────────────────
const bookingRules = [
  body('package_slug')
    .trim()
    .notEmpty().withMessage('Package is required'),
  body('guest_name')
    .trim()
    .notEmpty().withMessage('Guest name is required')
    .isLength({ max: 255 }).withMessage('Name too long'),
  body('guest_email')
    .isEmail().withMessage('Valid email address is required')
    .normalizeEmail(),
  body('guest_phone')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(val => (val ? val.replace(/[\s\-\(\)\.]/g, '') : val))
    .isMobilePhone('any', { strictMode: false }).withMessage('Invalid phone number'),
  body('guest_category')
    .isIn(['foreigner', 'saarc', 'nepali']).withMessage('Invalid guest category'),
  body('check_in_date')
    .isDate().withMessage('Valid check-in date is required'),
  body('check_out_date')
    .optional({ nullable: true, checkFalsy: true })
    .isDate().withMessage('Invalid check-out date'),
  body('num_adults')
    .isInt({ min: 1, max: 20 }).withMessage('At least 1 adult required'),
  body('num_children')
    .optional()
    .isInt({ min: 0, max: 20 }).withMessage('Invalid children count'),
];

// ── Routes ────────────────────────────────────────────────

// POST /api/bookings  — public: create a booking inquiry
router.post('/', rateLimiterMiddleware, bookingRules, validate, createBooking);

// GET /api/bookings/:reference  — public: look up a booking
router.get('/:reference', getBookingByReference);

module.exports = router;
