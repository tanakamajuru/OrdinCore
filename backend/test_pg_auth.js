const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('⚡ SSH connected. Finding PostgreSQL service name...');
  conn.exec('systemctl list-units --type=service | grep -i postgres', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      conn.end();
    }).on('data', d => process.stdout.write(d)).stderr.on('data', d => process.stderr.write(d));
  });
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
