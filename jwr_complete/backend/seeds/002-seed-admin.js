'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('Admin@JWR2024!', 12);

    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        email: 'admin@jungleworldresort.com',
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'JWR',
        phone: '+977-56-580100',
        nationality: 'Nepali',
        role: 'admin',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: 'admin@jungleworldresort.com',
    }, {});
  },
};
