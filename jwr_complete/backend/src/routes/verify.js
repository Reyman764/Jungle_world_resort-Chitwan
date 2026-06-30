'use strict';

const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body }  = require('express-validator');
const { validate } = require('../middleware/validate');
const { checkEmail } = require('../controllers/verifyController');

// Max 5 checks per 15 min per IP — this hits an MX/DNS lookup per call.
const checkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many requests. Please wait 15 minutes and try again.' },
});

// POST /api/verify/check-email — validate deliverability before OTP.
// (The OTP send/confirm steps themselves live under /api/otp — see
// routes/otp.js — which is the implementation the frontend uses.)
router.post(
  '/check-email',
  checkLimiter,
  [
    body('email').isEmail().withMessage('Valid email address required').normalizeEmail(),
  ],
  validate,
  checkEmail
);

module.exports = router;
