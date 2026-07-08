/**
 * One-off SSOT backfill (2026-07-07). Existing risks.trajectory / signal_clusters.trajectory
 * were written by the retired heuristic, so they're stale relative to the Finding K engine.
 * This recomputes both caches from the engine so the register/reports/Patterns immediately
 * agree with the RM detail / rm5 live views. Safe to re-run.
 */
import { query } from '../config/database';
import { trajectoryForCluster, trajectoryForRisk } from '../services/trajectory.service';

async function main() {
  const clusters = (await query(
    `SELECT id, risk_domain FROM signal_clusters WHERE cluster_status IN ('Emerging','Escalated','Confirmed')`
  )).rows;
  let cCount = 0;
  for (const c of clusters) {
    try {
      const tr = await trajectoryForCluster(c.id);
      // Safety floor: a Safeguarding theme never reads calmer than Deteriorating. (An
      // in-window Critical is re-applied by the pattern worker on the next signal.)
      const dir = String(c.risk_domain || '').toLowerCase().includes('safeguard') ? 'Deteriorating' : tr.direction;
      await query(`UPDATE signal_clusters SET trajectory = $1 WHERE id = $2`, [dir, c.id]);
      cCount++;
    } catch (e) { console.warn('cluster skip', c.id, (e as Error).message); }
  }

  const risks = (await query(
    `SELECT id, source_cluster_id FROM risks WHERE status NOT IN ('Closed','Resolved')`
  )).rows;
  let rCount = 0;
  for (const r of risks) {
    try {
      const tr = await trajectoryForRisk(r.id, r.source_cluster_id);
      await query(`UPDATE risks SET trajectory = $1 WHERE id = $2`, [tr.direction, r.id]);
      rCount++;
    } catch (e) { console.warn('risk skip', r.id, (e as Error).message); }
  }

  console.log(`SSOT trajectory backfill complete: ${cCount} clusters, ${rCount} risks.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
