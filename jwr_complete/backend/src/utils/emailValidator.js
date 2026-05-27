'use strict';

const dns = require('dns').promises;

/** Common disposable / throwaway email domains */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', '10minutemail.com',
  'throwaway.email', 'yopmail.com', 'sharklasers.com', 'trashmail.com',
  'getnada.com', 'maildrop.cc', 'fakeinbox.com', 'dispostable.com',
  'temp-mail.org', 'emailondeck.com', 'mintemail.com', 'mailnesia.com',
  'spamgourmet.com', 'mytemp.email', 'tempail.com', 'burnermail.io',
]);

const EMAIL_FORMAT = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validate that an email looks real and can receive mail (MX check).
 * @returns {{ valid: boolean, reason?: string, domain?: string }}
 */
async function validateEmailAddress(email) {
  const normalized = (email || '').trim().toLowerCase();

  if (!normalized) {
    return { valid: false, reason: 'Email address is required.' };
  }

  if (normalized.length > 254) {
    return { valid: false, reason: 'Email address is too long.' };
  }

  if (!EMAIL_FORMAT.test(normalized)) {
    return { valid: false, reason: 'Enter a valid email address format.' };
  }

  const [, domain] = normalized.split('@');
  if (!domain || domain.length < 3 || !domain.includes('.')) {
    return { valid: false, reason: 'Email domain looks invalid.' };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: 'Temporary or disposable email addresses are not allowed. Please use your real inbox.',
      domain,
    };
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return {
        valid: false,
        reason: 'This email domain cannot receive mail. Please check for typos or use another address.',
        domain,
      };
    }
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return {
        valid: false,
        reason: 'We could not verify this email domain. Please check the spelling of your address.',
        domain,
      };
    }
    // DNS timeout / network — allow but log (don't block legitimate users)
    console.warn(`[emailValidator] MX lookup failed for ${domain}:`, err.message);
  }

  return { valid: true, domain };
}

module.exports = { validateEmailAddress, DISPOSABLE_DOMAINS };
