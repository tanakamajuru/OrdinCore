const https = require('https');
const http = require('http');

function checkPort(port, useHttps = false) {
  return new Promise((resolve) => {
    const protocol = useHttps ? https : http;
    const options = {
      rejectUnauthorized: false,
      timeout: 2000
    };
    const req = protocol.get(`${useHttps ? 'https' : 'http'}://127.0.0.1:${port}/json/version`, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ port, success: true, useHttps, data: parsed });
        } catch (e) {
          resolve({ port, success: false, useHttps, error: 'JSON parse error: ' + e.message, raw: data });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ port, success: false, useHttps, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ port, success: false, useHttps, error: 'Timeout' });
    });
  });
}

async function main() {
  console.log('Checking port 58609 with HTTPS...');
  const res1 = await checkPort(58609, true);
  console.log(JSON.stringify(res1, null, 2));

  console.log('Checking port 58609 with HTTP...');
  const res2 = await checkPort(58609, false);
  console.log(JSON.stringify(res2, null, 2));
}

main();
