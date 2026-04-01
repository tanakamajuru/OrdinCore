async function test() {
  try {
    const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@caresignal.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;
    
    const compRes = await fetch('http://localhost:3001/api/v1/companies', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const compData = await compRes.json();
    const company = compData.data[0];
    
    // Create admin
    console.log("Creating admin for company", company.id);
    const createRes = await fetch('http://localhost:3001/api/v1/users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        first_name: "Test",
        last_name: "Admin",
        email: "test.admin@example.com",
        password: "Password123!",
        role: "ADMIN",
        company_id: company.id
      })
    });
    const createData = await createRes.json();
    console.log("Success:", createData);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
