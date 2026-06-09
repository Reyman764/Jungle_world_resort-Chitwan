'use strict';

const { Package, SiteSetting } = require('../models');
const { uploadImage } = require('../utils/cloudinaryUpload');

const PROMO_DEFAULTS = {
  label: 'Early Bird Discount Expires In',
  endsAt: '2026-09-30',
  showCountdown: true,
};

const CURRENCY_RATES_KEY = 'currency_rates';
const DEFAULT_RATES = { usd_to_npr: 132, inr_to_npr: 1.58 };

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

function fmtUSD(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'USD 0.00';
  return `USD ${n.toFixed(2)}`;
}

function fmtINR(amount) {
  return `INR ${Math.round(Number(amount)).toLocaleString('en-IN')}`;
}

function effectivePrice(regular, discount) {
  const d = discount != null && Number(discount) > 0 ? Number(discount) : null;
  return d ?? Number(regular);
}

function toNum(val) {
  return val != null ? Number(val) : null;
}

async function getCurrencyRatesFromDB() {
  const row = await SiteSetting.findOne({ where: { key: CURRENCY_RATES_KEY } });
  const val = row?.value || {};
  return {
    usd_to_npr: Number(val.usd_to_npr) || DEFAULT_RATES.usd_to_npr,
    inr_to_npr: Number(val.inr_to_npr) || DEFAULT_RATES.inr_to_npr,
  };
}

function serializePackage(row, rates) {
  const p = row.get ? row.get({ plain: true }) : row;
  const usdRate = (rates && Number(rates.usd_to_npr)) || DEFAULT_RATES.usd_to_npr;
  const inrRate = (rates && Number(rates.inr_to_npr)) || DEFAULT_RATES.inr_to_npr;

  const foreigner = effectivePrice(p.price_foreigner, p.price_foreigner_discount);
  const saarc     = effectivePrice(p.price_saarc,     p.price_saarc_discount);
  const nepali    = effectivePrice(p.price_nepali,    p.price_nepali_discount);

  const hasForeignerDiscount = p.price_foreigner_discount != null
    && Number(p.price_foreigner_discount) > 0
    && Number(p.price_foreigner_discount) < Number(p.price_foreigner);

  const hasSaarcDiscount = p.price_saarc_discount != null
    && Number(p.price_saarc_discount) > 0
    && Number(p.price_saarc_discount) < Number(p.price_saarc);

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
    img:      (() => {
      // Strip external/wrong URLs; fall back to a local gallery image keyed by slug
      const SLUG_IMGS = {
        'chitwan-at-a-glance': '/images/gallery/resort-03.jpg',
        'close-up-chitwan':    '/images/gallery/resort-06.jpg',
        'explore-chitwan':     '/images/gallery/resort-09.jpg',
      };
      const isWrongExternal = !p.image_url
        || p.image_url.includes('unsplash.com')
        || p.image_url.includes('sweethomechitwan.com');
      return isWrongExternal
        ? (SLUG_IMGS[p.slug] || '/images/gallery/resort-03.jpg')
        : p.image_url;
    })(),
    includes,
    // Display prices in proper currencies
    price:        fmtUSD(foreigner / usdRate),          // USD for international
    priceINR:     fmtINR(saarc    / inrRate),           // INR for SAARC
    priceNPR:     fmtNPR(nepali),                       // NPR for Nepali
    // "Before discount" originals in proper currency
    priceOriginal:    hasForeignerDiscount ? fmtUSD(Number(p.price_foreigner) / usdRate) : null,
    priceINROriginal: hasSaarcDiscount     ? fmtINR(Number(p.price_saarc)     / inrRate)  : null,
    // NPR equivalents for reference / booking math (booking wizard still works in NPR)
    priceNPREquiv: {
      foreigner: Math.round(foreigner),
      saarc:     Math.round(saarc),
    },
    // Raw numeric NPR values for booking calculations
    prices: { foreigner, saarc, nepali },
    sortOrder: p.sort_order,
    isActive:  p.is_active,
    // Raw values for admin forms (NPR stored)
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
  const [rows, promo, rates] = await Promise.all([
    Package.findAll({ where, order: [['sort_order', 'ASC'], ['name', 'ASC']] }),
    getPromoSettings(),
    getCurrencyRatesFromDB(),
  ]);
  res.json({
    packages: rows.map(r => serializePackage(r, rates)),
    promo,
    currencyRates: rates,
  });
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
    const rates = await getCurrencyRatesFromDB();
    res.json({ package: serializePackage(pkg, rates) });
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

/** GET /api/admin/packages/currency-rates */
async function getCurrencyRatesHandler(req, res, next) {
  try {
    const rates = await getCurrencyRatesFromDB();
    res.json({ currencyRates: rates });
  } catch (err) { next(err); }
}

/** PATCH /api/admin/packages/currency-rates */
async function updateCurrencyRatesHandler(req, res, next) {
  try {
    const { usd_to_npr, inr_to_npr } = req.body;
    const updates = {};

    if (usd_to_npr !== undefined) {
      const v = Number(usd_to_npr);
      if (!Number.isFinite(v) || v <= 0) return res.status(400).json({ error: 'usd_to_npr must be a positive number' });
      updates.usd_to_npr = v;
    }
    if (inr_to_npr !== undefined) {
      const v = Number(inr_to_npr);
      if (!Number.isFinite(v) || v <= 0) return res.status(400).json({ error: 'inr_to_npr must be a positive number' });
      updates.inr_to_npr = v;
    }

    const [row] = await SiteSetting.findOrCreate({
      where: { key: CURRENCY_RATES_KEY },
      defaults: { key: CURRENCY_RATES_KEY, value: DEFAULT_RATES },
    });

    await row.update({ value: { ...row.value, ...updates } });
    const rates = await getCurrencyRatesFromDB();
    res.json({ currencyRates: rates, message: 'Exchange rates updated' });
  } catch (err) { next(err); }
}

async function uploadPackageImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const imageUrl = await uploadImage(req.file.buffer, {
      mimetype:  req.file.mimetype,
      public_id: `pkg-${pkg.slug || pkg.id}-${Date.now()}`,
      folder:    'jungle-world-resort/packages',
    });

    await pkg.update({ image_url: imageUrl });
    const rates = await getCurrencyRatesFromDB();
    res.json({ package: serializePackage(pkg, rates) });
  } catch (err) { next(err); }
}

module.exports = {
  serializePackage,
  getPublicPackages,
  listAdminPackages,
  updatePackage,
  updatePromoSettings,
  getPromoSettings,
  uploadPackageImage,
  getCurrencyRatesHandler,
  updateCurrencyRatesHandler,
};
