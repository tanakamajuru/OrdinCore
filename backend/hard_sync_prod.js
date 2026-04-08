const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const uploadFile = (sftp, local, remote) => {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => {
      if (err) {
        console.error(`❌ Failed: ${local} -> ${remote}`, err);
        reject(err);
      } else {
        console.log(`📤 Uploaded: ${remote}`);
        resolve();
      }
    });
  });
};

const ensureDir = (sftp, dir) => {
  return new Promise((resolve) => {
    // remote directories use forward slashes
    sftp.mkdir(dir, (err) => {
      resolve(); // ignore if exists
    });
  });
};

const uploadDir = async (sftp, local, remote) => {
  await ensureDir(sftp, remote);
  const items = fs.readdirSync(local);
  for (const item of items) {
    const localPath = path.join(local, item);
    const remotePath = path.join(remote, item).replace(/\\/g, '/'); // ensure posix paths
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      await uploadDir(sftp, localPath, remotePath);
    } else {
      await uploadFile(sftp, localPath, remotePath);
    }
  }
};

const envContent = `
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://ordincore.co.uk,https://www.ordincore.co.uk
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ordincore
DB_USER=ordinuser
DB_PASSWORD=Highway@1520
JWT_SECRET=2483584f7ea2145e667cf469c9115ea32a943747ff0efbe13947bdfb2c08bce9b173
JWT_EXPIRE=24h
JWT_REFRESH_SECRET=dd646ff9bb3a805c40353cd71196bd7bcea2f2713ae9404e806ef457dbb02
JWT_REFRESH_EXPIRE=30d
ENABLE_ENGINES=false
REDIS_HOST=localhost
REDIS_PORT=6379
`.trim();

conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  conn.sftp(async (err, sftp) => {
    if (err) throw err;
    
    try {
      console.log('🚀 Starting Definitive Sync...');

      // 1. Sync Backend dist
      const localBackendDist = path.join(__dirname, 'dist');
      const remoteBackendDist = '/var/www/ordincore/backend/dist';
      console.log('📦 Mirroring Backend DIST...');
      await uploadDir(sftp, localBackendDist, remoteBackendDist);

      // 2. Sync Frontend dist
      const localFrontendDist = path.join(__dirname, '../frontend/dist');
      const remoteFrontendDist = '/var/www/ordincore/frontend/dist';
      console.log('🖼️ Mirroring Frontend DIST...');
      await uploadDir(sftp, localFrontendDist, remoteFrontendDist);

      // 3. Write clean .env.production
      console.log('⚙️ Standardizing Environment...');
      await new Promise((resolve) => {
        conn.exec(`echo "${envContent}" > /var/www/ordincore/backend/.env.production`, (err, stream) => {
          stream.on('close', resolve).on('data', () => {}).stderr.on('data', () => {});
        });
      });

      // 4. Restart PM2
      console.log('♻️ Restarting Services...');
      await new Promise((resolve) => {
        conn.exec('pm2 delete ordincore-api || true; cd /var/www/ordincore/backend && NODE_ENV=production pm2 start dist/server.js --name ordincore-api --update-env && pm2 save', (err, stream) => {
          stream.on('close', resolve).on('data', data => process.stdout.write(data)).stderr.on('data', data => process.stderr.write(data));
        });
      });

      console.log('✅✅ DEFINITIVE SYNC COMPLETE ✅✅');
      conn.end();
    } catch (e) {
      console.error('❌ Sync Failed:', e);
      conn.end();
    }
  });
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
