'use strict';

/**
 * Migration 019: Fix Package Images
 *
 * Replaces wrong Unsplash URLs and external images with local gallery paths:
 *   - Chitwan at a Glance:  /images/gallery/resort-03.jpg
 *   - Close Up Chitwan:     /images/gallery/resort-06.jpg (was camera equipment photo)
 *   - Explore Chitwan:      /images/gallery/resort-09.jpg (was Himalayan mountain)
 *
 * This migration is defensive — the API already has a runtime guard that strips
 * wrong external URLs, but this makes the DB records clean.
 */

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE packages
       SET image_url = '/images/gallery/resort-03.jpg',
           updated_at = NOW()
       WHERE slug = 'chitwan-at-a-glance'`
    );

    await queryInterface.sequelize.query(
      `UPDATE packages
       SET image_url = '/images/gallery/resort-06.jpg',
           updated_at = NOW()
       WHERE slug = 'close-up-chitwan'`
    );

    await queryInterface.sequelize.query(
      `UPDATE packages
       SET image_url = '/images/gallery/resort-09.jpg',
           updated_at = NOW()
       WHERE slug = 'explore-chitwan'`
    );

    console.log('✓ Package images fixed');
  },

  async down(queryInterface) {
    // Rollback: restore the old (wrong) URLs — only if you really need to undo
    await queryInterface.sequelize.query(
      `UPDATE packages
       SET image_url = 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=600&q=80',
           updated_at = NOW()
       WHERE slug = 'chitwan-at-a-glance'`
    );

    await queryInterface.sequelize.query(
      `UPDATE packages
       SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
           updated_at = NOW()
       WHERE slug = 'close-up-chitwan'`
    );

    await queryInterface.sequelize.query(
      `UPDATE packages
       SET image_url = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
           updated_at = NOW()
       WHERE slug = 'explore-chitwan'`
    );

    console.log('✗ Package images rolled back (shouldn\'t do this!)');
  },
};
