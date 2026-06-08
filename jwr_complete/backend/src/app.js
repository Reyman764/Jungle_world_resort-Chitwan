'use strict';

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const compression = require('compression');
const cookieParser= require('cookie-parser');
require('dotenv').config();

const app = express();

// Dev helper: print rate-limit settings so it's clear what dev mode uses
if (process.env.NODE_ENV !== 'production') {
  console.log(`[dev] RATE_LIMIT_WINDOW_MS=${process.env.RATE_LIMIT_WINDOW_MS}, RATE_LIMIT_MAX=${process.env.RATE_LIMIT_MAX}, RATE_LIMIT_MAX_DEV=${process.env.RATE_LIMIT_MAX_DEV}`);
}

// ── Security Middleware ────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cookieParser());

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.ADMIN_URL    || 'http://localhost:5174',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Request Logging ────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Body Parsers ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limiting ─────────────────────────────────────────
// Apply strict rate limits only in production. In development we avoid
// aggressive limits so hot-reloads / multiple tabs don't lock out the dev.
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', limiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many auth attempts, please try again in 15 minutes.' },
  });
  app.use('/api/auth/login',    authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/google',   authLimiter);
} else {
  // Development: use a very permissive limiter to avoid accidental lockouts
  const devLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_DEV) || 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', devLimiter);
  // expose limiter for dev debugging (e.g., reset counters)
  app.locals.devLimiter = devLimiter;
}

// Development helper: reset limiter for an IP
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/reset-rate-limit', express.json(), (req, res) => {
    try {
      const ip = (req.body && req.body.ip) || req.ip || req.socket.remoteAddress
      if (!app.locals.devLimiter || !app.locals.devLimiter.resetKey) {
        return res.status(500).json({ error: 'Rate limiter not available' })
      }
      app.locals.devLimiter.resetKey(ip)
      return res.json({ success: true, ip })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  })
}

// ── Health Check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:      'OK',
    service:     'Jungle World Resort API',
    version:     '2.0.0',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

const { hasSendGrid, hasSmtp, isEmailConfigured } = require('./utils/mailer');
app.get('/api/health/email', (req, res) => {
  const from = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || null;
  res.json({
    configured: isEmailConfigured(),
    sendgrid: {
      configured: hasSendGrid(),
      from:       hasSendGrid() ? from : null,
      hint:       hasSendGrid()
        ? null
        : 'Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in .env — see docs/SENDGRID_SETUP.md',
    },
    smtp: {
      configured: hasSmtp(),
      host:       hasSmtp() ? process.env.SMTP_HOST : null,
      user:       hasSmtp() ? process.env.SMTP_USER : null,
      hint:       hasSmtp()
        ? null
        : 'Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env — see docs/GMAIL_SMTP_SETUP.md',
    },
    dev_fallback: !isEmailConfigured() && process.env.NODE_ENV !== 'production',
  });
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/verify',   require('./routes/verify'));        // ✅ existing email/phone OTP (session-based)
app.use('/api/otp',      require('./routes/otp'));           // ✅ NEW: booking OTP via SendGrid
app.use('/api/bookings', require('./routes/bookings'));      // ✅ booking submission
app.use('/api/packages',  require('./routes/packages'));   // ✅ public packages
app.use('/api/admin/packages', require('./routes/adminPackages')); // ✅ package management
app.use('/api/admin/gallery',  require('./routes/adminGallery'));  // ✅ gallery management
app.use('/api/admin/offer',   require('./routes/adminOffer'));    // ✅ offer banner management
app.use('/api/admin',    require('./routes/admin'));         // ✅ admin dashboard
app.use('/api/staff/auth',    require('./routes/staffAuth'));     // ✅ staff auth portal

// Public gallery endpoint (no auth required — Gallery page reads images)
app.get('/api/gallery', require('./controllers/adminController').listGalleryImages);
// Public offer endpoint (no auth required — shows active offer popup to visitors)
app.get('/api/offer',   require('./controllers/adminController').getOffer);
// app.use('/api/payments',  require('./routes/payments'));  // add when ready

// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:  'Route not found',
    path:   req.originalUrl,
    method: req.method,
  });
});

// ── Global Error Handler ──────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  if (err.message && err.message.startsWith('CORS policy')) {
    return res.status(403).json({ error: err.message });
  }
  if (err.name === 'JsonWebTokenError')  return res.status(401).json({ error: 'Invalid token' });
  if (err.name === 'TokenExpiredError')  return res.status(401).json({ error: 'Token expired' });
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      error:   'Validation failed',
      details: err.errors.map(e => ({ field: e.path, message: e.message })),
    });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'Record already exists', field: err.errors[0]?.path });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

module.exports = app;
