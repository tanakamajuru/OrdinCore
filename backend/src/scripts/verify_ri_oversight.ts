import axios from 'axios';

const API_URL = 'https://ordincore.co.uk/api/v1';

async function verify() {
  console.log('🔍 Starting RI Oversight Verification...');
  
  try {
    // 1. Login as SuperAdmin
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'superadmin@caresignal.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.data.token;
    console.log('✅ Logged in as RI');

    // 2. Check Trends
    const trendsRes = await axios.get(`${API_URL}/analytics/trends`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const trends = trendsRes.data.data;
    if (trends.crossHouseIncidents) {
      console.log('✅ Cross-House Incident Trends available');
    } else {
      console.log('❌ Cross-House Incident Trends MISSING');
    }

    // 3. Request Cross-Site Report
    const reportRes = await axios.post(`${API_URL}/reports/request`, {
      type: 'cross_site_summary',
      name: 'Test RI Oversite Report',
      parameters: {}
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Cross-Site Report requested successfuly:', reportRes.data.data.id);

    console.log('--- VERIFICATION SUCCESSFUL ---');
  } catch (err: any) {
    console.error('❌ Verification FAILED:', err.response?.data || err.message);
  }
}

verify();
