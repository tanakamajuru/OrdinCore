import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
});

async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const passwordHash = await bcrypt.hash('Pass123!', 10);

        // 1. Create Companies
        const getOrCreateCompany = async (name: string) => {
            const existing = await client.query("SELECT id FROM companies WHERE name = $1 LIMIT 1", [name]);
            if (existing.rows.length > 0) return existing.rows[0].id;
            const res = await client.query("INSERT INTO companies (name, status) VALUES ($1, 'active') RETURNING id", [name]);
            return res.rows[0].id;
        };

        const qatCompanyId = await getOrCreateCompany('QAT Care Group');
        const uatCompanyId = await getOrCreateCompany('UAT Care Services Ltd');

        // 2. Create Houses
        const getOrCreateHouse = async (companyId: string, name: string) => {
            const existing = await client.query("SELECT id FROM houses WHERE company_id = $1 AND name = $2 LIMIT 1", [companyId, name]);
            if (existing.rows.length > 0) return existing.rows[0].id;
            const res = await client.query("INSERT INTO houses (company_id, name, status, capacity) VALUES ($1, $2, 'active', 10) RETURNING id", [companyId, name]);
            return res.rows[0].id;
        };

        const qatRose = await getOrCreateHouse(qatCompanyId, 'Rose House');
        const qatOak = await getOrCreateHouse(qatCompanyId, 'Oak Lodge');
        const qatMaple = await getOrCreateHouse(qatCompanyId, 'Maple Court');

        const uatRose = await getOrCreateHouse(uatCompanyId, 'Rose House');
        const uatOak = await getOrCreateHouse(uatCompanyId, 'Oak Lodge');

        // 3. Create Users
        const createUser = async (companyId: string, email: string, firstName: string, lastName: string, role: string) => {
            const res = await client.query(
                `INSERT INTO users (company_id, email, first_name, last_name, password_hash, role, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'active')
                 ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, company_id = EXCLUDED.company_id
                 RETURNING id`,
                [companyId, email, firstName, lastName, passwordHash, role]
            );
            return res.rows[0].id;
        };

        // QAT Users
        const tl1 = await createUser(qatCompanyId, 'tl1@qat.com', 'TL1', 'User', 'TEAM_LEADER');
        const rm1 = await createUser(qatCompanyId, 'rm1@qat.com', 'RM1', 'User', 'REGISTERED_MANAGER');
        const deputy1 = await createUser(qatCompanyId, 'deputy1@qat.com', 'Deputy1', 'User', 'TEAM_LEADER');
        const dir1 = await createUser(qatCompanyId, 'dir1@qat.com', 'Director1', 'User', 'DIRECTOR');

        // UAT Users
        const sarah = await createUser(uatCompanyId, 'sarah@uat.com', 'Sarah', 'TL', 'TEAM_LEADER');
        const mark = await createUser(uatCompanyId, 'mark@uat.com', 'Mark', 'RM', 'REGISTERED_MANAGER');
        const david = await createUser(uatCompanyId, 'david@uat.com', 'David', 'Deputy', 'TEAM_LEADER');
        const emma = await createUser(uatCompanyId, 'emma@uat.com', 'Emma', 'Director', 'DIRECTOR');
        const james = await createUser(uatCompanyId, 'james@uat.com', 'James', 'RI', 'RESPONSIBLE_INDIVIDUAL');

        // 4. Assignments
        const assignUser = async (userId: string, houseId: string, companyId: string, roleInHouse: string) => {
            await client.query(
                `INSERT INTO user_houses (user_id, house_id, company_id, role_in_house)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, house_id) DO NOTHING`,
                [userId, houseId, companyId, roleInHouse]
            );
        };

        await assignUser(tl1, qatRose, qatCompanyId, 'staff');
        await assignUser(rm1, qatRose, qatCompanyId, 'manager');
        await assignUser(deputy1, qatRose, qatCompanyId, 'staff');

        await assignUser(sarah, uatRose, uatCompanyId, 'staff');
        await assignUser(mark, uatRose, uatCompanyId, 'manager');
        await assignUser(david, uatRose, uatCompanyId, 'staff');

        // Update houses with managers and deputies
        await client.query("UPDATE houses SET manager_id = $1, deputy_rm_id = $2 WHERE id = $3", [rm1, deputy1, qatRose]);
        await client.query("UPDATE houses SET manager_id = $1, deputy_rm_id = $2 WHERE id = $3", [mark, david, uatRose]);

        await client.query('COMMIT');
        console.log('✅ QAT & UAT Seeding Complete');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding Failed', e);
    } finally {
        client.release();
        pool.end();
    }
}

main();
