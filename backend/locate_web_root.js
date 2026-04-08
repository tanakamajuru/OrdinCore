const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  // 1. Find Nginx root
  // 2. Check where the files are
  // 3. Move files if needed
  conn.exec(`grep -r "root" /etc/nginx/sites-enabled/ 2>/dev/null; grep -r "root" /etc/apache2/sites-enabled/ 2>/dev/null; find /var/www -name index.html -maxdepth 3`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', data => process.stdout.write(data)).stderr.on('data', data => process.stderr.write(data));
  });
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
