'use strict';

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const compression  = require('compression');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Trust first proxy (Nginx / Heroku / Render / Railway) for accurate client IPs
// Required for rate-limiting and audit logs to record correct IPs
app.set('trust proxy', 1);

// ── Security Middleware ────────────────────────────────────
app.use(helmet({
  // Content Security Policy — blocks XSS, injection, and mixed content
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"],
      imgSrc:         ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      connectSrc:     ["'self'"],
      fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
      objectSrc:      ["'none'"],
      baseUri:        ["'self'"],
      frameAncestors: ["'none'"],
      formAction:     ["'self'"],
    },
  },
  // HSTS — force HTTPS in production
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  noSniff:       true,  // prevent MIME sniffing
  hidePoweredBy: true,  // hide X-Powered-By: Express
  frameguard:    { action: 'deny' }, // clickjacking protection
  xssFilter:     true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

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

// ── Body Parsers — tight limits prevent DoS ───────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Rate Limiting ─────────────────────────────────────────
const makeLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: message || 'Too many requests, please try again later.' },
});

if (process.env.NODE_ENV === 'production') {
  // General API: 100 req per 15 min
  app.use('/api/', makeLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    parseInt(process.env.RATE_LIMIT_MAX)       || 100,
  ));

  // Auth endpoints: 10 attempts per 15 min (brute-force protection)
  const authStrict = makeLimiter(15 * 60 * 1000, 10,
    'Too many auth attempts, please try again in 15 minutes.');
  [
    '/api/auth/login', '/api/auth/register', '/api/auth/google',
    '/api/staff/auth/login', '/api/staff/auth/signup',
  ].forEach(p => app.use(p, authStrict));

  // OTP: 5 per 15 min (prevent abuse)
  app.use('/api/otp', makeLimiter(15 * 60 * 1000, 5,
    'Too many OTP requests. Please wait 15 minutes.'));
} else {
  // Development: very permissive
  const devLimiter = makeLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    parseInt(process.env.RATE_LIMIT_MAX_DEV)   || 1000,
  );
  app.use('/api/', devLimiter);
  app.locals.devLimiter = devLimiter;

  // Dev helper: reset rate limit for an IP
  app.post('/api/dev/reset-rate-limit', express.json(), (req, res) => {
    try {
      const ip = (req.body && req.body.ip) || req.ip || req.socket.remoteAddress;
      if (!app.locals.devLimiter || !app.locals.devLimiter.resetKey) {
        return res.status(500).json({ error: 'Rate limiter not available' });
      }
      app.locals.devLimiter.resetKey(ip);
      return res.json({ success: true, ip });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  console.log(`[dev] Rate limit: ${process.env.RATE_LIMIT_MAX_DEV || 1000} req / ${process.env.RATE_LIMIT_WINDOW_MS || 900000}ms`);
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

const { hasSmtp, isEmailConfigured } = require('./utils/mailer');
app.get('/api/health/email', (req, res) => {
  res.json({
    configured: isEmailConfigured(),
    smtp: {
      configured: hasSmtp(),
      host:       hasSmtp() ? process.env.SMTP_HOST : null,
      user:       hasSmtp() ? process.env.SMTP_USER : null,
      hint:       hasSmtp() ? null : 'Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env',
    },
    dev_fallback: !isEmailConfigured() && process.env.NODE_ENV !== 'production',
  });
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/verify',         require('./routes/verify'));
app.use('/api/otp',            require('./routes/otp'));
app.use('/api/bookings',       require('./routes/bookings'));
app.use('/api/packages',       require('./routes/packages'));
app.use('/api/admin/packages', require('./routes/adminPackages'));
app.use('/api/admin/gallery',  require('./routes/adminGallery'));
app.use('/api/admin/offer',    require('./routes/adminOffer'));
app.use('/api/admin',          require('./routes/admin'));
app.use('/api/staff/auth',     require('./routes/staffAuth'));

// Public endpoints (no auth required)
app.get('/api/gallery', require('./controllers/adminController').listGalleryImages);
app.get('/api/offer',   require('./controllers/adminController').getOffer);

// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl, method: req.method });
});

// ── Global Error Handler ──────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${err.message}`, err.stack);
  } else {
    console.error(`[ERROR] ${err.message}`);
  }

  if (err.message && err.message.startsWith('CORS policy')) {
    return res.status(403).json({ error: err.message });
  }
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
  if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      error:   'Validation failed',
      details: err.errors.map(e => ({ field: e.path, message: e.message })),
    });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'Record already exists', field: err.errors[0]?.path });
  }
  // Never leak stack traces or internal details in production
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

module.exports = app;
