import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Ready');
  const cmd = "sudo -u postgres psql -d caresignal_db -t -c \"SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1\"";
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code: number) => {
      conn.end();
      process.exit(code);
    }).on('data', (data: Buffer) => {
      const id = data.toString().trim();
      if (id) console.log('LIVE_SA_ID:' + id);
    }).stderr.on('data', (data: Buffer) => {
      console.error('STDERR:' + data);
    });
  });
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
