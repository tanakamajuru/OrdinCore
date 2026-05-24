const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const run = (cmd) => new Promise((resolve, reject) => {
  console.log(`🚀 Executing: ${cmd}`);
  conn.exec(cmd, (err, stream) => {
    if (err) return reject(err);
    let output = '';
    stream.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`Command failed with code ${code}: ${cmd}`));
    }).on('data', (data) => {
      output += data;
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
});

conn.on('ready', async () => {
  try {
    console.log('⚡ SSH Client Connected to 185.116.215.178');

    console.log('\n--- STEP 0: PULLING LATEST CODE FROM GIT ---');
    await run('cd /var/www/ordincore && git stash && git pull');

    console.log('\n--- STEP 1: CREATING BACKEND .ENV FILE ---');
    const backendEnv = `NODE_ENV=production
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ordincore
DB_USER=ordinuser
DB_PASSWORD=Highway@1520
DB_SSL=false
DB_MAX_CONNECTIONS=100
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

JWT_SECRET=4b8d4a62b2a305bf57fb8bd9f381e8c1d3a917a6b7a7ae33acfe2a15c5553788af421fa16029b95975c710a92a6e1ff68893e2e85a89362c4db687c09f514d64
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=dd646ff9bb3a805c40353cd71196bd7bcea2f2713ae9404e806ef457dbb02483584f7ea2145e667cf469c9115ea32a943747ff0efbe13947bdfb2c08bce9b173
JWT_REFRESH_EXPIRE=30d

ENABLE_ENGINES=false
CORS_ORIGIN=https://ordincore.co.uk,https://www.ordincore.co.uk,https://work.ordincore.co.uk`;

    // Write to a temporary file locally, then we can upload it, or write it via echo / cat directly on remote
    // We will use cat with EOF directly on remote
    await run(`cat > /var/www/ordincore/backend/.env << 'EOF'
${backendEnv}
EOF`);
    await run('chmod 600 /var/www/ordincore/backend/.env');
    console.log('✅ Created backend .env successfully');

    console.log('\n--- UPLOADING CORRECTED FILES & RUNNER TO SERVER ---');
    const migrateTs = fs.readFileSync(path.join(__dirname, 'src/scripts/migrate.ts'), 'utf8');
    const m41 = fs.readFileSync(path.join(__dirname, 'migrations/041_RM_governance_alignment.sql'), 'utf8');
    const m42 = fs.readFileSync(path.join(__dirname, 'migrations/042_RM_governance_alignment_v2.sql'), 'utf8');
    const m43 = fs.readFileSync(path.join(__dirname, 'migrations/043_RM_governance_refinement.sql'), 'utf8');
    const m44 = fs.readFileSync(path.join(__dirname, 'migrations/044_ordin_core_alignment_v2.sql'), 'utf8');
    const repair = fs.readFileSync(path.join(__dirname, 'migrations/repair_schema.sql'), 'utf8');
    const repair2 = fs.readFileSync(path.join(__dirname, 'migrations/repair_schema_v2.sql'), 'utf8');
    const repair3 = fs.readFileSync(path.join(__dirname, 'migrations/repair_schema_v3.sql'), 'utf8');
    const repair4 = fs.readFileSync(path.join(__dirname, 'migrations/repair_schema_v4.sql'), 'utf8');

    await run(`echo "${Buffer.from(migrateTs).toString('base64')}" | base64 -d > /var/www/ordincore/backend/src/scripts/migrate.ts`);
    await run(`echo "${Buffer.from(m41).toString('base64')}" | base64 -d > /var/www/ordincore/backend/migrations/041_RM_governance_alignment.sql`);
    await run(`echo "${Buffer.from(m42).toString('base64')}" | base64 -d > /var/www/ordincore/backend/migrations/042_RM_governance_alignment_v2.sql`);
    await run(`echo "${Buffer.from(m43).toString('base64')}" | base64 -d > /var/www/ordincore/backend/migrations/043_RM_governance_refinement.sql`);
    await run(`echo "${Buffer.from(m44).toString('base64')}" | base64 -d > /var/www/ordincore/backend/migrations/044_ordin_core_alignment_v2.sql`);
    await run(`echo "${Buffer.from(repair).toString('base64')}" | base64 -d > /var/www/ordincore/backend/migrations/repair_schema.sql`);
    await run(`echo "${Buffer.from(repair2).toString('base64')}" | base64 -d > /var/www/ordincore/backend/migrations/repair_schema_v2.sql`);
    await run(`echo "${Buffer.from(repair3).toString('base64')}" | base64 -d > /var/www/ordincore/backend/migrations/repair_schema_v3.sql`);
    await run(`echo "${Buffer.from(repair4).toString('base64')}" | base64 -d > /var/www/ordincore/backend/migrations/repair_schema_v4.sql`);
    console.log('✅ Corrected files uploaded successfully');

    console.log('\n--- STEP 2: INSTALLING DEPENDENCIES & BUILDING BACKEND ---');
    await run('cd /var/www/ordincore/backend && npm install');
    await run('cd /var/www/ordincore/backend && chmod -R +x node_modules/.bin/ || true');
    await run('cd /var/www/ordincore/backend && npm run build');

    console.log('\n--- STEP 3: RESETTING DATABASE, RUNNING MIGRATIONS & SEEDING ---');
    // Backup pg_hba.conf
    await run('cp /var/lib/pgsql/data/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf.bak');
    // Set local postgres connections to trust temporarily
    await run("sed -i 's/local all postgres        md5/local all postgres        trust/g' /var/lib/pgsql/data/pg_hba.conf");
    await run("sed -i 's/local samerole all        md5/local samerole all        trust/g' /var/lib/pgsql/data/pg_hba.conf");
    // Reload postgresql
    await run('systemctl reload postgresql || systemctl reload postgresql-16 || systemctl reload postgresql-15 || sudo -u postgres pg_ctl reload -D /var/lib/pgsql/data || true');

    // Run database recreation
    await run('sudo -u postgres psql -c "DROP DATABASE IF EXISTS ordincore;"');
    await run('sudo -u postgres psql -c "CREATE DATABASE ordincore OWNER ordinuser;"');
    await run('sudo -u postgres psql -d ordincore -c "CREATE EXTENSION IF NOT EXISTS \\"uuid-ossp\\";"');
    
    // Run migrations and seeds
    await run('cd /var/www/ordincore/backend && npm run db:migrate');
    await run('cd /var/www/ordincore/backend && npx ts-node seeds/001_superadmin.ts');
    await run('cd /var/www/ordincore/backend && npm run db:seed');

    // Restore original pg_hba.conf
    await run('cp /var/lib/pgsql/data/pg_hba.conf.bak /var/lib/pgsql/data/pg_hba.conf');
    await run('systemctl reload postgresql || systemctl reload postgresql-16 || systemctl reload postgresql-15 || sudo -u postgres pg_ctl reload -D /var/lib/pgsql/data || true');
    await run('rm -f /var/lib/pgsql/data/pg_hba.conf.bak');
    console.log('✅ Re-secured PostgreSQL local authentication to md5');

    console.log('\n--- STEP 4: STARTING BACKEND WITH PM2 ---');
    await run('cd /var/www/ordincore/backend && pm2 stop ordincore-api || true');
    await run('cd /var/www/ordincore/backend && pm2 delete ordincore-api || true');
    await run('cd /var/www/ordincore/backend && pm2 start dist/server.js --name ordincore-api');
    await run('pm2 save');

    console.log('\n--- STEP 5: CREATING FRONTEND .ENV.PRODUCTION & BUILDING FRONTEND ---');
    const frontendEnv = `VITE_API_URL=https://ordincore.co.uk/api/v1
VITE_WS_URL=wss://ordincore.co.uk`;
    await run(`cat > /var/www/ordincore/frontend/.env.production << 'EOF'
${frontendEnv}
EOF`);
    await run('cd /var/www/ordincore/frontend && npm install --legacy-peer-deps');
    await run('cd /var/www/ordincore/frontend && npm run build');

    console.log('\n--- STEP 6: BUILDING LANDING PAGE ---');
    await run('cd /var/www/ordincore/landing-page && npm install');
    await run('cd /var/www/ordincore/landing-page && npm run build');
    await run('mkdir -p /var/www/ordincore/landing-page-dist');
    await run('cp -rf /var/www/ordincore/landing-page/dist/* /var/www/ordincore/landing-page-dist/');

    console.log('\n--- STEP 7: INSPECTING & TESTING NGINX ---');
    // Let's print out active Nginx configuration for verification
    await run('cat /etc/nginx/sites-enabled/ordincore.co.uk || cat /etc/nginx/sites-available/default || true');
    await run('nginx -t');
    await run('systemctl reload nginx');

    console.log('\n--- STEP 8: ADJUSTING PERMISSIONS & SELINUX ---');
    await run('chmod +x /var /var/www /var/www/ordincore /var/www/ordincore/frontend /var/www/ordincore/frontend/dist');
    await run('chmod -R +r /var/www/ordincore/frontend/dist');
    await run('chcon -R -t httpd_sys_content_t /var/www/ordincore/frontend/dist/ || true');
    await run('chmod -R +r /var/www/ordincore/landing-page-dist');
    await run('chcon -R -t httpd_sys_content_t /var/www/ordincore/landing-page-dist/ || true');

    console.log('\n--- STEP 9: VERIFYING DEPLOYMENT ---');
    await run('pm2 list');
    // Simple curl test to make sure login endpoint resolves
    await run('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/auth/login -X POST -H "Content-Type: application/json" -d \'{"email":"superadmin@caresignal.com","password":"admin123"}\' || true');

    console.log('\n\n✅ FULL DEPLOYMENT COMPLETED SUCCESSFULLY!');
    conn.end();
  } catch (err) {
    console.error('\n❌ DEPLOYMENT FAILED:', err.message);
    conn.end();
    process.exit(1);
  }
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
