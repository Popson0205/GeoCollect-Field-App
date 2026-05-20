// api/src/routes/mobile.js
// Mobile app endpoints: assigned forms, batch submissions, org management, invites
const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

function mailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

module.exports = async function (fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // ── GET /forms/assigned ──────────────────────────────────────────
  // Returns all forms the current user can collect data on:
  // - forms assigned directly to the user
  // - forms assigned to any org the user belongs to
  // - forms assigned to the user's role
  fastify.get('/forms/assigned', auth, async (req) => {
    const userId = req.user.id;
    const { rows: orgRows } = await pool.query(
      'SELECT org_id, role FROM org_members WHERE user_id = $1',
      [userId]
    );
    const orgIds = orgRows.map(r => r.org_id);
    const roles = [...new Set(orgRows.map(r => r.role))];

    const { rows } = await pool.query(`
      SELECT DISTINCT
        fs.id, fs.name AS title, fs.version, fs.schema AS fields,
        fs.geometry_type, fs.is_published, fs.created_by,
        p.id AS project_id, p.name AS project_name,
        g.id AS geofence_id, g.name AS geofence_name,
        g.type AS geofence_type, g.geometry AS geofence_geometry,
        g.enforcement AS geofence_enforcement,
        g.buffer_meters AS geofence_buffer_meters,
        g.radius_meters AS geofence_radius_meters,
        g.active AS geofence_active
      FROM form_schemas fs
      JOIN projects p ON fs.project_id = p.id
      LEFT JOIN geofences g ON g.form_id = fs.id AND g.active = TRUE
      LEFT JOIN form_assignments fa ON fa.form_id = fs.id
      WHERE fs.is_published = TRUE
        AND (
          (fa.assignee_type = 'user' AND fa.assignee_id = $1)
          OR (fa.assignee_type = 'org' AND fa.assignee_id = ANY($2::uuid[]))
          OR (fa.assignee_type = 'role' AND fa.assignee_id = ANY($3::text[]))
          OR fs.created_by = $1
        )
      ORDER BY fs.created_at DESC
    `, [userId, orgIds.length ? orgIds : ['00000000-0000-0000-0000-000000000000'], roles.length ? roles : ['__none__']]);

    return rows.map(r => ({
      id: r.id,
      version: r.version,
      title: r.title,
      description: null,
      org_id: r.project_id,
      created_by: r.created_by,
      sharing: 'organization',
      fields: Array.isArray(r.fields?.fields) ? r.fields.fields : [],
      settings: {
        allow_draft: true,
        require_gps: true,
        gps_accuracy_threshold_m: 20,
      },
      geofence: r.geofence_id ? {
        id: r.geofence_id,
        form_id: r.id,
        name: r.geofence_name,
        type: r.geofence_type,
        geometry: r.geofence_geometry,
        enforcement: r.geofence_enforcement,
        buffer_meters: r.geofence_buffer_meters,
        radius_meters: r.geofence_radius_meters,
        active: r.geofence_active,
      } : null,
    }));
  });

  // ── POST /submissions/batch ──────────────────────────────────────
  fastify.post('/submissions/batch', auth, async (req, reply) => {
    const { submissions } = req.body;
    if (!Array.isArray(submissions) || submissions.length === 0) {
      return reply.code(400).send({ error: 'submissions array required' });
    }

    const results = [];
    for (const sub of submissions) {
      try {
        const syncedAt = new Date().toISOString();
        const geomPoint = sub.location
          ? `ST_SetSRID(ST_MakePoint(${sub.location.longitude}, ${sub.location.latitude}), 4326)`
          : 'NULL';

        await pool.query(`
          INSERT INTO features (
            id, form_schema_id, project_id, collected_by,
            geometry, properties, geofence_status, device_id, submitted_at, sync_status
          ) VALUES (
            $1, $2, (SELECT project_id FROM form_schemas WHERE id=$2),
            $3, ${sub.location ? geomPoint : 'NULL'}, $4, $5, $6, $7, 'synced'
          )
          ON CONFLICT (id) DO UPDATE SET
            properties = EXCLUDED.properties,
            geofence_status = EXCLUDED.geofence_status,
            sync_status = 'synced'
        `, [
          sub.id, sub.form_id, req.user.id,
          JSON.stringify(sub.answers),
          sub.geofence_status || 'not_applicable',
          sub.device_id || 'unknown',
          sub.submitted_at || syncedAt,
        ]);
        results.push({ id: sub.id, success: true, synced_at: syncedAt });
      } catch (err) {
        results.push({ id: sub.id, success: false, error: err.message });
      }
    }
    return { results };
  });

  // ── GET /auth/me (extended with org memberships) ─────────────────
  fastify.get('/auth/me/mobile', auth, async (req) => {
    const { rows: userRows } = await pool.query(
      'SELECT id, email, full_name, role, account_type, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    const user = userRows[0];
    if (!user) return { user: null, memberships: [] };

    const { rows: memRows } = await pool.query(`
      SELECT om.org_id, om.role, o.name AS org_name, o.slug AS org_slug
      FROM org_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = $1
    `, [req.user.id]);

    return {
      user: { ...user, account_type: user.account_type || 'individual' },
      memberships: memRows.map(m => ({
        org_id: m.org_id,
        org_name: m.org_name,
        org_slug: m.org_slug,
        role: m.role,
        joined_at: new Date().toISOString(),
      })),
    };
  });

  // ── POST /auth/register (extended for org) ───────────────────────
  // Handled in auth.js — we just add the org creation here as a hook
  fastify.post('/orgs/register', auth, async (req, reply) => {
    const { org_name } = req.body;
    if (!org_name) return reply.code(400).send({ error: 'org_name required' });
    const slug = org_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const { rows } = await pool.query(
        `INSERT INTO organizations (name, slug, owner_id) VALUES ($1, $2, $3) RETURNING *`,
        [org_name, slug, req.user.id]
      );
      await pool.query(
        `INSERT INTO org_members (org_id, user_id, role, invited_by) VALUES ($1, $2, 'admin', $2)`,
        [rows[0].id, req.user.id]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'Organization name taken' });
      throw err;
    }
  });

  // ── GET /orgs/:id/members ────────────────────────────────────────
  fastify.get('/orgs/:id/members', auth, async (req, reply) => {
    const { rows: check } = await pool.query(
      'SELECT role FROM org_members WHERE org_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!check[0]) return reply.code(403).send({ error: 'Not a member' });

    const { rows } = await pool.query(`
      SELECT om.user_id, om.role, om.joined_at, u.email, u.full_name
      FROM org_members om JOIN users u ON u.id = om.user_id
      WHERE om.org_id = $1 ORDER BY om.joined_at
    `, [req.params.id]);
    return rows;
  });

  // ── POST /orgs/:id/invite ────────────────────────────────────────
  fastify.post('/orgs/:id/invite', auth, async (req, reply) => {
    const { rows: check } = await pool.query(
      "SELECT role FROM org_members WHERE org_id=$1 AND user_id=$2 AND role='admin'",
      [req.params.id, req.user.id]
    );
    if (!check[0]) return reply.code(403).send({ error: 'Admin only' });

    const { email, role } = req.body;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO org_invitations (org_id, email, role, token, invited_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING`,
      [req.params.id, email, role, token, req.user.id, expiresAt]
    );

    // Send invite email if SMTP configured
    if (process.env.SMTP_HOST) {
      const { rows: orgRows } = await pool.query('SELECT name FROM organizations WHERE id=$1', [req.params.id]);
      const orgName = orgRows[0]?.name ?? 'GeoCollect';
      const inviteUrl = `${process.env.APP_URL || 'https://geocollect-field-app.onrender.com'}/invite?token=${token}`;
      try {
        await mailer().sendMail({
          from: process.env.SMTP_FROM || 'noreply@geocollect.app',
          to: email,
          subject: `You're invited to join ${orgName} on GeoCollect`,
          html: `<p>You've been invited to join <strong>${orgName}</strong> as a <strong>${role.replace('_',' ')}</strong>.</p>
                 <p><a href="${inviteUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accept Invitation</a></p>
                 <p>This link expires in 7 days.</p>`,
        });
      } catch (e) {
        console.warn('Email send failed:', e.message);
      }
    }
    return { message: 'Invite sent', token };
  });

  // ── POST /auth/accept-invite ─────────────────────────────────────
  fastify.post('/auth/accept-invite', auth, async (req, reply) => {
    const { token } = req.body;
    const { rows } = await pool.query(
      `SELECT * FROM org_invitations WHERE token=$1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [token]
    );
    if (!rows[0]) return reply.code(400).send({ error: 'Invalid or expired invitation' });
    const inv = rows[0];

    await pool.query(
      `INSERT INTO org_members (org_id, user_id, role, invited_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT (org_id, user_id) DO UPDATE SET role=EXCLUDED.role`,
      [inv.org_id, req.user.id, inv.role, inv.invited_by]
    );
    await pool.query(
      `UPDATE org_invitations SET accepted_at=NOW() WHERE id=$1`,
      [inv.id]
    );
    return { message: 'Joined organization', org_id: inv.org_id, role: inv.role };
  });

  // ── PATCH /orgs/:id/members/:userId ─────────────────────────────
  fastify.patch('/orgs/:id/members/:userId', auth, async (req, reply) => {
    const { rows: check } = await pool.query(
      "SELECT role FROM org_members WHERE org_id=$1 AND user_id=$2 AND role='admin'",
      [req.params.id, req.user.id]
    );
    if (!check[0]) return reply.code(403).send({ error: 'Admin only' });
    await pool.query(
      'UPDATE org_members SET role=$1 WHERE org_id=$2 AND user_id=$3',
      [req.body.role, req.params.id, req.params.userId]
    );
    return { message: 'Role updated' };
  });

  // ── DELETE /orgs/:id/members/:userId ────────────────────────────
  fastify.delete('/orgs/:id/members/:userId', auth, async (req, reply) => {
    const { rows: check } = await pool.query(
      "SELECT role FROM org_members WHERE org_id=$1 AND user_id=$2 AND role='admin'",
      [req.params.id, req.user.id]
    );
    if (!check[0]) return reply.code(403).send({ error: 'Admin only' });
    await pool.query(
      'DELETE FROM org_members WHERE org_id=$1 AND user_id=$2',
      [req.params.id, req.params.userId]
    );
    return { message: 'Member removed' };
  });

  // ── GET /orgs/:id/invitations ────────────────────────────────────
  fastify.get('/orgs/:id/invitations', auth, async (req, reply) => {
    const { rows: check } = await pool.query(
      "SELECT role FROM org_members WHERE org_id=$1 AND user_id=$2 AND role='admin'",
      [req.params.id, req.user.id]
    );
    if (!check[0]) return reply.code(403).send({ error: 'Admin only' });
    const { rows } = await pool.query(
      `SELECT id, email, role, expires_at, created_at FROM org_invitations
       WHERE org_id=$1 AND accepted_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    return rows;
  });
};
