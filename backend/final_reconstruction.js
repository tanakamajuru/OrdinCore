const { Client } = require('ssh2');

const conn = new Client();

const envContent = `
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://ordincore.co.uk,https://www.ordincore.co.uk
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ordincore
DB_USER=ordinuser
DB_PASSWORD='Highway@1520'
JWT_SECRET=2483584f7ea2145e667cf469c9115ea32a943747ff0efbe13947bdfb2c08bce9b173
JWT_EXPIRE=24h
JWT_REFRESH_SECRET=dd646ff9bb3a805c40353cd71196bd7bcea2f2713ae9404e806ef457dbb02
JWT_REFRESH_EXPIRE=30d
ENABLE_ENGINES=false
REDIS_HOST=localhost
REDIS_PORT=6379
`.trim();

conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  
  // 1. Create Clean .env.production
  // 2. Ensure Database exists
  // 3. Reset Role
  // 4. Restart PM2
  const cmd = `
    echo "${envContent}" > /var/www/ordincore/backend/.env.production && \
    sudo -u postgres psql -c "CREATE DATABASE ordincore;" || true && \
    sudo -u postgres psql -c "ALTER ROLE ordinuser WITH PASSWORD 'Highway@1520';" && \
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ordincore TO ordinuser;" && \
    cd /var/www/ordincore/backend && \
    pm2 delete ordincore-api || true && \
    NODE_ENV=production pm2 start dist/server.js --name ordincore-api --update-env && \
    pm2 save
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('✅ Final Recovery complete with code:', code);
      conn.end();
    }).on('data', data => process.stdout.write(data)).stderr.on('data', data => process.stderr.write(data));
  });
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
