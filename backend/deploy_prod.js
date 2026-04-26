const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  conn.exec('cd /var/www/ordincore && git stash && git pull && cd backend && npm install && chmod +x node_modules/.bin/tsc && npm run build && NODE_ENV=production node dist/scripts/migrate.js && NODE_ENV=production pm2 restart all --update-env && pm2 logs 0 --lines 20 --no-daemon', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('✅ Deployment Finished (Exit Code: ' + code + ')');
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('❌ Connection Error:', err);
}).connect({
  host: '185.116.215.178',
  port: 22,
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
