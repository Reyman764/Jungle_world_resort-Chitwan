'use strict';

/**
 * Staff Authentication Service
 *
 * Handles staff account lifecycle: registration, email verification,
 * login, password reset, and audit logging.
 *
 * Staff accounts are stored in the `users` table with role `staff` or `admin`.
 * Tokens are stored hashed in `staff_tokens`; events in `staff_audit_logs`.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, StaffToken, StaffAuditLog, sequelize } = require('../models');
const {
  sendStaffVerificationEmail,
  sendStaffPasswordResetEmail,
} = require('../utils/mailer');

const BCRYPT_ROUNDS = 12;
const STAFF_ROLES = new Set(['staff', 'admin']);
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;  // 24 hours
const RESET_TTL_MS = 60 * 60 * 1000;               // 1 hour

// ── Helpers ───────────────────────────────────────────────────

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isStaffUser(user) {
  return user && STAFF_ROLES.has(user.role);
}

function publicStaffInfo(user) {
  return {
    id:                  user.id,
    email:               user.email,
    first_name:          user.first_name,
    last_name:           user.last_name,
    role:                user.role,
    status:              user.account_status,
    is_verified:         user.is_verified,
    last_login:          user.last_login,
    must_change_password: user.must_change_password ?? false,
  };
}

/** Generate a URL-safe random token and its bcrypt hash */
async function generateTokenPair() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
  return { rawToken, tokenHash };
}

/** Find a valid, unused staff token row matching the raw token */
async function findValidToken(rawToken, tokenType, transaction = null) {
  const now = new Date();

  const candidates = await StaffToken.findAll({
    where: {
      token_type: tokenType,
      used_at: null,
      expires_at: { [Op.gt]: now },
    },
    order: [['created_at', 'DESC']],
    limit: 50,
    ...(transaction ? { transaction } : {}),
  });

  for (const row of candidates) {
    const match = await bcrypt.compare(rawToken, row.token_hash);
    if (match) return row;
  }
  return null;
}

// ── Audit logging ─────────────────────────────────────────────

/**
 * Record a staff auth event in staff_audit_logs.
 * NOTE: Never pass a transaction here — audit log failures must not
 * roll back caller transactions.
 */
async function logAuditEvent(staffId, action, details = '', performedByStaffId = null, ipAddress = null) {
  try {
    await StaffAuditLog.create({
      staff_id: staffId,
      action,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      performed_by_staff_id: performedByStaffId,
      ip_address: ipAddress,
    });
  } catch (err) {
    // Audit log failures are non-fatal — log and continue
    console.error('[staffAuth] audit log failed:', err.message);
  }
}

// ── Email wrappers ────────────────────────────────────────────

async function sendVerificationEmail(email, token, firstName) {
  try {
    const result = await sendStaffVerificationEmail(email, token, firstName);
    console.log(`[staffAuth] verification email → ${email} via ${result.provider}`);
    return { success: true };
  } catch (err) {
    console.error('[staffAuth] verification email failed:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[staffAuth] DEV verification token for ${email}: ${token}`);
      return { success: true, dev: true };
    }
    throw err;
  }
}

async function sendPasswordResetEmail(email, token, firstName) {
  try {
    const result = await sendStaffPasswordResetEmail(email, token, firstName);
    console.log(`[staffAuth] reset email → ${email} via ${result.provider}`);
    return { success: true };
  } catch (err) {
    console.error('[staffAuth] reset email failed:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[staffAuth] DEV reset token for ${email}: ${token}`);
      return { success: true, dev: true };
    }
    throw err;
  }
}

/** Invalidate any previous unused tokens of the same type for a staff member */
async function invalidateOldTokens(staffId, tokenType, transaction) {
  await StaffToken.update(
    { used_at: new Date() },
    {
      where: { staff_id: staffId, token_type: tokenType, used_at: null },
      transaction,
    }
  );
}

// ── 1. Create Staff Account ───────────────────────────────────

/**
 * Register a new staff account (pending until email verified).
 *
 * @param {{ email, password, firstName, lastName, role? }} input
 */
async function createStaffAccount({ email, password, firstName, lastName, role = 'staff' }) {
  try {
    const normalized = normalizeEmail(email);

    if (!normalized || !password || !firstName || !lastName) {
      return { success: false, message: 'Email, password, first name, and last name are required' };
    }

    if (!STAFF_ROLES.has(role)) {
      return { success: false, message: 'Invalid staff role' };
    }

    const existing = await User.findOne({ where: { email: normalized } });
    if (existing) {
      return { success: false, message: 'An account with this email already exists' };
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let staff;
    let rawToken;

    await sequelize.transaction(async (transaction) => {
      staff = await User.create({
        email: normalized,
        password_hash,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        account_status: 'pending',
        is_verified: false,
        auth_provider: 'local',
      }, { transaction });

      const tokenPair = await generateTokenPair();
      rawToken = tokenPair.rawToken;

      await invalidateOldTokens(staff.id, 'email_verification', transaction);

      await StaffToken.create({
        staff_id: staff.id,
        token_hash: tokenPair.tokenHash,
        token_type: 'email_verification',
        expires_at: new Date(Date.now() + VERIFICATION_TTL_MS),
      }, { transaction });
    });

    // Audit log fires OUTSIDE the transaction — failure is non-fatal
    await logAuditEvent(
      staff.id,
      'STAFF_ACCOUNT_CREATED',
      `Staff account created for ${normalized}`,
      null,
      null
    );

    await sendVerificationEmail(normalized, rawToken, firstName);

    return {
      success: true,
      message: 'Staff account created. Please check your email to verify your account.',
      staffId: staff.id,
      email: normalized,
      status: 'pending',
    };
  } catch (err) {
    console.error('[staffAuth] createStaffAccount:', err.message);
    return { success: false, message: 'Failed to create staff account' };
  }
}

// ── 2. Email Verification ─────────────────────────────────────

/**
 * Verify a staff email using the one-time token from the verification link.
 */
async function verifyEmail(rawToken) {
  try {
    if (!rawToken || String(rawToken).length < 32) {
      return { success: false, message: 'Invalid verification token' };
    }

    let staffId;

    await sequelize.transaction(async (transaction) => {
      const tokenRow = await findValidToken(rawToken, 'email_verification', transaction);
      if (!tokenRow) {
        const error = new Error('TOKEN_INVALID');
        throw error;
      }

      const staff = await User.findByPk(tokenRow.staff_id, { transaction });
      if (!staff || !isStaffUser(staff)) {
        const error = new Error('STAFF_NOT_FOUND');
        throw error;
      }

      await tokenRow.update({ used_at: new Date() }, { transaction });

      await staff.update({
        account_status: 'active',
        is_verified: true,
      }, { transaction });

      staffId = staff.id;
    });

    // Audit log outside transaction
    await logAuditEvent(
      staffId,
      'EMAIL_VERIFIED',
      'Staff email verified — account activated',
      staffId,
      null
    );

    const staff = await User.findByPk(staffId);

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
      staffId: staff.id,
      email: staff.email,
      status: 'active',
      staff: publicStaffInfo(staff),
    };
  } catch (err) {
    if (err.message === 'TOKEN_INVALID') {
      return { success: false, message: 'Invalid or expired verification token' };
    }
    if (err.message === 'STAFF_NOT_FOUND') {
      return { success: false, message: 'Staff account not found' };
    }
    console.error('[staffAuth] verifyEmail:', err.message);
    return { success: false, message: 'Email verification failed' };
  }
}

// ── 3. Login ──────────────────────────────────────────────────

/**
 * Authenticate a staff member.
 *
 * @param {{ email, password, ipAddress? }} input
 */
async function login({ email, password, ipAddress = null }) {
  try {
    const normalized = normalizeEmail(email);

    const staff = await User.findOne({ where: { email: normalized } });

    // Generic error — don't reveal whether email exists
    if (!staff || !isStaffUser(staff) || !staff.password_hash) {
      return { success: false, message: 'Invalid email or password' };
    }

    if (staff.account_status === 'pending') {
      return { success: false, message: 'Please verify your email before logging in' };
    }
    if (staff.account_status === 'inactive') {
      return { success: false, message: 'Your account is inactive. Contact an administrator.' };
    }
    if (staff.account_status === 'suspended') {
      return { success: false, message: 'Your account has been suspended. Contact an administrator.' };
    }

    const valid = await bcrypt.compare(password, staff.password_hash);
    if (!valid) {
      await logAuditEvent(staff.id, 'LOGIN_FAILED', 'Invalid password attempt', null, ipAddress);
      return { success: false, message: 'Invalid email or password' };
    }

    await staff.update({ last_login: new Date() });

    await logAuditEvent(
      staff.id,
      'LOGIN_SUCCESS',
      'Staff logged in',
      staff.id,
      ipAddress
    );

    return {
      success: true,
      message: 'Login successful',
      staffId: staff.id,
      email: staff.email,
      status: staff.account_status,
      staff: publicStaffInfo(staff),
    };
  } catch (err) {
    console.error('[staffAuth] login:', err.message);
    return { success: false, message: 'Login failed' };
  }
}

// ── 4. Password Reset Request ─────────────────────────────────

/**
 * Request a password reset link. Always returns the same message (security).
 */
async function requestPasswordReset(email) {
  const genericMessage = 'If an account exists with that email, a reset link has been sent.';

  try {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return { success: true, message: genericMessage };
    }

    const staff = await User.findOne({ where: { email: normalized } });

    // Don't reveal whether the email exists
    if (!staff || !isStaffUser(staff)) {
      return { success: true, message: genericMessage };
    }

    let rawToken;

    await sequelize.transaction(async (transaction) => {
      const tokenPair = await generateTokenPair();
      rawToken = tokenPair.rawToken;

      await invalidateOldTokens(staff.id, 'password_reset', transaction);

      await StaffToken.create({
        staff_id: staff.id,
        token_hash: tokenPair.tokenHash,
        token_type: 'password_reset',
        expires_at: new Date(Date.now() + RESET_TTL_MS),
      }, { transaction });
    });

    await sendPasswordResetEmail(normalized, rawToken, staff.first_name);

    await logAuditEvent(
      staff.id,
      'PASSWORD_RESET_REQUESTED',
      'Password reset email sent',
      staff.id,
      null
    );

    return { success: true, message: genericMessage };
  } catch (err) {
    console.error('[staffAuth] requestPasswordReset:', err.message);
    return { success: true, message: genericMessage };
  }
}

// ── 5. Reset Password ───────────────────────────────────────

/**
 * Set a new password using a valid reset token.
 */
async function resetPassword({ token, newPassword }) {
  try {
    if (!token || !newPassword) {
      return { success: false, message: 'Token and new password are required' };
    }

    if (String(newPassword).length < 8) {
      return { success: false, message: 'Password must be at least 8 characters' };
    }

    let staffId;

    await sequelize.transaction(async (transaction) => {
      const tokenRow = await findValidToken(token, 'password_reset', transaction);
      if (!tokenRow) {
        const error = new Error('TOKEN_INVALID');
        throw error;
      }

      const staff = await User.findByPk(tokenRow.staff_id, { transaction });
      if (!staff || !isStaffUser(staff)) {
        const error = new Error('STAFF_NOT_FOUND');
        throw error;
      }

      const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await tokenRow.update({ used_at: new Date() }, { transaction });
      await staff.update({ password_hash, refresh_token: null, must_change_password: false }, { transaction });

      staffId = staff.id;
    });

    await logAuditEvent(
      staffId,
      'PASSWORD_RESET_COMPLETED',
      'Password reset via email link',
      staffId,
      null
    );

    return {
      success: true,
      message: 'Password reset successfully. You can now log in.',
      staffId,
    };
  } catch (err) {
    if (err.message === 'TOKEN_INVALID') {
      return { success: false, message: 'Invalid or expired reset token' };
    }
    if (err.message === 'STAFF_NOT_FOUND') {
      return { success: false, message: 'Staff account not found' };
    }
    console.error('[staffAuth] resetPassword:', err.message);
    return { success: false, message: 'Password reset failed' };
  }
}

// ── 6. Change Password (authenticated) ────────────────────────

/**
 * Change password for a logged-in staff member.
 */
async function changePassword({ staffId, oldPassword, newPassword, ipAddress = null }) {
  try {
    if (!staffId || !oldPassword || !newPassword) {
      return { success: false, message: 'Staff ID, old password, and new password are required' };
    }

    if (String(newPassword).length < 8) {
      return { success: false, message: 'New password must be at least 8 characters' };
    }

    const staff = await User.findByPk(staffId);
    if (!staff || !isStaffUser(staff)) {
      return { success: false, message: 'Staff account not found' };
    }

    if (!staff.password_hash) {
      return { success: false, message: 'This account does not use password login' };
    }

    const valid = await bcrypt.compare(oldPassword, staff.password_hash);
    if (!valid) {
      await logAuditEvent(staff.id, 'PASSWORD_CHANGE_FAILED', 'Incorrect old password', staff.id, ipAddress);
      return { success: false, message: 'Current password is incorrect' };
    }

    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await staff.update({ password_hash, refresh_token: null, must_change_password: false });

    await logAuditEvent(
      staff.id,
      'PASSWORD_CHANGED',
      'Password changed by authenticated user',
      staff.id,
      ipAddress
    );

    return {
      success: true,
      message: 'Password changed successfully. Please log in again.',
      staffId: staff.id,
    };
  } catch (err) {
    console.error('[staffAuth] changePassword:', err.message);
    return { success: false, message: 'Failed to change password' };
  }
}

// ── 7. Create Staff By Admin ──────────────────────────────────

/**
 * Admin creates a staff account directly — account is immediately active.
 * Staff member must change their temporary password on first login.
 *
 * IMPORTANT: logAuditEvent is called OUTSIDE the transaction so that any
 * FK constraint issue with staff_audit_logs never aborts the user creation.
 *
 * @param {{ email, password, firstName, lastName, role?, createdByAdminId? }} input
 */
async function createStaffByAdmin({ email, password, firstName, lastName, role = 'staff', createdByAdminId = null }) {
  try {
    const normalized = normalizeEmail(email);

    if (!normalized || !password || !firstName || !lastName) {
      return { success: false, message: 'Email, password, first name, and last name are required' };
    }

    if (!STAFF_ROLES.has(role)) {
      return { success: false, message: 'Invalid staff role' };
    }

    if (String(password).length < 6) {
      return { success: false, message: 'Temporary password must be at least 6 characters' };
    }

    const existing = await User.findOne({ where: { email: normalized } });
    if (existing) {
      return { success: false, message: 'An account with this email already exists' };
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let staff;

    // Only user creation inside the transaction — no audit log here
    await sequelize.transaction(async (transaction) => {
      staff = await User.create({
        email:                normalized,
        password_hash,
        first_name:           firstName.trim(),
        last_name:            lastName.trim(),
        role,
        account_status:       'active',
        is_verified:          true,
        auth_provider:        'local',
        must_change_password: true,
      }, { transaction });
    });

    // Audit log fires after the transaction commits — non-fatal if it fails
    await logAuditEvent(
      staff.id,
      'STAFF_ACCOUNT_CREATED_BY_ADMIN',
      `Account created by admin for ${normalized} with role '${role}'`,
      createdByAdminId,
      null
    );

    return {
      success: true,
      message: `Staff account created for ${normalized}. They can now log in with the temporary password.`,
      staffId: staff.id,
      email:   normalized,
      status:  'active',
      staff:   publicStaffInfo(staff),
    };
  } catch (err) {
    console.error('[staffAuth] createStaffByAdmin:', err.message);
    return { success: false, message: 'Failed to create staff account' };
  }
}


module.exports = {
  createStaffAccount,
  createStaffByAdmin,
  verifyEmail,
  login,
  requestPasswordReset,
  resetPassword,
  changePassword,
  sendVerificationEmail,
  sendPasswordResetEmail,
  logAuditEvent,
  publicStaffInfo,
  BCRYPT_ROUNDS,
};
