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
 * Build a Cloudinary image URL with automatic format, quality and optional width.
 *
 * Using f_auto delivers WebP/AVIF to browsers that support it,
 * q_auto picks the optimal quality — together these are the biggest
 * image-delivery wins flagged by Lighthouse.
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
 * Build a responsive srcSet string for a Cloudinary image.
 * Returns a comma-separated list of `url Nw` descriptors.
 */
export function cloudinarySrcSet(publicId, widths = [400, 800, 1200]) {
  return widths
    .map(w => `${cloudinaryUrl(publicId, { width: w })} ${w}w`)
    .join(', ')
}

/**
 * Pre-built gallery image URLs (uploaded to jwr/gallery/ folder).
 * We request 800 px wide by default — large enough for 33 vw columns
 * on desktop, right-sized for mobile.  The browser fetches the
 * appropriate width via the srcSet / sizes attributes in Gallery.jsx.
 */
export const GALLERY_URLS = {
  'resort-01':         cloudinaryUrl('jwr/gallery/resort-01',         { width: 800 }),
  'resort-02':         cloudinaryUrl('jwr/gallery/resort-02',         { width: 800 }),
  'resort-03':         cloudinaryUrl('jwr/gallery/resort-03',         { width: 800 }),
  'resort-04':         cloudinaryUrl('jwr/gallery/resort-04',         { width: 800 }),
  'resort-05':         cloudinaryUrl('jwr/gallery/resort-05',         { width: 800 }),
  'resort-06':         cloudinaryUrl('jwr/gallery/resort-06',         { width: 800 }),
  'resort-07':         cloudinaryUrl('jwr/gallery/resort-07',         { width: 800 }),
  'resort-08':         cloudinaryUrl('jwr/gallery/resort-08',         { width: 800 }),
  'resort-09':         cloudinaryUrl('jwr/gallery/resort-09',         { width: 800 }),
  'resort-10':         cloudinaryUrl('jwr/gallery/resort-10',         { width: 800 }),
  'resort-hero':       cloudinaryUrl('jwr/gallery/resort-hero',       { width: 1920 }),
  'resort-pool-day1':  cloudinaryUrl('jwr/gallery/resort-pool-day1',  { width: 1200 }),
  'resort-pool-day2':  cloudinaryUrl('jwr/gallery/resort-pool-day2',  { width: 1200 }),
  'resort-pool-night': cloudinaryUrl('jwr/gallery/resort-pool-night', { width: 800 }),
}

/** Public IDs for use with cloudinarySrcSet() */
export const GALLERY_IDS = {
  'resort-01':         'jwr/gallery/resort-01',
  'resort-02':         'jwr/gallery/resort-02',
  'resort-03':         'jwr/gallery/resort-03',
  'resort-04':         'jwr/gallery/resort-04',
  'resort-05':         'jwr/gallery/resort-05',
  'resort-06':         'jwr/gallery/resort-06',
  'resort-07':         'jwr/gallery/resort-07',
  'resort-08':         'jwr/gallery/resort-08',
  'resort-09':         'jwr/gallery/resort-09',
  'resort-10':         'jwr/gallery/resort-10',
  'resort-hero':       'jwr/gallery/resort-hero',
  'resort-pool-day1':  'jwr/gallery/resort-pool-day1',
  'resort-pool-day2':  'jwr/gallery/resort-pool-day2',
  'resort-pool-night': 'jwr/gallery/resort-pool-night',
}
