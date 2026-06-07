'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Protect routes — requires valid JWT access token
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash', 'refresh_token', 'password_reset_token'] },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(err);
  }
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Require admin or staff role
 */
function requireStaff(req, res, next) {
  if (!req.user || !['admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}

/**
 * Optional auth — attaches user if token present but does not block
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password_hash', 'refresh_token', 'password_reset_token'] },
      });
      if (user) req.user = user;
    }
    next();
  } catch {
    next(); // ignore auth errors for optional
  }
}

/**
 * Require one of the given roles
 * Usage: requireRole(['admin', 'manager', 'staff'])
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
}

/**
 * Protect staff-specific routes.
 * Verifies JWT and ensures the user has a valid staff/admin role and active status.
 * Sets both req.staffUser and req.user for downstream compatibility.
 */
async function authenticateStaffToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const STAFF_ROLES = ['staff', 'admin', 'manager'];
    if (!decoded.role || !STAFF_ROLES.includes(decoded.role)) {
      return res.status(403).json({ error: 'Access denied. Staff account required.' });
    }

    const staff = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash', 'refresh_token', 'password_reset_token'] },
    });

    if (!staff) {
      return res.status(401).json({ error: 'Staff account not found' });
    }

    // Block access for non-active accounts
    if (staff.account_status && !['active'].includes(staff.account_status)) {
      return res.status(401).json({
        error: `Staff account is ${staff.account_status}. Please contact an administrator.`,
      });
    }

    req.staffUser = staff;
    req.user      = staff; // also set req.user for unified compatibility
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(err);
  }
}

module.exports = { authenticateToken, requireAdmin, requireStaff, requireRole, optionalAuth, authenticateStaffToken };
