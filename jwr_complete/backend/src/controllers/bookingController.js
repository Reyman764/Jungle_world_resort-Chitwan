'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, Package, Booking } = require('../models');
const { generateBookingReference } = require('../utils/bookingRef');
const { analyzeBookingForSpam } = require('../services/spamDetectionService');
const { logAuditEvent } = require('./auditLogController');
const { getClientIp } = require('../middleware/rateLimiter');

/**
 * Map frontend package IDs → database slugs
 * Frontend uses short IDs ('glance', 'closeup', 'explore')
 * Database uses full slugs ('chitwan-at-a-glance', etc.)
 */
const SLUG_MAP = {
  'glance':  'chitwan-at-a-glance',
  'closeup': 'close-up-chitwan',
  'explore': 'explore-chitwan',
};

/**
 * POST /api/bookings
 * Public endpoint — no login required.
 * Accepts a booking inquiry from the frontend wizard and saves it to the DB.
 */
async function createBooking(req, res, next) {
  try {
    const {
      package_slug,       // frontend pkg.id  e.g. 'glance'
      guest_name,
      guest_email,
      guest_phone,
      guest_category,     // 'foreigner' | 'saarc' | 'nepali'
      check_in_date,
      check_out_date,     // may be null/empty from the wizard
      num_adults,
      num_children,
      special_requests,
      currency,
      base_price,
      service_charge,
      vat,
      total_price,
      verification_token, // ← required: issued after OTP verification
    } = req.body;

    // ── 0. Require a valid verification token ────────────────
    if (!verification_token) {
      return res.status(400).json({
        error: 'Email verification is required. Please verify your email address before submitting a booking.',
      });
    }
    try {
      const decoded = jwt.verify(
        verification_token,
        process.env.JWT_SECRET || 'dev-secret-change-in-production'
      );
      if (!decoded.email_verified) throw new Error('Email not verified');
      // Ensure the verified email matches the booking email
      const verifiedEmail  = decoded.email.trim().toLowerCase();
      const submittedEmail = (guest_email || '').trim().toLowerCase();
      if (verifiedEmail !== submittedEmail) {
        return res.status(400).json({
          error: 'The verified email address does not match the booking email. Please re-verify.',
        });
      }
    } catch (jwtErr) {
      return res.status(401).json({
        error: 'Verification token is invalid or has expired. Please verify your email again.',
      });
    }

    // ── 1. Validate required fields ──────────────────────────
    if (!guest_name || !guest_email || !check_in_date || !package_slug) {
      return res.status(400).json({
        error: 'Missing required fields: package_slug, guest_name, guest_email, check_in_date',
      });
    }

    // ── 1b. Sanitize and length-check user inputs ─────────────
    const sanitized = {
      guest_name:       String(guest_name).trim().slice(0, 100),
      guest_email:      String(guest_email).trim().toLowerCase().slice(0, 254),
      guest_phone:      guest_phone ? String(guest_phone).trim().replace(/[^\d\s\+\-\(\)]/g, '').slice(0, 30) : null,
      special_requests: special_requests ? String(special_requests).trim().slice(0, 1000) : null,
    };

    // Reject obviously invalid names (HTML tags, scripts)
    if (/<[^>]*>/.test(sanitized.guest_name)) {
      return res.status(400).json({ error: 'Guest name contains invalid characters.' });
    }

    // Basic date format check: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(check_in_date)) {
      return res.status(400).json({ error: 'check_in_date must be in YYYY-MM-DD format.' });
    }
    if (check_out_date && !dateRegex.test(check_out_date)) {
      return res.status(400).json({ error: 'check_out_date must be in YYYY-MM-DD format.' });
    }

    // Validate num_adults is reasonable (1-20)
    const numAdultsInt = parseInt(num_adults, 10);
    if (isNaN(numAdultsInt) || numAdultsInt < 1 || numAdultsInt > 20) {
      return res.status(400).json({ error: 'num_adults must be between 1 and 20.' });
    }

    // ── 2. Resolve package ──────────────────────────────────
    // Accept both frontend short IDs and full DB slugs
    const resolvedSlug = SLUG_MAP[package_slug] || package_slug;
    const pkg = await Package.findOne({ where: { slug: resolvedSlug } });

    if (!pkg) {
      return res.status(404).json({
        error: `Package not found: "${package_slug}". Run seeds first: npm run seed`,
      });
    }

    // ── 3. Find or create guest user ─────────────────────────
    // The booking form doesn't require login, so we find-or-create
    // a user record keyed on email.
    let user = await User.findOne({ where: { email: guest_email.toLowerCase().trim() } });

    if (!user) {
      // Split name into first / last  (e.g. "Ram Bahadur" → "Ram", "Bahadur")
      const parts     = guest_name.trim().split(/\s+/);
      const firstName = parts[0] || 'Guest';
      const lastName  = parts.slice(1).join(' ') || 'User';

      // Random password — guest can request a reset later via forgot-password
      const tempPassword  = uuidv4();
      const password_hash = await bcrypt.hash(tempPassword, 10);

      user = await User.create({
        email:         guest_email.toLowerCase().trim(),
        password_hash,
        first_name:    firstName,
        last_name:     lastName,
        phone:         guest_phone || null,
        role:          'guest',
        is_verified:   true, // email OTP verified before booking
      });
    } else if (!user.is_verified) {
      await user.update({
        is_verified: true,
        phone: guest_phone || user.phone,
      });
    }

    // ── 4. Resolve check_out_date ─────────────────────────────
    // If frontend didn't send departure, derive it from package duration
    let checkOut = check_out_date;
    if (!checkOut || checkOut === '') {
      const arrival  = new Date(check_in_date);
      arrival.setDate(arrival.getDate() + pkg.duration_nights);
      checkOut = arrival.toISOString().split('T')[0];
    }

    // ── 5. Calculate prices server-side (never trust frontend values) ────
    // All price calculations are done here using DB prices only.
    const unitPrice      = parseFloat(
      guest_category === 'foreigner' ? pkg.price_foreigner :
      guest_category === 'saarc'     ? pkg.price_saarc     :
                                       pkg.price_nepali
    );
    const adults         = parseInt(num_adults, 10)  || 1;
    const children       = parseInt(num_children, 10) || 0;
    const childUnitPrice = Math.round(unitPrice * 0.5);
    const basePrice      = unitPrice * adults + childUnitPrice * children;
    const serviceCharge  = Math.round(basePrice * 0.10);
    const vatAmount      = Math.round(basePrice * 0.13);
    const totalPrice     = basePrice + serviceCharge + vatAmount;

    // ── 6. Generate unique booking reference ─────────────────
    let bookingRef;
    let attempts = 0;
    do {
      bookingRef = generateBookingReference();
      const exists = await Booking.findOne({ where: { booking_reference: bookingRef } });
      if (!exists) break;
      attempts++;
    } while (attempts < 5);

    // ── 7. Save booking to database ──────────────────────────
    const booking = await Booking.create({
      booking_reference: bookingRef,
      user_id:           user.id,
      package_id:        pkg.id,
      guest_name:        guest_name.trim(),
      guest_email:       guest_email.toLowerCase().trim(),
      guest_phone:       guest_phone || null,
      guest_category:    guest_category || 'foreigner',
      check_in_date:     check_in_date,
      check_out_date:    checkOut,
      num_adults:        adults,
      num_children:      children,
      special_requests:  special_requests || null,
      currency:          currency || 'NPR',
      base_price:        basePrice,
      service_charge:    serviceCharge,
      vat:               vatAmount,
      total_price:       totalPrice,
      paid_amount:       0,
      balance_due:       totalPrice,
      status:            'draft',
      payment_status:    'pending',
      payment_method:    'pay_at_hotel',
      source:            'direct',
    });

    // ── 8. Spam check + audit log ─────────────────────────────
    const clientIp = getClientIp(req);
    let spamResult = { isSpam: false, riskLevel: 'low', reasons: [], score: 0 };
    try {
      spamResult = await analyzeBookingForSpam({
        guest_email,
        check_in_date,
        check_out_date: checkOut,
      }, clientIp);

      if (spamResult.isSpam) {
        await booking.update({
          is_spam: true,
          spam_reason: spamResult.reasons[0] || 'Automated spam detection',
          marked_spam_at: new Date(),
        });
      }

      await logAuditEvent(booking.id, 'CREATED', {
        performedById: user.id,
        performedByName: guest_name.trim(),
        performedByRole: 'guest',
        reason: 'New booking from guest',
        risk_level: spamResult.riskLevel,
        ip_address: clientIp,
        user_agent: req.headers['user-agent'] || null,
        new_value: 'Booking request submitted',
        metadata: { booking_reference: booking.booking_reference, spam_score: spamResult.score },
      });

      if (spamResult.isSpam) {
        await logAuditEvent(booking.id, 'SPAM_DETECTED', {
          performedByName: 'SYSTEM',
          reason: spamResult.reasons[0],
          risk_level: spamResult.riskLevel,
          ip_address: clientIp,
          field_name: 'is_spam',
          new_value: 'true',
        });
      }
    } catch (auditErr) {
      console.warn(`[AUDIT] Booking creation log failed: ${auditErr.message}`);
    }

    // ── 9. Respond ────────────────────────────────────────────
    return res.status(201).json({
      success:           true,
      booking_reference: booking.booking_reference,
      booking_id:        booking.id,
      message:           'Booking request received. We will confirm within 24 hours.',
      summary: {
        package:     pkg.name,
        check_in:    booking.check_in_date,
        check_out:   booking.check_out_date,
        guests:      `${adults} adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}`,
        currency:    booking.currency,
        total_price: booking.total_price,
      },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookings/:reference
 * Lookup a booking by reference number (public — guest can check their booking)
 */
async function getBookingByReference(req, res, next) {
  try {
    const booking = await Booking.findOne({
      where: { booking_reference: req.params.reference.toUpperCase() },
      include: [
        { model: Package, as: 'package', attributes: ['name', 'badge', 'image_url'] },
      ],
      attributes: { exclude: ['user_id'] }, // don't expose user_id publicly
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    return res.json({ booking });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBooking, getBookingByReference };
