const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  // Using a simpler command structure to avoid escaping issues
  const cmd = `sudo -u postgres psql -c "ALTER USER ordinuser WITH PASSWORD 'Highway@1520';"`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('✅ Command Finished with code:', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
