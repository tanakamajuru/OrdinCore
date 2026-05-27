const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  console.log('⚡ SSH Client Ready to deploy OrdinCore Landing Page');
  
  const cmd = `echo "=== STEP 1: PULLING LATEST CODE ===" && ` +
              `cd /var/www/ordincore && git stash && git pull && ` +
              `echo "=== STEP 2: INSTALLING & BUILDING LANDING PAGE ===" && ` +
              `cd landing-page && npm install && npm run build && ` +
              `echo "=== STEP 3: COPYING STATIC ASSETS ===" && ` +
              `mkdir -p /var/www/ordincore/landing-page-dist && ` +
              `cp -rf /var/www/ordincore/landing-page/dist/* /var/www/ordincore/landing-page-dist/ && ` +
              `echo "=== STEP 4: ADJUSTING PERMISSIONS & SELINUX ===" && ` +
              `chmod -R +r /var/www/ordincore/landing-page-dist && ` +
              `chcon -R -t httpd_sys_content_t /var/www/ordincore/landing-page-dist/ || true && ` +
              `echo "=== STEP 5: RESTARTING NGINX ===" && ` +
              `systemctl restart nginx && ` +
              `echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"`;
              
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('✅ Remote execution finished with code:', code);
      conn.end();
    }).on('data', data => process.stdout.write(data)).stderr.on('data', data => process.stderr.write(data));
  });
}).connect({ host: '185.116.215.178', username: 'root', password: 'FccC0vb5I0Hr8lYb' });
