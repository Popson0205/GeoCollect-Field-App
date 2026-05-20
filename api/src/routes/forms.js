// api/src/routes/forms.js
const pool = require('../db/pool');
const { randomUUID } = require('crypto');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise a form row so consumers always get `geofences` as an array.
 * Zone shape: { id, name, polygon, assigned_to: uuid | null }
 */
function normaliseForm(row) {
  if (
    row.geofences &&
    Array.isArray(row.geofences) &&
    row.geofences.length === 0 &&
    row.geofence
  ) {
    row.geofences = [{
      id: 'legacy',
      name: 'Zone 1',
      polygon: row.geofence,
      assigned_to: null,
    }];
  }
  // Ensure every zone has assigned_to field (backfill nulls for older records)
  if (Array.isArray(row.geofences)) {
    row.geofences = row.geofences.map(z => ({
      assigned_to: null,
      ...z,
    }));
  }
  return row;
}

/**
 * Filter zones for a field collector:
 *   - zones assigned to them → included
 *   - zones with assigned_to = null → included (open/shared zones)
 *   - zones assigned to someone else → excluded
 *
 * Managers, GIS analysts, and admins always see all zones.
 */
function filterZonesForUser(form, userId, userRole) {
  const managerRoles = ['project_manager', 'gis_analyst', 'platform_admin'];
  if (managerRoles.includes(userRole)) return form; // full visibility

  if (!Array.isArray(form.geofences)) return form;

  form.geofences = form.geofences.filter(
    z => z.assigned_to === null || z.assigned_to === userId
  );
  return form;
}

// ── Routes ────────────────────────────────────────────────────────────────────

module.exports = async function (fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // ── GET /projects/:projectId/forms ──────────────────────────────────────────
  fastify.get('/projects/:projectId/forms', auth, async (req) => {
    const { rows } = await pool.query(
      `SELECT id, project_id, name, version, geometry_type, schema,
              geofence, geofences, is_published,
              share_token, visibility,
              created_by, created_at, updated_at
       FROM form_schemas
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [req.params.projectId]
    );
    return rows
      .map(normaliseForm)
      .map(f => filterZonesForUser(f, req.user.id, req.user.role));
  });

  // ── POST /projects/:projectId/forms ─────────────────────────────────────────
  fastify.post('/projects/:projectId/forms', auth, async (req, reply) => {
    const {
      name,
      geometry_type = 'Point',
      schema = {},
      geofence = null,
      geofences = [],
      visibility = 'private',
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO form_schemas
         (project_id, name, geometry_type, schema,
          geofence, geofences, visibility, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.params.projectId, name, geometry_type,
        JSON.stringify(schema),
        geofence ? JSON.stringify(geofence) : null,
        JSON.stringify(geofences),
        visibility,
        req.user.id,
      ]
    );
    return reply.code(201).send(normaliseForm(rows[0]));
  });

  // ── GET /forms/:id ──────────────────────────────────────────────────────────
  fastify.get('/forms/:id', auth, async (req, reply) => {
    const { rows } = await pool.query(
      `SELECT id, project_id, name, version, geometry_type, schema,
              geofence, geofences, is_published,
              share_token, visibility,
              created_by, created_at, updated_at
       FROM form_schemas WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' });
    const form = normaliseForm(rows[0]);
    return filterZonesForUser(form, req.user.id, req.user.role);
  });

  // ── PATCH /forms/:id ────────────────────────────────────────────────────────
  // geofences array: [{ id, name, polygon, assigned_to: uuid|null }]
  fastify.patch('/forms/:id', auth, async (req, reply) => {
    const { name, geometry_type, schema, geofence, geofences, visibility } = req.body;

    const sets = [];
    const params = [];

    if (name !== undefined) {
      params.push(name); sets.push(`name = $${params.length}`);
    }
    if (geometry_type !== undefined) {
      params.push(geometry_type); sets.push(`geometry_type = $${params.length}`);
    }
    if (schema !== undefined) {
      params.push(JSON.stringify(schema)); sets.push(`schema = $${params.length}::jsonb`);
    }
    if (visibility !== undefined) {
      params.push(visibility); sets.push(`visibility = $${params.length}`);
    }
    if ('geofence' in req.body) {
      params.push(geofence ? JSON.stringify(geofence) : null);
      sets.push(`geofence = $${params.length}`);
    }
    if ('geofences' in req.body) {
      params.push(JSON.stringify(geofences ?? []));
      sets.push(`geofences = $${params.length}::jsonb`);
    }

    if (sets.length === 0) {
      const { rows } = await pool.query('SELECT * FROM form_schemas WHERE id = $1', [req.params.id]);
      if (!rows[0]) return reply.code(404).send({ error: 'Not found' });
      return normaliseForm(rows[0]);
    }

    sets.push('updated_at = NOW()');
    params.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE form_schemas SET ${sets.join(', ')}
       WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' });
    return normaliseForm(rows[0]);
  });

  // ── POST /forms/:id/publish ─────────────────────────────────────────────────
  fastify.post('/forms/:id/publish', auth, async (req, reply) => {
    const visibility = req.body?.visibility;
    const token = randomUUID();

    let query, qParams;
    if (visibility) {
      query = `
        UPDATE form_schemas
        SET is_published = TRUE,
            version      = version + 1,
            updated_at   = NOW(),
            share_token  = COALESCE(share_token, $1),
            visibility   = $2
        WHERE id = $3 RETURNING *`;
      qParams = [token, visibility, req.params.id];
    } else {
      query = `
        UPDATE form_schemas
        SET is_published = TRUE,
            version      = version + 1,
            updated_at   = NOW(),
            share_token  = COALESCE(share_token, $1)
        WHERE id = $2 RETURNING *`;
      qParams = [token, req.params.id];
    }

    const { rows } = await pool.query(query, qParams);
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' });
    return normaliseForm(rows[0]);
  });

  // ── GET /forms/share/:token  (PUBLIC — no auth) ─────────────────────────────
  // Public share link. Returns only open zones (assigned_to = null).
  // Assigned zones are never exposed via the public link.
  fastify.get('/forms/share/:token', async (req, reply) => {
    const { rows } = await pool.query(
      `SELECT id, project_id, name, geometry_type, schema,
              geofence, geofences, visibility
       FROM form_schemas
       WHERE share_token = $1 AND is_published = TRUE`,
      [req.params.token]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Form not found or not published' });

    const form = normaliseForm(rows[0]);

    if (form.visibility === 'private') {
      return reply.code(403).send({ error: 'This form is private and cannot be accessed via share link.' });
    }

    // Public users only see open (unassigned) zones
    form.geofences = (form.geofences || []).filter(z => z.assigned_to === null);

    return form;
  });

  // ── DELETE /forms/:id ───────────────────────────────────────────────────────
  fastify.delete('/forms/:id', auth, async (req, reply) => {
    await pool.query('DELETE FROM form_schemas WHERE id = $1', [req.params.id]);
    return reply.code(204).send();
  });
};
