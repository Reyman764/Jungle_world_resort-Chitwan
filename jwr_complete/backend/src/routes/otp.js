'use strict';

/**
 * backend/src/routes/otp.js
 *
 * SendGrid OTP endpoints for Jungle World Resort booking flow.
 *
 * POST /api/otp/send-code   — generate & email a 6-digit code
 * POST /api/otp/verify-code — confirm code, return JWT
 *
 * Uses verification_tokens table (separate from verification_sessions).
 */

const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body }  = require('express-validator');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { Op }    = require('sequelize');
const { validate }         = require('../middleware/validate');
const { VerificationToken } = require('../models');
const { sendBookingOtpEmail } = require('../utils/mailer');

// ── Constants ─────────────────────────────────────────────
const OTP_TTL_MS     = 10 * 60 * 1000;  // 10 minutes
const COOLDOWN_MS    = 2  * 60 * 1000;  // 2-min cooldown per email
const MAX_ATTEMPTS   = 5;
const JWT_EXPIRES_IN = '1h';

function generateOtp() {
  const { randomInt } = require('crypto');
  // Guaranteed 6 digits: 100000–999999
  return String(randomInt(100000, 1000000));
}

function jwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-in-production';
}

// ── Per-IP rate limiters ──────────────────────────────────
// Belt-and-suspenders on top of the per-email cooldown below.
const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests from this IP. Please wait 15 minutes.' },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please wait 15 minutes.' },
});

// ─────────────────────────────────────────────────────────
// POST /api/otp/send-code
// Body: { email }
// ─────────────────────────────────────────────────────────
router.post(
  '/send-code',
  sendLimiter,
  [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const ip    = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      const now   = new Date();

      // ── Per-email cooldown (2 minutes) ───────────────────
      const recent = await VerificationToken.findOne({
        where: {
          email,
          is_valid:   true,
          created_at: { [Op.gt]: new Date(now.getTime() - COOLDOWN_MS) },
        },
        order: [['created_at', 'DESC']],
      });
      if (recent) {
        const waitSec = Math.ceil(
          (recent.created_at.getTime() + COOLDOWN_MS - now.getTime()) / 1000
        );
        return res.status(429).json({
          error: `Please wait ${waitSec} seconds before requesting another code.`,
        });
      }

      // ── Invalidate all previous codes for this email ─────
      await VerificationToken.update(
        { is_valid: false },
        { where: { email, is_valid: true } }
      );

      // ── Generate, hash, persist ───────────────────────────
      const otp    = generateOtp();
      const hash   = await bcrypt.hash(otp, 10);

      await VerificationToken.create({
        email,
        code:       hash,
        expires_at: new Date(now.getTime() + OTP_TTL_MS),
        is_valid:   true,
        attempts:   0,
        ip_address: ip,
      });

      // ── Send via SendGrid (falls back to SMTP / dev-console) ─
      const mail = await sendBookingOtpEmail(email, otp);

      console.log(`[otp/send-code] Code dispatched to ${email} via ${mail.provider}`);

      return res.status(200).json({
        success:    true,
        message:    `Verification code sent to ${email}`,
        expires_in: 600,   // seconds
        // In non-production, expose code when no mail provider is configured
        ...(process.env.NODE_ENV !== 'production' && !mail.delivered && {
          dev_otp: otp,
        }),
      });
    } catch (err) {
      if (err.message?.includes('Email is not configured')) {
        return res.status(503).json({
          error: 'Email service is not configured. Set SENDGRID_API_KEY in backend .env.',
        });
      }
      if (err?.code === 401 || err?.code === 403) {
        return res.status(503).json({
          error: 'Email service error. Please try again or contact support.',
        });
      }
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────
// POST /api/otp/verify-code
// Body: { email, code }
// ─────────────────────────────────────────────────────────
router.post(
  '/verify-code',
  verifyLimiter,
  [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('code')
      .notEmpty().withMessage('Code is required')
      .isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
      .isNumeric().withMessage('Code must contain only digits'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const code  = String(req.body.code || '').trim();

      // ── Find the most recent valid, unexpired token ───────
      const token = await VerificationToken.findOne({
        where: {
          email,
          is_valid:   true,
          expires_at: { [Op.gt]: new Date() },
        },
        order: [['created_at', 'DESC']],
      });

      if (!token) {
        return res.status(401).json({
          error: 'Invalid or expired code. Please request a new one.',
        });
      }

      // ── Brute-force guard ─────────────────────────────────
      if (token.attempts >= MAX_ATTEMPTS) {
        return res.status(429).json({
          error: 'Too many attempts. Please request a new code.',
        });
      }

      // ── Constant-time comparison ──────────────────────────
      const valid = await bcrypt.compare(code, token.code);
      if (!valid) {
        await token.increment('attempts');
        const remaining = MAX_ATTEMPTS - (token.attempts + 1);
        return res.status(401).json({
          error: remaining > 0
            ? `Incorrect code — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            : 'Too many incorrect attempts. Please request a new code.',
        });
      }

      // ── Mark as used (can't be verified again) ────────────
      await token.update({ is_valid: false, verified_at: new Date() });

      // ── Issue 1-hour verification JWT ─────────────────────
      const verificationToken = jwt.sign(
        {
          email:          email,
          email_verified: true,
          via:            'otp',
        },
        jwtSecret(),
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.status(200).json({
        success:            true,
        message:            'Email verified successfully',
        verification_token: verificationToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
