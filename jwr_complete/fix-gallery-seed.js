/**
 * fix-gallery-seed.js
 *
 * ONE-TIME FIX — run from inside jwr_complete/
 *
 * The previous seed script stored:
 *   value = [array directly]
 *
 * But the controller expects:
 *   value = { images: [array] }
 *
 * This script reads whatever is in the DB and
 * re-saves it in the correct format.
 *
 * Usage:
 *   cd jwr_complete
 *   node ../fix-gallery-seed.js
 *
 * OR if placed in jwr_complete/ already:
 *   node fix-gallery-seed.js
 */

require('dotenv').config({ path: './backend/.env' })
const { Sequelize } = require('sequelize')

const GALLERY_IMAGES = [
  { filename: 'resort-01',        caption: 'Jungle World Resort grounds',       category: 'Resort', size: 'large' },
  { filename: 'resort-02',        caption: 'Resort surroundings at Chitwan',    category: 'Resort', size: ''      },
  { filename: 'resort-03',        caption: 'Jungle World Resort landscape',     category: 'Resort', size: ''      },
  { filename: 'resort-04',        caption: 'Resort view in the morning light',  category: 'Resort', size: 'large' },
  { filename: 'resort-05',        caption: 'Evening ambience at Jungle World',  category: 'Resort', size: ''      },
  { filename: 'resort-06',        caption: 'Night atmosphere at the resort',    category: 'Resort', size: ''      },
  { filename: 'resort-07',        caption: 'Jungle World Resort at night',      category: 'Resort', size: ''      },
  { filename: 'resort-08',        caption: 'Resort gardens and pathways',       category: 'Resort', size: ''      },
  { filename: 'resort-09',        caption: 'Relaxing spaces at Jungle World',   category: 'Resort', size: 'large' },
  { filename: 'resort-10',        caption: 'The beauty of Jungle World Resort', category: 'Resort', size: ''      },
  { filename: 'resort-pool-night',caption: 'Swimming pool glowing at night',    category: 'Resort', size: 'large' },
  { filename: 'resort-pool-day1', caption: 'Resort pool surrounded by palms',  category: 'Resort', size: ''      },
  { filename: 'resort-pool-day2', caption: 'Crystal clear pool with jungle',   category: 'Resort', size: ''      },
  { filename: 'resort-hero',      caption: 'Jungle World Resort hero image',    category: 'Resort', size: 'large' },
]

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dvadwvpco'

function buildCloudinaryUrl(filename) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/jwr/gallery/${filename}`
}

async function fix() {
  console.log('\n🔧 Gallery DB Fix — correcting data format\n')

  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  })

  try {
    await sequelize.authenticate()
    console.log('✅ Connected to database\n')

    const SiteSetting = sequelize.define(
      'SiteSetting',
      {
        key:   { type: Sequelize.STRING, primaryKey: true },
        value: { type: Sequelize.JSONB },
      },
      { tableName: 'site_settings', timestamps: false }
    )

    // --- Read existing row ---
    const existing = await SiteSetting.findOne({ where: { key: 'gallery' } })

    let existingImages = []

    if (existing) {
      const val = existing.value
      console.log('📋 Current value type:', Array.isArray(val) ? 'ARRAY (broken)' : typeof val)

      if (Array.isArray(val)) {
        // ❌ Bug format — the array was stored directly
        console.log(`   Found ${val.length} images in wrong format. Fixing...\n`)
        existingImages = val
      } else if (val && Array.isArray(val.images)) {
        // ✅ Already correct — nothing to do
        console.log(`   Already in correct format with ${val.images.length} images.\n`)
        console.log('✅ No fix needed! Gallery should already be working.')
        console.log('   If still broken, check your backend is running and restarted.\n')
        process.exit(0)
      } else {
        console.log('   Empty or unknown format. Will reseed with Cloudinary images.\n')
      }
    } else {
      console.log('⚠️  No gallery record found. Creating fresh from Cloudinary URLs.\n')
    }

    // --- Build correct images array ---
    // Use existing images if they look valid, otherwise rebuild from Cloudinary filenames
    let finalImages = existingImages.length > 0
      ? existingImages  // keep the existing data, just fix the wrapper
      : GALLERY_IMAGES.map((img, i) => ({
          id:         Date.now() + i,
          url:        buildCloudinaryUrl(img.filename),
          caption:    img.caption,
          category:   img.category,
          size:       img.size,
          uploadedAt: new Date().toISOString(),
        }))

    // --- Save with CORRECT format: { images: [...] } ---
    if (existing) {
      await SiteSetting.update(
        { value: { images: finalImages } },
        { where: { key: 'gallery' } }
      )
      console.log('✅ Updated existing record with correct format.')
    } else {
      await SiteSetting.create({
        key:   'gallery',
        value: { images: finalImages },
      })
      console.log('✅ Created new gallery record with correct format.')
    }

    console.log(`\n📸 ${finalImages.length} images now stored as { images: [...] }\n`)
    finalImages.forEach((img, i) => {
      console.log(`  ${i + 1}. ${img.caption}`)
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n✅ Fix complete!\n')
    console.log('Next steps:')
    console.log('  1. Restart your backend:  cd backend && npm run dev')
    console.log('  2. Open admin dashboard → Gallery tab')
    console.log('  3. All images should now appear ✅\n')

    process.exit(0)
  } catch (err) {
    console.error('\n❌ Error:', err.message)
    console.error('\nFull error:', err)
    process.exit(1)
  }
}

fix()
