const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('⚡ SSH Client Ready - Running migration on production DB');
  const cmd = `PGPASSWORD='Highway@1520' psql -h localhost -U ordinuser -d ordincore -c "ALTER TABLE governance_pulses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;" -c "CREATE INDEX IF NOT EXISTS idx_governance_pulses_created_by ON governance_pulses(created_by);"`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('Migration finished (Exit Code: ' + code + ')');
      conn.end();
    }).on('data', d => process.stdout.write(d))
      .stderr.on('data', d => process.stderr.write(d));
  });
}).on('error', (err) => {
  console.error('❌ Connection Error:', err);
}).connect({
  host: '185.116.215.178',
  port: 22,
  username: 'root',
  password: 'FccC0vb5I0Hr8lYb'
});
