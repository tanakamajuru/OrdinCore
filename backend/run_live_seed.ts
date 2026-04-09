import { Client } from 'ssh2';
import * as fs from 'fs';

const conn = new Client();
const code = fs.readFileSync('seed_live_standalone.js');

conn.on('ready', () => {
    console.log('⚡ SSH Ready');
    conn.exec('cat > /var/www/ordincore/backend/seed_live_tmp.js && cd /var/www/ordincore/backend && node seed_live_tmp.js && rm seed_live_tmp.js', (err, stream) => {
        if (err) throw err;
        
        stream.on('close', (code: number) => {
            console.log('✅ Process finished with code:', code);
            conn.end();
            process.exit(code);
        }).on('data', (data: Buffer) => {
            process.stdout.write(data);
        }).stderr.on('data', (data: Buffer) => {
            process.stderr.write(data);
        });

        stream.write(code);
        stream.end();
    });
}).connect({
    host: '185.116.215.178',
    port: 22,
    username: 'root',
    password: 'FccC0vb5I0Hr8lYb'
});
