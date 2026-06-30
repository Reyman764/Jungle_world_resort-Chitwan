'use strict';

/**
 * Centralized JWT (access token) configuration.
 *
 * Previously several files each hardcoded their own fallback secret when
 * JWT_SECRET was unset ('change-me-in-production' in one file,
 * 'dev-secret-change-in-production' in another, no fallback at all in a
 * third). That's a latent bug: if JWT_SECRET were ever missing, a token
 * signed by one file would fail to verify in another, since they'd be
 * using different secrets. server.js already refuses to boot in
 * production without a real JWT_SECRET, so this fallback only matters
 * for a local dev environment that hasn't created its .env yet — but it
 * must be the *same* fallback everywhere, which is the whole point of
 * importing it from one place instead of redeclaring it per-file.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-please-set-JWT_SECRET-in-env';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

module.exports = { JWT_SECRET, JWT_EXPIRE };
