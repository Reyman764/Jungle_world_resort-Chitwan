'use strict';

require('dotenv').config();

// ── Startup validation — fail fast on missing critical config ──
const REQUIRED_IN_PROD = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL', 'SMTP_USER', 'SMTP_PASS'];
if (process.env.NODE_ENV === 'production') {
  const missing = REQUIRED_IN_PROD.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[STARTUP] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Warn in dev if JWT_SECRET looks like the default placeholder
if (process.env.NODE_ENV !== 'production') {
  const secret = process.env.JWT_SECRET || '';
  if (!secret || secret.includes('change') || secret.length < 32) {
    console.warn('[WARNING] JWT_SECRET is missing or weak. Set a strong secret in .env before going to production.');
  }
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
  if (!refreshSecret || refreshSecret.length < 32) {
    console.warn('[WARNING] JWT_REFRESH_SECRET is missing or weak. Set a strong secret in .env.');
  }
}

const app = require('./app');
const { sequelize } = require('./models');

let server;

function shutdown(signal) {
  console.log(`\n[${signal}] Gracefully shutting down...`);
  if (server) {
    server.close(() => {
      sequelize.close();
      console.log('HTTP server + DB connection closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

async function start() {
  const PORT = parseInt(process.env.PORT) || 3000;

  // Test database connection
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Check your DATABASE_URL in .env');
    process.exit(1);
  }

  // Verify SMTP on startup (non-blocking in dev)
  const { verifySmtpConnection } = require('./utils/mailer');
  const smtpOk = await verifySmtpConnection();
  if (!smtpOk && process.env.NODE_ENV === 'production') {
    console.error('❌ SMTP connection failed. Emails will not be delivered.');
    // Don't exit — server can still run, booking can proceed without email
  }

  server = app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║       🌿 Jungle World Resort API  v2.0            ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Server  → http://localhost:${PORT}                 ║`);
    console.log(`║  Health  → http://localhost:${PORT}/api/health      ║`);
    console.log(`║  Auth    → http://localhost:${PORT}/api/auth        ║`);
    console.log(`║  Env     → ${(process.env.NODE_ENV || 'development').padEnd(37)}║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });
}

start().catch(err => {
  console.error('[STARTUP ERROR]', err);
  process.exit(1);
});
