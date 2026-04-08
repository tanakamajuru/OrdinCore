const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const uploadFile = (sftp, local, remote) => {
  return new Promise((resolve, reject) => {
    console.log(`📤 Uploading: ${local} -> ${remote}`);
    sftp.fastPut(local, remote, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const ensureDir = (sftp, dir) => {
  return new Promise((resolve) => {
    sftp.mkdir(dir, (err) => {
      resolve(); // Ignore if already exists
    });
  });
};

conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  conn.sftp(async (err, sftp) => {
    if (err) throw err;
    
    try {
      const localDist = path.join(__dirname, '../frontend/dist');
      const remoteDist = '/var/www/ordincore/frontend/dist';
      const remoteAssets = path.posix.join(remoteDist, 'assets');

      // 1. Clean (using exec for speed)
      await new Promise((resolve) => {
        conn.exec(`rm -rf ${remoteDist}/*`, (err, stream) => {
           stream.on('close', resolve).on('data', () => {}).stderr.on('data', () => {});
        });
      });
      console.log('🧹 Remote DIST cleaned');

      // 2. Setup dirs
      await ensureDir(sftp, remoteDist);
      await ensureDir(sftp, remoteAssets);

      // 3. Upload index.html
      await uploadFile(sftp, path.join(localDist, 'index.html'), path.posix.join(remoteDist, 'index.html'));

      // 4. Upload assets
      const assets = fs.readdirSync(path.join(localDist, 'assets'));
      for (const asset of assets) {
        await uploadFile(sftp, path.join(localDist, 'assets', asset), path.posix.join(remoteAssets, asset));
      }

      console.log('✅ Final REDEPLOY Complete');
      conn.end();
    } catch (e) {
      console.error('❌ REDEPLOY Failed:', e);
      conn.end();
    }
  });
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
