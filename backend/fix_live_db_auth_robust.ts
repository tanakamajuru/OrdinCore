import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
    console.log('⚡ SSH Ready');
    // We target local TCP connections (127.0.0.1/32) and change ident/md5 to trust
    const hbaPath = '/var/lib/pgsql/data/pg_hba.conf';
    const cmd = `
        sed -i 's/127.0.0.1\\/32            ident/127.0.0.1\\/32            trust/g' ${hbaPath}
        sed -i 's/127.0.0.1\\/32            md5/127.0.0.1\\/32            trust/g' ${hbaPath}
        sed -i 's/::1\\/128                 ident/::1\\/128                 trust/g' ${hbaPath}
        sed -i 's/::1\\/128                 md5/::1\\/128                 trust/g' ${hbaPath}
        systemctl reload postgresql || pg_ctl reload -D /var/lib/pgsql/data
    `;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        
        stream.on('close', (code: number) => {
            console.log('✅ Auth fix finished with code:', code);
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
