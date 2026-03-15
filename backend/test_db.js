const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'caresignal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

client.connect()
  .then(() => { console.log("SUCCESS"); client.end(); })
  .catch(err => { console.error("DB_ERROR:", err.message); process.exit(1); });
