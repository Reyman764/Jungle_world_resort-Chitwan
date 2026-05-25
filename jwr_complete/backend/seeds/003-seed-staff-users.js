'use strict';

/**
 * Seed: Staff / Manager users for Admin Dashboard testing
 *
 * Run:  npm run seed
 *
 * Creates:
 *   manager@jungleworldresort.com  / Password123!  (role: manager)
 *   staff@jungleworldresort.com    / Password123!  (role: staff)
 *   admin@jungleworldresort.com    / Password123!  (role: admin)
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const SALT = 12;

    const staffUsers = [
      {
        id:           uuidv4(),
        email:        'manager@jungleworldresort.com',
        password_hash: await bcrypt.hash('Password123!', SALT),
        first_name:   'Resort',
        last_name:    'Manager',
        role:         'manager',
        is_verified:  true,
        created_at:   new Date(),
        updated_at:   new Date(),
      },
      {
        id:           uuidv4(),
        email:        'staff@jungleworldresort.com',
        password_hash: await bcrypt.hash('Password123!', SALT),
        first_name:   'Front',
        last_name:    'Desk',
        role:         'staff',
        is_verified:  true,
        created_at:   new Date(),
        updated_at:   new Date(),
      },
      {
        id:           uuidv4(),
        email:        'admin@jungleworldresort.com',
        password_hash: await bcrypt.hash('Password123!', SALT),
        first_name:   'System',
        last_name:    'Admin',
        role:         'admin',
        is_verified:  true,
        created_at:   new Date(),
        updated_at:   new Date(),
      },
    ];

    for (const u of staffUsers) {
      const exists = await queryInterface.rawSelect('users', {
        where: { email: u.email },
      }, ['id']);

      if (!exists) {
        await queryInterface.bulkInsert('users', [u], {});
        console.log(`✅  Seeded staff user: ${u.email}`);
      } else {
        console.log(`⏭️   Already exists: ${u.email}`);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: {
        [require('sequelize').Op.in]: [
          'manager@jungleworldresort.com',
          'staff@jungleworldresort.com',
          'admin@jungleworldresort.com',
        ],
      },
    }, {});
  },
};
