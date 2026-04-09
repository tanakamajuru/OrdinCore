import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Client Ready for DB Check');
  const customCmd = process.argv[2];
  const cmd = customCmd ? `PGPASSWORD="Highway@1520" psql -h localhost -U ordinuser -d ordincore -c "${customCmd}"` : 'PGPASSWORD="Highway@1520" psql -h localhost -U ordinuser -d ordincore -c "\\dt"';
  conn.exec(cmd, (err: any, stream: any) => {
    if (err) throw err;
    stream.on('close', (code: any, signal: any) => {
      console.log('✅ Check Finished (Exit Code: ' + code + ')');
      conn.end();
      process.exit(code);
    }).on('data', (data: any) => {
      process.stdout.write(data);
    }).stderr.on('data', (data: any) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '185.116.215.178',
  port: 22,
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
