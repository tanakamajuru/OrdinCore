const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Connect to default DB to create the new one
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

client.connect()
  .then(async () => { 
    console.log("Connected to default postgres db"); 
    try {
        await client.query('CREATE DATABASE "caresignal_db"');
        console.log("Successfully created caresignal_db");
    } catch(err) {
        if (err.code === '42P04') {
            console.log("Database already exists");
        } else {
            console.error("Error creating database:", err.message);
            process.exit(1);
        }
    }
    client.end(); 
  })
  .catch(err => { console.error("DB_ERROR:", err.message); process.exit(1); });
