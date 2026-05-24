# 🌿 Jungle World Resort — Backend API

**Node.js + Express REST API** for the Jungle World Resort booking system.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4 |
| Database | PostgreSQL (Supabase) via Sequelize ORM |
| Auth | JWT (access + refresh tokens) |
| Payments | Stripe + Khalti (Step 5) |
| Email | SendGrid (Step 7) |

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          ← Sequelize DB config
│   ├── controllers/
│   │   └── authController.js    ← register, login, refresh, logout, me
│   ├── middleware/
│   │   ├── auth.js              ← JWT protection middleware
│   │   └── validate.js          ← express-validator error handler
│   ├── models/
│   │   ├── index.js             ← Sequelize instance + associations
│   │   ├── User.js              ← Guest accounts
│   │   ├── Package.js           ← Tour packages
│   │   ├── Booking.js           ← Reservations
│   │   ├── Payment.js           ← Payment transactions
│   │   └── Review.js            ← Guest reviews
│   ├── routes/
│   │   └── auth.js              ← POST /api/auth/*
│   ├── utils/
│   │   ├── constants.js         ← Enums (statuses, roles, currencies)
│   │   └── bookingRef.js        ← Booking reference generator
│   ├── app.js                   ← Express app
│   └── server.js                ← HTTP server entry point
├── migrations/
│   ├── 001-create-users.js
│   ├── 002-create-packages.js
│   ├── 003-create-bookings.js
│   ├── 004-create-payments.js
│   └── 005-create-reviews.js
├── seeds/
│   ├── 001-seed-packages.js     ← 3 resort packages
│   └── 002-seed-admin.js        ← Admin user
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
# Edit .env — add your Supabase DATABASE_URL and JWT secrets
```

### 3 — Run Migrations (creates tables in Supabase)

```bash
npm run migrate
```

### 4 — Seed Initial Data (packages + admin user)

```bash
npm run seed
```

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

## API Endpoints — Step 2

### Auth Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new guest | No |
| POST | `/api/auth/login` | Login + get tokens | No |
| POST | `/api/auth/refresh` | Get new access token | No |
| POST | `/api/auth/logout` | Logout + clear session | Yes |
| GET | `/api/auth/me` | Get current user | Yes |
| PUT | `/api/auth/me` | Update profile | Yes |
| PUT | `/api/auth/change-password` | Change password | Yes |

### Example Requests

#### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "guest@example.com",
    "password": "SecurePass1",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "guest@example.com",
    "password": "SecurePass1"
  }'
```

#### Get Profile (with token)
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Database Models

| Model | Table | Description |
|-------|-------|-------------|
| User | users | Guest accounts + admin/staff |
| Package | packages | Tour packages (3 tiers) |
| Booking | bookings | Reservations |
| Payment | payments | Payment transactions |
| Review | reviews | Guest reviews |

---

## Admin Credentials (after seeding)

```
Email:    admin@jungleworldresort.com
Password: Admin@JWR2024!
```

⚠️ Change this password immediately in production!

---

## Implementation Progress

- [x] **Step 1** — Backend foundation: Express, CORS, security, rate limiting
- [x] **Step 2** — Database models, migrations, JWT authentication ← **Current**
- [ ] **Step 3** — Booking CRUD endpoints
- [ ] **Step 4** — Packages & pricing API
- [ ] **Step 5** — Payment integration (Stripe + Khalti)
- [ ] **Step 6** — Admin dashboard API
- [ ] **Step 7** — Email & SMS notifications
- [ ] **Step 8** — Testing & deployment

---

*Jungle World Resort, Sauraha, Chitwan, Nepal*
