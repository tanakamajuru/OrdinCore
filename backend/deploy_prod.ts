import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  conn.exec('cd /var/www/ordincore && git stash && git pull && cd backend && npm install && npm run build && NODE_ENV=production pm2 restart all --update-env && pm2 logs 0 --lines 20 --no-daemon', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('✅ Deployment Finished (Exit Code: ' + code + ')');
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '185.116.215.178',
  port: 22,
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
