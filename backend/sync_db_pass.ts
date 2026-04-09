import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
    console.log('⚡ SSH Ready');
    // Set the password for the postgres user in the database
    const cmd = "sudo -u postgres psql -c \"ALTER USER postgres WITH PASSWORD 'Chemz@25';\"";
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code: number) => {
            console.log('✅ Pass sync finished with code:', code);
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
