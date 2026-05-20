// api/src/routes/portal.js
// Phase 3 portal routes: API keys, webhooks, scheduled exports, portal config.

const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { randomUUID } = require('crypto');

module.exports = async function (fastify) {
  const auth    = { preHandler: [fastify.authenticate] };
  const anyAuth = { preHandler: [fastify.authenticateAny] };

  // ── Portal project list (JWT or API key) ───────────────────────────────────
  fastify.get('/portal/projects', anyAuth, async (req) => {
    const { rows } = await pool.query(`
      SELECT p.id, p.name, p.description, p.status,
        (SELECT COUNT(*) FROM features f WHERE f.project_id = p.id) AS feature_count,
        (SELECT MAX(f.created_at) FROM features f WHERE f.project_id = p.id) AS last_submission
      FROM projects p
      WHERE p.owner_id = $1
         OR p.id IN (SELECT project_id FROM project_members WHERE user_id = $1)
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    return rows;
  });

  // ── Portal features (JWT or API key, supports ?bbox & ?limit) ─────────────
  fastify.get('/portal/projects/:id/features', anyAuth, async (req, reply) => {
    const { bbox, limit = 1000, offset = 0 } = req.query;
    let bboxFilter = '';
    const params = [req.params.id, parseInt(limit), parseInt(offset)];

    if (bbox) {
      const [minx, miny, maxx, maxy] = bbox.split(',').map(Number);
      bboxFilter = `AND ST_Intersects(f.geometry, ST_MakeEnvelope($4,$5,$6,$7,4326))`;
      params.push(minx, miny, maxx, maxy);
    }

    const { rows } = await pool.query(`
      SELECT f.id, f.form_schema_id, f.submitted_by,
             ST_AsGeoJSON(f.geometry)::json AS geometry,
             f.attributes, f.created_at
      FROM features f
      WHERE f.project_id = $1
      ${bboxFilter}
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `, params);

    return {
      type: 'FeatureCollection',
      features: rows.map(r => ({
        type: 'Feature',
        id: r.id,
        geometry: r.geometry,
        properties: { ...r.attributes, _form_schema_id: r.form_schema_id, _submitted_by: r.submitted_by, _created_at: r.created_at }
      }))
    };
  });

  // ── Portal config ──────────────────────────────────────────────────────────
  fastify.get('/portal/config/:projectId', auth, async (req, reply) => {
    const { rows } = await pool.query(
      'SELECT * FROM portal_config WHERE project_id = $1',
      [req.params.projectId]
    );
    return rows[0] || { project_id: req.params.projectId, widgets: [], branding: {} };
  });

  fastify.put('/portal/config/:projectId', auth, async (req, reply) => {
    const { widgets = [], branding = {} } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO portal_config (project_id, widgets, branding, updated_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id) DO UPDATE
        SET widgets = $2, branding = $3, updated_by = $4, updated_at = NOW()
      RETURNING *
    `, [req.params.projectId, JSON.stringify(widgets), JSON.stringify(branding), req.user.id]);
    return rows[0];
  });

  // ── API Keys ───────────────────────────────────────────────────────────────
  fastify.post('/portal/api-keys', auth, async (req, reply) => {
    const { project_id, name, scopes = ['read'], expires_at = null } = req.body;
    const rawKey = `gc_live_${crypto.randomBytes(16).toString('hex')}`;
    const prefix = rawKey.slice(0, 16);
    const hash   = await bcrypt.hash(rawKey, 10);

    const { rows } = await pool.query(`
      INSERT INTO api_keys (project_id, created_by, name, key_hash, key_prefix, scopes, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, key_prefix, scopes, expires_at, created_at
    `, [project_id, req.user.id, name, hash, prefix, scopes, expires_at]);

    // Return the raw key ONCE — never stored in plain text
    return reply.code(201).send({ ...rows[0], key: rawKey });
  });

  fastify.get('/portal/api-keys', auth, async (req) => {
    const { project_id } = req.query;
    const { rows } = await pool.query(`
      SELECT id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at
      FROM api_keys
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [project_id]);
    return rows;
  });

  fastify.delete('/portal/api-keys/:id', auth, async (req, reply) => {
    await pool.query(
      'UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );
    return reply.code(204).send();
  });

  // Internal: validate API key (called by geo-api)
  fastify.get('/portal/api-keys/validate', async (req, reply) => {
    const rawKey = req.headers['x-api-key'] || req.query?.api_key;
    if (!rawKey) return reply.code(400).send({ valid: false });
    const prefix = rawKey.slice(0, 16);
    const { rows } = await pool.query(
      `SELECT * FROM api_keys WHERE key_prefix = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
      [prefix]
    );
    if (!rows[0]) return { valid: false };
    const valid = await bcrypt.compare(rawKey, rows[0].key_hash);
    if (!valid) return { valid: false };
    return { valid: true, projectId: rows[0].project_id, scopes: rows[0].scopes };
  });

  // ── Webhooks ───────────────────────────────────────────────────────────────
  fastify.post('/portal/webhooks', auth, async (req, reply) => {
    const { project_id, name, url, secret, events = ['feature.created'] } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO webhooks (project_id, created_by, name, url, secret, events)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, url, events, is_active, created_at
    `, [project_id, req.user.id, name, url, secret || null, events]);
    return reply.code(201).send(rows[0]);
  });

  fastify.get('/portal/webhooks', auth, async (req) => {
    const { project_id } = req.query;
    const { rows } = await pool.query(
      'SELECT id, name, url, events, is_active, last_fired_at, failure_count, created_at FROM webhooks WHERE project_id = $1 ORDER BY created_at DESC',
      [project_id]
    );
    return rows;
  });

  fastify.delete('/portal/webhooks/:id', auth, async (req, reply) => {
    await pool.query('DELETE FROM webhooks WHERE id = $1 AND created_by = $2', [req.params.id, req.user.id]);
    return reply.code(204).send();
  });

  fastify.post('/portal/webhooks/:id/test', auth, async (req, reply) => {
    const { rows } = await pool.query('SELECT * FROM webhooks WHERE id = $1', [req.params.id]);
    if (!rows[0]) return reply.code(404).send({ error: 'Webhook not found' });

    const testPayload = {
      event: 'feature.created',
      test: true,
      timestamp: new Date().toISOString(),
      data: { id: randomUUID(), message: 'This is a test delivery from GeoCollect.' }
    };

    const body = JSON.stringify(testPayload);
    const sig  = rows[0].secret
      ? crypto.createHmac('sha256', rows[0].secret).update(body).digest('hex')
      : null;

    const res = await fetch(rows[0].url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sig ? { 'X-GeoCollect-Signature': `sha256=${sig}` } : {})
      },
      body
    });

    return { status_code: res.status, success: res.ok };
  });

  fastify.get('/portal/webhooks/:id/deliveries', auth, async (req) => {
    const { rows } = await pool.query(
      'SELECT id, event, status_code, attempt, success, delivered_at FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY delivered_at DESC LIMIT 50',
      [req.params.id]
    );
    return rows;
  });

  // ── Scheduled Exports ──────────────────────────────────────────────────────
  fastify.post('/portal/exports/scheduled', auth, async (req, reply) => {
    const { project_id, name, format, cron, destination, destination_config = {} } = req.body;
    const { rows } = await pool.query(`
      INSERT INTO scheduled_exports (project_id, created_by, name, format, cron, destination, destination_config)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [project_id, req.user.id, name, format, cron, destination, JSON.stringify(destination_config)]);
    return reply.code(201).send(rows[0]);
  });

  fastify.get('/portal/exports/scheduled', auth, async (req) => {
    const { project_id } = req.query;
    const { rows } = await pool.query(
      'SELECT * FROM scheduled_exports WHERE project_id = $1 ORDER BY created_at DESC',
      [project_id]
    );
    return rows;
  });

  fastify.delete('/portal/exports/scheduled/:id', auth, async (req, reply) => {
    await pool.query('DELETE FROM scheduled_exports WHERE id = $1 AND created_by = $2', [req.params.id, req.user.id]);
    return reply.code(204).send();
  });
};

  // ── Database Reset (admin only) ────────────────────────────────────────────
  // DELETE /portal/admin/reset-data
  // Wipes all features, attachments, webhook_deliveries, and audit_log rows.
  // Requires platform_admin role. Protected behind a confirmation token.
  fastify.delete('/portal/admin/reset-data', auth, async (req, reply) => {
    if (req.user.role !== 'platform_admin') {
      return reply.code(403).send({ error: 'Only platform administrators can reset data.' });
    }

    const { confirm } = req.query;
    if (confirm !== 'WIPE_ALL_DATA') {
      return reply.code(400).send({
        error: 'Missing confirmation. Pass ?confirm=WIPE_ALL_DATA to proceed.',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rowCount: wh }  = await client.query('DELETE FROM webhook_deliveries');
      const { rowCount: att } = await client.query('DELETE FROM attachments');
      const { rowCount: aud } = await client.query('DELETE FROM audit_log');
      const { rowCount: ft }  = await client.query('DELETE FROM features');
      await client.query('COMMIT');
      return reply.send({
        success: true,
        deleted: { features: ft, attachments: att, audit_log: aud, webhook_deliveries: wh },
        message: 'All submission data has been wiped successfully.',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });
