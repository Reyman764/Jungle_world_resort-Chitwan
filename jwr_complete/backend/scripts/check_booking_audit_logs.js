require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query(`SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema='public' AND table_name='booking_audit_logs'
    ) AS exists`);
    console.log('exists:', res.rows[0].exists);
    if (res.rows[0].exists) {
      const c = await client.query('SELECT COUNT(*)::int as cnt FROM booking_audit_logs');
      console.log('rows:', c.rows[0].cnt);
    }
  } catch (err) {
    console.error('ERROR:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
