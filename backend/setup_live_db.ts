import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
    console.log('⚡ SSH Ready');
    // 1. Create DB if not exists
    // 2. Run migrations
    const cmd = `
        sudo -u postgres createdb caresignal_db || echo "DB already exists"
        cd /var/www/ordincore/backend
        npm install
        npx ts-node src/scripts/migrate.ts
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
    });
}).connect({
    host: '185.116.215.178',
    username: 'root',
    password: 'FccC0vb5I0Hr8lYb'
});
