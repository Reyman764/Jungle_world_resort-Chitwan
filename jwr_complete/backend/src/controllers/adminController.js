'use strict';

const { Op } = require('sequelize');
const { Booking, Package, User, BookingAuditLog, Payment, Review, SiteSetting, sequelize, Sequelize } = require('../models');
const { uploadImage } = require('../utils/cloudinaryUpload');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getClientIp } = require('../middleware/rateLimiter');

const BOOKING_STATUSES = new Set([
  'draft',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
]);

const PAYMENT_STATUSES = new Set([
  'pending',
  'partial',
  'completed',
  'refunded',
  'failed',
]);

const PAYMENT_METHODS = new Set([
  'stripe',
  'khalti',
  'bank_transfer',
  'pay_at_hotel',
  'cash',
]);

const MONEY_FIELDS = new Set([
  'paid_amount',
  'refund_amount',
  'balance_due',
  'total_price',
]);

const PAYMENT_REVENUE_SQL = `
  CASE
    WHEN payment_status = 'partial'
      THEN COALESCE(paid_amount, 0)
    WHEN payment_status = 'completed'
      THEN COALESCE(total_price, 0)
    WHEN payment_status = 'refunded'
      THEN GREATEST(
        COALESCE(NULLIF(paid_amount, 0), total_price, 0) - COALESCE(refund_amount, 0),
        0
      )
    ELSE 0
  END
`;

function fieldToAction(field) {
  const map = {
    status: 'BOOKING_STATUS_CHANGED',
    payment_status: 'PAYMENT_STATUS_CHANGED',
    payment_method: 'PAYMENT_METHOD_CHANGED',
    paid_amount: 'PAID_AMOUNT_UPDATED',
    refund_amount: 'REFUND_AMOUNT_UPDATED',
    balance_due: 'BALANCE_DUE_UPDATED',
    admin_notes: 'NOTES_UPDATED',
    cancellation_reason: 'CANCELLATION_REASON_UPDATED',
  };
  return map[field] || 'FIELD_UPDATED';
}

function fieldLabel(field) {
  const map = {
    status: 'Booking Status',
    payment_status: 'Payment Status',
    payment_method: 'Payment Method',
    paid_amount: 'Paid Amount',
    refund_amount: 'Refund Amount',
    balance_due: 'Balance Due',
    admin_notes: 'Internal Notes',
    cancellation_reason: 'Cancellation Reason',
  };
  return map[field] || field;
}

function actorFromRequest(req) {
  const actor = req.user || {};
  const changedBy = actor.first_name
    ? `${actor.first_name} ${actor.last_name || ''}`.trim()
    : (actor.email || 'Unknown');

  return {
    changedBy,
    changedByRole: actor.role || 'staff',
    changedById: actor.id || null,
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || null,
  };
}

function toAmount(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : fallback;
}

function money(value) {
  return Number(toAmount(value, 0).toFixed(2));
}

function parseAmountInput(value, label) {
  if (value === null || value === undefined || value === '') return 0;
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount < 0) {
    const error = new Error(`${label} must be a positive number`);
    error.status = 400;
    throw error;
  }
  return money(amount);
}

function normalizeAuditValue(field, value) {
  if (value === null || value === undefined || value === '') return null;
  if (MONEY_FIELDS.has(field)) return money(value).toFixed(2);
  return String(value);
}

function valuesMatch(field, left, right) {
  if (MONEY_FIELDS.has(field)) return money(left) === money(right);
  const leftStr = left !== null && left !== undefined ? String(left).trim() : '';
  const rightStr = right !== null && right !== undefined ? String(right).trim() : '';
  return leftStr === rightStr;
}

function paymentRevenueFromValues(values) {
  const paymentStatus = values.payment_status || 'pending';
  const totalPrice = money(values.total_price);
  const paidAmount = money(values.paid_amount);
  const refundAmount = money(values.refund_amount);

  if (paymentStatus === 'partial') return paidAmount;
  if (paymentStatus === 'completed') return totalPrice;
  if (paymentStatus === 'refunded') {
    const revenueBase = paidAmount > 0 ? paidAmount : totalPrice;
    return Math.max(revenueBase - refundAmount, 0);
  }
  return 0;
}

function bookingSnapshot(booking, overrides = {}) {
  const plain = typeof booking.get === 'function' ? booking.get({ plain: true }) : booking;
  return { ...plain, ...overrides };
}

function applyPaymentRules(booking, updates) {
  const touchesPayment = ['payment_status', 'paid_amount', 'refund_amount'].some(
    field => Object.prototype.hasOwnProperty.call(updates, field)
  );

  if (!touchesPayment) return updates;

  const next = { ...updates };
  const totalPrice = money(booking.total_price);
  const previousPaymentStatus = booking.payment_status || 'pending';
  const nextPaymentStatus = next.payment_status || previousPaymentStatus;
  let paidAmount = Object.prototype.hasOwnProperty.call(next, 'paid_amount')
    ? money(next.paid_amount)
    : money(booking.paid_amount);
  let refundAmount = Object.prototype.hasOwnProperty.call(next, 'refund_amount')
    ? money(next.refund_amount)
    : money(booking.refund_amount);

  if (nextPaymentStatus === 'pending' || nextPaymentStatus === 'failed') {
    paidAmount = 0;
    refundAmount = 0;
  } else if (nextPaymentStatus === 'partial') {
    paidAmount = Math.min(paidAmount, totalPrice);
    refundAmount = 0;
  } else if (nextPaymentStatus === 'completed') {
    paidAmount = totalPrice;
    refundAmount = 0;
  } else if (nextPaymentStatus === 'refunded') {
    paidAmount = paidAmount > 0 ? Math.min(paidAmount, totalPrice) : totalPrice;
    if (
      previousPaymentStatus !== 'refunded' &&
      refundAmount === 0 &&
      money(booking.refund_amount) === 0
    ) {
      refundAmount = paidAmount;
    }
    refundAmount = Math.min(refundAmount, paidAmount);
  }

  const retainedAmount = nextPaymentStatus === 'refunded'
    ? Math.max(paidAmount - refundAmount, 0)
    : paidAmount;

  next.paid_amount = money(paidAmount);
  next.refund_amount = money(refundAmount);
  next.balance_due = money(Math.max(totalPrice - retainedAmount, 0));

  return next;
}

function auditEntriesForChanges({ booking, updates, actor, req }) {
  const changed = [];
  const before = bookingSnapshot(booking);
  const after = bookingSnapshot(booking, updates);

  for (const [field, newValue] of Object.entries(updates)) {
    const oldValue = booking[field];
    if (valuesMatch(field, oldValue, newValue)) continue;

    changed.push({
      booking_id: booking.id,
      changed_by_id: actor.changedById,
      changed_by: actor.changedBy,
      changed_by_role: actor.changedByRole,
      action: fieldToAction(field),
      field_name: field,
      old_value: normalizeAuditValue(field, oldValue),
      new_value: normalizeAuditValue(field, newValue),
      ip_address: actor.ip,
      user_agent: actor.userAgent,
      metadata: {
        booking_reference: booking.booking_reference,
        field_label: fieldLabel(field),
        revenue_before: paymentRevenueFromValues(before).toFixed(2),
        revenue_after: paymentRevenueFromValues(after).toFixed(2),
        request_path: req.originalUrl,
        request_method: req.method,
      },
    });
  }

  return changed;
}

function buildRequestedUpdates(req) {
  const updates = {};

  if (req.body.status !== undefined) {
    if (!BOOKING_STATUSES.has(req.body.status)) {
      const error = new Error('Invalid booking status');
      error.status = 400;
      throw error;
    }
    updates.status = req.body.status;
  }

  if (req.body.payment_status !== undefined) {
    if (!PAYMENT_STATUSES.has(req.body.payment_status)) {
      const error = new Error('Invalid payment status');
      error.status = 400;
      throw error;
    }
    updates.payment_status = req.body.payment_status;
  }

  if (req.body.payment_method !== undefined) {
    const method = req.body.payment_method || null;
    if (method !== null && !PAYMENT_METHODS.has(method)) {
      const error = new Error('Invalid payment method');
      error.status = 400;
      throw error;
    }
    updates.payment_method = method;
  }

  if (req.body.paid_amount !== undefined) {
    updates.paid_amount = parseAmountInput(req.body.paid_amount, 'Paid amount');
  }

  if (req.body.refund_amount !== undefined) {
    updates.refund_amount = parseAmountInput(req.body.refund_amount, 'Refund amount');
  }

  if (req.body.admin_notes !== undefined) {
    updates.admin_notes = req.body.admin_notes === null ? null : String(req.body.admin_notes);
  }

  if (req.body.cancellation_reason !== undefined) {
    updates.cancellation_reason = req.body.cancellation_reason === null
      ? null
      : String(req.body.cancellation_reason);
  }

  if (req.body.is_spam !== undefined) {
    updates.is_spam = Boolean(req.body.is_spam);
    if (!updates.is_spam) {
      updates.spam_reason = null;
      updates.marked_spam_at = null;
      updates.marked_spam_by = null;
    }
  }

  return updates;
}

const SORT_OPTIONS = {
  latest:        [['created_at', 'DESC']],
  oldest:        [['created_at', 'ASC']],
  highest_value: [['total_price', 'DESC']],
  lowest_value:  [['total_price', 'ASC']],
};

async function getBookings(req, res, next) {
  try {
    const {
      status,
      startDate,
      endDate,
      category,
      search,
      page = 1,
      limit: limitParam,
      sort = 'latest',
      is_spam,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100);
    const offset = (parseInt(page, 10) - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (category) where.guest_category = category;
    if (is_spam === 'true') where.is_spam = true;
    else if (is_spam === 'false') where.is_spam = false;

    if (startDate || endDate) {
      where.check_in_date = {};
      if (startDate) where.check_in_date[Op.gte] = startDate;
      if (endDate) where.check_in_date[Op.lte] = endDate;
    }

    if (search) {
      const like = { [Op.iLike]: `%${search}%` };
      where[Op.or] = [
        { guest_name: like },
        { guest_email: like },
        { booking_reference: like },
      ];
    }

    const order = SORT_OPTIONS[sort] || SORT_OPTIONS.latest;
    const total = await Booking.count({ where });

    const rows = await Booking.findAll({
      where,
      include: [
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'slug', 'duration_nights'],
          required: false,
        },
      ],
      order,
      limit,
      offset,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return res.json({
      bookings: rows,
      total,
      page: parseInt(page, 10),
      pageSize: limit,
      total_pages: totalPages,
      totalPages,
      hasMore: parseInt(page, 10) < totalPages,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/bookings/:id
 * Hard-delete draft bookings only. Removes payments first (FK RESTRICT).
 */
async function deleteBooking(req, res, next) {
  try {
    const actor = req.user || {};
    const actorName = actor.first_name
      ? `${actor.first_name} ${actor.last_name || ''}`.trim()
      : (actor.email || 'Admin');

    let deletedBookingId;
    let bookingReference;
    let hardDeleted = false;

    await sequelize.transaction(async (transaction) => {
      const booking = await Booking.findByPk(req.params.id, { transaction });
      if (!booking) {
        const error = new Error('Booking not found');
        error.status = 404;
        throw error;
      }

      deletedBookingId = booking.id;
      bookingReference = booking.booking_reference;

      if (booking.status !== 'draft') {
        const error = new Error('Only draft bookings can be permanently deleted. Cancel confirmed bookings instead.');
        error.status = 400;
        throw error;
      }

      // Payments table uses ON DELETE RESTRICT — must remove children first
      await Payment.destroy({ where: { booking_id: booking.id }, transaction });
      await Review.destroy({ where: { booking_id: booking.id }, transaction });
      await BookingAuditLog.destroy({ where: { booking_id: booking.id }, transaction });
      await booking.destroy({ transaction });

      hardDeleted = true;
      console.log(`[admin] Hard-deleted draft ${bookingReference} by ${actorName}`);
    });

    if (!hardDeleted) {
      return res.status(500).json({ error: 'Delete failed' });
    }

    return res.json({
      success: true,
      message: 'Booking permanently deleted',
      deletedBookingId,
      booking_reference: bookingReference,
      hardDeleted: true,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('[admin] deleteBooking error:', err.message);
    return next(err);
  }
}

async function getBookingById(req, res, next) {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'slug', 'duration_nights', 'description'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name', 'role'],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    return res.json({ booking });
  } catch (err) {
    next(err);
  }
}

async function updateBooking(req, res, next) {
  try {
    const requestedUpdates = buildRequestedUpdates(req);
    const actor = actorFromRequest(req);
    let refreshed;

    await sequelize.transaction(async (transaction) => {
      const booking = await Booking.findByPk(req.params.id, { transaction });
      if (!booking) {
        const error = new Error('Booking not found');
        error.status = 404;
        throw error;
      }

      const normalizedUpdates = applyPaymentRules(booking, requestedUpdates);
      const changedUpdates = {};

      for (const [field, value] of Object.entries(normalizedUpdates)) {
        if (!valuesMatch(field, booking[field], value)) {
          changedUpdates[field] = value;
        }
      }

      const auditEntries = auditEntriesForChanges({
        booking,
        updates: changedUpdates,
        actor,
        req,
      });

      if (Object.keys(changedUpdates).length > 0) {
        await booking.update(changedUpdates, { transaction });
      }

      if (auditEntries.length > 0) {
        await BookingAuditLog.bulkCreate(auditEntries, { transaction });
      }

      refreshed = await Booking.findByPk(req.params.id, {
        include: [{ model: Package, as: 'package', attributes: ['id', 'name', 'slug'] }],
        transaction,
      });
    });

    return res.json({
      booking: refreshed,
      message: 'Booking updated successfully',
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const { id } = req.params;

    const exists = await Booking.count({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const logs = await BookingAuditLog.findAll({
      where: { booking_id: id },
      order: [['created_at', 'DESC']],
      limit: 300,
    });

    return res.json({ logs });
  } catch (err) {
    next(err);
  }
}

async function getDashboardStats(req, res, next) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total_bookings,
      pending_confirmations,
      confirmed_bookings,
      checked_in,
      completed,
      avgParty,
    ] = await Promise.all([
      Booking.count(),
      Booking.count({ where: { status: 'draft' } }),
      Booking.count({ where: { status: 'confirmed' } }),
      Booking.count({ where: { status: 'checked_in' } }),
      Booking.count({ where: { status: 'checked_out' } }),
      Booking.findOne({
        attributes: [
          [sequelize.fn('AVG', sequelize.col('num_adults')), 'avg_adults'],
        ],
        raw: true,
      }),
    ]);

    const results = await sequelize.query(
      `
      SELECT
        COALESCE(SUM(${PAYMENT_REVENUE_SQL}), 0) AS total_revenue,
        COALESCE(SUM(
          CASE
            WHEN created_at >= :monthStart THEN ${PAYMENT_REVENUE_SQL}
            ELSE 0
          END
        ), 0) AS revenue_this_month,
        COALESCE(SUM(
          CASE
            WHEN status IN ('confirmed', 'checked_in', 'checked_out')
              THEN ${PAYMENT_REVENUE_SQL}
            ELSE 0
          END
        ), 0) AS confirmed_revenue
      FROM bookings
      `,
      {
        replacements: {
          monthStart: monthStart.toISOString(),
        },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    const revenueRow = (Array.isArray(results) ? results[0] : results) || {};

    return res.json({
      total_bookings,
      pending_confirmations,
      confirmed_bookings,
      checked_in,
      completed,
      total_revenue: parseFloat(revenueRow.total_revenue || 0).toFixed(2),
      revenue_this_month: parseFloat(revenueRow.revenue_this_month || 0).toFixed(2),
      confirmed_revenue: parseFloat(revenueRow.confirmed_revenue || 0).toFixed(2),
      average_party_size: avgParty
        ? parseFloat(avgParty.avg_adults || 0).toFixed(1)
        : '0.0',
    });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const idOrEmail = req.params.id;
    if (!idOrEmail) return res.status(400).json({ error: 'Missing user identifier' });

    let user;
    if (idOrEmail.includes('@')) {
      user = await User.findOne({ where: { email: idOrEmail } });
    } else {
      user = await User.findByPk(idOrEmail);
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (['admin', 'staff'].includes(user.role)) {
      return res.status(403).json({ error: 'Cannot delete staff or admin accounts' });
    }

    await sequelize.transaction(async (transaction) => {
      // 1. Anonymize the user account
      const newEmail = `deleted-${user.id}@deleted.jwr`;
      const randomPass = crypto.randomBytes(16).toString('hex');
      const hashed = await bcrypt.hash(randomPass, 10);

      await user.update({
        email: newEmail,
        first_name: 'Deleted',
        last_name: 'User',
        password_hash: hashed,
        phone: null,
        nationality: null,
        profile_picture_url: null,
        is_verified: false,
        refresh_token: null,
        password_reset_token: null,
        password_reset_expires: null,
      }, { transaction });

      // 2. Anonymize guest details on all bookings belonging to this user
      //    so the admin dashboard no longer displays PII
      await Booking.update(
        {
          guest_name:  'Deleted Guest',
          guest_email: newEmail,
          guest_phone: null,
          guest_nationality: null,
        },
        {
          where: { user_id: user.id },
          transaction,
        }
      );
    });

    return res.json({ success: true, message: 'Guest account and booking details anonymized' });
  } catch (err) {
    next(err);
  }
}


// ── Gallery Management ──────────────────────────────────────────────────────
// Gallery images stored in SiteSetting key='gallery'
// value: { images: [{ id, url, caption, category, size, uploadedAt }] }

const GALLERY_KEY = 'gallery';
const GALLERY_CATEGORIES = ['Resort', 'Wildlife', 'Activities', 'Landscape'];

async function getGallerySetting() {
  const row = await SiteSetting.findOne({ where: { key: GALLERY_KEY } });
  if (!row) return [];
  const val = row.value || {};
  return Array.isArray(val.images) ? val.images : [];
}

async function saveGallerySetting(images) {
  const [row] = await SiteSetting.findOrCreate({
    where: { key: GALLERY_KEY },
    defaults: { key: GALLERY_KEY, value: { images: [] } },
  });
  await row.update({ value: { images } });
  return images;
}

/** GET /api/gallery (public) or GET /api/admin/gallery (admin) */
async function listGalleryImages(req, res, next) {
  try {
    const images = await getGallerySetting();
    res.json({ images });
  } catch (err) { next(err); }
}

/** POST /api/admin/gallery/upload — multipart upload */
async function uploadGalleryImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const caption  = req.body.caption  || '';
    const category = req.body.category || 'Resort';
    const size     = req.body.size     || '';   // 'large' or ''

    if (!GALLERY_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${GALLERY_CATEGORIES.join(', ')}` });
    }

    const ts = Date.now();
    const imageUrl = await uploadImage(req.file.buffer, {
      mimetype:  req.file.mimetype,
      public_id: `gallery-${ts}`,
      folder:    'jungle-world-resort/gallery',
    });

    const images = await getGallerySetting();
    const newImage = {
      id:         ts,
      url:        imageUrl,
      caption,
      category,
      size,
      uploadedAt: new Date().toISOString(),
    };
    images.push(newImage);
    await saveGallerySetting(images);

    res.status(201).json({ image: newImage, images });
  } catch (err) { next(err); }
}

/** PATCH /api/admin/gallery/:id — update caption / category / size */
async function updateGalleryImage(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const images = await getGallerySetting();
    const idx = images.findIndex(img => img.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Gallery image not found' });

    const { caption, category, size } = req.body;
    if (caption  !== undefined) images[idx].caption  = caption;
    if (category !== undefined) {
      if (!GALLERY_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `Invalid category` });
      }
      images[idx].category = category;
    }
    if (size !== undefined) images[idx].size = size;

    await saveGallerySetting(images);
    res.json({ image: images[idx], images });
  } catch (err) { next(err); }
}

/** DELETE /api/admin/gallery/:id */
async function deleteGalleryImage(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const images = await getGallerySetting();
    const filtered = images.filter(img => img.id !== id);
    if (filtered.length === images.length) {
      return res.status(404).json({ error: 'Gallery image not found' });
    }
    await saveGallerySetting(filtered);
    res.json({ success: true, images: filtered });
  } catch (err) { next(err); }
}

// ── Offer Banner Management ──────────────────────────────────────────────────
// Stored in SiteSetting key='offer_banner'
// value: { url, title, expiresAt, uploadedAt }

const OFFER_KEY = 'offer_banner';

async function getOfferSetting() {
  const row = await SiteSetting.findOne({ where: { key: OFFER_KEY } });
  if (!row || !row.value) return null;
  const offer = row.value;
  // Treat expired offers as absent for public endpoint
  return offer;
}

/** GET /api/offer (public) — returns offer if active and not expired */
async function getOffer(req, res, next) {
  try {
    const offer = await getOfferSetting();
    if (!offer || !offer.url) return res.json({ offer: null });
    // Check expiry
    if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
      return res.json({ offer: null });
    }
    res.json({ offer });
  } catch (err) { next(err); }
}

/** POST /api/admin/offer/upload — admin upload offer banner */
async function uploadOffer(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const title    = req.body.title    || '';
    const duration = parseInt(req.body.duration, 10) || 24; // hours

    if (duration < 1 || duration > 8760) {
      return res.status(400).json({ error: 'Duration must be between 1 and 8760 hours' });
    }

    const ts = Date.now();
    const imageUrl = await uploadImage(req.file.buffer, {
      mimetype:  req.file.mimetype,
      public_id: `offer-${ts}`,
      folder:    'jungle-world-resort/offers',
    });

    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();

    const offer = {
      url:        imageUrl,
      title,
      expiresAt,
      uploadedAt: new Date().toISOString(),
    };

    const [row] = await SiteSetting.findOrCreate({
      where:    { key: OFFER_KEY },
      defaults: { key: OFFER_KEY, value: {} },
    });
    await row.update({ value: offer });

    res.status(201).json({ offer });
  } catch (err) { next(err); }
}

/** DELETE /api/admin/offer — remove offer banner */
async function deleteOffer(req, res, next) {
  try {
    const row = await SiteSetting.findOne({ where: { key: OFFER_KEY } });
    if (row) await row.destroy();
    res.json({ success: true });
  } catch (err) { next(err); }
}

/**
 * GET /api/admin/stats/monthly
 * Returns last 12 months of booking counts + revenue for the trend chart.
 */
async function getMonthlyTrend(req, res, next) {
  try {
    const rows = await sequelize.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        COUNT(*)::int                                         AS bookings,
        COALESCE(SUM(
          CASE
            WHEN payment_status = 'partial'  THEN COALESCE(paid_amount, 0)
            WHEN payment_status = 'completed' THEN COALESCE(total_price, 0)
            WHEN payment_status = 'refunded'
              THEN GREATEST(
                COALESCE(NULLIF(paid_amount,0), total_price, 0) - COALESCE(refund_amount,0),
                0
              )
            ELSE 0
          END
        ), 0)::float                                          AS revenue
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '12 months'
        AND status NOT IN ('draft')
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Fill in any missing months so frontend always has 12 data points
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      months.push({ month: key, label, bookings: 0, revenue: 0 });
    }

    rows.forEach(r => {
      const idx = months.findIndex(m => m.month === r.month);
      if (idx !== -1) {
        months[idx].bookings = Number(r.bookings);
        months[idx].revenue  = Math.round(Number(r.revenue));
      }
    });

    return res.json({ trend: months });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/export/csv
 * Streams filtered bookings as a CSV file.
 * Accepts same query params as getBookings.
 */
async function exportBookingsCSV(req, res, next) {
  try {
    const {
      status,
      startDate,
      endDate,
      category,
      search,
      sort = 'latest',
      is_spam,
    } = req.query;

    const where = {};
    if (status)   where.status         = status;
    if (category) where.guest_category = category;
    if (is_spam === 'true')  where.is_spam = true;
    if (is_spam === 'false') where.is_spam = false;

    if (startDate || endDate) {
      where.check_in_date = {};
      if (startDate) where.check_in_date[Op.gte] = startDate;
      if (endDate)   where.check_in_date[Op.lte] = endDate;
    }

    if (search) {
      const like = { [Op.iLike]: `%${search}%` };
      where[Op.or] = [
        { guest_name:        like },
        { guest_email:       like },
        { booking_reference: like },
      ];
    }

    const order = SORT_OPTIONS[sort] || SORT_OPTIONS.latest;

    const bookings = await Booking.findAll({
      where,
      include: [{
        model:      Package,
        as:         'package',
        attributes: ['name'],
        required:   false,
      }],
      order,
      limit: 5000, // Safety cap
    });

    const esc = v => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headers = [
      'Reference', 'Guest Name', 'Guest Email', 'Guest Phone',
      'Package', 'Category', 'Adults', 'Children',
      'Check-in', 'Check-out', 'Nights',
      'Status', 'Payment Status', 'Payment Method',
      'Total (NPR)', 'Paid (NPR)', 'Balance (NPR)',
      'Is Spam', 'Created At',
    ];

    const lines = [headers.join(',')];

    bookings.forEach(b => {
      lines.push([
        esc(b.booking_reference),
        esc(b.guest_name),
        esc(b.guest_email),
        esc(b.guest_phone),
        esc(b.package?.name || ''),
        esc(b.guest_category),
        esc(b.num_adults),
        esc(b.num_children),
        esc(b.check_in_date),
        esc(b.check_out_date),
        esc(b.duration_nights),
        esc(b.status),
        esc(b.payment_status),
        esc(b.payment_method),
        esc(Math.round(Number(b.total_price || 0))),
        esc(Math.round(Number(b.paid_amount || 0))),
        esc(Math.round(Number(b.balance_due || 0))),
        esc(b.is_spam ? 'Yes' : 'No'),
        esc(b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : ''),
      ].join(','));
    });

    const csv = lines.join('\n');
    const filename = `jwr-bookings-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  getAuditLogs,
  getDashboardStats,
  getMonthlyTrend,
  exportBookingsCSV,
  deleteUser,
  paymentRevenueFromValues,
  listGalleryImages,
  uploadGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  getOffer,
  uploadOffer,
  deleteOffer,
};
