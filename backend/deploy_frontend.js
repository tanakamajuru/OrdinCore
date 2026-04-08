const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const tar = require('tar');

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  
  // Create a tarball of local dist
  tar.c({
    gzip: true,
    cwd: path.join(__dirname, '../frontend/dist')
  }, ['.']).pipe(fs.createWriteStream('dist.tar.gz')).on('finish', () => {
    console.log('📦 Local Tarball Created');
    
    // Upload and Extract
    conn.exec('rm -rf /var/www/ordincore/frontend/dist/* && mkdir -p /var/www/ordincore/frontend/dist && tar xzf - -C /var/www/ordincore/frontend/dist', (err, stream) => {
      if (err) throw err;
      stream.on('close', (code) => {
        console.log('✅ Frontend Uploaded (Exit Code: ' + code + ')');
        conn.end();
        fs.unlinkSync('dist.tar.gz');
      }).on('data', data => process.stdout.write(data)).stderr.on('data', data => process.stderr.write(data));
      
      const fileStream = fs.createReadStream('dist.tar.gz');
      fileStream.pipe(stream);
    });
  });
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
