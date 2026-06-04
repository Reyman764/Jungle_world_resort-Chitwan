'use strict';

const { Package, SiteSetting } = require('../models');

const PROMO_DEFAULTS = {
  label: 'Early Bird Discount Expires In',
  endsAt: '2026-09-30',
  showCountdown: true,
};

const UPDATABLE_FIELDS = [
  'name', 'description', 'duration_nights', 'duration_days',
  'price_foreigner', 'price_saarc', 'price_nepali',
  'price_foreigner_discount', 'price_saarc_discount', 'price_nepali_discount',
  'discount_label', 'urgency_text', 'badge', 'image_url',
  'includes', 'is_popular', 'is_active', 'sort_order',
];

function fmtNPR(amount) {
  return `NPR ${Math.round(Number(amount)).toLocaleString('en-IN')}`;
}

function effectivePrice(regular, discount) {
  const d = discount != null && Number(discount) > 0 ? Number(discount) : null;
  return d ?? Number(regular);
}

function toNum(val) {
  return val != null ? Number(val) : null;
}

function serializePackage(row) {
  const p = row.get ? row.get({ plain: true }) : row;

  const foreigner = effectivePrice(p.price_foreigner, p.price_foreigner_discount);
  const saarc     = effectivePrice(p.price_saarc,     p.price_saarc_discount);
  const nepali    = effectivePrice(p.price_nepali,    p.price_nepali_discount);

  const hasDiscount = [
    [p.price_foreigner, p.price_foreigner_discount],
    [p.price_saarc,     p.price_saarc_discount],
    [p.price_nepali,    p.price_nepali_discount],
  ].some(([r, d]) => d != null && Number(d) > 0 && Number(d) < Number(r));

  const includes = Array.isArray(p.includes) ? p.includes : (p.includes ? JSON.parse(p.includes) : []);

  return {
    id:       p.short_id || p.slug,
    dbId:     p.id,
    slug:     p.slug,
    name:     p.name,
    duration: `${p.duration_nights} Night${p.duration_nights > 1 ? 's' : ''} · ${p.duration_days} Days`,
    badge:    p.badge,
    popular:  p.is_popular,
    discount: p.discount_label  || null,
    urgency:  p.urgency_text    || null,
    desc:     p.description,
    img:      p.image_url,
    includes,
    price:        fmtNPR(foreigner),
    priceINR:     fmtNPR(saarc),
    priceNPR:     fmtNPR(nepali),
    priceOriginal: hasDiscount ? fmtNPR(p.price_foreigner) : null,
    prices:       { foreigner, saarc, nepali },
    sortOrder: p.sort_order,
    isActive:  p.is_active,
    // Raw values for admin forms only
    _raw: {
      name:                     p.name,
      description:              p.description,
      duration_nights:          p.duration_nights,
      duration_days:            p.duration_days,
      price_foreigner:          Number(p.price_foreigner),
      price_saarc:              Number(p.price_saarc),
      price_nepali:             Number(p.price_nepali),
      price_foreigner_discount: toNum(p.price_foreigner_discount),
      price_saarc_discount:     toNum(p.price_saarc_discount),
      price_nepali_discount:    toNum(p.price_nepali_discount),
      discount_label:           p.discount_label,
      urgency_text:             p.urgency_text,
      badge:                    p.badge,
      image_url:                p.image_url,
      is_popular:               p.is_popular,
      includes,
    },
  };
}

async function getPromoSettings() {
  const row = await SiteSetting.findOne({ where: { key: 'promo' } });
  const val = row?.value || {};
  return {
    label:         val.label         || PROMO_DEFAULTS.label,
    endsAt:        val.ends_at       || PROMO_DEFAULTS.endsAt,
    showCountdown: val.show_countdown !== undefined ? Boolean(val.show_countdown) : PROMO_DEFAULTS.showCountdown,
  };
}

async function respondWithPackages(res, where = {}) {
  const [rows, promo] = await Promise.all([
    Package.findAll({ where, order: [['sort_order', 'ASC'], ['name', 'ASC']] }),
    getPromoSettings(),
  ]);
  res.json({ packages: rows.map(serializePackage), promo });
}

async function getPublicPackages(req, res, next) {
  try { await respondWithPackages(res, { is_active: true }); } catch (err) { next(err); }
}

async function listAdminPackages(req, res, next) {
  try { await respondWithPackages(res); } catch (err) { next(err); }
}

async function updatePackage(req, res, next) {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const updates = Object.fromEntries(
      UPDATABLE_FIELDS
        .filter(k => req.body[k] !== undefined)
        .map(k => [k, req.body[k]])
    );

    if (updates.includes && typeof updates.includes === 'string') {
      try { updates.includes = JSON.parse(updates.includes); } catch { /* keep as-is */ }
    }

    await pkg.update(updates);
    res.json({ package: serializePackage(pkg) });
  } catch (err) { next(err); }
}

async function updatePromoSettings(req, res, next) {
  try {
    const { label, endsAt, showCountdown } = req.body;
    const [row] = await SiteSetting.findOrCreate({
      where: { key: 'promo' },
      defaults: { key: 'promo', value: { label: PROMO_DEFAULTS.label, ends_at: PROMO_DEFAULTS.endsAt, show_countdown: true } },
    });

    const next = { ...row.value };
    if (label         !== undefined) next.label         = label;
    if (endsAt        !== undefined) next.ends_at        = endsAt;
    if (showCountdown !== undefined) next.show_countdown = Boolean(showCountdown);

    await row.update({ value: next });
    res.json({ promo: await getPromoSettings() });
  } catch (err) { next(err); }
}

module.exports = { serializePackage, getPublicPackages, listAdminPackages, updatePackage, updatePromoSettings, getPromoSettings };
