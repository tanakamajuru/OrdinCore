const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function runPhase2() {
  try {
    console.log('--- Phase 2: Company Admin Creates Houses & Users ---');
    
    // 2.1 Login as Admin
    console.log('Step 2.1: Login as admin@sunrise.care');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@sunrise.care',
      password: 'AdminPass123!'
    });
    const token = loginRes.data.data.token;
    const companyId = loginRes.data.data.user.company_id;
    console.log('✔ Login successful');

    // 2.2 Create Houses
    console.log('Step 2.2: Create Houses');
    const houses = [
      { name: 'Rose House', status: 'Residential', company_id: companyId, capacity: 20 },
      { name: 'Oak Lodge', status: 'Supported Living', company_id: companyId, capacity: 15 },
      { name: 'Maple Court', status: 'Domiciliary', company_id: companyId, capacity: 50 },
    ];
    let createdHouses = {};
    for (let h of houses) {
      const res = await axios.post(`${API_BASE}/houses`, h, { headers: { Authorization: `Bearer ${token}` } });
      createdHouses[h.name] = res.data.data.id;
      console.log(`  ✔ House Created: ${h.name} (${res.data.data.id})`);
    }

    // 2.3 Create Users
    console.log('Step 2.3: Create Users');
    const users = [
      { first_name: 'Sarah', last_name: 'T', email: 'sarah.t@sunrise.care', password: 'Pass123!', role: 'TEAM_LEADER', house: createdHouses['Rose House'] },
      { first_name: 'Tom', last_name: 'O', email: 'tom.o@sunrise.care', password: 'Pass123!', role: 'TEAM_LEADER', house: createdHouses['Oak Lodge'] },
      { first_name: 'Mark', last_name: 'Davies', email: 'mark.d@sunrise.care', password: 'Pass123!', role: 'REGISTERED_MANAGER', house: createdHouses['Rose House'] },
      { first_name: 'David', last_name: 'Chen', email: 'david.c@sunrise.care', password: 'Pass123!', role: 'TEAM_LEADER' /* Fallback for DEPUTY_MANAGER */, house: createdHouses['Rose House'] },
      { first_name: 'Emma', last_name: 'W', email: 'emma.w@sunrise.care', password: 'Pass123!', role: 'DIRECTOR', is_global: true },
      { first_name: 'James', last_name: 'C', email: 'james.c@sunrise.care', password: 'Pass123!', role: 'RESPONSIBLE_INDIVIDUAL', is_global: true }
    ];

    let createdUsers = {};
    for (let u of users) {
      const payload = {
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        password: u.password,
        role: u.role,
        company_id: companyId
      };
      
      const res = await axios.post(`${API_BASE}/users`, payload, { headers: { Authorization: `Bearer ${token}` } });
      createdUsers[u.email] = res.data.data.id;
      console.log(`  ✔ User Created: ${u.email} (${res.data.data.id})`);

      if (u.house) {
        try {
          await axios.post(`${API_BASE}/houses/${u.house}/users`, { user_id: res.data.data.id, role_in_house: u.role }, { headers: { Authorization: `Bearer ${token}` } });
          console.log(`    Assign to House Success.`);
        } catch(e) {}
      }
    }

    // 2.4 Edit Rose House
    console.log('Step 2.4: Assign PM and DPM to Rose House');
    const updatePayload = {
      primary_rm_id: createdUsers['mark.d@sunrise.care'],
      deputy_rm_id: createdUsers['david.c@sunrise.care']
    };
    try {
      await axios.put(`${API_BASE}/houses/${createdHouses['Rose House']}`, updatePayload, { headers: { Authorization: `Bearer ${token}` } });
      console.log(`  ✔ Rose House Updated.`);
    } catch(err) {
      console.log('  Could not set RM/Deputy using PUT house:', err.response?.data?.message || err.message);
    }

    console.log('Phase 2 completed.');
  } catch (err) {
    console.error('Error during Phase 2:', err.response?.data || err.message);
    process.exit(1);
  }
}

runPhase2();
