import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
    console.log('⚡ SSH Ready');
    // Run migrations on the live server
    const cmd = 'cd /var/www/ordincore/backend && npx ts-node src/scripts/migrate.ts';

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        
        stream.on('close', (code: number) => {
            console.log('✅ Migration process finished with code:', code);
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
