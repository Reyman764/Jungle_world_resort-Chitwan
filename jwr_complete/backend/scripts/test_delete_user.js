require('dotenv').config();

(async () => {
  try {
    const API = process.env.TEST_API_URL || 'http://localhost:3000';
    const emailOrId = process.argv[2] || process.env.TEST_DELETE_TARGET || 'guest@example.com';
    const managerEmail = process.env.TEST_EMAIL || 'manager@jungleworldresort.com';
    const managerPassword = process.env.TEST_PASSWORD;

    if (!managerPassword) {
      console.error('Set TEST_PASSWORD (the seeded manager password) in your environment before running this script.');
      process.exit(1);
    }

    // Login as manager
    const login = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: managerEmail, password: managerPassword })
    });
    const L = await login.json();
    const token = L.access_token;

    console.log('Calling DELETE /api/admin/users/' + encodeURIComponent(emailOrId));
    const res = await fetch(`${API}/api/admin/users/${encodeURIComponent(emailOrId)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    const body = await res.json().catch(() => ({}));
    console.log('Status:', res.status, 'Body:', body);
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(1);
  }
})();
