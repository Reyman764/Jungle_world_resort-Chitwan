'use strict';

/**
 * backend/src/utils/mailer.js
 *
 * Email sending utilities.
 *
 * Provider priority: SendGrid → Gmail SMTP → dev-console (non-production only)
 *
 * Exports:
 *   sendOtpEmail(to, otp, name)         — used by /api/verify routes
 *   sendBookingOtpEmail(to, otp)        — used by /api/otp routes (SendGrid spec template)
 *   isEmailConfigured()
 *   hasSendGrid()
 *   hasSmtp()
 */

const nodemailer = require('nodemailer');
const sgMail     = require('@sendgrid/mail');

let _smtpTransporter = null;

// ── Provider detection ────────────────────────────────────

function getFromAddress() {
  return (
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    '"Jungle World Resort" <noreply@jungleworldresort.com>'
  );
}

function hasSendGrid() {
  const key = (process.env.SENDGRID_API_KEY || '').trim();
  if (!key || key.includes('xxxx') || key.length < 20) return false;
  return key.startsWith('SG.');
}

function hasSmtp() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim()
  );
}

function isEmailConfigured() {
  return hasSendGrid() || hasSmtp();
}

// ── Error formatting ──────────────────────────────────────

function formatSendGridError(err) {
  const body = err?.response?.body;
  const msgs = body?.errors?.map(e => e.message).filter(Boolean);
  if (msgs?.length) return msgs.join(' ');
  if (err?.code === 401) {
    return 'SendGrid rejected the API key. Create a new key at app.sendgrid.com → Settings → API Keys.';
  }
  if (err?.code === 403) {
    return 'SendGrid denied sending. Verify your sender email in SendGrid → Settings → Sender Authentication.';
  }
  return err?.message || 'SendGrid could not send the email.';
}

function formatSmtpError(err) {
  const msg = err?.message || '';
  if (msg.includes('Invalid login') || msg.includes('535')) {
    return 'Gmail rejected the login. Use an App Password — see docs/GMAIL_SMTP_SETUP.md';
  }
  if (msg.includes('EAUTH')) {
    return 'SMTP authentication failed. Check SMTP_USER and SMTP_PASS in .env';
  }
  return msg || 'SMTP could not send the email.';
}

function getSmtpTransporter() {
  if (_smtpTransporter) return _smtpTransporter;
  _smtpTransporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _smtpTransporter;
}

// ── Low-level send ────────────────────────────────────────

async function dispatchEmail(payload) {
  if (hasSendGrid()) {
    if (!process.env.SENDGRID_FROM_EMAIL?.trim()) {
      throw new Error('SENDGRID_FROM_EMAIL is required. Use the exact email you verified in SendGrid.');
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    try {
      await sgMail.send(payload);
      return { provider: 'sendgrid', delivered: true };
    } catch (sgErr) {
      console.error('[mailer] SendGrid error:', formatSendGridError(sgErr));
      throw new Error(formatSendGridError(sgErr));
    }
  }

  if (hasSmtp()) {
    try {
      await getSmtpTransporter().sendMail(payload);
      return { provider: 'smtp', delivered: true };
    } catch (smtpErr) {
      console.error('[mailer] SMTP error:', formatSmtpError(smtpErr));
      throw new Error(formatSmtpError(smtpErr));
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Email is not configured. Set SENDGRID_API_KEY or SMTP_HOST in your server environment.'
    );
  }

  // Dev fallback: log to console
  console.log('\n' + '═'.repeat(60));
  console.log('📧  DEV MAILER — no SENDGRID_API_KEY or SMTP configured');
  console.log('─'.repeat(60));
  console.log(`  To      : ${payload.to}`);
  console.log(`  Subject : ${payload.subject}`);
  if (payload._devCode) console.log(`  Code    : ${payload._devCode}`);
  console.log('═'.repeat(60) + '\n');

  return { provider: 'dev-console', delivered: false };
}

// ─────────────────────────────────────────────────────────
// ORIGINAL template — used by /api/verify routes
// ─────────────────────────────────────────────────────────

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
    subject: `${otp} is your Jungle World Resort verification code`,
    html,
    text,
  };
}

/**
 * Send OTP email via SendGrid → SMTP → dev-console.
 * Used by /api/verify routes (existing session-based flow).
 */
async function sendOtpEmail(to, otp, name = 'Guest') {
  const from    = getFromAddress();
  const content = buildOtpContent(otp, name);
  const result  = await dispatchEmail({
    to,
    from,
    subject: content.subject,
    html:    content.html,
    text:    content.text,
    _devCode: otp,
  });
  console.log(`[mailer] sendOtpEmail → ${to} via ${result.provider}`);
  return result;
}

// ─────────────────────────────────────────────────────────
// BOOKING OTP template — used by /api/otp routes
// Matches the spec: 56px gold code, 🔐 subject, security warning
// ─────────────────────────────────────────────────────────

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
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:#c89739;font-size:11px;letter-spacing:3px;
                             text-transform:uppercase;font-weight:600;">
                    Jungle World Resort
                  </p>
                  <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;
                             letter-spacing:-0.3px;">
                    🔐 Booking Verification Code
                  </h1>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <p style="margin:0 0 6px;color:#2d4a3e;font-size:16px;font-weight:600;">
              Hello, valued guest!
            </p>
            <p style="margin:0 0 28px;color:#555;font-size:14px;line-height:1.7;">
              You requested a verification code to complete your booking at
              <strong>Jungle World Resort, Sauraha Chitwan</strong>.
              Enter this code on the booking form to continue.
            </p>

            <!-- Code box -->
            <div style="background:#fdf8ee;border:2px solid #c89739;border-radius:12px;
                        text-align:center;padding:28px 20px;margin-bottom:28px;">
              <p style="margin:0 0 10px;font-size:11px;color:#c89739;
                         letter-spacing:3px;text-transform:uppercase;font-weight:700;">
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
                  <p style="margin:0 0 8px;font-size:13px;color:#2d4a3e;font-weight:600;">
                    How to use this code:
                  </p>
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
                   style="background:#fff8f0;border-left:4px solid #e67e22;border-radius:4px;
                          margin-bottom:20px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0;font-size:13px;color:#7f4820;line-height:1.6;">
                    🔒 <strong>Security Notice:</strong> Never share this code with anyone.
                    Jungle World Resort staff will <em>never</em> ask for your verification code.
                    This code was requested from our booking system.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">
              If you did not request this code, you can safely ignore this email.
              Your account is not at risk.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f9f8;padding:20px 40px;border-top:1px solid #e8eee8;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#2d4a3e;font-size:13px;font-weight:600;">
                    Jungle World Resort
                  </p>
                  <p style="margin:0;color:#999;font-size:11px;line-height:1.6;">
                    Sauraha, Chitwan, Nepal · +977-XXX-XXXXXX<br>
                    <a href="https://jungleworldresort.com"
                       style="color:#c89739;text-decoration:none;">jungleworldresort.com</a>
                    &nbsp;·&nbsp;
                    <a href="mailto:bookings@jungleworldresort.com"
                       style="color:#c89739;text-decoration:none;">bookings@jungleworldresort.com</a>
                  </p>
                </td>
              </tr>
            </table>
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
    '🔐 Your Jungle World Resort Booking Code',
    '',
    `Your verification code is: ${otp}`,
    '',
    'This code is valid for 10 minutes.',
    'Enter it in the booking form to verify your email address.',
    '',
    'SECURITY: Never share this code with anyone. Jungle World Resort',
    'staff will never ask for your verification code.',
    '',
    'If you did not request this code, please ignore this email.',
    '',
    '─────────────────────────────────────────',
    'Jungle World Resort · Sauraha, Chitwan, Nepal',
    'jungleworldresort.com · bookings@jungleworldresort.com',
  ].join('\n');

  return {
    subject: '🔐 Your Jungle World Resort Booking Code',
    html,
    text,
  };
}

/**
 * Send booking OTP email via SendGrid → SMTP → dev-console.
 * Used by the new /api/otp routes.
 */
async function sendBookingOtpEmail(to, otp) {
  const from    = getFromAddress();
  const content = buildBookingOtpContent(otp);
  const result  = await dispatchEmail({
    to,
    from,
    subject:  content.subject,
    html:     content.html,
    text:     content.text,
    _devCode: otp,
  });
  console.log(`[mailer] sendBookingOtpEmail → ${to} via ${result.provider}`);
  return result;
}

module.exports = {
  sendOtpEmail,
  sendBookingOtpEmail,   // ← NEW
  isEmailConfigured,
  hasSendGrid,
  hasSmtp,
};
