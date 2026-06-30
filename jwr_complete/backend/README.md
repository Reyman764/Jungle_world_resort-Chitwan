# 🌿 Jungle World Resort — Backend API

**Node.js + Express REST API** for the Jungle World Resort booking system.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4 |
| Database | PostgreSQL (Supabase) via Sequelize ORM |
| Auth | JWT (access + refresh tokens), bcrypt password hashing |
| Image storage | Cloudinary (falls back to Supabase Storage if unconfigured) |
| Email | Gmail SMTP via Nodemailer — see `docs/GMAIL_SMTP_SETUP.md` |

Payment is **not** processed by this API — `payment_method`/`payment_status` on a
booking are recorded by staff from the admin dashboard (e.g. after a bank
transfer or pay-at-hotel arrangement). There is no Stripe/Khalti integration
in the current codebase.

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          ← Sequelize CLI DB config (migrations/seeds)
│   │   └── jwt.js                ← Centralized JWT secret/expiry
│   ├── controllers/
│   │   ├── authController.js     ← Guest register/login/refresh/logout/me
│   │   ├── staffAuthController.js← Staff login/password reset/change-password
│   │   ├── adminController.js    ← Bookings, gallery, offers, dashboard stats
│   │   ├── adminStaffController.js ← Admin staff management + audit logs
│   │   ├── bookingController.js  ← Public booking create/lookup
│   │   ├── packageController.js  ← Packages CRUD + live currency rates
│   │   ├── auditLogController.js ← Booking audit log read/write
│   │   └── verifyController.js   ← Email deliverability pre-check
│   ├── middleware/
│   │   ├── auth.js               ← JWT auth (guest + staff) + role checks
│   │   ├── rateLimiter.js        ← In-memory per-IP limiters
│   │   └── validate.js           ← express-validator error handler
│   ├── models/                   ← Sequelize models (see Database Models below)
│   ├── routes/
│   ├── services/
│   │   ├── staffAuthService.js   ← Staff account lifecycle + token handling
│   │   └── spamDetectionService.js
│   ├── utils/
│   │   ├── mailer.js             ← Gmail SMTP sending (+ dev console fallback)
│   │   ├── cloudinaryUpload.js   ← Image upload (Cloudinary/Supabase) + mimetype allowlist
│   │   ├── bookingRef.js         ← Booking reference generator
│   │   ├── emailValidator.js     ← Format + MX/deliverability check
│   │   └── verificationToken.js  ← Short-lived "email verified" JWT
│   ├── app.js                    ← Express app (CORS, Helmet, rate limits, routes)
│   └── server.js                 ← HTTP server entry point + startup checks
├── migrations/                   ← Sequelize CLI migrations (run in order)
├── seeds/                        ← Sequelize CLI seeds (packages, admin, staff)
├── .env.example
├── .sequelizerc
└── package.json
```

---

## Quick Start

### 1 — Install Dependencies

```bash
cd backend
npm install
```

### 2 — Configure Environment

```bash
cp .env.example .env
# Edit .env — add your Supabase DATABASE_URL, JWT secrets, SMTP credentials
```

**Booking verification emails (Gmail SMTP):** see
[docs/GMAIL_SMTP_SETUP.md](docs/GMAIL_SMTP_SETUP.md). Set `SMTP_USER` +
`SMTP_PASS` (a Google App Password, not your regular Gmail password) in
`.env`, then check `GET /api/health/email` to confirm it's picked up
(outside production this also reports the configured host/user; in
production only a boolean is returned).

### 3 — Run Migrations (creates tables in Supabase)

```bash
npm run migrate
```

### 4 — Seed Initial Data (packages + admin/staff users)

```bash
npm run seed
```

This creates one `manager`, one `staff`, and one `admin` account. Each gets
a **random password printed once to the console** — copy it down before
you lose it. To set a specific password instead (e.g. for a repeatable
local setup), set `SEED_ADMIN_PASSWORD` / `SEED_MANAGER_PASSWORD` /
`SEED_STAFF_PASSWORD` (or `SEED_STAFF_DEFAULT_PASSWORD` for all three) in
your environment before seeding. Either way, log in once and change it
from the admin dashboard.

### 5 — Start the Server

```bash
npm run dev
```

You should see:
```
✅ Database connected successfully

╔══════════════════════════════════════════════════╗
║       🌿 Jungle World Resort API  v2.0            ║
╠══════════════════════════════════════════════════╣
║  Server  → http://localhost:3000                  ║
║  Auth    → http://localhost:3000/api/auth         ║
╚══════════════════════════════════════════════════╝
```

---

## API Overview

| Area | Base path | Notes |
|------|-----------|-------|
| Guest auth | `/api/auth` | register, login, Google sign-in, refresh, logout, me |
| Email pre-check | `/api/verify` | `check-email` (format + MX lookup) |
| Booking OTP | `/api/otp` | `send-code` / `verify-code` — used by the booking wizard |
| Bookings | `/api/bookings` | `POST /` create, `GET /:reference` public lookup (rate-limited) |
| Packages | `/api/packages` | public package listing + live currency rates |
| Staff auth | `/api/staff/auth` | login, password reset, change-password, me |
| Admin | `/api/admin/*` | bookings, staff, gallery, packages, offers, dashboard (role-gated) |
| Health | `/api/health`, `/api/health/email` | uptime + mail-config checks |

Self-registration for staff is intentionally disabled — accounts are
created by an admin from the dashboard with a temporary password, and the
new staff member is forced to set their own password on first login
(`must_change_password`).

#### Example: Guest login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "guest@example.com",
    "password": "SecurePass1"
  }'
```

#### Example: Authenticated request
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Database Models

| Model | Table | Description |
|-------|-------|-------------|
| User | users | Guest accounts *and* staff/manager/admin accounts |
| Package | packages | Tour packages, pricing, marketing fields |
| Booking | bookings | Reservations |
| Payment | payments | Payment records (manually entered by staff) |
| Review | reviews | Guest reviews |
| VerificationToken | verification_tokens | Booking-flow email OTP codes |
| StaffToken | staff_tokens | Staff password-reset / email-verification tokens |
| StaffAuditLog | staff_audit_logs | Staff account lifecycle + login history |
| BookingAuditLog | booking_audit_logs | Immutable change history per booking |
| SiteSetting | site_settings | Gallery images + misc. site config key/value rows |

---

## Security Notes

- JWT secrets, DB URL, and SMTP credentials are required env vars in
  production — `server.js` refuses to start without them.
- Rate limiting is layered: a general per-IP cap on all of `/api/`, a
  stricter cap on auth/booking-creation/booking-lookup endpoints, and a
  dedicated OTP-request limiter.
- Image uploads (gallery/packages/offers) are restricted to an explicit
  JPEG/PNG/WEBP/GIF allowlist — SVG is intentionally excluded since it can
  carry embedded scripts.
- CSV export of bookings neutralizes leading `=`, `+`, `-`, `@` characters
  to prevent spreadsheet formula injection when an admin opens the file.
- See the root-level `.gitignore` — never commit a real `.env` file.

---

*Jungle World Resort, Sauraha, Chitwan, Nepal*
