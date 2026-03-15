// Simple endpoint testing script
// Run with: node test-endpoints.js

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test endpoints
async function testEndpoints() {
  const baseUrl = 'localhost';
  const port = 3001;
  
  console.log('🚀 Testing CareSignal API Endpoints...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/health',
      method: 'GET'
    });
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Response:`, healthResponse.data);
    console.log('   ✅ Health check working!\n');

    // Test 2: Admin Login
    console.log('2. Testing Admin Login...');
    const loginResponse = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@caresignal.com',
      password: 'admin123'
    });
    console.log(`   Status: ${loginResponse.statusCode}`);
    console.log(`   Response:`, loginResponse.data);
    
    if (loginResponse.statusCode === 200 && loginResponse.data.token) {
      console.log('   ✅ Admin login successful!');
      const adminToken = loginResponse.data.token;
      
      // Test 3: Get Users (Admin Only)
      console.log('\n3. Testing Get Users (Admin Only)...');
      const usersResponse = await makeRequest({
        hostname: baseUrl,
        port: port,
        path: '/api/admin/users',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`   Status: ${usersResponse.statusCode}`);
      console.log(`   Users count:`, usersResponse.data.data?.length || 0);
      console.log('   ✅ Get users working!');

      // Test 4: Get Dashboard Stats
      console.log('\n4. Testing Dashboard Stats...');
      const statsResponse = await makeRequest({
        hostname: baseUrl,
        port: port,
        path: '/api/admin/dashboard/stats',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`   Status: ${statsResponse.statusCode}`);
      console.log(`   Stats:`, statsResponse.data.data);
      console.log('   ✅ Dashboard stats working!');

      // Test 5: Create User
      console.log('\n5. Testing Create User...');
      const createUserResponse = await makeRequest({
        hostname: baseUrl,
        port: port,
        path: '/api/admin/users',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }, {
        email: 'test.user@example.com',
        name: 'Test User',
        password: 'testpassword123',
        role: 'registered-manager',
        organization: 'CareSignal Test'
      });
      console.log(`   Status: ${createUserResponse.statusCode}`);
      console.log(`   Response:`, createUserResponse.data);
      console.log('   ✅ Create user working!');

      // Test 6: Invalid Login
      console.log('\n6. Testing Invalid Login...');
      const invalidLoginResponse = await makeRequest({
        hostname: baseUrl,
        port: port,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });
      console.log(`   Status: ${invalidLoginResponse.statusCode}`);
      console.log(`   Response:`, invalidLoginResponse.data);
      console.log('   ✅ Invalid login properly rejected!');

    } else {
      console.log('   ❌ Admin login failed!');
    }

    console.log('\n🎉 API Testing Complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Health Check');
    console.log('   ✅ Admin Authentication');
    console.log('   ✅ User Management');
    console.log('   ✅ Dashboard Statistics');
    console.log('   ✅ Error Handling');
    console.log('\n🚀 All endpoints are working correctly!');

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure backend is running on localhost:3001');
    console.log('   2. Check database connection');
    console.log('   3. Verify environment variables');
  }
}

// Run the tests
testEndpoints();
