'use strict';

/**
 * backend/src/utils/mailer.js
 *
 * Email sending via Gmail SMTP (nodemailer).
 *
 * Required env vars:
 *   SMTP_HOST   smtp.gmail.com
 *   SMTP_PORT   587
 *   SMTP_USER   jungleworldresortchitwan@gmail.com
 *   SMTP_PASS   <App Password from Google>
 *   SMTP_FROM   "Jungle World Resort" <jungleworldresortchitwan@gmail.com>
 *
 * Exports:
 *   sendOtpEmail(to, otp, name)
 *   sendBookingOtpEmail(to, otp)
 *   sendStaffVerificationEmail(email, token, firstName)
 *   sendStaffPasswordResetEmail(email, token, firstName)
 *   isEmailConfigured()
 *   hasSmtp()
 *   verifySmtpConnection()
 */

const nodemailer = require('nodemailer');

// ── Singleton transporter ─────────────────────────────────────

let _transporter = null;

function hasSmtp() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim()
  );
}

function isEmailConfigured() {
  return hasSmtp();
}

function getFromAddress() {
  return (
    process.env.SMTP_FROM?.trim() ||
    `"Jungle World Resort" <${process.env.SMTP_USER || 'noreply@jungleworldresort.com'}>`
  );
}

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 3,
    rateDelta: 1000,
    rateLimit: 3,
  });
  return _transporter;
}

/** Verify SMTP connection — called at server startup */
async function verifySmtpConnection() {
  if (!hasSmtp()) {
    console.warn('[mailer] SMTP not configured — email sending is disabled.');
    return false;
  }
  try {
    await getTransporter().verify();
    console.log('[mailer] ✅ SMTP connection verified (Gmail)');
    return true;
  } catch (err) {
    console.error('[mailer] ❌ SMTP verification failed:', formatSmtpError(err));
    return false;
  }
}

// ── Error helpers ─────────────────────────────────────────────

function formatSmtpError(err) {
  const msg = err?.message || '';
  if (msg.includes('Invalid login') || msg.includes('535')) {
    return 'Gmail rejected the login. Use an App Password — see docs/GMAIL_SMTP_SETUP.md';
  }
  if (msg.includes('EAUTH')) {
    return 'SMTP authentication failed. Check SMTP_USER and SMTP_PASS in .env';
  }
  if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT')) {
    return 'Cannot reach SMTP server. Check SMTP_HOST and SMTP_PORT in .env';
  }
  return msg || 'SMTP could not send the email.';
}

// ── Core dispatch ─────────────────────────────────────────────

async function dispatchEmail(payload) {
  if (hasSmtp()) {
    try {
      await getTransporter().sendMail({
        from:    payload.from || getFromAddress(),
        to:      payload.to,
        subject: payload.subject,
        html:    payload.html,
        text:    payload.text,
      });
      return { provider: 'smtp', delivered: true };
    } catch (smtpErr) {
      const msg = formatSmtpError(smtpErr);
      console.error('[mailer] SMTP error:', msg);
      throw new Error(msg);
    }
  }

  // Production: hard fail — we always have SMTP configured
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in your server environment.'
    );
  }

  // Dev fallback: log to console
  console.log('\n' + '═'.repeat(60));
  console.log('📧  DEV MAILER — SMTP not configured');
  console.log('─'.repeat(60));
  console.log(`  To      : ${payload.to}`);
  console.log(`  Subject : ${payload.subject}`);
  if (payload._devCode) console.log(`  Code    : ${payload._devCode}`);
  console.log('═'.repeat(60) + '\n');

  return { provider: 'dev-console', delivered: false };
}

// ── Email templates ───────────────────────────────────────────

function buildOtpContent(otp, name) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a4731;padding:28px 32px;">
            <p style="margin:0;color:#c9a84c;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Jungle World Resort</p>
            <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:600;">Your verification code</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#333;font-size:15px;">Hello <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
              Use this code to verify your email and complete your booking enquiry.
              It expires in <strong>10 minutes</strong>.
            </p>
            <div style="background:#f0f7f2;border:2px solid #1a4731;border-radius:10px;
                        text-align:center;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 6px;font-size:12px;color:#1a4731;letter-spacing:1.5px;text-transform:uppercase;">
                Verification code
              </p>
              <p style="margin:0;font-size:42px;font-weight:700;letter-spacing:12px;color:#1a4731;">
                ${otp}
              </p>
            </div>
            <p style="margin:0;color:#aaa;font-size:12px;">
              If you did not request this, you can ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:11px;">
              Jungle World Resort · Sauraha, Chitwan, Nepal
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hello ${name},\n\nYour Jungle World Resort verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n– Jungle World Resort`;

  return {
    subject: `Jungle World Resort – Your verification code`,
    html,
    text,
  };
}

function buildBookingOtpContent(otp) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Booking Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.10);max-width:560px;">
        <!-- Header -->
        <tr>
          <td style="background:#1b4332;padding:32px 40px 28px;">
            <p style="margin:0;color:#c89739;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">
              Jungle World Resort
            </p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">
              Booking Verification Code
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 6px;color:#2d4a3e;font-size:16px;font-weight:600;">Hello, valued guest!</p>
            <p style="margin:0 0 28px;color:#555;font-size:14px;line-height:1.7;">
              You requested a verification code to complete your booking at
              <strong>Jungle World Resort, Sauraha Chitwan</strong>.
              Enter this code on the booking form to continue.
            </p>
            <!-- Code box -->
            <div style="background:#fdf8ee;border:2px solid #c89739;border-radius:12px;
                        text-align:center;padding:28px 20px;margin-bottom:28px;">
              <p style="margin:0 0 10px;font-size:11px;color:#c89739;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
                Your Verification Code
              </p>
              <p style="margin:0;font-size:56px;font-weight:800;letter-spacing:14px;
                         color:#c89739;line-height:1.1;font-family:'Courier New',monospace;">
                ${otp}
              </p>
              <p style="margin:12px 0 0;font-size:13px;color:#888;">
                ⏱ Valid for <strong>10 minutes</strong> only
              </p>
            </div>
            <!-- Instructions -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f7faf7;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 8px;font-size:13px;color:#2d4a3e;font-weight:600;">How to use this code:</p>
                  <ol style="margin:0;padding-left:18px;color:#555;font-size:13px;line-height:1.8;">
                    <li>Return to the Jungle World Resort booking form</li>
                    <li>Enter the 6-digit code in the verification boxes</li>
                    <li>Click <strong>"Confirm code"</strong> to verify your email</li>
                    <li>Complete your booking details and submit</li>
                  </ol>
                </td>
              </tr>
            </table>
            <!-- Security warning -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#fff8f0;border-left:4px solid #e67e22;border-radius:4px;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0;font-size:13px;color:#7f4820;line-height:1.6;">
                    🔒 <strong>Security Notice:</strong> Never share this code with anyone.
                    Jungle World Resort staff will <em>never</em> ask for your verification code.
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9f8;padding:20px 40px;border-top:1px solid #e8eee8;">
            <p style="margin:0 0 4px;color:#2d4a3e;font-size:13px;font-weight:600;">Jungle World Resort</p>
            <p style="margin:0;color:#999;font-size:11px;line-height:1.6;">
              Sauraha, Chitwan, Nepal<br>
              <a href="https://jungleworldresort.com" style="color:#c89739;text-decoration:none;">jungleworldresort.com</a>
              &nbsp;·&nbsp;
              <a href="mailto:jungleworldresortchitwan@gmail.com" style="color:#c89739;text-decoration:none;">jungleworldresortchitwan@gmail.com</a>
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;color:#bbb;font-size:11px;text-align:center;">
        This is an automated message from the Jungle World Resort booking system.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    'Your Jungle World Resort Booking Code',
    '',
    `Your verification code is: ${otp}`,
    '',
    'This code is valid for 10 minutes.',
    'Enter it in the booking form to verify your email address.',
    '',
    'SECURITY: Never share this code with anyone.',
    '',
    'If you did not request this code, please ignore this email.',
    '',
    '─────────────────────────────────────────',
    'Jungle World Resort · Sauraha, Chitwan, Nepal',
    'jungleworldresort.com · jungleworldresortchitwan@gmail.com',
  ].join('\n');

  return {
    subject: 'Jungle World Resort – Booking verification code',
    html,
    text,
  };
}

function staffAdminBaseUrl() {
  return (process.env.ADMIN_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

// ── Public API ────────────────────────────────────────────────

async function sendOtpEmail(to, otp, name = 'Guest') {
  const content = buildOtpContent(otp, name);
  const result  = await dispatchEmail({
    to,
    from:     getFromAddress(),
    subject:  content.subject,
    html:     content.html,
    text:     content.text,
    _devCode: otp,
  });
  console.log(`[mailer] sendOtpEmail → ${to} via ${result.provider}`);
  return result;
}

async function sendBookingOtpEmail(to, otp) {
  const content = buildBookingOtpContent(otp);
  const result  = await dispatchEmail({
    to,
    from:     getFromAddress(),
    subject:  content.subject,
    html:     content.html,
    text:     content.text,
    _devCode: otp,
  });
  console.log(`[mailer] sendBookingOtpEmail → ${to} via ${result.provider}`);
  return result;
}

async function sendStaffVerificationEmail(email, token, firstName = 'Staff') {
  const verifyUrl = `${staffAdminBaseUrl()}/staff-verify?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1a4731;">Verify your staff account</h2>
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>Welcome to Jungle World Resort admin. Please verify your email to activate your account.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;background:#1a4731;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a></p>
      <p style="font-size:12px;color:#666;">Or copy this link: ${verifyUrl}</p>
      <p style="font-size:12px;color:#999;">This link expires in 24 hours.</p>
    </div>`;
  const text = `Hello ${firstName},\n\nVerify your staff account: ${verifyUrl}\n\nExpires in 24 hours.`;

  return dispatchEmail({
    to:       email,
    from:     getFromAddress(),
    subject:  'Jungle World Resort — Verify your staff account',
    html,
    text,
    _devCode: token,
  });
}

async function sendStaffPasswordResetEmail(email, token, firstName = 'Staff') {
  const resetUrl = `${staffAdminBaseUrl()}/staff-reset-password?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1a4731;">Reset your password</h2>
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>We received a request to reset your staff account password.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#1a4731;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
      <p style="font-size:12px;color:#666;">Or copy this link: ${resetUrl}</p>
      <p style="font-size:12px;color:#999;">This link expires in 1 hour. If you did not request this, ignore this email.</p>
    </div>`;
  const text = `Hello ${firstName},\n\nReset your password: ${resetUrl}\n\nExpires in 1 hour.`;

  return dispatchEmail({
    to:       email,
    from:     getFromAddress(),
    subject:  'Jungle World Resort — Password reset',
    html,
    text,
    _devCode: token,
  });
}

module.exports = {
  sendOtpEmail,
  sendBookingOtpEmail,
  sendStaffVerificationEmail,
  sendStaffPasswordResetEmail,
  isEmailConfigured,
  hasSmtp,
  verifySmtpConnection,
};
