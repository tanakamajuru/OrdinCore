import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH connection established');
    const remoteCmd = `
        cd /var/www/ordincore/backend
        # Get .env content for debug
        echo "--- .env CONTENT ---"
        cat .env
        echo "--- DB POKE ---"
        node -e "
            require('dotenv').config();
            const { Client } = require('pg');
            const pg = new Client({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME
            });
            pg.connect()
                .then(() => pg.query('SELECT id FROM users WHERE role = \\'SUPER_ADMIN\\' LIMIT 1'))
                .then(res => {
                    console.log('RESULT_SA_ID:' + (res.rows[0]?.id || 'NONE'));
                    pg.end();
                    process.exit(0);
                })
                .catch(err => {
                    console.error('PG_CONNECT_ERROR:', err.message);
                    process.exit(1);
                });
        "
    `;

    conn.exec(remoteCmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code: number) => {
            console.log('Process exited with code:', code);
            conn.end();
        }).on('data', (data: Buffer) => {
            process.stdout.write(data);
        }).stderr.on('data', (data: Buffer) => {
            process.stderr.write(data);
        });
    });
}).connect({
    host: '185.116.215.178',
    port: 22,
    username: 'root',
    password: 'FccC0vb5I0Hr8lYb'
});
