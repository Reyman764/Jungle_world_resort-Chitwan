'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { Op } = require('sequelize');
const { User } = require('../models');
const { issueVerificationToken } = require('../utils/verificationToken');

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

    if (!user.password_hash) {
      return res.status(401).json({
        error: 'This account uses Google sign-in. Please continue with Google.',
      });
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

// ── Google Sign-In (guest / booking) ─────────────────────
exports.googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required.' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({
        error: 'Google sign-in is not configured on the server. Set GOOGLE_CLIENT_ID in .env',
      });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.email_verified) {
      return res.status(400).json({ error: 'Google account email is not verified.' });
    }

    const email      = payload.email.toLowerCase();
    const googleId   = payload.sub;
    const firstName  = payload.given_name || payload.name?.split(' ')[0] || 'Guest';
    const lastName   = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '';
    const picture    = payload.picture || null;

    let user = await User.findOne({
      where: {
        [Op.or]: [{ google_id: googleId }, { email }],
      },
    });

    if (user) {
      await user.update({
        google_id:         googleId,
        auth_provider:     user.auth_provider === 'local' && user.password_hash ? 'local' : 'google',
        is_verified:       true,
        profile_picture_url: picture || user.profile_picture_url,
        first_name:        user.first_name || firstName,
        last_name:         user.last_name || lastName || 'User',
        last_login:        new Date(),
      });
    } else {
      user = await User.create({
        email,
        google_id:           googleId,
        auth_provider:       'google',
        password_hash:       null,
        first_name:          firstName,
        last_name:           lastName || 'User',
        profile_picture_url: picture,
        role:                'guest',
        is_verified:         true,
        last_login:          new Date(),
      });
    }

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await user.update({ refresh_token: await bcrypt.hash(refreshToken, 8) });

    const verification_token = issueVerificationToken({
      email: user.email,
      via:   'google',
    });

    res.json({
      message: 'Signed in with Google',
      user: user.toSafeJSON(),
      access_token: accessToken,
      refresh_token: refreshToken,
      verification_token,
      email_verified: true,
      profile: {
        name:    payload.name,
        email:   user.email,
        picture: user.profile_picture_url,
      },
    });
  } catch (err) {
    console.error('[googleLogin]', err.message);
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Google sign-in expired. Please try again.' });
    }
    next(err);
  }
};

// ── Change Password ───────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findByPk(req.user.id);

    // Google-only accounts have no password — they can't change what doesn't exist
    if (!user.password_hash) {
      return res.status(400).json({
        error: 'This account uses Google sign-in and does not have a password.',
      });
    }

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
