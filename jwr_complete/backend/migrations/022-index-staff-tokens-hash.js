'use strict';

/**
 * Migration 022 — Index staff_tokens.token_hash
 *
 * staffAuthService now hashes tokens with HMAC-SHA256 (deterministic)
 * instead of bcrypt (salted/non-deterministic), so verification/reset
 * lookups can match `token_hash` directly:
 *   WHERE token_hash = ? AND token_type = ? AND used_at IS NULL AND expires_at > NOW()
 * This index makes that lookup O(log n) instead of a sequential scan.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('staff_tokens', ['token_hash'], {
      name: 'idx_staff_tokens_token_hash',
    }).catch(() => {}); // ignore if already exists
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('staff_tokens', 'idx_staff_tokens_token_hash').catch(() => {});
  },
};
