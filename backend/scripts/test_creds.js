const axios = require('axios');
const API_BASE = 'https://ordincore.co.uk/api/v1';

const passwords = ['admin123', 'password123', 'Highway@1520'];
const email = 'taylor@ordincore.com';

async function test() {
  for (const password of passwords) {
    try {
      console.log(`Testing ${email} with ${password}...`);
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      console.log(`SUCCESS with ${password}!`);
      console.log(res.data);
      return;
    } catch (err) {
      console.log(`FAILED with ${password}: ${err.response?.data?.message || err.message}`);
    }
  }
}

test();
