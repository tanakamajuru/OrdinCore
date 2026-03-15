// Quick test to verify login is working
// Run with: node test-login-fix.js

const http = require('http');

const testLogin = () => {
  const data = JSON.stringify({
    email: "admin@caresignal.com",
    password: "admin123"
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', body);
      
      if (res.statusCode === 200) {
        console.log('✅ Login successful!');
        try {
          const response = JSON.parse(body);
          console.log('✅ Token received:', response.token ? 'Yes' : 'No');
          console.log('✅ User data:', response.user ? 'Yes' : 'No');
        } catch (e) {
          console.log('❌ Failed to parse response');
        }
      } else {
        console.log('❌ Login failed');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
  });

  req.write(data);
  req.end();
};

console.log('🧪 Testing login endpoint...');
testLogin();
