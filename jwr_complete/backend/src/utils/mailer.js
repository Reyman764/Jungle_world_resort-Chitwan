'use strict';

const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST) {
    // Production: real SMTP (works with Gmail, SendGrid SMTP, Brevo, etc.)
    _transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development fallback: print to console instead of sending
    _transporter = {
      sendMail: async (opts) => {
        console.log('\n' + '═'.repeat(60));
        console.log('📧  DEV MAILER — email not sent (no SMTP_HOST set)');
        console.log('─'.repeat(60));
        console.log(`  To      : ${opts.to}`);
        console.log(`  Subject : ${opts.subject}`);
        console.log(`  Message : ${opts.text}`);
        console.log('═'.repeat(60) + '\n');
        return { messageId: `dev-${Date.now()}` };
      },
    };
  }
  return _transporter;
}

/**
 * Send a 6-digit OTP to the guest's email address.
 */
async function sendOtpEmail(to, otp, name = 'Guest') {
  const from = process.env.SMTP_FROM || '"Jungle World Resort" <bookings@jungleworldresort.com>';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a4731;padding:28px 32px;">
            <p style="margin:0;color:#c9a84c;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Jungle World Resort</p>
            <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:600;">Booking Verification</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#333;font-size:15px;">Hello <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
              To complete your booking at Jungle World Resort, please use the
              verification code below. It is valid for <strong>10 minutes</strong>.
            </p>

            <!-- OTP Box -->
            <div style="background:#f0f7f2;border:2px solid #1a4731;border-radius:10px;
                        text-align:center;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 6px;font-size:12px;color:#1a4731;letter-spacing:1.5px;text-transform:uppercase;">
                Your verification code
              </p>
              <p style="margin:0;font-size:42px;font-weight:700;letter-spacing:12px;color:#1a4731;">
                ${otp}
              </p>
            </div>

            <p style="margin:0 0 8px;color:#888;font-size:13px;">
              ⏱ Expires in 10 minutes &nbsp;·&nbsp; 🔒 Do not share this code
            </p>
            <p style="margin:0;color:#aaa;font-size:12px;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:11px;">
              Jungle World Resort &nbsp;·&nbsp; Sauraha, Chitwan, Nepal<br>
              <a href="https://jungleworldresort.com" style="color:#1a4731;">jungleworldresort.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await getTransporter().sendMail({
    from,
    to,
    subject: `${otp} — Your Jungle World Resort Verification Code`,
    text: `Hello ${name},\n\nYour booking verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n– Jungle World Resort`,
    html,
  });
}

module.exports = { sendOtpEmail };
