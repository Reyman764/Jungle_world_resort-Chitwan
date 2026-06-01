-- ============================================================
-- docs/supabase_verification_tokens.sql
--
-- Run this in the Supabase SQL editor to create the
-- verification_tokens table used by /api/otp endpoints.
--
-- Supabase: Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- ── Create table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) NOT NULL,
  code         VARCHAR(255) NOT NULL,           -- bcrypt hash of the 6-digit OTP
  expires_at   TIMESTAMPTZ NOT NULL,            -- 10 minutes from creation
  verified_at  TIMESTAMPTZ DEFAULT NULL,        -- set when code is used
  attempts     INTEGER     NOT NULL DEFAULT 0,  -- wrong-guess counter
  is_valid     BOOLEAN     NOT NULL DEFAULT TRUE,
  ip_address   VARCHAR(45) DEFAULT NULL,        -- optional: IPv4 or IPv6
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────
-- Fast lookup by email
CREATE INDEX IF NOT EXISTS vt_email_idx
  ON verification_tokens (email);

-- Fast expiry-based cleanup
CREATE INDEX IF NOT EXISTS vt_expires_idx
  ON verification_tokens (expires_at);

-- Partial index: only index rows where is_valid = TRUE
-- (keeps the index tiny after tokens expire or are used)
CREATE INDEX IF NOT EXISTS vt_valid_email_idx
  ON verification_tokens (email, created_at DESC)
  WHERE is_valid = TRUE;

-- ── Row Level Security ────────────────────────────────────
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- Backend service role has full access (your app uses service_role key)
-- No public-facing RLS policies are needed since the table is only
-- accessed server-side via the backend API.

-- ── Auto-update updated_at ────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_verification_tokens_updated_at ON verification_tokens;
CREATE TRIGGER set_verification_tokens_updated_at
  BEFORE UPDATE ON verification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── Optional: periodic cleanup of stale rows ─────────────
-- Add a scheduled job in Supabase → Edge Functions, or run manually:
-- DELETE FROM verification_tokens
--   WHERE created_at < NOW() - INTERVAL '24 hours';
