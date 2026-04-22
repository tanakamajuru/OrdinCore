const axios = require('axios');

async function debug() {
  try {
    // 1. Login as Mark to get token
    const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'mark.d@sunrise.care',
      password: 'Pass123!'
    });
    const token = loginRes.data.data.token;
    const houseId = loginRes.data.data.user.assigned_house_id || '8a835b50-f27e-4e1d-985b-a380f03504ea';

    console.log('Logged in as Mark. Token:', token.substring(0, 10) + '...');

    // 2. Call the failing endpoint
    const url = `http://localhost:3001/api/v1/pulses?house_id=${houseId}&review_status=New,Triage&limit=5`;
    console.log('Calling:', url);

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Error Status:', err.response?.status);
    console.error('Error Data:', JSON.stringify(err.response?.data, null, 2));
  }
}

debug();
