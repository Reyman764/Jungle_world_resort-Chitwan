'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { Op }  = require('sequelize');
const { VerificationSession } = require('../models');
const { sendOtpEmail }        = require('../utils/mailer');

const OTP_TTL_MS     = 10 * 60 * 1000;   // 10 minutes
const SESSION_TTL_MS = 2  * 60 * 60 * 1000; // 2 hours
const MAX_ATTEMPTS   = 5;

/** Generate a cryptographically adequate 6-digit OTP */
function generateOtp() {
  // Math.random is fine for a 6-digit OTP in this context;
  // for higher security swap with crypto.randomInt(100000, 1000000)
  const { randomInt } = require('crypto');
  return String(randomInt(100000, 1000000));
}

function jwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-in-production';
}

/** Issue a signed verification token once email is confirmed */
function issueVerificationToken(session) {
  return jwt.sign(
    {
      session_id:     session.id,
      email:          session.email,
      email_verified: true,
      phone:          session.phone         || null,
      phone_verified: session.phone_verified || false,
    },
    jwtSecret(),
    { expiresIn: '2h' }
  );
}

// ── Purge expired sessions (housekeeping, best-effort) ────
async function purgeExpired() {
  await VerificationSession.destroy({ where: { expires_at: { [Op.lt]: new Date() } } }).catch(() => {});
}

// ─────────────────────────────────────────────────────────
// POST /api/verify/send-email-otp
// body: { email, name? }
// ─────────────────────────────────────────────────────────
async function sendEmailOtp(req, res, next) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const name  = (req.body.name  || 'Guest').trim();

    if (!email) return res.status(400).json({ error: 'Email address is required.' });

    // Basic format guard (express-validator already ran, but be safe)
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) return res.status(400).json({ error: 'Invalid email address format.' });

    // Remove any unverified sessions for this email to avoid stale OTPs
    await VerificationSession.destroy({
      where: { email, email_verified: false },
    });
    purgeExpired(); // fire-and-forget cleanup

    const otp     = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const now     = new Date();

    const session = await VerificationSession.create({
      email,
      email_otp_hash:    otpHash,
      email_otp_expires: new Date(now.getTime() + OTP_TTL_MS),
      expires_at:        new Date(now.getTime() + SESSION_TTL_MS),
    });

    await sendOtpEmail(email, otp, name);

    return res.status(200).json({
      session_id: session.id,
      message:    'A 6-digit verification code has been sent to your email address.',
      // In dev: also echo OTP so you don't need a real inbox
      ...(process.env.NODE_ENV !== 'production' && { dev_otp: otp }),
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/verify/confirm-email-otp
// body: { session_id, otp }
// ─────────────────────────────────────────────────────────
async function confirmEmailOtp(req, res, next) {
  try {
    const { session_id, otp } = req.body;
    if (!session_id || !otp) {
      return res.status(400).json({ error: 'session_id and otp are required.' });
    }

    const session = await VerificationSession.findOne({
      where: {
        id:         session_id,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!session) {
      return res.status(404).json({
        error: 'Verification session not found or expired. Please request a new code.',
      });
    }
    if (session.email_verified) {
      // Already verified — just re-issue the token
      return res.json({ verified: true, verification_token: issueVerificationToken(session) });
    }
    if (session.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({
        error: 'Too many failed attempts. Please request a new verification code.',
      });
    }
    if (!session.email_otp_hash || new Date() > session.email_otp_expires) {
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new one.',
      });
    }

    const valid = await bcrypt.compare(otp.trim(), session.email_otp_hash);
    if (!valid) {
      await session.increment('attempts');
      const remaining = MAX_ATTEMPTS - (session.attempts + 1);
      return res.status(400).json({
        error: remaining > 0
          ? `Incorrect code — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Incorrect code and no attempts remaining. Please request a new code.',
      });
    }

    // ✅ Correct OTP
    await session.update({ email_verified: true, attempts: 0, email_otp_hash: null });

    return res.json({
      verified:           true,
      verification_token: issueVerificationToken(session),
      message:            'Email verified successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/verify/send-phone-otp
// body: { session_id, phone }
// Requires email to already be verified on the session.
// ─────────────────────────────────────────────────────────
async function sendPhoneOtp(req, res, next) {
  try {
    const { session_id, phone } = req.body;
    if (!session_id || !phone) {
      return res.status(400).json({ error: 'session_id and phone are required.' });
    }

    const session = await VerificationSession.findOne({
      where: {
        id:             session_id,
        email_verified: true,
        expires_at:     { [Op.gt]: new Date() },
      },
    });
    if (!session) {
      return res.status(404).json({ error: 'Verified session not found. Please verify your email first.' });
    }

    const otp     = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    await session.update({
      phone,
      phone_otp_hash:    otpHash,
      phone_otp_expires: new Date(Date.now() + OTP_TTL_MS),
      phone_verified:    false,
    });

    // ── SMS dispatch ─────────────────────────────────────
    // Wire up your SMS provider here:
    //   Sparrow SMS (Nepal):  https://api.sparrowsms.com/v2/sms/
    //   Twilio:               require('twilio')(SID, TOKEN)
    //   AWS SNS, Vonage, etc.
    //
    // For now we log the OTP in development mode.
    console.log(`\n📱 [SMS OTP] Phone ${phone}: ${otp}\n`);

    return res.status(200).json({
      message: 'A verification code has been sent to your phone number.',
      ...(process.env.NODE_ENV !== 'production' && { dev_otp: otp }),
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/verify/confirm-phone-otp
// body: { session_id, otp }
// ─────────────────────────────────────────────────────────
async function confirmPhoneOtp(req, res, next) {
  try {
    const { session_id, otp } = req.body;
    if (!session_id || !otp) {
      return res.status(400).json({ error: 'session_id and otp are required.' });
    }

    const session = await VerificationSession.findOne({
      where: {
        id:             session_id,
        email_verified: true,
        expires_at:     { [Op.gt]: new Date() },
      },
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired.' });
    }
    if (session.phone_verified) {
      return res.json({ verified: true, verification_token: issueVerificationToken(session) });
    }
    if (!session.phone_otp_hash || new Date() > session.phone_otp_expires) {
      return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
    }
    if (session.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
    }

    const valid = await bcrypt.compare(otp.trim(), session.phone_otp_hash);
    if (!valid) {
      await session.increment('attempts');
      return res.status(400).json({ error: 'Incorrect code.' });
    }

    await session.update({ phone_verified: true, phone_otp_hash: null });

    return res.json({
      verified:           true,
      verification_token: issueVerificationToken(session),
      message:            'Phone number verified.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendEmailOtp, confirmEmailOtp, sendPhoneOtp, confirmPhoneOtp };
