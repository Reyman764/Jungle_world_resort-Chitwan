'use strict';

const { Op } = require('sequelize');
const { Booking, Package, User, sequelize } = require('../models');

/**
 * GET /api/admin/bookings
 * Returns paginated, filtered list of all bookings with package info.
 * Query params: status, startDate, endDate, category, search, page
 */
async function getBookings(req, res, next) {
  try {
    const {
      status,
      startDate,
      endDate,
      category,
      search,
      page = 1,
    } = req.query;

    const limit  = 50;
    const offset = (parseInt(page) - 1) * limit;

    const where = {};

    if (status)    where.status         = status;
    if (category)  where.guest_category = category;

    if (startDate || endDate) {
      where.check_in_date = {};
      if (startDate) where.check_in_date[Op.gte] = startDate;
      if (endDate)   where.check_in_date[Op.lte] = endDate;
    }

    if (search) {
      const like = { [Op.iLike]: `%${search}%` };
      where[Op.or] = [
        { guest_name:      like },
        { guest_email:     like },
        { booking_reference: like },
      ];
    }

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
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      bookings:    rows,
      total,
      page:        parseInt(page),
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/bookings/:id
 * Full booking details including guest + package info.
 */
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

/**
 * PATCH /api/admin/bookings/:id
 * Update status, payment info, or internal notes.
 */
async function updateBooking(req, res, next) {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const allowed = ['status', 'payment_status', 'paid_amount', 'admin_notes'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Recalculate balance_due when paid_amount changes
    if (updates.paid_amount !== undefined) {
      updates.balance_due = parseFloat(booking.total_price) - parseFloat(updates.paid_amount);
    }

    await booking.update(updates);

    const refreshed = await Booking.findByPk(req.params.id, {
      include: [{ model: Package, as: 'package', attributes: ['id', 'name', 'slug'] }],
    });

    return res.json({ booking: refreshed, message: 'Booking updated successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/stats
 * Dashboard summary counts and revenue figures.
 */
async function getDashboardStats(req, res, next) {
  try {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total_bookings,
      pending_confirmations,
      confirmed_bookings,
      checked_in,
      completed,
      revenueAll,
      revenueMonth,
      avgParty,
    ] = await Promise.all([
      Booking.count(),
      Booking.count({ where: { status: 'draft' } }),
      Booking.count({ where: { status: 'confirmed' } }),
      Booking.count({ where: { status: 'checked_in' } }),
      Booking.count({ where: { status: 'checked_out' } }),

      // Total revenue from completed / confirmed / checked-in bookings
      Booking.sum('total_price', {
        where: { status: { [Op.in]: ['confirmed', 'checked_in', 'checked_out'] } },
      }),

      // Revenue this calendar month
      Booking.sum('total_price', {
        where: {
          status:     { [Op.in]: ['confirmed', 'checked_in', 'checked_out'] },
          created_at: { [Op.gte]: monthStart },
        },
      }),

      // Average party size
      Booking.findOne({
        attributes: [
          [sequelize.fn('AVG', sequelize.col('num_adults')), 'avg_adults'],
        ],
        raw: true,
      }),
    ]);

    return res.json({
      total_bookings,
      pending_confirmations,
      confirmed_bookings,
      checked_in,
      completed,
      total_revenue:      parseFloat(revenueAll   || 0).toFixed(2),
      revenue_this_month: parseFloat(revenueMonth || 0).toFixed(2),
      average_party_size: avgParty
        ? parseFloat(avgParty.avg_adults || 0).toFixed(1)
        : '0.0',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBookings, getBookingById, updateBooking, getDashboardStats };
