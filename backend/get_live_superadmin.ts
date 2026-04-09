import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  conn.exec('cd /var/www/ordincore/backend && node -e "require(\'dotenv\').config(); const { Client } = require(\'pg\'); const c = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME }); c.connect().then(() => c.query(\\\"SELECT id FROM users WHERE role = \'SUPER_ADMIN\' LIMIT 1\\\")).then(r => { console.log(\'LIVE_SUPERADMIN_ID:\' + r.rows[0].id); c.end(); });"', (err: Error | undefined, stream: any) => {
    if (err) throw err;
    stream.on('close', (code: number, signal: string) => {
      conn.end();
    }).on('data', (data: Buffer) => {
      console.log('' + data);
    }).stderr.on('data', (data: Buffer) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '185.116.215.178',
  port: 22,
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
