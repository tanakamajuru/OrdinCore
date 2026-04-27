const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const query = process.argv[2] || `SELECT DISTINCT role FROM users`;
  console.log(`⚡ SSH Client Ready - Running query: ${query}`);
  const cmd = `PGPASSWORD='Highway@1520' psql -h localhost -U ordinuser -d ordincore -c "${query}"`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Finished (Exit Code: ' + code + ')');
      conn.end();
    }).on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', (err) => {
  console.error('❌ Connection Error:', err);
}).connect({
  host: '185.116.215.178',
  port: 22,
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
