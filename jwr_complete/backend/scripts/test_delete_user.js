require('dotenv').config();

(async () => {
  try {
    const API = process.env.TEST_API_URL || 'http://localhost:3000';
    const emailOrId = process.argv[2] || 'reymankhadgi077@gmail.com';

    // Login as manager
    const login = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@jungleworldresort.com', password: 'Password123!' })
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
