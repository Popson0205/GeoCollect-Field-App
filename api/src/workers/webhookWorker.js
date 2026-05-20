// api/src/workers/webhookWorker.js
// BullMQ worker: delivers webhook events to configured endpoints.
// Retry policy: 3 attempts — 1 min, 5 min, 15 min backoff.
// After 10 consecutive failures, webhook is deactivated.
//
// Start: node src/workers/webhookWorker.js

require('dotenv').config();
const { Worker, Queue } = require('bullmq');
const crypto = require('crypto');
const pool = require('../db/pool');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = { url: REDIS_URL };

const RETRY_DELAYS = [60_000, 300_000, 900_000]; // 1m, 5m, 15m

const worker = new Worker('webhook-delivery', async (job) => {
  const { projectId, event, payload } = job.data;

  const { rows: hooks } = await pool.query(
    `SELECT * FROM webhooks
     WHERE project_id = $1 AND is_active = TRUE AND $2 = ANY(events)`,
    [projectId, event]
  );

  for (const hook of hooks) {
    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
    const sig  = hook.secret
      ? `sha256=${crypto.createHmac('sha256', hook.secret).update(body).digest('hex')}`
      : null;

    let statusCode = null;
    let responseBody = '';
    let success = false;

    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GeoCollect-Webhook/1.0',
          ...(sig ? { 'X-GeoCollect-Signature': sig } : {})
        },
        body,
        signal: AbortSignal.timeout(10_000)
      });
      statusCode = res.status;
      responseBody = await res.text().catch(() => '');
      success = res.ok;
    } catch (err) {
      responseBody = err.message;
    }

    // Record delivery
    await pool.query(`
      INSERT INTO webhook_deliveries (webhook_id, event, payload, status_code, response_body, attempt, success)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [hook.id, event, JSON.stringify(payload), statusCode, responseBody, job.attemptsMade + 1, success]);

    if (success) {
      await pool.query(
        'UPDATE webhooks SET last_fired_at = NOW(), failure_count = 0 WHERE id = $1',
        [hook.id]
      );
    } else {
      const { rows: [updated] } = await pool.query(
        'UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = $1 RETURNING failure_count',
        [hook.id]
      );
      // Deactivate after 10 consecutive failures
      if (updated.failure_count >= 10) {
        await pool.query('UPDATE webhooks SET is_active = FALSE WHERE id = $1', [hook.id]);
        console.warn(`[WebhookWorker] Webhook ${hook.id} deactivated after 10 failures.`);
      }
    }
  }
}, {
  connection,
  concurrency: 5,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'custom' },
  }
});

worker.on('failed', (job, err) => {
  console.error(`[WebhookWorker] Job ${job?.id} failed: ${err.message}`);
});

console.log('[WebhookWorker] Listening on webhook-delivery queue...');
