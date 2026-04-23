const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function runPhase1() {
  try {
    console.log('--- Phase 1: Super Admin Creates Company & Company Admin ---');
    
    // 1.1 Login as Super Admin
    console.log('Step 1.1: Login as superadmin@caresignal.com');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'superadmin@caresignal.com',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;
    console.log('✔ Login successful');

    // 1.3 Create Company
    console.log('Step 1.3: Create Company "Sunrise Care Group Ltd"');
    const compRes = await axios.post(`${API_BASE}/companies`, {
      name: 'Sunrise Care Group Ltd',
      domain: 'sunrise.care',
      subscription_plan: 'Professional'
    }, { headers: { Authorization: `Bearer ${token}` } });
    const companyId = compRes.data.data.id;
    console.log(`✔ Company Created: ${companyId}`);

    // 1.5 Create Company Admin User
    console.log('Step 1.5: Create Company Admin');
    const userRes = await axios.post(`${API_BASE}/users`, {
      first_name: 'Admin',
      last_name: 'Sunrise',
      email: 'admin@sunrise.care',
      role: 'ADMIN',
      company_id: companyId,
      password: 'AdminPass123!'
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log(`✔ Admin User Created: ${userRes.data.data.id}`);

    console.log('Step 1.6: Log out successful (stateless)');
    console.log(`\nPhase 1 completed successfully.`);
    console.log(`CompanyId: ${companyId}`);
  } catch (err) {
    console.error('Error during Phase 1:', err.response?.data || err.message);
    process.exit(1);
  }
}

runPhase1();
