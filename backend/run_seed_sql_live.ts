import { Client } from 'ssh2';
import * as fs from 'fs';

const conn = new Client();
const sql = fs.readFileSync('seed_live.sql');

conn.on('ready', () => {
    console.log('⚡ SSH Ready');
    // We target both potentially used databases
    const cmd = `
        cat > /tmp/seed_live.sql
        sudo -u postgres psql -d caresignal_db -f /tmp/seed_live.sql
        sudo -u postgres psql -d ordincore -f /tmp/seed_live.sql
    `;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        
        stream.on('close', (code: number) => {
            console.log('✅ Final process finished with code:', code);
            conn.end();
            process.exit(code);
        }).on('data', (data: Buffer) => {
            process.stdout.write(data);
        }).stderr.on('data', (data: Buffer) => {
            process.stderr.write(data);
        });

        stream.write(sql);
        stream.end();
    });
}).connect({
    host: '185.116.215.178',
    username: 'root',
    password: 'FccC0vb5I0Hr8lYb'
});
