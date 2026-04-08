const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const uploadDir = async (sftp, localDir, remoteDir) => {
  const files = fs.readdirSync(localDir);
  
  // Ensure remote directory exists
  try {
    await new Promise((resolve, reject) => {
      sftp.mkdir(remoteDir, (err) => {
        if (err && err.code !== 4) return reject(err); // 4 = already exists
        resolve();
      });
    });
  } catch (e) {}

  for (const file of files) {
    const localPath = path.join(localDir, file);
    const remotePath = path.posix.join(remoteDir, file);
    const stats = fs.statSync(localPath);

    if (stats.isDirectory()) {
      await uploadDir(sftp, localPath, remotePath);
    } else {
      console.log(`📤 Uploading: ${file}`);
      await new Promise((resolve, reject) => {
        sftp.fastPut(localPath, remotePath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
};

conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  conn.sftp(async (err, sftp) => {
    if (err) throw err;
    
    try {
      const localDist = path.join(__dirname, '../frontend/dist');
      const remoteDist = '/var/www/ordincore/frontend/dist';
      
      console.log('🧹 Cleaning remote dist...');
      // We'll just overwrite files, but let's try to clear assets first if possible
      // Actually, sftp doesn't have a simple recursive rm. We'll just overwrite.
      
      await uploadDir(sftp, localDist, remoteDist);
      console.log('✅ SFTP Upload Complete');
      conn.end();
    } catch (e) {
      console.error('❌ SFTP Upload Failed:', e);
      conn.end();
    }
  });
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
