'use strict';

const { Op } = require('sequelize');
const { Booking, Package, User, BookingAuditLog, Payment, Review, SiteSetting, sequelize, Sequelize } = require('../models');
const { uploadImage } = require('../utils/cloudinaryUpload');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getClientIp } = require('../middleware/rateLimiter');
const { logAuditEvent } = require('./auditLogController');

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
      payment_status,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100);
    const offset = (parseInt(page, 10) - 1) * limit;
    const where = { deleted_at: null }; // never show recycle-binned bookings in the normal list

    if (status) where.status = status;
    if (payment_status) where.payment_status = payment_status;
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
 * Soft-delete — moves the booking into the recycle bin instead of erasing
 * it. Works for any booking status (draft, confirmed, partial, completed,
 * etc.) since it's now fully recoverable. Records who deleted it and when,
 * and writes a BOOKING_SOFT_DELETED entry to the existing audit trail so
 * it shows up in that booking's change history too. Only a permanent
 * delete from the recycle bin (admin-only) actually erases the row.
 */
async function deleteBooking(req, res, next) {
  try {
    const { changedBy, changedByRole, changedById, ip, userAgent } = actorFromRequest(req);
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 255) : null;

    let responsePayload;

    await sequelize.transaction(async (transaction) => {
      const booking = await Booking.findOne({
        where: { id: req.params.id, deleted_at: null },
        transaction,
      });

      if (!booking) {
        const error = new Error('Booking not found');
        error.status = 404;
        throw error;
      }

      const statusAtDeletion = booking.status;

      await booking.update({
        deleted_at: new Date(),
        deleted_by_id: changedById,
        deleted_by_name: changedBy,
        deleted_by_role: changedByRole,
      }, { transaction });

      await logAuditEvent(booking.id, 'BOOKING_SOFT_DELETED', {
        performedById: changedById,
        performedByName: changedBy,
        performedByRole: changedByRole,
        field_name: 'booking',
        old_value: `Active (${statusAtDeletion})`,
        new_value: 'Moved to Recycle Bin',
        reason,
        risk_level: 'high',
        ip_address: ip,
        user_agent: userAgent,
        metadata: { booking_reference: booking.booking_reference },
      }, transaction);

      responsePayload = {
        success: true,
        message: `Booking ${booking.booking_reference} moved to the recycle bin`,
        deletedBookingId: booking.id,
        booking_reference: booking.booking_reference,
      };
    });

    return res.json(responsePayload);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('[admin] deleteBooking error:', err.message);
    return next(err);
  }
}

/**
 * GET /api/admin/recycle-bin
 * Admin-only. Lists every soft-deleted booking, most recently deleted
 * first, along with who deleted it and when.
 */
async function listRecycleBin(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await Booking.findAndCountAll({
      where: { deleted_at: { [Op.ne]: null } },
      include: [
        { model: Package, as: 'package', attributes: ['id', 'name'], required: false },
      ],
      order: [['deleted_at', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      bookings: rows,
      total: count,
      page,
      totalPages: Math.max(Math.ceil(count / limit), 1),
    });
  } catch (err) {
    console.error('[admin] listRecycleBin error:', err.message);
    next(err);
  }
}

/**
 * POST /api/admin/recycle-bin/:id/restore
 * Admin-only. Clears the soft-delete columns and puts the booking back
 * into every normal list/lookup. Logs a BOOKING_RESTORED audit entry.
 */
async function restoreBooking(req, res, next) {
  try {
    const { changedBy, changedByRole, changedById, ip, userAgent } = actorFromRequest(req);
    let restored;

    await sequelize.transaction(async (transaction) => {
      const booking = await Booking.findOne({
        where: { id: req.params.id, deleted_at: { [Op.ne]: null } },
        transaction,
      });

      if (!booking) {
        const error = new Error('Booking not found in recycle bin');
        error.status = 404;
        throw error;
      }

      const deletedByName = booking.deleted_by_name || 'Unknown';
      const deletedByRole = booking.deleted_by_role || 'unknown';

      await booking.update({
        deleted_at: null,
        deleted_by_id: null,
        deleted_by_name: null,
        deleted_by_role: null,
      }, { transaction });

      await logAuditEvent(booking.id, 'BOOKING_RESTORED', {
        performedById: changedById,
        performedByName: changedBy,
        performedByRole: changedByRole,
        field_name: 'booking',
        old_value: `Deleted by ${deletedByName} (${deletedByRole})`,
        new_value: 'Restored',
        risk_level: 'medium',
        ip_address: ip,
        user_agent: userAgent,
        metadata: { booking_reference: booking.booking_reference },
      }, transaction);

      restored = booking;
    });

    return res.json({
      success: true,
      message: `Booking ${restored.booking_reference} restored`,
      booking: restored,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('[admin] restoreBooking error:', err.message);
    return next(err);
  }
}

/**
 * DELETE /api/admin/recycle-bin/:id
 * Admin-only. Permanently erases a booking that's already in the recycle
 * bin — this is the only path left in the app that actually destroys a
 * booking row. Logs BOOKING_PERMANENTLY_DELETED first, then destroys the
 * booking. The audit log rows for this booking (including the one just
 * written) are deliberately left alone: booking_audit_logs.booking_id is
 * ON DELETE SET NULL (migration 024), so the full history — who booked
 * it, every status/payment change, who deleted it, who permanently
 * erased it — survives the booking itself, identified afterwards by
 * metadata.booking_reference instead of the now-gone booking_id. This
 * mirrors the staff_audit_logs fix in migration 021: an audit trail that
 * disappears when the audited row is removed defeats its purpose.
 */
async function permanentlyDeleteBooking(req, res, next) {
  try {
    const { changedBy, changedByRole, changedById, ip, userAgent } = actorFromRequest(req);

    let deletedBookingId;
    let bookingReference;

    await sequelize.transaction(async (transaction) => {
      const booking = await Booking.findOne({
        where: { id: req.params.id, deleted_at: { [Op.ne]: null } },
        transaction,
      });

      if (!booking) {
        const error = new Error('Booking not found in recycle bin');
        error.status = 404;
        throw error;
      }

      deletedBookingId = booking.id;
      bookingReference = booking.booking_reference;

      await logAuditEvent(booking.id, 'BOOKING_PERMANENTLY_DELETED', {
        performedById: changedById,
        performedByName: changedBy,
        performedByRole: changedByRole,
        field_name: 'booking',
        old_value: `Deleted by ${booking.deleted_by_name || 'Unknown'}`,
        new_value: 'Permanently Erased',
        risk_level: 'high',
        ip_address: ip,
        user_agent: userAgent,
        metadata: { booking_reference: booking.booking_reference },
      }, transaction);

      // Payments table uses ON DELETE RESTRICT — must remove children first.
      // Reviews cascade on their own. Audit logs are intentionally left
      // in place (see doc comment above) — they SET NULL, they don't block
      // the delete and they don't get destroyed here.
      await Payment.destroy({ where: { booking_id: booking.id }, transaction });
      await Review.destroy({ where: { booking_id: booking.id }, transaction });
      await booking.destroy({ transaction });
    });

    return res.json({
      success: true,
      message: `Booking ${bookingReference} permanently deleted`,
      deletedBookingId,
      booking_reference: bookingReference,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('[admin] permanentlyDeleteBooking error:', err.message);
    return next(err);
  }
}

async function getBookingById(req, res, next) {
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, deleted_at: null },
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
      const booking = await Booking.findOne({
        where: { id: req.params.id, deleted_at: null },
        transaction,
      });
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

      refreshed = await Booking.findOne({
        where: { id: req.params.id },
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
      Booking.count({ where: { deleted_at: null } }),
      Booking.count({ where: { status: 'draft', deleted_at: null } }),
      Booking.count({ where: { status: 'confirmed', deleted_at: null } }),
      Booking.count({ where: { status: 'checked_in', deleted_at: null } }),
      Booking.count({ where: { status: 'checked_out', deleted_at: null } }),
      Booking.findOne({
        where: { deleted_at: null },
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
      WHERE deleted_at IS NULL AND status <> 'draft'
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
        COALESCE(SUM(${PAYMENT_REVENUE_SQL}), 0)::float       AS revenue
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '12 months'
        AND status NOT IN ('draft')
        AND deleted_at IS NULL
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
 * GET /api/admin/stats/revenue-breakdown
 * Explains the "Total Revenue" number on the dashboard: which packages,
 * payment statuses, and booking statuses it's made up of, plus an
 * itemized list of every active booking counted in it (mirrors the exact
 * same formula as getDashboardStats/getMonthlyTrend, via
 * paymentRevenueFromValues, so the totals always agree).
 *
 * Also flags any booking whose stored paid_amount / refund_amount /
 * balance_due don't match what its own payment_status implies (the same
 * normalization applyPaymentRules already enforces on every manual edit).
 * These flagged bookings are the "doesn't add up" cases — usually data
 * left over from before a fix, or edited directly in the database.
 */
async function getRevenueBreakdown(req, res, next) {
  try {
    const bookings = await Booking.findAll({
      where: { deleted_at: null, status: { [Op.ne]: 'draft' } },
      include: [
        { model: Package, as: 'package', attributes: ['id', 'name'], required: false },
      ],
      attributes: [
        'id', 'booking_reference', 'guest_name', 'status', 'payment_status',
        'total_price', 'paid_amount', 'refund_amount', 'balance_due',
        'package_id', 'created_at',
      ],
      order: [['created_at', 'DESC']],
    });

    const byPackage = new Map();
    const byPaymentStatus = new Map();
    const byStatus = new Map();
    const items = [];
    let grandTotal = 0;
    let mismatchedCount = 0;

    for (const row of bookings) {
      const plain = row.get({ plain: true });
      const revenue = paymentRevenueFromValues(plain);
      grandTotal += revenue;

      const pkgKey = plain.package_id || 'unassigned';
      const pkgName = plain.package?.name || 'Unassigned / Deleted Package';
      if (!byPackage.has(pkgKey)) {
        byPackage.set(pkgKey, { package_id: plain.package_id, package_name: pkgName, revenue: 0, booking_count: 0 });
      }
      const pkgAgg = byPackage.get(pkgKey);
      pkgAgg.revenue += revenue;
      pkgAgg.booking_count += 1;

      const psKey = plain.payment_status || 'pending';
      if (!byPaymentStatus.has(psKey)) {
        byPaymentStatus.set(psKey, { payment_status: psKey, revenue: 0, booking_count: 0 });
      }
      const psAgg = byPaymentStatus.get(psKey);
      psAgg.revenue += revenue;
      psAgg.booking_count += 1;

      const stKey = plain.status || 'draft';
      if (!byStatus.has(stKey)) {
        byStatus.set(stKey, { status: stKey, revenue: 0, booking_count: 0 });
      }
      const stAgg = byStatus.get(stKey);
      stAgg.revenue += revenue;
      stAgg.booking_count += 1;

      // Would applyPaymentRules (the same rules used on every manual edit)
      // compute different paid/refund/balance figures than what's stored?
      const expected = applyPaymentRules(plain, { payment_status: psKey });
      const isMismatched =
        money(plain.paid_amount) !== money(expected.paid_amount) ||
        money(plain.refund_amount) !== money(expected.refund_amount) ||
        money(plain.balance_due) !== money(expected.balance_due);
      if (isMismatched) mismatchedCount += 1;

      items.push({
        id: plain.id,
        booking_reference: plain.booking_reference,
        guest_name: plain.guest_name,
        package_name: pkgName,
        status: stKey,
        payment_status: psKey,
        total_price: money(plain.total_price).toFixed(2),
        paid_amount: money(plain.paid_amount).toFixed(2),
        refund_amount: money(plain.refund_amount).toFixed(2),
        balance_due: money(plain.balance_due).toFixed(2),
        revenue: revenue.toFixed(2),
        created_at: plain.created_at,
        is_mismatched: isMismatched,
        ...(isMismatched ? {
          expected_paid_amount: money(expected.paid_amount).toFixed(2),
          expected_refund_amount: money(expected.refund_amount).toFixed(2),
          expected_balance_due: money(expected.balance_due).toFixed(2),
        } : {}),
      });
    }

    items.sort((a, b) => Number(b.revenue) - Number(a.revenue));

    const sortDesc = (map) => [...map.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map(x => ({ ...x, revenue: x.revenue.toFixed(2) }));

    return res.json({
      grand_total: grandTotal.toFixed(2),
      booking_count: bookings.length,
      mismatched_count: mismatchedCount,
      by_package: sortDesc(byPackage),
      by_payment_status: sortDesc(byPaymentStatus),
      by_status: sortDesc(byStatus),
      bookings: items,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/stats/reconcile-payments
 * Admin-only. Finds every active, non-draft booking whose paid_amount /
 * refund_amount / balance_due don't match what applyPaymentRules would
 * compute from its own payment_status + total_price, and corrects them —
 * the exact same normalization already applied on every manual edit in
 * updateBooking(), just swept once across existing data. Every change goes
 * through the normal audit trail, same as a manual edit would.
 */
async function reconcilePaymentMismatches(req, res, next) {
  try {
    const actor = actorFromRequest(req);
    const fixed = [];

    await sequelize.transaction(async (transaction) => {
      const bookings = await Booking.findAll({
        where: { deleted_at: null, status: { [Op.ne]: 'draft' } },
        transaction,
      });

      for (const booking of bookings) {
        const expected = applyPaymentRules(booking, { payment_status: booking.payment_status });
        const changedUpdates = {};

        for (const field of ['paid_amount', 'refund_amount', 'balance_due']) {
          if (!valuesMatch(field, booking[field], expected[field])) {
            changedUpdates[field] = expected[field];
          }
        }

        if (Object.keys(changedUpdates).length === 0) continue;

        const auditEntries = auditEntriesForChanges({
          booking,
          updates: changedUpdates,
          actor,
          req,
        });

        await booking.update(changedUpdates, { transaction });

        if (auditEntries.length > 0) {
          await BookingAuditLog.bulkCreate(auditEntries, { transaction });
        }

        fixed.push({
          booking_reference: booking.booking_reference,
          guest_name: booking.guest_name,
          changes: changedUpdates,
        });
      }
    });

    return res.json({
      success: true,
      fixed_count: fixed.length,
      fixed,
      message: fixed.length
        ? `Reconciled payment fields on ${fixed.length} booking${fixed.length === 1 ? '' : 's'}.`
        : 'Nothing to fix — every active booking already matches.',
    });
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

    const where = { deleted_at: null };
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
      let s = String(v);
      // Neutralize CSV/spreadsheet formula injection: a leading
      // =, +, -, @, tab, or CR makes Excel/Sheets treat the cell as a
      // formula. These fields (guest name/phone) come straight from the
      // public booking form, so prefix a literal apostrophe to force
      // text interpretation — the standard OWASP mitigation for this.
      if (/^[=+\-@\t\r]/.test(s)) {
        s = `'${s}`;
      }
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
  listRecycleBin,
  restoreBooking,
  permanentlyDeleteBooking,
  getAuditLogs,
  getDashboardStats,
  getMonthlyTrend,
  getRevenueBreakdown,
  reconcilePaymentMismatches,
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
