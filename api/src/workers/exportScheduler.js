// api/src/workers/exportScheduler.js
// BullMQ worker: runs scheduled export jobs on cron schedule.
// On startup: loads all active scheduled_exports rows and registers each as a
// repeatable BullMQ job. Calls geo-api POST /export/ and routes to destination.
//
// Start: node src/workers/exportScheduler.js

require('dotenv').config();
const { Worker, Queue } = require('bullmq');
const pool = require('../db/pool');
const nodemailer = require('nodemailer');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const GEO_API   = process.env.GEO_API_URL || 'http://geo-api:3002';
const connection = { url: REDIS_URL };

const exportQueue = new Queue('scheduled-export', { connection });

async function registerAllJobs() {
  const { rows } = await pool.query(
    'SELECT * FROM scheduled_exports WHERE is_active = TRUE'
  );
  for (const job of rows) {
    await exportQueue.add(
      `export:${job.id}`,
      { exportId: job.id },
      { repeat: { pattern: job.cron }, jobId: `export:${job.id}` }
    );
    console.log(`[ExportScheduler] Registered job for export "${job.name}" (${job.cron})`);
  }
}

const worker = new Worker('scheduled-export', async (job) => {
  const { exportId } = job.data;

  const { rows } = await pool.query('SELECT * FROM scheduled_exports WHERE id = $1', [exportId]);
  if (!rows[0] || !rows[0].is_active) return;

  const exp = rows[0];

  // Fetch features from geo-api export endpoint
  const res = await fetch(`${GEO_API}/export/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: exp.project_id, format: exp.format })
  });

  if (!res.ok) throw new Error(`geo-api export failed: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const filename = `export_${exp.project_id}_${Date.now()}.${exp.format === 'shapefile' ? 'zip' : exp.format}`;

  // Route to destination
  if (exp.destination === 'minio') {
    const minio = require('../lib/minio');
    const { Readable } = require('stream');
    const key = `exports/${exp.project_id}/${filename}`;
    await minio.upload(key, Readable.from(buffer), buffer.length, 'application/octet-stream');
    const url = await minio.presignedUrl(key, 7 * 24 * 3600); // 7 days
    console.log(`[ExportScheduler] Uploaded to MinIO: ${url}`);

  } else if (exp.destination === 'email') {
    const cfg = exp.destination_config;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || '587'),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'exports@geocollect.io',
      to: cfg.email,
      subject: `GeoCollect Export: ${exp.name}`,
      text: `Your scheduled export "${exp.name}" is attached.`,
      attachments: [{ filename, content: buffer }]
    });

  } else if (exp.destination === 'webhook') {
    const cfg = exp.destination_config;
    await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-Export-Name': exp.name },
      body: buffer
    });
  }

  await pool.query(
    'UPDATE scheduled_exports SET last_run_at = NOW() WHERE id = $1',
    [exportId]
  );
  console.log(`[ExportScheduler] Completed export "${exp.name}"`);

}, { connection, concurrency: 2 });

worker.on('failed', (job, err) => {
  console.error(`[ExportScheduler] Job ${job?.id} failed: ${err.message}`);
});

registerAllJobs().then(() => {
  console.log('[ExportScheduler] All scheduled export jobs registered.');
});
