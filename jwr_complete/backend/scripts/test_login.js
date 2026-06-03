require('dotenv').config();

const API = process.env.TEST_API_URL || (process.env.API_URL || 'http://localhost:3000');
const email = process.env.TEST_EMAIL || 'manager@jungleworldresort.com';
const password = process.env.TEST_PASSWORD || 'Password123!';

async function run() {
  try {
    console.log('API base:', API);

    // Login
    let r = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    console.log('Login status', r.status);
    const loginBody = await r.json().catch(() => ({}));
    console.log('Login body:', loginBody?.message || loginBody?.error || Object.keys(loginBody).length ? loginBody : '[empty]');
    if (!r.ok) return process.exit(1);

    const token = loginBody.access_token;
    if (!token) {
      console.error('No access token returned');
      return process.exit(1);
    }

    // Make a few admin requests
    const endpoints = ['/api/admin/stats', '/api/admin?page=1', '/api/admin'];
    for (const ep of endpoints) {
      const res = await fetch(`${API}${ep}`, { headers: { Authorization: `Bearer ${token}` } });
      console.log(ep, '->', res.status);
      const body = await res.text().catch(() => '[no body]');
      console.log('Body length:', body?.length || 0);
    }

    // Test refresh token if provided
    if (loginBody.refresh_token) {
      const rr = await fetch(`${API}/api/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: loginBody.refresh_token }),
      });
      console.log('/api/auth/refresh ->', rr.status);
      const rbody = await rr.json().catch(() => ({}));
      console.log('Refresh response keys:', Object.keys(rbody));
    }

    console.log('Test completed');
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(1);
  }
}

run();
