'use strict';

const WINDOW_MS = (parseInt(process.env.BOOKING_RATE_WINDOW_HOURS, 10) || 1) * 60 * 60 * 1000;
const MAX_ATTEMPTS = parseInt(process.env.BOOKING_RATE_LIMIT, 10) || 5;
const store = new Map();

function normalizeIp(raw) {
  if (!raw) return 'unknown';
  let ip = String(raw).trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
}

function getClientIp(req) {
  const forwarded = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return normalizeIp(forwarded || req.ip || req.socket?.remoteAddress);
}

function rateLimiterMiddleware(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  let entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
  }

  entry.count += 1;
  store.set(ip, entry);

  const remaining = Math.max(MAX_ATTEMPTS - entry.count, 0);
  const retryAfter = Math.max(Math.ceil((entry.resetAt - now) / 1000), 0);

  res.setHeader('X-RateLimit-Limit', String(MAX_ATTEMPTS));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(retryAfter));

  if (entry.count > MAX_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many booking attempts',
      retryAfter,
      message: 'Please try again in 1 hour',
    });
  }

  return next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 15 * 60 * 1000).unref?.();

module.exports = { rateLimiterMiddleware, getClientIp, MAX_ATTEMPTS };
