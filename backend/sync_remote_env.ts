import { Client } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

const conn = new Client();
const localEnvProdPath = 'c:\\Users\\tanaka.majuru\\Downloads\\SAAS DOCS\\Governance SaaS Application\\backend\\.env.production.unix';
const remoteEnvPath = '/var/www/ordincore/backend/.env';

conn.on('ready', () => {
  console.log('⚡ SSH Client Ready for Env Sync (Base64)');
  const envContent = fs.readFileSync(localEnvProdPath, 'utf8');
  const base64Content = Buffer.from(envContent).toString('base64');
  
  conn.exec(`echo "${base64Content}" | base64 -d > ${remoteEnvPath}`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code: number) => {
      console.log('✅ Remote .env updated (Exit Code: ' + code + ')');
      conn.end();
      process.exit(code);
    }).on('data', (d: any) => console.log(d.toString())).stderr.on('data', (d: any) => console.error(d.toString()));
  });
}).connect({
  host: '185.116.215.178',
  port: 22,
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
