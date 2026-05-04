// fresh_deployment.js
// Performs a fresh database migration (reset + migrate) and redeploys backend/frontend.
// Run with: node fresh_deployment.js

const { Client } = require('ssh2');
const readline = require('readline');
const https = require('https');

// ===== CONFIGURATION ====================================================
const CONFIG = {
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb',
  remoteRoot: '/var/www/ordincore',
  healthCheckUrl: 'https://www.ordincore.co.uk',
  // Commands (adjust if your package.json scripts differ)
  resetDbCommand: 'sudo -u postgres psql -d caresignal_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"', // drops all tables and recreates schema
  migrateCommand: 'chmod -R 755 node_modules/.bin && npm run db:migrate',    // fix permissions then run migrations
  redeployCommand: 'node redeploy_frontend_clean.js'
};
// =========================================================================

function log(msg) { console.log(`🛠️  ${msg}`); }
function warn(msg) { console.warn(`⚠️  ${msg}`); }
function err(msg) { console.error(`❌ ${msg}`); }

// Helper to run SSH command and return stdout
function runRemote(conn, cmd, options = {}) {
  return new Promise((resolve, reject) => {
    log(`> ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream
        .on('close', (code) => {
          if (code === 0) resolve(stdout);
          else reject(new Error(`Command failed with exit code ${code}: ${cmd}\n${stderr}`));
        })
        .on('data', (data) => { stdout += data; process.stdout.write(data); })
        .stderr.on('data', (data) => { stderr += data; process.stderr.write(data); });
    });
  });
}

// Simple HTTP GET health check (no browser)
function healthCheck(url) {
  return new Promise((resolve, reject) => {
    const client = https.get(url, { rejectUnauthorized: false }, (res) => {
      if (res.statusCode === 200) resolve();
      else reject(new Error(`Health check returned ${res.statusCode}`));
    });
    client.on('error', reject);
    client.setTimeout(10000, () => {
      client.destroy();
      reject(new Error('Health check timeout'));
    });
  });
}

// Ask for confirmation before destroying data
function askConfirmation() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('⚠️  WARNING: This will DELETE ALL EXISTING DATA in the database. Type "yes" to continue: ', (answer) => {
      rl.close();
      resolve(answer === 'yes');
    });
  });
}

async function main() {
  console.log('\n🚀 Ordin Core Fresh Deployment Script\n');

  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log('Deployment cancelled.');
    process.exit(0);
  }

  const conn = new Client();
  conn.on('ready', async () => {
    try {
      log('SSH connection established.');

      // Navigate to project root
      const cdCmd = `cd ${CONFIG.remoteRoot}/backend`;

      // Step 1: Pull latest code
      log('Pulling latest code...');
      await runRemote(conn, `cd ${CONFIG.remoteRoot} && git stash && git pull`);

      // Step 2: Backend setup (Install & permissions)
      log('Installing backend dependencies...');
      await runRemote(conn, `${cdCmd} && npm install`);
      await runRemote(conn, `${cdCmd} && chmod -R 755 node_modules/.bin || true`);

      // Step 3: Reset database (fresh schema)
      log('Resetting database (fresh schema)...');
      await runRemote(conn, `${cdCmd} && ${CONFIG.resetDbCommand}`);

      // Step 4: Run migrations
      log('Running migrations...');
      await runRemote(conn, `${cdCmd} && npm run db:migrate`);

      // Step 5: Build and restart backend
      log('Building backend...');
      await runRemote(conn, `${cdCmd} && npm run build`);
      
      log('Restarting backend services...');
      await runRemote(conn, `${cdCmd} && pm2 restart ordincore-api || pm2 start dist/server.js --name ordincore-api`);

      // Step 6: Frontend setup and build
      log('Building frontend...');
      await runRemote(conn, `cd ${CONFIG.remoteRoot}/frontend && npm install --legacy-peer-deps && npm run build`);

      // Step 4: Health check
      log('Performing health check...');
      await healthCheck(CONFIG.healthCheckUrl);
      log('✅ Health check passed.');

      console.log('\n✅✅✅ Fresh deployment completed successfully!\n');
      conn.end();
      process.exit(0);
    } catch (error) {
      err(error.message);
      conn.end();
      process.exit(1);
    }
  });

  conn.on('error', (e) => {
    err(`SSH connection error: ${e.message}`);
    process.exit(1);
  });

  conn.connect({
    host: CONFIG.host,
    username: CONFIG.username,
    password: CONFIG.password,
    readyTimeout: 30000
  });
}

main();
