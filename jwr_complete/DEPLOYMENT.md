# 🌿 Jungle World Resort — Deployment Guide

## What Changed in This Build

### Bug Fixes
| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `.env` | `JWT_EXPIRE=7d` was accidentally appended to `JWT_REFRESH_SECRET` — `JWT_EXPIRE` was never set | Separated onto own lines |
| 2 | `mailer.js` | Still imported `@sendgrid/mail` (dead code) | Removed entirely — SMTP-only now |
| 3 | `package.json` | `@sendgrid/mail` still in dependencies | Removed |
| 4 | `authController.js` | `changePassword` crashed with `data and hash arguments required` for Google-only accounts | Added null check |
| 5 | `bookingController.js` | Frontend-submitted prices were trusted (`base_price`, `total_price`, etc.) — anyone could send `total_price: 1` | All prices now calculated server-side only |
| 6 | `adminController.js` | Booking cancel auto-anonymized the guest's account, preventing future bookings | Removed — GDPR delete is explicit only |
| 7 | `adminController.js` | Duplicate `getClientIp()` function (also in `rateLimiter.js`) | Removed duplicate, import from rateLimiter |
| 8 | `spamDetectionService.js` | Unguarded `hasOverlappingBookings()` could throw on null dates | Wrapped in try/catch |
| 9 | `routes/otp.js` | Error message referenced `SENDGRID_API_KEY` after migration to SMTP | Updated to SMTP wording |
| 10 | `app.js` | Missing `app.set('trust proxy', 1)` — rate limiting and IP logging showed proxy IPs, not real client IPs | Added |
| 11 | `server.js` | `JWT_REFRESH_SECRET` not validated on startup in production | Added to required vars |

### Improvements
- `mailer.js` — SMTP transporter now uses **connection pooling** (3 connections, rate-limited) and verifies on startup
- `server.js` — Verifies SMTP connection at boot and logs result
- `migration 020` — Composite index on `verification_tokens(email, is_valid, expires_at)` for fast OTP lookups
- `.env.production` — New template with deployment checklist

---

## Quick Start (Development)

```bash
# Backend
cd jwr_complete/backend
npm install
cp .env .env.local     # already configured for dev
npm run migrate
npm run seed
npm run dev            # http://localhost:3000

# Frontend
cd jwr_complete/frontend
npm install
npm run dev            # http://localhost:5173
```

---

## Production Deployment Checklist

### 1. Environment Variables
Copy `.env.production` and fill in all values:
```bash
cp .env.production .env
# Edit .env — replace every REPLACE_WITH_... placeholder
```

Critical values to change:
- [ ] `JWT_SECRET` — generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- [ ] `JWT_REFRESH_SECRET` — generate separately (different value)
- [ ] `FRONTEND_URL` — your real domain
- [ ] `ADMIN_URL` — your admin domain
- [ ] `GOOGLE_CLIENT_ID` — from Google Cloud Console

### 2. Run Database Migrations
```bash
npm run migrate    # Runs all migrations including 020
```

### 3. Seed Data (first deploy only)
```bash
npm run seed
```

### 4. Build Frontend
```bash
cd frontend
echo "VITE_API_URL=https://api.yourdomain.com" > .env.local
npm run build      # Output: dist/
```

### 5. Gmail App Password
- The app uses `jungleworldresortchitwan@gmail.com`
- `SMTP_PASS` is already set to the App Password in `.env`
- If it stops working: Google Account → Security → 2-Step Verification → App passwords → Regenerate

### 6. Cloudinary
- Account: `dvadwvpco` (jungleworldresortchitwan)
- Already configured in `.env`

---

## Email Health Check
```
GET /api/health/email
```
Returns SMTP status. Use to verify email is working after deploy.

## API Health
```
GET /api/health
```
