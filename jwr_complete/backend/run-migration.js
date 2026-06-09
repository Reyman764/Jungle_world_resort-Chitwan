#!/usr/bin/env node
/**
 * Manual Migration Runner
 * 
 * Usage:
 *   node run-migration.js
 * 
 * This script will prompt you for database credentials and run the migration directly.
 */

const readline = require('readline');
const { Sequelize } = require('sequelize');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  console.log('\n🔧 Package Images Migration Runner\n');
  console.log('This script will update your package images in the database.');
  console.log('Make sure you have a backup of your database before proceeding.\n');

  try {
    // Get database credentials
    const host = await question('Database Host (e.g., localhost): ');
    const port = await question('Database Port (e.g., 5432): ');
    const database = await question('Database Name: ');
    const username = await question('Username (e.g., postgres): ');
    const password = await question('Password (hidden): ');

    console.log('\n🔗 Connecting to database...');

    // Create Sequelize connection
    const sequelize = new Sequelize(database, username, password, {
      host,
      port: parseInt(port),
      dialect: 'postgres',
      logging: false,
    });

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully!\n');

    // Run the migration
    console.log('🚀 Running migration: Fix Package Images\n');

    const result = await sequelize.query(`
      UPDATE packages
      SET image_url = '/images/gallery/resort-03.jpg',
          updated_at = NOW()
      WHERE slug = 'chitwan-at-a-glance';

      UPDATE packages
      SET image_url = '/images/gallery/resort-06.jpg',
          updated_at = NOW()
      WHERE slug = 'close-up-chitwan';

      UPDATE packages
      SET image_url = '/images/gallery/resort-09.jpg',
          updated_at = NOW()
      WHERE slug = 'explore-chitwan';

      SELECT slug, name, image_url FROM packages ORDER BY sort_order;
    `);

    console.log('✅ Migration completed!\n');
    console.log('Updated packages:\n');
    
    const packages = result[result.length - 1];
    packages.forEach(pkg => {
      console.log(`  📦 ${pkg.name}`);
      console.log(`     Image: ${pkg.image_url}\n`);
    });

    await sequelize.close();
    console.log('✅ All done! Your package images have been fixed.\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
