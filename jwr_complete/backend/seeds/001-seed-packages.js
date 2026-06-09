'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('packages', [
      {
        id: uuidv4(),
        slug: 'chitwan-at-a-glance',
        name: 'Chitwan at a Glance',
        description: 'A quick yet immersive getaway. Ideal for those with limited time who still want to experience the magic of Chitwan.',
        duration_nights: 1,
        duration_days: 2,
        price_foreigner: 15960.00,
        price_saarc:      9600.00,
        price_nepali:     5000.00,
        includes: JSON.stringify([
          'Welcome drink & cultural show',
          'Elephant bathing',
          'Jeep safari',
          'Canoe safari',
          'All meals',
        ]),
        image_url: '/images/gallery/resort-03.jpg',
        badge: '1N · 2D',
        is_popular: false,
        is_active: true,
        sort_order: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        slug: 'close-up-chitwan',
        name: 'Close Up Chitwan',
        description: 'Get closer to nature with extended jungle walks, bird watching at dawn, and a sunset canoe ride.',
        duration_nights: 2,
        duration_days: 3,
        price_foreigner: 25270.00,
        price_saarc:     15200.00,
        price_nepali:     8500.00,
        includes: JSON.stringify([
          'All 1N/2D activities',
          'Guided jungle walk',
          'Bird watching',
          'Sunset canoe',
          'All meals',
        ]),
        image_url: '/images/gallery/resort-06.jpg',
        badge: '2N · 3D',
        is_popular: false,
        is_active: true,
        sort_order: 2,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        slug: 'explore-chitwan',
        name: 'Explore Chitwan',
        description: 'A deep dive into the wilderness. Jungle drives, canoe safari, elephant bathing, cultural village tour and much more.',
        duration_nights: 3,
        duration_days: 4,
        price_foreigner: 33250.00,
        price_saarc:     24000.00,
        price_nepali:    12500.00,
        includes: JSON.stringify([
          'All prior activities',
          'Elephant back safari',
          'Sunrise jungle drive',
          'Farewell dinner',
          'Airport transfers',
        ]),
        image_url: '/images/gallery/resort-09.jpg',
        badge: '3N · 4D',
        is_popular: true,
        is_active: true,
        sort_order: 3,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('packages', null, {});
  },
};
