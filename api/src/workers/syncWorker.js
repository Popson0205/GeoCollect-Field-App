// api/src/workers/syncWorker.js
// BullMQ worker: processes pending offline feature sync batches.
// Start alongside the API: node src/workers/syncWorker.js

require('dotenv').config();
const { Worker, Queue } = require('bullmq');
const pool = require('../db/pool');

const REDIS_URL  = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = { url: REDIS_URL };

const featureSyncQueue = new Queue('feature-sync', { connection });

const worker = new Worker('feature-sync', async (job) => {
  const { features, userId } = job.data;
  const results = { synced: 0, skipped: 0, errors: [] };

  for (const feat of features) {
    const { id, form_schema_id, project_id, geometry, attributes, device_id, vector_clock } = feat;
    try {
      const { rows: existing } = await pool.query(
        'SELECT id, vector_clock FROM features WHERE id = $1', [id]
      );

      if (existing[0]) {
        // CRDT merge: take max of each device's counter
        const serverClock = existing[0].vector_clock || {};
        const clientClock = vector_clock || {};
        const mergedClock = { ...serverClock };
        for (const [devId, count] of Object.entries(clientClock)) {
          mergedClock[devId] = Math.max(mergedClock[devId] || 0, Number(count));
        }

        const { rows: [serverFeat] } = await pool.query(
          'SELECT attributes FROM features WHERE id = $1', [id]
        );
        const serverAttrs  = serverFeat?.attributes || {};
        const mergedAttrs  = { ...serverAttrs };
        const clientSum    = Object.values(clientClock).reduce((a, b) => a + Number(b), 0);
        const serverSum    = Object.values(serverClock).reduce((a, b) => a + Number(b), 0);
        if (clientSum >= serverSum) Object.assign(mergedAttrs, attributes);

        await pool.query(
          `UPDATE features SET attributes=$1, vector_clock=$2, sync_status='synced', updated_at=NOW() WHERE id=$3`,
          [JSON.stringify(mergedAttrs), JSON.stringify(mergedClock), id]
        );
      } else {
        await pool.query(
          `INSERT INTO features
             (id, form_schema_id, project_id, submitted_by, geometry, attributes,
              device_id, sync_status, vector_clock)
           VALUES ($1,$2,$3,$4,ST_SetSRID(ST_GeomFromGeoJSON($5),4326),$6,$7,'synced',$8)
           ON CONFLICT (id) DO NOTHING`,
          [id, form_schema_id, project_id, userId, JSON.stringify(geometry),
           JSON.stringify(attributes), device_id, JSON.stringify(vector_clock || {})]
        );
      }
      results.synced++;
    } catch (err) {
      results.errors.push({ id, error: err.message });
      results.skipped++;
    }
  }
  console.log(`[SyncWorker] Job ${job.id}: synced=${results.synced} skipped=${results.skipped}`);
  return results;
}, { connection, concurrency: 5 });

worker.on('failed', (job, err) => {
  console.error(`[SyncWorker] Job ${job?.id} failed:`, err.message);
});

console.log('[SyncWorker] Listening on queue: feature-sync');
module.exports = { featureSyncQueue };
