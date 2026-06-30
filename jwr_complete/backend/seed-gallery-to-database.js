/**
 * backend/seed-gallery-to-database.js
 *
 * ONE-TIME SEED SCRIPT — run after upload-gallery-to-cloudinary.js
 *
 * Creates database records (SiteSetting) for all 14 gallery images
 * that are already in Cloudinary at jwr/gallery/ folder.
 *
 * This allows the admin Gallery page to display all images.
 *
 * Usage (from anywhere — the .env path below is resolved relative to
 * this file, not to your current directory):
 *   node backend/seed-gallery-to-database.js
 *   # or, from inside backend/:
 *   node seed-gallery-to-database.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') })
const { Sequelize } = require('sequelize')

// Gallery image data — points to URLs already in Cloudinary
const GALLERY_IMAGES = [
  {
    filename: 'resort-01',
    caption: 'Jungle World Resort grounds',
    category: 'Resort',
    size: 'large',
  },
  {
    filename: 'resort-02',
    caption: 'Resort surroundings at Chitwan',
    category: 'Resort',
    size: '',
  },
  {
    filename: 'resort-03',
    caption: 'Jungle World Resort landscape',
    category: 'Resort',
    size: '',
  },
  {
    filename: 'resort-04',
    caption: 'Resort view in the morning light',
    category: 'Resort',
    size: 'large',
  },
  {
    filename: 'resort-05',
    caption: 'Evening ambience at Jungle World',
    category: 'Resort',
    size: '',
  },
  {
    filename: 'resort-06',
    caption: 'Night atmosphere at the resort',
    category: 'Resort',
    size: '',
  },
  {
    filename: 'resort-07',
    caption: 'Jungle World Resort at night',
    category: 'Resort',
    size: '',
  },
  {
    filename: 'resort-08',
    caption: 'Resort gardens and pathways',
    category: 'Resort',
    size: '',
  },
  {
    filename: 'resort-09',
    caption: 'Relaxing spaces at Jungle World',
    category: 'Resort',
    size: 'large',
  },
  {
    filename: 'resort-10',
    caption: 'The beauty of Jungle World Resort',
    category: 'Resort',
    size: '',
  },
  {
    filename: 'resort-pool-night',
    caption: 'Swimming pool glowing at night',
    category: 'Resort',
    size: 'large',
  },
  {
    filename: 'resort-pool-day1',
    caption: 'Resort pool surrounded by palms',
    category: 'Resort',
    size: '',
  },
  {
    filename: 'resort-pool-day2',
    caption: 'Crystal clear pool with jungle',
    category: 'Resort',
    size: '',
  },
  {
    filename: 'resort-hero',
    caption: 'Jungle World Resort hero image',
    category: 'Resort',
    size: 'large',
  },
]

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dvadwvpco'

/**
 * Build Cloudinary URL for a filename
 * All images stored in jwr/gallery/ folder with auto quality/format
 */
function buildCloudinaryUrl(filename) {
  const publicId = `jwr/gallery/${filename}`
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${publicId}`
}

/**
 * Build image object for database
 */
function buildImageObject(imgData) {
  const ts = Date.now() + Math.random() * 1000 // unique timestamp
  return {
    id: Math.floor(ts),
    url: buildCloudinaryUrl(imgData.filename),
    caption: imgData.caption,
    category: imgData.category,
    size: imgData.size,
    uploadedAt: new Date().toISOString(),
  }
}

/**
 * Initialize Sequelize and SiteSetting model
 */
async function seedGallery() {
  console.log('\n🖼️  Jungle World Resort — Gallery Database Seed')
  console.log('━'.repeat(52) + '\n')

  // Connect to database
  const sequelize = new Sequelize(
    process.env.DATABASE_URL || 
    `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  )

  try {
    // Test connection
    await sequelize.authenticate()
    console.log('✅ Connected to database\n')

    // Load SiteSetting model (simplified)
    const SiteSetting = sequelize.define(
      'SiteSetting',
      {
        key:   { type: Sequelize.STRING, primaryKey: true },
        value: { type: Sequelize.JSON },
      },
      { tableName: 'site_settings', timestamps: false }
    )

    // Build all image records
    const images = GALLERY_IMAGES.map(buildImageObject)

    // Create or update the SiteSetting record
    console.log(`Creating ${images.length} gallery image records...\n`)

    const [setting, created] = await SiteSetting.findOrCreate({
      where: { key: 'gallery' },
      defaults: { key: 'gallery', value: images },
    })

    if (!created) {
      // Update existing
      setting.value = images
      await setting.save()
      console.log('✅ Updated existing gallery SiteSetting\n')
    } else {
      console.log('✅ Created new gallery SiteSetting\n')
    }

    // List all images
    console.log('📸 Seeded Gallery Images:')
    console.log('─'.repeat(52))
    images.forEach((img, i) => {
      console.log(`${i + 1}. ${img.caption}`)
      console.log(`   Category: ${img.category}, Size: ${img.size || 'normal'}`)
      console.log(`   URL: ${img.url.substring(0, 50)}...`)
      console.log()
    })

    console.log('━'.repeat(52))
    console.log('\n✅ Gallery seeding complete!')
    console.log('\nNext steps:')
    console.log('  1. Restart backend: npm run dev')
    console.log('  2. Admin dashboard → Gallery tab')
    console.log('  3. All 14 images should now be visible\n')

    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    console.error('\nTroubleshooting:')
    console.error('  • Check DATABASE_URL in backend/.env')
    console.error('  • Ensure database is running')
    console.error('  • Check Sequelize/database connection\n')
    process.exit(1)
  }
}

seedGallery()
