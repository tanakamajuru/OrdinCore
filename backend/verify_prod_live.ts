import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Client Ready for Verification');
  // Run the verification script on the server
  // We use npx ts-node to run the .ts file
  conn.exec('cd /var/www/ordincore/backend && NODE_ENV=production node dist/scripts/verify_full_journey.js', (err: any, stream: any) => {
    if (err) throw err;
    stream.on('close', (code: any, signal: any) => {
      console.log('✅ Verification Finished (Exit Code: ' + code + ')');
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
