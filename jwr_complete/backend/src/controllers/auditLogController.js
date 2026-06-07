'use strict';

const { Op } = require('sequelize');
const { BookingAuditLog, Booking, User } = require('../models');

function formatLogEntry(log) {
  const plain = typeof log.get === 'function' ? log.get({ plain: true }) : log;
  const performer = plain.changer;

  return {
    id: plain.id,
    booking_id: plain.booking_id,
    booking_reference: plain.booking?.booking_reference || plain.metadata?.booking_reference || null,
    action: plain.action,
    field_name: plain.field_name,
    old_value: plain.old_value,
    new_value: plain.new_value,
    reason: plain.reason || null,
    risk_level: plain.risk_level || 'low',
    ip_address: plain.ip_address,
    created_at: plain.created_at,
    performed_by: performer
      ? {
          id: performer.id,
          name: `${performer.first_name || ''} ${performer.last_name || ''}`.trim() || performer.email,
          email: performer.email,
        }
      : { id: plain.changed_by_id, name: plain.changed_by || 'SYSTEM', email: null },
  };
}

async function logAuditEvent(bookingId, action, details = {}, transaction = null) {
  const opts = transaction ? { transaction } : {};
  return BookingAuditLog.create({
    booking_id: bookingId,
    changed_by_id: details.performedById || null,
    changed_by: details.performedByName || details.changed_by || 'SYSTEM',
    changed_by_role: details.performedByRole || 'system',
    action,
    field_name: details.field_name || 'booking',
    old_value: details.old_value ?? null,
    new_value: details.new_value ?? null,
    reason: details.reason || null,
    risk_level: details.risk_level || 'low',
    ip_address: details.ip_address || null,
    user_agent: details.user_agent || null,
    metadata: details.metadata || null,
  }, opts);
}

async function getRecentAuditLogs(filters = {}) {
  const limit = Math.min(parseInt(filters.limit, 10) || 15, 100);
  const offset = parseInt(filters.offset, 10) || 0;
  const where = {};

  if (filters.action) where.action = filters.action;
  if (filters.risk_level) where.risk_level = filters.risk_level;

  const { count, rows } = await BookingAuditLog.findAndCountAll({
    where,
    include: [
      { model: Booking, as: 'booking', attributes: ['booking_reference', 'guest_name'], required: false },
      { model: User, as: 'changer', attributes: ['id', 'email', 'first_name', 'last_name'], required: false },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    logs: rows.map(formatLogEntry),
    total: count,
    hasMore: offset + rows.length < count,
  };
}

async function listAuditLogs(req, res, next) {
  try {
    const result = await getRecentAuditLogs({
      limit: req.query.limit,
      offset: req.query.offset,
      action: req.query.action,
      risk_level: req.query.risk_level,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { logAuditEvent, getRecentAuditLogs, listAuditLogs, formatLogEntry };
