'use strict';

const { Package, SiteSetting } = require('../models');

function fmtNPR(amount) {
  return `NPR ${Math.round(Number(amount)).toLocaleString('en-IN')}`;
}

function effectivePrice(regular, discount) {
  const d = discount != null && Number(discount) > 0 ? Number(discount) : null;
  const r = Number(regular);
  return d != null ? d : r;
}

function serializePackage(row) {
  const p = row.get ? row.get({ plain: true }) : row;
  const nights = p.duration_nights;
  const days = p.duration_days;

  const foreigner = effectivePrice(p.price_foreigner, p.price_foreigner_discount);
  const saarc = effectivePrice(p.price_saarc, p.price_saarc_discount);
  const nepali = effectivePrice(p.price_nepali, p.price_nepali_discount);

  const hasDiscount = (
    (p.price_foreigner_discount != null && Number(p.price_foreigner_discount) > 0)
    || (p.price_saarc_discount != null && Number(p.price_saarc_discount) > 0)
    || (p.price_nepali_discount != null && Number(p.price_nepali_discount) > 0)
  );

  return {
    id: p.short_id || p.slug,
    dbId: p.id,
    slug: p.slug,
    shortId: p.short_id,
    name: p.name,
    duration: `${nights} Night${nights > 1 ? 's' : ''} · ${days} Days`,
    badge: p.badge,
    popular: p.is_popular,
    discount: p.discount_label || null,
    urgency: p.urgency_text || null,
    desc: p.description,
    img: p.image_url,
    includes: Array.isArray(p.includes) ? p.includes : (p.includes ? JSON.parse(p.includes) : []),
    price: fmtNPR(foreigner),
    priceINR: fmtNPR(saarc),
    priceNPR: fmtNPR(nepali),
    priceOriginal: hasDiscount ? fmtNPR(p.price_foreigner) : null,
    prices: { foreigner, saarc, nepali },
    originalPrices: hasDiscount ? {
      foreigner: Number(p.price_foreigner),
      saarc: Number(p.price_saarc),
      nepali: Number(p.price_nepali),
    } : null,
    sortOrder: p.sort_order,
    isActive: p.is_active,
    // Raw numbers for admin forms
    _raw: {
      name: p.name,
      description: p.description,
      duration_nights: p.duration_nights,
      duration_days: p.duration_days,
      price_foreigner: Number(p.price_foreigner),
      price_saarc: Number(p.price_saarc),
      price_nepali: Number(p.price_nepali),
      price_foreigner_discount: p.price_foreigner_discount != null ? Number(p.price_foreigner_discount) : null,
      price_saarc_discount: p.price_saarc_discount != null ? Number(p.price_saarc_discount) : null,
      price_nepali_discount: p.price_nepali_discount != null ? Number(p.price_nepali_discount) : null,
      discount_label: p.discount_label,
      urgency_text: p.urgency_text,
      badge: p.badge,
      image_url: p.image_url,
      is_popular: p.is_popular,
      includes: Array.isArray(p.includes) ? p.includes : [],
    },
  };
}

async function getPromoSettings() {
  const row = await SiteSetting.findOne({ where: { key: 'promo' } });
  const val = row?.value || {};
  return {
    label: val.label || 'Early Bird Discount Expires In',
    endsAt: val.ends_at || val.endsAt || '2026-09-30',
  };
}

async function getPublicPackages(req, res, next) {
  try {
    const rows = await Package.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
    });
    const promo = await getPromoSettings();
    res.json({
      packages: rows.map(serializePackage),
      promo,
    });
  } catch (err) {
    next(err);
  }
}

async function listAdminPackages(req, res, next) {
  try {
    const rows = await Package.findAll({ order: [['sort_order', 'ASC']] });
    const promo = await getPromoSettings();
    res.json({
      packages: rows.map(serializePackage),
      promo,
    });
  } catch (err) {
    next(err);
  }
}

async function updatePackage(req, res, next) {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const allowed = [
      'name', 'description', 'duration_nights', 'duration_days',
      'price_foreigner', 'price_saarc', 'price_nepali',
      'price_foreigner_discount', 'price_saarc_discount', 'price_nepali_discount',
      'discount_label', 'urgency_text', 'badge', 'image_url',
      'includes', 'is_popular', 'is_active', 'sort_order',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.includes && typeof updates.includes === 'string') {
      try { updates.includes = JSON.parse(updates.includes); } catch { /* keep string */ }
    }

    await pkg.update(updates);
    res.json({ package: serializePackage(pkg) });
  } catch (err) {
    next(err);
  }
}

async function updatePromoSettings(req, res, next) {
  try {
    const { label, endsAt, ends_at } = req.body;
    const ends = endsAt || ends_at;
    const [row] = await SiteSetting.findOrCreate({
      where: { key: 'promo' },
      defaults: {
        key: 'promo',
        value: { label: 'Early Bird Discount Expires In', ends_at: '2026-09-30' },
      },
    });

    const nextVal = { ...row.value };
    if (label !== undefined) nextVal.label = label;
    if (ends !== undefined) nextVal.ends_at = ends;

    await row.update({ value: nextVal });
    res.json({ promo: await getPromoSettings() });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  serializePackage,
  getPublicPackages,
  listAdminPackages,
  updatePackage,
  updatePromoSettings,
  getPromoSettings,
};
