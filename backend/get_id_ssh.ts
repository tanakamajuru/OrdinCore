import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH connection established');
    const remoteCmd = `
        cd /var/www/ordincore/backend
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
                    console.log('ID_FOUND:' + res.rows[0].id);
                    pg.end();
                    process.exit(0);
                })
                .catch(err => {
                    console.error('PG_ERROR:', err.message);
                    process.exit(1);
                });
        "
    `;

    conn.exec(remoteCmd, (err, stream) => {
        if (err) {
            console.error('Exec error:', err);
            return conn.end();
        }
        stream.on('close', (code: number) => {
            console.log('Remote process closed with code:', code);
            conn.end();
        }).on('data', (data: Buffer) => {
            console.log('' + data);
        }).stderr.on('data', (data: Buffer) => {
            console.error('REMOTE_STDERR:', '' + data);
        });
    });
}).connect({
    host: '185.116.215.178',
    port: 22,
    username: 'root',
    password: 'FccC0vb5I0Hr8lYb'
});
