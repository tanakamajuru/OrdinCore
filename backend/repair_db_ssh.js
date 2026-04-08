const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  console.log('⚡ SSH Client Ready');
  const cmd = 'sudo -u postgres psql -c "CREATE DATABASE ordincore;" || true; ' +
              'sudo -u postgres psql -c "ALTER ROLE ordinuser WITH PASSWORD \'Highway@1520\';" || true; ' +
              'sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ordincore TO ordinuser;"';
              
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('✅ Remote command finished with code:', code);
      conn.end();
    }).on('data', data => process.stdout.write(data)).stderr.on('data', data => process.stderr.write(data));
  });
}).connect({ host: '185.116.215.178', username: 'root', password: 'FccC0vb5I0Hr8lYb' });
