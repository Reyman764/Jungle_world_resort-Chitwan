'use strict';

require('dotenv').config();
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
