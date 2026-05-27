'use strict';

const nodemailer = require('nodemailer');
const sgMail     = require('@sendgrid/mail');

let _smtpTransporter = null;

function getFromAddress() {
  return (
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    '"Jungle World Resort" <bookings@jungleworldresort.com>'
  );
}

function hasSendGrid() {
  const key = (process.env.SENDGRID_API_KEY || '').trim();
  if (!key || key.includes('xxxx') || key.length < 20) return false;
  return key.startsWith('SG.');
}

/** User-friendly message from SendGrid API errors */
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

function hasSmtp() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim()
  );
}

function formatSmtpError(err) {
  const msg = err?.message || '';
  if (msg.includes('Invalid login') || msg.includes('535')) {
    return 'Gmail rejected the login. Use an App Password (not your normal password) — see docs/GMAIL_SMTP_SETUP.md';
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
 * Send OTP email via SendGrid (preferred) or SMTP.
 * @throws if no mail provider is configured in production
 */
async function sendOtpEmail(to, otp, name = 'Guest') {
  const from    = getFromAddress();
  const content = buildOtpContent(otp, name);
  const payload = {
    to,
    from,
    subject: content.subject,
    html:    content.html,
    text:    content.text,
  };

  if (hasSendGrid()) {
    if (!process.env.SENDGRID_FROM_EMAIL?.trim()) {
      throw new Error('SENDGRID_FROM_EMAIL is required. Use the exact email you verified in SendGrid.');
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    try {
      await sgMail.send(payload);
      console.log(`[mailer] SendGrid → OTP sent to ${to}`);
      return { provider: 'sendgrid', delivered: true };
    } catch (sgErr) {
      console.error('[mailer] SendGrid error:', formatSendGridError(sgErr));
      throw new Error(formatSendGridError(sgErr));
    }
  }

  if (hasSmtp()) {
    try {
      await getSmtpTransporter().sendMail(payload);
      console.log(`[mailer] Gmail SMTP → OTP sent to ${to}`);
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

  console.log('\n' + '═'.repeat(60));
  console.log('📧  DEV MAILER — no SENDGRID_API_KEY or SMTP_HOST set');
  console.log('─'.repeat(60));
  console.log(`  To      : ${to}`);
  console.log(`  Subject : ${content.subject}`);
  console.log(`  Code    : ${otp}`);
  console.log('═'.repeat(60) + '\n');

  return { provider: 'dev-console', delivered: false };
}

function isEmailConfigured() {
  return hasSendGrid() || hasSmtp();
}

module.exports = { sendOtpEmail, isEmailConfigured, hasSendGrid, hasSmtp };
