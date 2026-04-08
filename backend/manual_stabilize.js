const { Client } = require('ssh2');

const conn = new Client();

const indexHtml = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>OrdinCore</title>
      <script type="module" crossorigin src="/assets/index-MCGy6h_n.js"></script>
      <link rel="stylesheet" crossorigin href="/assets/index-D1iAYXPX.css">
    </head>

    <body>
      <div id="root"></div>
    </body>
  </html>
`;

conn.on('ready', () => {
  console.log('⚡ SSH Client Ready');
  
  // 1. Write index.html 
  // 2. Reset DB Pass
  // 3. Restart Backend with explicit environment
  const cmd = `
    echo '${indexHtml.trim()}' > /var/www/ordincore/frontend/dist/index.html && \
    sudo -u postgres psql -c "ALTER ROLE ordinuser WITH PASSWORD 'Highway@1520';" && \
    cd /var/www/ordincore/backend && \
    export NODE_ENV=production && \
    export DB_USER=ordinuser && \
    export DB_PASSWORD='Highway@1520' && \
    pm2 restart ordincore-api --update-env && \
    pm2 save
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('✅ Manual stabilization complete with code:', code);
      conn.end();
    }).on('data', data => process.stdout.write(data)).stderr.on('data', data => process.stderr.write(data));
  });
}).connect({
  host: '185.116.215.178',
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
