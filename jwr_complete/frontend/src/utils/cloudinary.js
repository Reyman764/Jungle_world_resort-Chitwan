/**
 * frontend/src/utils/cloudinary.js
 *
 * Cloudinary URL helpers for Jungle World Resort.
 * Cloud: dvadwvpco  (jungleworldresortchitwan@gmail.com)
 *
 * All gallery images live at: jwr/gallery/{filename-without-ext}
 * Logo stays in public/images/logo/ — NOT on Cloudinary.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dvadwvpco'
const BASE       = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`

/**
 * Build a Cloudinary image URL with automatic format and quality.
 *
 * @param {string} publicId  e.g. 'jwr/gallery/resort-01'
 * @param {object} opts      optional transform overrides
 * @returns {string}
 */
export function cloudinaryUrl(publicId, opts = {}) {
  const {
    quality = 'auto',
    format  = 'auto',
    width   = '',
    height  = '',
    crop    = '',
  } = opts

  const transforms = [`f_${format}`, `q_${quality}`]
  if (width)  transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if (crop)   transforms.push(`c_${crop}`)

  return `${BASE}/${transforms.join(',')}/${publicId}`
}

/**
 * Pre-built gallery image URLs (uploaded to jwr/gallery/ folder).
 * Run scripts/upload-gallery-to-cloudinary.js once to seed them.
 */
export const GALLERY_URLS = {
  'resort-01':         cloudinaryUrl('jwr/gallery/resort-01'),
  'resort-02':         cloudinaryUrl('jwr/gallery/resort-02'),
  'resort-03':         cloudinaryUrl('jwr/gallery/resort-03'),
  'resort-04':         cloudinaryUrl('jwr/gallery/resort-04'),
  'resort-05':         cloudinaryUrl('jwr/gallery/resort-05'),
  'resort-06':         cloudinaryUrl('jwr/gallery/resort-06'),
  'resort-07':         cloudinaryUrl('jwr/gallery/resort-07'),
  'resort-08':         cloudinaryUrl('jwr/gallery/resort-08'),
  'resort-09':         cloudinaryUrl('jwr/gallery/resort-09'),
  'resort-10':         cloudinaryUrl('jwr/gallery/resort-10'),
  'resort-hero':       cloudinaryUrl('jwr/gallery/resort-hero'),
  'resort-pool-day1':  cloudinaryUrl('jwr/gallery/resort-pool-day1'),
  'resort-pool-day2':  cloudinaryUrl('jwr/gallery/resort-pool-day2'),
  'resort-pool-night': cloudinaryUrl('jwr/gallery/resort-pool-night'),
}
