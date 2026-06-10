'use strict';

const bcrypt  = require('bcryptjs');
const { Op }  = require('sequelize');
const { VerificationSession } = require('../models');
const { sendOtpEmail }        = require('../utils/mailer');
const { validateEmailAddress } = require('../utils/emailValidator');
const { issueVerificationToken } = require('../utils/verificationToken');

const OTP_TTL_MS     = 10 * 60 * 1000;
const SESSION_TTL_MS = 2  * 60 * 60 * 1000;
const MAX_ATTEMPTS   = 5;

function generateOtp() {
  const { randomInt } = require('crypto');
  return String(randomInt(100000, 1000000));
}

async function purgeExpired() {
  await VerificationSession.destroy({ where: { expires_at: { [Op.lt]: new Date() } } }).catch(() => {});
}

// POST /api/verify/check-email
async function checkEmail(req, res, next) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const result = await validateEmailAddress(email);
    if (!result.valid) {
      return res.status(400).json({ valid: false, error: result.reason });
    }
    return res.json({
      valid: true,
      message: 'This email address looks valid and can receive mail.',
      domain: result.domain,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/verify/send-email-otp
async function sendEmailOtp(req, res, next) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const name  = (req.body.name  || 'Guest').trim();

    const emailCheck = await validateEmailAddress(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.reason });
    }

    await VerificationSession.destroy({
      where: { email, email_verified: false },
    });
    purgeExpired();

    const otp     = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const now     = new Date();

    const session = await VerificationSession.create({
      email,
      email_otp_hash:    otpHash,
      email_otp_expires: new Date(now.getTime() + OTP_TTL_MS),
      expires_at:        new Date(now.getTime() + SESSION_TTL_MS),
    });

    const mailResult = await sendOtpEmail(email, otp, name);

    return res.status(200).json({
      session_id: session.id,
      message:    'A 6-digit verification code has been sent to your email inbox.',
      email_sent: mailResult.delivered,
      ...(process.env.NODE_ENV !== 'production' && !mailResult.delivered && { dev_otp: otp }),
    });
  } catch (err) {
    if (err.message && err.message.includes('Email is not configured')) {
      return res.status(503).json({ error: err.message });
    }
    if (err.message === 'Unauthorized' || err?.code === 401) {
      return res.status(503).json({
        error: 'Email service is misconfigured. Replace the placeholder SENDGRID_API_KEY in backend .env with a real key, or remove it to use dev mode.',
      });
    }
    next(err);
  }
}

// POST /api/verify/confirm-email-otp
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
        error: 'Verification session expired. Please request a new code.',
      });
    }
    if (session.email_verified) {
      return res.json({
        verified: true,
        verification_token: issueVerificationToken({
          sessionId: session.id,
          email: session.email,
          via: 'otp',
        }),
      });
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

    const valid = await bcrypt.compare(String(otp).trim(), session.email_otp_hash);
    if (!valid) {
      await session.increment('attempts');
      const remaining = MAX_ATTEMPTS - (session.attempts + 1);
      return res.status(400).json({
        error: remaining > 0
          ? `Incorrect code — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Incorrect code. Please request a new verification code.',
      });
    }

    await session.update({ email_verified: true, attempts: 0, email_otp_hash: null });

    return res.json({
      verified:           true,
      verification_token: issueVerificationToken({
        sessionId: session.id,
        email: session.email,
        via: 'otp',
      }),
      message: 'Email verified successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkEmail,
  sendEmailOtp,
  confirmEmailOtp,
};
