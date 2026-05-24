'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { User } = require('../models');

// ── Token helpers ─────────────────────────────────────────
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
}

// ── Register ──────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone, nationality } = req.body;

    // Check duplicate
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: email.toLowerCase(),
      password_hash,
      first_name,
      last_name,
      phone: phone || null,
      nationality: nationality || null,
      role: 'guest',
    });

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save hashed refresh token
    await user.update({ refresh_token: await bcrypt.hash(refreshToken, 8) });

    res.status(201).json({
      message: 'Registration successful',
      user: user.toSafeJSON(),
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await user.update({
      refresh_token: await bcrypt.hash(refreshToken, 8),
      last_login: new Date(),
    });

    res.json({
      message: 'Login successful',
      user: user.toSafeJSON(),
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ── Refresh Token ─────────────────────────────────────────
exports.refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.refresh_token) {
      return res.status(401).json({ error: 'Session not found, please login again' });
    }

    const valid = await bcrypt.compare(refresh_token, user.refresh_token);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken  = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await user.update({ refresh_token: await bcrypt.hash(newRefreshToken, 8) });

    res.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    await req.user.update({ refresh_token: null });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Get Current User ──────────────────────────────────────
exports.me = async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
};

// ── Update Profile ────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, nationality } = req.body;

    await req.user.update({
      first_name: first_name || req.user.first_name,
      last_name:  last_name  || req.user.last_name,
      phone:      phone      || req.user.phone,
      nationality: nationality || req.user.nationality,
    });

    res.json({
      message: 'Profile updated',
      user: req.user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
};

// ── Change Password ───────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findByPk(req.user.id);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const password_hash = await bcrypt.hash(new_password, 12);
    await user.update({ password_hash, refresh_token: null }); // invalidate all sessions

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (err) {
    next(err);
  }
};
