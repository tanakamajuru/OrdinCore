const http = require('http');

async function login() {
  const data = JSON.stringify({
    email: 'superadmin@caresignal.com',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body).data.token);
        } else {
          reject(new Error(`Login failed with status ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getUsers(token) {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Fetch users failed with status ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function verify() {
  try {
    console.log('Logging in...');
    const token = await login();
    console.log('Fetching users...');
    const res = await getUsers(token);
    const users = res.data;
    if (users && users.length > 0) {
      const user = users[0];
      console.log('First user found:', {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        name: user.name
      });
      if (user.name === `${user.first_name} ${user.last_name}`) {
        console.log('✅ Name field is correctly concatenated!');
      } else {
        console.error('❌ Name field is missing or incorrect:', user.name);
      }
    } else {
      console.log('No users found to verify.');
    }
  } catch (err) {
    console.error('Verification failed:', err.message);
  }
}

verify();
