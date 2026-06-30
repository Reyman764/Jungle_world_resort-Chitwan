'use strict';

/**
 * Seed: Staff / Manager users for Admin Dashboard testing
 *
 * Run:  npm run seed
 *
 * SECURITY NOTE: this file is committed to source control. A hardcoded
 * password here is a published password — anyone who finds the repo
 * (this one is public on GitHub) can read it. Each seeded account gets
 * its own random password by default; pass SEED_ADMIN_PASSWORD /
 * SEED_MANAGER_PASSWORD / SEED_STAFF_PASSWORD (or the single
 * SEED_STAFF_DEFAULT_PASSWORD to apply one password to all three) if you
 * want a known password for local development.
 *
 * If you ever ran this seed against a real/production database using
 * the old hardcoded 'Password123!' default, log in and rotate that
 * password immediately.
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

function randomPassword() {
  // 18 random bytes → 24-char base64url string. Comfortably satisfies
  // any password policy and isn't guessable.
  return crypto.randomBytes(18).toString('base64url');
}

function passwordFor(role, envVar) {
  return process.env[envVar] || process.env.SEED_STAFF_DEFAULT_PASSWORD || randomPassword();
}

module.exports = {
  async up(queryInterface) {
    const SALT = 12;

    const accounts = [
      { role: 'manager', email: 'manager@jungleworldresort.com', envVar: 'SEED_MANAGER_PASSWORD', first_name: 'Resort',  last_name: 'Manager' },
      { role: 'staff',   email: 'staff@jungleworldresort.com',   envVar: 'SEED_STAFF_PASSWORD',   first_name: 'Front',   last_name: 'Desk' },
      { role: 'admin',   email: 'admin@jungleworldresort.com',   envVar: 'SEED_ADMIN_PASSWORD',   first_name: 'System',  last_name: 'Admin' },
    ];

    const printed = [];

    for (const acct of accounts) {
      const exists = await queryInterface.rawSelect('users', {
        where: { email: acct.email },
      }, ['id']);

      if (exists) {
        console.log(`⏭️   Already exists: ${acct.email}`);
        continue;
      }

      const plainPassword = passwordFor(acct.role, acct.envVar);
      const password_hash = await bcrypt.hash(plainPassword, SALT);

      await queryInterface.bulkInsert('users', [{
        id:            uuidv4(),
        email:         acct.email,
        password_hash,
        first_name:    acct.first_name,
        last_name:     acct.last_name,
        role:          acct.role,
        is_verified:   true,
        created_at:    new Date(),
        updated_at:    new Date(),
      }], {});

      printed.push({ email: acct.email, password: plainPassword });
      console.log(`✅  Seeded staff user: ${acct.email}`);
    }

    if (printed.length) {
      console.log('\n' + '═'.repeat(60));
      console.log('🔑  SEEDED LOGIN CREDENTIALS — shown once, not stored anywhere');
      console.log('─'.repeat(60));
      for (const p of printed) console.log(`  ${p.email}  →  ${p.password}`);
      console.log('═'.repeat(60) + '\n');
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
