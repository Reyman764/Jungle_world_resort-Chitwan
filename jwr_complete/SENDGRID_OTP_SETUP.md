# SendGrid OTP Integration — Setup Guide
## Jungle World Resort Booking System

---

## What Was Built

Two new backend endpoints plus a new database table, wired into the existing
BookingWizard flow. The **email OTP is now required** before a booking can be submitted.

| New File | Purpose |
|---|---|
| `backend/src/routes/otp.js` | `POST /api/otp/send-code` and `POST /api/otp/verify-code` |
| `backend/src/models/VerificationToken.js` | Sequelize model for `verification_tokens` table |
| `backend/migrations/008-create-verification-tokens.js` | Creates the DB table |
| `backend/docs/supabase_verification_tokens.sql` | Direct SQL for Supabase dashboard |
| `backend/src/utils/mailer.js` | Added `sendBookingOtpEmail()` with branded template |
| `backend/src/models/index.js` | Registers `VerificationToken` model |
| `backend/src/app.js` | Mounts `/api/otp` route |
| `frontend/src/components/BookingWizard.jsx` | Updated OTP handlers to use new endpoints |

---

## Step 1: SendGrid Account Setup (~5 minutes)

### 1a. Create account
Go to [https://sendgrid.com](https://sendgrid.com) → **Start For Free**.
The free tier allows **100 emails/day** — enough for a small resort.

### 1b. Generate an API key
1. Log in → **Settings** → **API Keys** → **Create API Key**
2. Name it `jungle-world-resort-booking`
3. Select **Full Access** (or Restricted Access with only "Mail Send" enabled)
4. Click **Create & View** — **copy the key NOW** (it's shown only once)
5. The key starts with `SG.`

### 1c. Verify your sender email
You must verify the email address you'll send from.

**Option A — Single Sender (quickest for testing)**
1. **Settings** → **Sender Authentication** → **Verify a Single Sender**
2. Fill in `noreply@jungleworldresort.com` (or your actual domain email)
3. Click the verification link in the email SendGrid sends you

**Option B — Domain Authentication (recommended for production)**
1. **Settings** → **Sender Authentication** → **Authenticate Your Domain**
2. Follow the DNS record instructions for your domain registrar
3. Gives you `@jungleworldresort.com` sending without per-address verification

---

## Step 2: Database Setup (~2 minutes)

### Option A — Run the Sequelize migration (local / Railway / Heroku)
```bash
cd backend
npm run migrate
```
This runs `migrations/008-create-verification-tokens.js`.

### Option B — Run SQL directly in Supabase
1. Supabase Dashboard → **SQL Editor** → **New query**
2. Paste the contents of `backend/docs/supabase_verification_tokens.sql`
3. Click **Run**

Either option creates the `verification_tokens` table with all required indexes.

---

## Step 3: Environment Variables

Copy `.env.example` to `.env` (if not already done) and fill in your SendGrid values:

```env
# Required — replace with your real values
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@jungleworldresort.com

# Optional support contact shown in email footer
SENDGRID_SUPPORT_EMAIL=support@jungleworldresort.com

# JWT secret — generate a strong one
JWT_SECRET=replace-with-64-char-random-string
```

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Step 4: Restart the Backend

```bash
cd backend
npm run dev      # development
# or
npm start        # production
```

### Verify email is configured
```bash
curl http://localhost:3000/api/health/email
```
Expected response when SendGrid is correctly configured:
```json
{
  "configured": true,
  "sendgrid": {
    "configured": true,
    "from": "noreply@jungleworldresort.com",
    "hint": null
  }
}
```

---

## Step 5: Test the Endpoints

### Test send-code
```bash
curl -X POST http://localhost:3000/api/otp/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

Expected success response:
```json
{
  "success": true,
  "message": "Verification code sent to your@email.com",
  "expires_in": 600
}
```

### Test verify-code
```bash
curl -X POST http://localhost:3000/api/otp/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","code":"123456"}'
```

Expected success response:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "verification_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## How It Works (End-to-End)

```
User enters email in booking form
         ↓
"Send verification code" button clicked
         ↓
POST /api/otp/send-code  { email }
  ├── Rate limit check (1 code per 2 min per email)
  ├── Invalidate old codes for this email
  ├── Generate 6-digit code, bcrypt-hash it
  ├── Save to verification_tokens table (10 min expiry)
  └── Send branded email via SendGrid
         ↓
User receives email, enters 6-digit code
         ↓
POST /api/otp/verify-code  { email, code }
  ├── Find most recent valid unexpired token for email
  ├── Check attempt count (max 5)
  ├── bcrypt.compare(code, stored_hash)
  ├── Mark token as used (is_valid = false, verified_at = now)
  └── Return 1-hour JWT { email_verified: true }
         ↓
Token stored in sessionStorage + React state
         ↓
User completes booking form and submits
         ↓
POST /api/bookings  { ...booking, verification_token }
  └── Backend verifies JWT signature + email match
         ↓
Booking saved to database ✅
```

---

## Error Reference

| Scenario | Status | Message |
|---|---|---|
| Invalid email format | 400 | "Valid email is required" |
| Code sent less than 2 min ago | 429 | "Please wait X seconds before requesting another code" |
| Email service not configured | 503 | "Email service is not configured..." |
| Invalid/expired code | 401 | "Invalid or expired code. Please request a new one." |
| Code must be 6 digits | 400 | "Code must be 6 digits" |
| Too many wrong attempts | 429 | "Too many attempts. Please request a new code." |
| Incorrect code (with count) | 401 | "Incorrect code — 3 attempts remaining." |

---

## Security Notes

- OTP codes are **bcrypt-hashed** before storage — never stored plaintext
- Each code is **single-use** — invalidated immediately after first successful verification
- Requesting a new code **invalidates all previous codes** for that email
- **2-minute cooldown** per email prevents bombing
- **5-attempt limit** per code prevents brute-force
- JWT tokens are **1 hour** — enough for a booking session
- The verified email in the JWT **must match** the booking's guest email

---

## Deployment Checklist

- [ ] SendGrid account created and API key generated
- [ ] Sender email verified in SendGrid
- [ ] `SENDGRID_API_KEY` set in production environment variables
- [ ] `SENDGRID_FROM_EMAIL` set to verified sender address
- [ ] `JWT_SECRET` set to a strong random string (64+ chars)
- [ ] `DATABASE_URL` points to production database
- [ ] Migration run on production DB (`npm run migrate`)
- [ ] `NODE_ENV=production` set in production
- [ ] `/api/health/email` returns `"configured": true`
- [ ] End-to-end test: request code → receive email → verify → submit booking
- [ ] SendGrid dashboard shows successful email delivery

---

## Troubleshooting

### "Email service is not configured"
→ `SENDGRID_API_KEY` is missing or contains placeholder `xxxx` characters.
   Set a real `SG.xxx` key in your `.env`.

### "SendGrid rejected the API key" (401)
→ Key is syntactically valid but not accepted by SendGrid.
   Create a new key at app.sendgrid.com → Settings → API Keys.

### "SendGrid denied sending" (403)
→ The `SENDGRID_FROM_EMAIL` address is not verified in your SendGrid account.
   Go to Settings → Sender Authentication.

### Emails go to spam
→ Use Domain Authentication (DNS records) instead of Single Sender Verification.
   This dramatically improves deliverability.

### "Invalid or expired code" immediately after sending
→ Server clock might be out of sync. In Docker, run `docker run ... --cap-add SYS_TIME`.
   Also check that `DATABASE_URL` timezone settings match the app server timezone.

### Dev mode: no email received
When `SENDGRID_API_KEY` is not set in development, the OTP is printed to the
backend console instead of sent by email. Look for the `📧 DEV MAILER` block:
```
════════════════════════════════════════════════════════════
📧  DEV MAILER — no SENDGRID_API_KEY or SMTP configured
────────────────────────────────────────────────────────────
  To      : guest@example.com
  Subject : 🔐 Your Jungle World Resort Booking Code
  Code    : 847291
════════════════════════════════════════════════════════════
```
The code is also returned as `dev_otp` in the API response and shown in the
booking form's dev hint box.

---

## Monitoring

After deploying, watch your SendGrid dashboard for:
- **Delivered** — confirms emails reached inboxes
- **Bounced / Invalid** — flags fake email addresses
- **Spam Reports** — action needed if rate is high (add unsubscribe link or switch to Domain Auth)

Free tier usage: 100 emails/day. For a small resort receiving perhaps 10–20 bookings/day,
this is well within limits. Upgrade to Essentials ($19.95/mo) for 50,000/day.
