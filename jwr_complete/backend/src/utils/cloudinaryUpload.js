'use strict';
/**
 * Lightweight Cloudinary upload helper (no SDK dependency needed).
 * Uses the REST upload API with a Buffer payload.
 *
 * Required env vars:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Falls back to Supabase Storage when Cloudinary env vars are absent.
 */

const crypto = require('crypto');
const https  = require('https');

// ── Cloudinary ───────────────────────────────────────────────────────────────

function cloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY    &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Build a correct Cloudinary signed-upload signature.
 * All parameters (except file, cloud_name, resource_type, api_key)
 * must be included, sorted alphabetically.
 */
function buildCloudinarySignature(params, secret) {
  const sortedStr = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return crypto.createHash('sha1').update(sortedStr + secret).digest('hex');
}

/** Upload a Buffer to Cloudinary; returns the secure_url. */
async function uploadToCloudinary(buffer, options = {}) {
  const cloud  = process.env.CLOUDINARY_CLOUD_NAME;
  const key    = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  const folder = options.folder || 'jungle-world-resort/packages';

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Build params to sign — ALL non-excluded params must be here
  const signParams = { folder, timestamp };
  if (options.public_id) signParams.public_id = options.public_id;

  const signature = buildCloudinarySignature(signParams, secret);

  // Encode image as base64 data URI for the REST API
  const mime    = options.mimetype || 'image/jpeg';
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;

  const bodyObj = {
    file:      dataUri,
    api_key:   key,
    timestamp,
    signature,
    folder,
  };
  if (options.public_id) bodyObj.public_id = options.public_id;

  const body = JSON.stringify(bodyObj);

  return new Promise((resolve, reject) => {
    const url  = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
    const opts = {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(url, opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          if (data.secure_url) return resolve(data.secure_url);
          reject(new Error(data.error?.message || 'Cloudinary upload failed'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Supabase Storage (fallback) ──────────────────────────────────────────────

function supabaseConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Upload a Buffer to Supabase Storage; returns the public URL. */
async function uploadToSupabase(buffer, options = {}) {
  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket         = process.env.SUPABASE_STORAGE_BUCKET || 'package-images';
  const ext            = (options.mimetype || 'image/jpeg').split('/')[1] || 'jpg';
  const filename       = options.public_id
    ? `${options.public_id}.${ext}`
    : `pkg-${Date.now()}.${ext}`;
  const path           = `${options.folder || 'packages'}/${filename}`;

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

  return new Promise((resolve, reject) => {
    const opts = {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${serviceRoleKey}`,
        'Content-Type':   options.mimetype || 'image/jpeg',
        'Content-Length': buffer.length,
        'x-upsert':       'true',
      },
    };
    const lib = uploadUrl.startsWith('https') ? https : require('http');
    const req = lib.request(uploadUrl, opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
          return resolve(publicUrl);
        }
        try {
          const err = JSON.parse(raw);
          reject(new Error(err.message || `Supabase upload failed (${res.statusCode})`));
        } catch { reject(new Error(`Supabase upload failed (${res.statusCode})`)); }
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload an image buffer to whichever provider is configured.
 * @param {Buffer}  buffer
 * @param {object}  opts   – { mimetype, public_id, folder }
 * @returns {Promise<string>}  The public URL of the uploaded image
 */
async function uploadImage(buffer, opts = {}) {
  if (cloudinaryConfigured()) return uploadToCloudinary(buffer, opts);
  if (supabaseConfigured())   return uploadToSupabase(buffer, opts);
  throw new Error(
    'No image storage configured. ' +
    'Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET, ' +
    'or SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in your .env'
  );
}

module.exports = { uploadImage, cloudinaryConfigured, supabaseConfigured };
