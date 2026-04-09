import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
    console.log('⚡ SSH Ready');
    conn.exec('cat /var/lib/pgsql/data/pg_hba.conf', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            conn.end();
        }).on('data', (data: Buffer) => {
            console.log(data.toString());
        }).stderr.on('data', (data: Buffer) => {
            console.error('STDERR:', data.toString());
        });
    });
}).connect({
    host: '185.116.215.178',
    username: 'root',
    password: 'FccC0vb5I0Hr8lYb'
});
