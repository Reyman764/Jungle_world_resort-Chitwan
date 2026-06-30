'use strict';

const { validateEmailAddress } = require('../utils/emailValidator');

// POST /api/verify/check-email
//
// Validates email format + domain deliverability (MX lookup) before the
// guest is asked to verify it via OTP. This is the only endpoint in this
// file that the frontend actually calls — the booking flow's OTP
// send/verify steps go through /api/otp/* (see routes/otp.js), which is
// the live implementation. This file used to also contain
// sendEmailOtp/confirmEmailOtp built on a separate `VerificationSession`
// table; that parallel OTP system was never wired up to the frontend and
// has been removed along with the now-unused model/table.
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

module.exports = {
  checkEmail,
};
