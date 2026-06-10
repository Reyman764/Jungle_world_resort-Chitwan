/**
 * scripts/upload-gallery-to-cloudinary.js
 *
 * ONE-TIME SETUP SCRIPT — run once from your local machine.
 *
 * Uploads all static gallery images from:
 *   frontend/public/images/gallery/
 * ...to your Cloudinary account under the folder:
 *   jwr/gallery/
 *
 * After this runs, the public/images/gallery/ folder can be deleted
 * (or is already deleted if you're using the cleaned-up version).
 *
 * Usage:
 *   cd jwr_complete
 *   node scripts/upload-gallery-to-cloudinary.js
 *
 * Requirements:
 *   npm install cloudinary dotenv   (in the root or backend folder)
 */

require('dotenv').config({ path: './backend/.env' })
const cloudinary = require('cloudinary').v2
const path       = require('path')
const fs         = require('fs')

// ── Config ────────────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvadwvpco',
  api_key:    process.env.CLOUDINARY_API_KEY    || '932672843811153',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'jDsITtUiP_so5x178N5urZaJZTg',
})

// ── Images to upload ─────────────────────────────────────────────────────────
// These files need to be present in frontend/public/images/gallery/
// Keep a backup of these images somewhere safe before deleting from public/!
const GALLERY_DIR = path.join(__dirname, '../frontend/public/images/gallery')

const IMAGES = [
  { file: 'resort-01.jpg',         publicId: 'jwr/gallery/resort-01' },
  { file: 'resort-02.jpg',         publicId: 'jwr/gallery/resort-02' },
  { file: 'resort-03.jpg',         publicId: 'jwr/gallery/resort-03' },
  { file: 'resort-04.jpg',         publicId: 'jwr/gallery/resort-04' },
  { file: 'resort-05.jpg',         publicId: 'jwr/gallery/resort-05' },
  { file: 'resort-06.jpg',         publicId: 'jwr/gallery/resort-06' },
  { file: 'resort-07.jpg',         publicId: 'jwr/gallery/resort-07' },
  { file: 'resort-08.jpg',         publicId: 'jwr/gallery/resort-08' },
  { file: 'resort-09.jpg',         publicId: 'jwr/gallery/resort-09' },
  { file: 'resort-10.jpg',         publicId: 'jwr/gallery/resort-10' },
  { file: 'resort-hero.jpg',       publicId: 'jwr/gallery/resort-hero' },
  { file: 'resort-pool-day1.jpg',  publicId: 'jwr/gallery/resort-pool-day1' },
  { file: 'resort-pool-day2.jpg',  publicId: 'jwr/gallery/resort-pool-day2' },
  { file: 'resort-pool-night.jpg', publicId: 'jwr/gallery/resort-pool-night' },
]

// ── Upload ────────────────────────────────────────────────────────────────────
async function uploadAll() {
  console.log('\n🌿 Jungle World Resort — Cloudinary Gallery Upload')
  console.log('━'.repeat(52))
  console.log(`Cloud : ${process.env.CLOUDINARY_CLOUD_NAME || 'dvadwvpco'}`)
  console.log(`Folder: jwr/gallery/`)
  console.log(`Images: ${IMAGES.length} files`)
  console.log('━'.repeat(52) + '\n')

  const results = { success: [], failed: [] }

  for (const { file, publicId } of IMAGES) {
    const localPath = path.join(GALLERY_DIR, file)

    if (!fs.existsSync(localPath)) {
      console.log(`⚠️  Skipped  ${file} — not found at ${localPath}`)
      results.failed.push({ file, reason: 'File not found' })
      continue
    }

    try {
      const result = await cloudinary.uploader.upload(localPath, {
        public_id:     publicId,
        overwrite:     true,
        resource_type: 'image',
      })
      console.log(`✅  Uploaded ${file}`)
      console.log(`    URL: ${result.secure_url}\n`)
      results.success.push({ file, url: result.secure_url })
    } catch (err) {
      const msg = err?.message || String(err)
      console.error(`❌  Failed  ${file}: ${msg}\n`)
      results.failed.push({ file, reason: msg })
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('━'.repeat(52))
  console.log(`\n📊 Summary: ${results.success.length} uploaded, ${results.failed.length} failed\n`)

  if (results.success.length === IMAGES.length) {
    console.log('🎉 All images uploaded successfully!')
    console.log('\n✅ Next steps:')
    console.log('   1. You can now delete: frontend/public/images/gallery/')
    console.log('   2. Keep a local backup of those images somewhere safe')
    console.log('   3. Restart your frontend: npm run dev')
    console.log('   4. Gallery images now load from Cloudinary CDN\n')
  } else if (results.failed.length > 0) {
    console.log('⚠️  Some uploads failed. Check your Cloudinary credentials in backend/.env')
    console.log('   Credentials needed:')
    console.log('   CLOUDINARY_CLOUD_NAME=dvadwvpco')
    console.log('   CLOUDINARY_API_KEY=932672843811153')
    console.log('   CLOUDINARY_API_SECRET=...\n')
  }

  if (results.failed.length > 0) {
    console.log('Failed files:')
    results.failed.forEach(f => console.log(`  • ${f.file}: ${f.reason}`))
    console.log()
  }
}

uploadAll().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
