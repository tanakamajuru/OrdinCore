require('dotenv').config();
const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  await client.connect();
  
  // 1. Get Superadmin ID
  const superadminRes = await client.query("SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1");
  console.log('Superadmin ID:', superadminRes.rows[0]?.id || 'NONE');

  // 2. Check governance_templates schema
  const templateSchema = await client.query(`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'governance_templates'
  `);
  console.log('\ngovernance_templates columns:');
  console.log(JSON.stringify(templateSchema.rows, null, 2));

  // 3. Check governance_questions schema
  const questionSchema = await client.query(`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'governance_questions'
  `);
  console.log('\ngovernance_questions columns:');
  console.log(JSON.stringify(questionSchema.rows, null, 2));

  await client.end();
}

check().catch(console.error);
