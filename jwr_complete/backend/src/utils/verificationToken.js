'use strict';

const jwt = require('jsonwebtoken');

function jwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-in-production';
}

/**
 * Issue a signed token after email is verified (OTP or Google).
 */
function issueVerificationToken({ sessionId = null, email, phone = null, phoneVerified = false, via = 'otp' }) {
  return jwt.sign(
    {
      session_id:     sessionId,
      email:          email.trim().toLowerCase(),
      email_verified: true,
      phone:          phone || null,
      phone_verified: phoneVerified,
      via,
    },
    jwtSecret(),
    { expiresIn: '2h' }
  );
}

module.exports = { issueVerificationToken, jwtSecret };
