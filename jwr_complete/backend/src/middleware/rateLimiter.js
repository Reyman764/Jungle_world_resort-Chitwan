'use strict';

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

/**
 * Factory for a simple in-memory, per-IP sliding-window rate limiter.
 * Each call gets its own counter store and bucket key prefix so multiple
 * limiters (e.g. booking creation vs. booking lookup) don't share counts.
 */
function createRateLimiter({ windowMs, max, keyPrefix, message, retryMessage }) {
  return function rateLimiter(req, res, next) {
    const ip  = `${keyPrefix}:${getClientIp(req)}`;
    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count += 1;
    store.set(ip, entry);

    const remaining  = Math.max(max - entry.count, 0);
    const retryAfter = Math.max(Math.ceil((entry.resetAt - now) / 1000), 0);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(retryAfter));

    if (entry.count > max) {
      return res.status(429).json({
        error: message,
        retryAfter,
        message: retryMessage,
      });
    }

    return next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 15 * 60 * 1000).unref?.();

// ── Booking creation: a guest only ever submits a handful of these ──────
const BOOKING_WINDOW_MS    = (parseInt(process.env.BOOKING_RATE_WINDOW_HOURS, 10) || 1) * 60 * 60 * 1000;
const BOOKING_MAX_ATTEMPTS = parseInt(process.env.BOOKING_RATE_LIMIT, 10) || 5;

const rateLimiterMiddleware = createRateLimiter({
  windowMs: BOOKING_WINDOW_MS,
  max: BOOKING_MAX_ATTEMPTS,
  keyPrefix: 'booking-create',
  message: 'Too many booking attempts',
  retryMessage: 'Please try again in 1 hour',
});

// ── Booking lookup (GET /api/bookings/:reference): public, unauthenticated,
// and the reference is a guessable-ish short code, so this needs its own
// limit to make enumeration impractical — but generous enough that a
// guest checking their own booking a few times isn't blocked.
const LOOKUP_WINDOW_MS    = 15 * 60 * 1000;
const LOOKUP_MAX_ATTEMPTS = parseInt(process.env.BOOKING_LOOKUP_RATE_LIMIT, 10) || 20;

const bookingLookupRateLimiter = createRateLimiter({
  windowMs: LOOKUP_WINDOW_MS,
  max: LOOKUP_MAX_ATTEMPTS,
  keyPrefix: 'booking-lookup',
  message: 'Too many lookup attempts',
  retryMessage: 'Please try again in 15 minutes',
});

module.exports = {
  rateLimiterMiddleware,
  bookingLookupRateLimiter,
  getClientIp,
  MAX_ATTEMPTS: BOOKING_MAX_ATTEMPTS,
};
