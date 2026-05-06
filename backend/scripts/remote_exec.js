const { Client } = require('ssh2');
const conn = new Client();

const cmd = process.argv[2];
if (!cmd) {
  console.error('Usage: node remote_exec.js "<command>"');
  process.exit(1);
}

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '185.116.215.178',
  port: 22,
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
