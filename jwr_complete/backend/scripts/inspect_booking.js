require('dotenv').config();
const fetch = global.fetch || require('node-fetch');

(async function(){
  try {
    const API = process.env.TEST_API_URL || 'http://localhost:3000';
    const login = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@jungleworldresort.com', password: 'Password123!' })
    });
    const L = await login.json();
    const token = L.access_token;
    const id = process.argv[2] || 'b8b411d0-4344-4441-9541-1cea9140020d';
    const res = await fetch(`${API}/api/admin/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    console.log(JSON.stringify({ id, user: data.booking?.user || null, guest_email: data.booking?.guest_email || null }, null, 2));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
