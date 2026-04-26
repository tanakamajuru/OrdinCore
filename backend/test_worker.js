const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

async function evaluateRules(company_id, house_id, domain, pulse_id) {
    try {
        console.log(`Evaluating rules for ${domain}`);
        const signals14dRes = await pool.query(
            `SELECT gp.*, rsl.cluster_id 
             FROM governance_pulses gp
             LEFT JOIN risk_signal_links rsl ON gp.id = rsl.pulse_entry_id
             WHERE gp.company_id = $1 AND gp.house_id = $2 
             AND gp.created_at >= NOW() - INTERVAL '14 days'
             AND $3 = ANY(gp.risk_domain)
             ORDER BY gp.created_at DESC`,
            [company_id, house_id, domain]
        );
        const recentSignals = signals14dRes.rows;
        console.log(`Found ${recentSignals.length} recent signals`);
        if (recentSignals.length === 0) return;

        let clusterRes = await pool.query(
            `SELECT * FROM signal_clusters 
             WHERE company_id = $1 AND house_id = $2 AND risk_domain = $3 
             AND cluster_status IN ('Emerging', 'Escalated')`,
            [company_id, house_id, domain]
        );

        let cluster_id;
        if (clusterRes.rows.length > 0) {
            cluster_id = clusterRes.rows[0].id;
        } else {
            console.log('Creating new cluster');
            const newClusterRes = await pool.query(
                `INSERT INTO signal_clusters (company_id, house_id, risk_domain, cluster_label, cluster_status, signal_count, first_signal_date, last_signal_date, trajectory)
                 VALUES ($1, $2, $3, $4, 'Emerging', 0, NOW(), NOW(), 'Stable') RETURNING id`,
                [company_id, house_id, domain, `${domain} Signals - ${house_id} (New)`]
            );
            cluster_id = newClusterRes.rows[0].id;
        }

        await pool.query(
            `INSERT INTO risk_signal_links (cluster_id, pulse_entry_id, linked_by) 
             VALUES ($1, $2, (SELECT created_by FROM governance_pulses WHERE id = $2)) 
             ON CONFLICT DO NOTHING`,
            [cluster_id, pulse_id]
        );
        console.log('Linked to cluster');

        const linkRes = await pool.query(`SELECT COUNT(*) FROM risk_signal_links WHERE cluster_id = $1`, [cluster_id]);
        const signal_count = parseInt(linkRes.rows[0].count);

        await pool.query(
            `UPDATE signal_clusters SET cluster_status = $1, trajectory = $2, signal_count = $3, last_signal_date = NOW(), cluster_label = $4
             WHERE id = $5`,
            ['Emerging', 'Stable', signal_count, `${domain} Signals - ${signal_count} recent`, cluster_id]
        );
        console.log('Cluster updated successfully');

        const rmRes = await pool.query(`SELECT user_id as id FROM user_houses WHERE house_id = $1 AND role_in_house = 'REGISTERED_MANAGER' LIMIT 1`, [house_id]);
        const rm_id = rmRes.rows[0]?.id;
        console.log('RM ID:', rm_id);

    } catch (e) {
        console.error('ERROR in evaluateRules:', e);
    }
}

async function run() {
    await evaluateRules('c38ba336-3dd3-4f56-a385-539765a4e112', '38ba95e5-81a2-409b-992e-862b3f31e889', 'Medication', '3a0a403e-fc0d-4d06-8237-b0756ffe9dd7');
    await evaluateRules('c38ba336-3dd3-4f56-a385-539765a4e112', '38ba95e5-81a2-409b-992e-862b3f31e889', 'Staffing', '79a7e56f-580d-4ab5-a976-7151a90c083c');
    process.exit(0);
}
run();
