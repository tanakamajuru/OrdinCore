import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { trajectoryForCluster, trajectoryForRisk } from '../services/trajectory.service';
import logger from '../utils/logger';

export const startTrajectoryRefreshWorker = () => {
  const name = 'trajectory-refresh';
  const queue = new Queue(name, { connection: redisConnection });
  queue.add('refresh', {}, { repeat: { every: 60 * 60 * 1000 }, removeOnComplete: true, removeOnFail: true })
    .catch((e) => logger.error('Failed to schedule trajectory refresh', e));
  return new Worker(name, async (_job: Job) => {
    const clusters = (await query(`SELECT id FROM signal_clusters WHERE cluster_status NOT IN ('Dismissed','Resolved')`)).rows;
    for (const c of clusters) {
      const tr = await trajectoryForCluster(c.id);
      await query(`UPDATE signal_clusters SET trajectory=$1, updated_at=NOW() WHERE id=$2 AND trajectory::text IS DISTINCT FROM $1`, [tr.direction, c.id]);
    }
    const risks = (await query(`SELECT id, source_cluster_id FROM risks WHERE status NOT IN ('Closed','Resolved')`)).rows;
    for (const r of risks) {
      const tr = await trajectoryForRisk(r.id, r.source_cluster_id);
      await query(`UPDATE risks SET trajectory=$1, updated_at=NOW() WHERE id=$2 AND trajectory::text IS DISTINCT FROM $1`, [tr.direction, r.id]);
    }
    return { clusters: clusters.length, risks: risks.length, calculationVersion: 'trajectory-v3' };
  }, { connection: redisConnection });
};
