require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const name = '008-create-verification-tokens.js';
    const res = await client.query(
      'INSERT INTO "SequelizeMeta" (name) SELECT $1::text WHERE NOT EXISTS (SELECT 1 FROM "SequelizeMeta" WHERE name=$1::text) RETURNING name',
      [name]
    );
    if (res.rowCount === 1) {
      console.log('Inserted migration:', res.rows[0].name);
    } else {
      console.log('Migration already present:', name);
    }
  } catch (err) {
    console.error('ERROR:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
