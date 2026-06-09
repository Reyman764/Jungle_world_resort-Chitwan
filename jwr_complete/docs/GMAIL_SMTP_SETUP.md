# Gmail SMTP Setup — Jungle World Resort Booking System

**Last Updated:** June 2026  
**Purpose:** Free, unlimited email sending for booking confirmations, OTP verification, and staff communications

---

## Why Gmail Instead of SendGrid?

✅ **Free** — Unlimited emails (SendGrid free tier was 100/day, now expired)  
✅ **Reliable** — Google's infrastructure, excellent deliverability  
✅ **No Setup Fees** — Just your existing Gmail account  
✅ **Already Integrated** — Your backend has `nodemailer` + fallback logic ready  

---

## Step-by-Step Setup

### 1. Enable 2-Step Verification (Required for App Passwords)

1. Go to **https://myaccount.google.com/security**
2. Scroll to **"How you sign in to Google"**
3. Click **"2-Step Verification"**
4. Follow the prompts:
   - Choose your recovery phone number
   - Verify with a code
   - Back up recovery codes (save these!)
   - Confirm

### 2. Generate an App Password

1. Go back to **https://myaccount.google.com/security**
2. Scroll to **"App passwords"** (appears ONLY if 2FA is enabled)
3. Click **"App passwords"**
4. Select:
   - **App:** Mail
   - **Device:** Windows Computer (or your device)
5. Google generates a **16-character password** (e.g., `abcd efgh ijkl mnop`)
   - **Copy this immediately** — it's shown only once!
   - The spaces can be removed: `abcdefghijklmnop`

### 3. Update Your .env File

Edit `backend/.env`:

```bash
# ── Email — Gmail SMTP (Active) ────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com          # ← your actual Gmail address
SMTP_PASS=abcdefghijklmnop              # ← the 16-char app password
SMTP_FROM="Jungle World Resort" <your-gmail@gmail.com>
```

**⚠️ Important:**
- Use your **Gmail address** (e.g., `reymankhadgi@gmail.com`), not a custom domain
- Use the **16-character app password**, not your regular password
- Do NOT commit `.env` to git

### 4. Install Updated Dependencies

After removing `@sendgrid/mail` from `package.json`:

```bash
cd backend
npm install
# This removes SendGrid and keeps nodemailer
```

### 5. Test Email Sending

Start the backend and try a booking:

```bash
npm run dev
```

Then:
1. Go to **http://localhost:5173** (frontend)
2. Click **"PLAN YOUR VISIT"** or start a booking
3. Enter your email to trigger the OTP email
4. Check your inbox for the verification code

**Expected behavior:**
- Email arrives in **seconds**
- From: `Jungle World Resort <your-gmail@gmail.com>`
- Subject: `Jungle World Resort – Booking verification code`
- Includes a 6-digit code

### 6. Monitor Email Sending

Check the terminal logs:

```
[mailer] sendBookingOtpEmail → user@example.com via smtp
```

This confirms the email was sent via Gmail SMTP. ✅

---

## Troubleshooting

### "Gmail rejected the login" or Error 535

**Problem:** Wrong app password or Gmail account

**Fix:**
1. Generate a new app password at **https://myaccount.google.com/security**
2. Make sure you're using the **16-character app password**, not your regular password
3. Copy WITHOUT spaces (e.g., `abcdefghijklmnop` not `abcd efgh ijkl mnop`)
4. Restart the backend: `npm run dev`

### "SMTP authentication failed"

**Problem:** 2FA not enabled on your Google account

**Fix:**
1. Go to **https://myaccount.google.com/security**
2. Enable **2-Step Verification** (see Step 1)
3. Then generate an app password (see Step 2)

### Email goes to spam

**Problem:** Gmail SMTP lacks domain authentication (expected for free tier)

**Solution:**
- Emails will have `[Gmail]` tag but still deliver
- To reduce spam folder: recipients should mark as "Not spam"
- For production: set up SPF/DKIM (use SendGrid or a mail service)

### No email received

**Problem:** Check multiple places

**Fix:**
1. Check **Promotions** folder in Gmail
2. Check **Spam/Junk** folder
3. Check backend logs for errors: `tail -f backend.log`
4. Try from a different email address

---

## Switching Back to SendGrid

If your SendGrid trial is renewed or you get a paid tier:

1. Edit `backend/.env`:
   ```bash
   SENDGRID_API_KEY=SG.your-api-key-here
   SENDGRID_FROM_EMAIL=your-verified-email@sendgrid.com
   ```

2. Remove SMTP_ variables (or leave them — SendGrid takes priority)

3. Restart backend

The fallback logic in `src/utils/mailer.js` automatically uses SendGrid if configured, else SMTP.

---

## Email Templates

**Current templates sent:**

1. **Booking OTP** — Verification code for booking inquiries
2. **Staff Verification** — Staff account activation link
3. **Password Reset** — Staff password reset link

All use responsive HTML designed for mobile/desktop.

---

## Security Notes

🔒 **Never:**
- Commit `.env` with your app password to git
- Share your app password
- Use your regular Google password for SMTP

✅ **Do:**
- Keep app passwords in `.env` only
- Use a dedicated Gmail account for this if possible
- Rotate app passwords periodically
- Monitor email logs for spam

---

## Support

- **Gmail Help:** https://support.google.com/accounts
- **Nodemailer Docs:** https://nodemailer.com
- **Your Backend Mailer:** `backend/src/utils/mailer.js`

---

**Questions?** Check the error message in your terminal logs or the mailer.js comments.
