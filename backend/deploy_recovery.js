const { Client } = require('ssh2');

const conn = new Client();

const run = (cmd) => new Promise((resolve, reject) => {
  console.log(`🚀 Executing: ${cmd}`);
  conn.exec(cmd, (err, stream) => {
    if (err) return reject(err);
    let output = '';
    stream.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`Command failed with code ${code}: ${cmd}`));
    }).on('data', (data) => {
      output += data;
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
});

conn.on('ready', async () => {
  try {
    console.log('⚡ SSH Client Ready');
    
    console.log('--- SYNCING CODE ---');
    await run('cd /var/www/ordincore && git stash && git pull');

    console.log('--- REPAIRING BACKEND ---');
    await run('cd /var/www/ordincore/backend && npm install');
    await run('cd /var/www/ordincore/backend && (chmod -R +x node_modules/.bin/ || true) && npm run build');
    await run('cd /var/www/ordincore/backend && npm run db:migrate');
    await run('cd /var/www/ordincore/backend && NODE_ENV=production pm2 restart ordincore-api --update-env || NODE_ENV=production pm2 start dist/server.js --name ordincore-api');

    console.log('--- REPAIRING FRONTEND ---');
    await run('cd /var/www/ordincore/frontend && npm install && npm run build');
    
    console.log('--- VERIFYING STATUS ---');
    // Run pm2 logs in background, sleep, then kill it to exit
    await run('pm2 status && (pm2 logs ordincore-api --lines 50 --no-daemon & sleep 5; kill $!)');

    console.log('✅ RECOVERY COMPLETE');
    conn.end();
  } catch (err) {
    console.error('❌ RECOVERY FAILED:', err.message);
    conn.end();
  }
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
