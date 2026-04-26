const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

async function getDashboardFeed(company_id, house_ids) {
    const placeholderIds = house_ids.map((_, i) => `$${i + 2}`).join(', ');
    const patternSignals = await pool.query(
        `SELECT sc.*, h.name as house_name 
         FROM signal_clusters sc
         JOIN houses h ON h.id = sc.house_id
         WHERE sc.company_id = $1 AND sc.house_id IN (${placeholderIds})
         AND sc.cluster_status IN ('Emerging', 'Confirmed', 'Escalated')
         ORDER BY sc.last_signal_date DESC`,
        [company_id, ...house_ids]
    );
    console.log(patternSignals.rows);
    process.exit(0);
}

getDashboardFeed('c38ba336-3dd3-4f56-a385-539765a4e112', ['38ba95e5-81a2-409b-992e-862b3f31e889']);
