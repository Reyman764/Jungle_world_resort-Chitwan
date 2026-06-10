'use strict';

const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body }  = require('express-validator');
const { validate } = require('../middleware/validate');
const {
  checkEmail,
  sendEmailOtp,
  confirmEmailOtp,
} = require('../controllers/verifyController');

// ── Rate limits ───────────────────────────────────────────
// Sending OTPs: max 5 per 15 min per IP (prevents SMS/email bombing)
const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many OTP requests. Please wait 15 minutes and try again.' },
});

// Confirming OTPs: max 10 per 15 min per IP (brute-force guard)
const confirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many verification attempts. Please wait 15 minutes.' },
});

// ── Routes ────────────────────────────────────────────────

// POST /api/verify/check-email — validate deliverability before OTP
router.post(
  '/check-email',
  sendLimiter,
  [
    body('email').isEmail().withMessage('Valid email address required').normalizeEmail(),
  ],
  validate,
  checkEmail
);

// POST /api/verify/send-email-otp
router.post(
  '/send-email-otp',
  sendLimiter,
  [
    body('email').isEmail().withMessage('Valid email address required').normalizeEmail(),
    body('name').optional().trim().isLength({ max: 100 }),
  ],
  validate,
  sendEmailOtp
);

// POST /api/verify/confirm-email-otp
router.post(
  '/confirm-email-otp',
  confirmLimiter,
  [
    body('session_id').notEmpty().withMessage('session_id is required'),
    body('otp')
      .notEmpty().withMessage('OTP is required')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
      .isNumeric().withMessage('OTP must contain only digits'),
  ],
  validate,
  confirmEmailOtp
);

module.exports = router;
