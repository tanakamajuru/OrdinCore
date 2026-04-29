const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'care_signal'
});

async function run() {
  await client.connect();
  console.log('Connected to database');

  try {
    const migrationPath = path.join(__dirname, 'migrations', '035_stabilize_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration 035...');
    // We split by ';' but carefully to handle DO blocks
    // Actually, pg-client can handle multiple statements if separated by ';' usually,
    // but DO blocks can be tricky. Let's just run the whole thing.
    await client.query(sql);
    console.log('Migration 035 applied successfully');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

run();
