const pool = require('../db/pool');

module.exports = async function (fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // GET /projects
  fastify.get('/projects', auth, async (req) => {
    const { rows } = await pool.query(`
      SELECT p.*, u.full_name as owner_name,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM form_schemas fs WHERE fs.project_id = p.id) as form_count
      FROM projects p
      LEFT JOIN users u ON u.id = p.owner_id
      WHERE p.owner_id = $1
         OR p.id IN (SELECT project_id FROM project_members WHERE user_id = $1)
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    return rows;
  });

  // POST /projects
  fastify.post('/projects', auth, async (req, reply) => {
    const { name, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1,$2,$3) RETURNING *',
      [name, description, req.user.id]
    );
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [rows[0].id, req.user.id, req.user.role]
    );
    return reply.code(201).send(rows[0]);
  });

  // GET /projects/:id
  fastify.get('/projects/:id', auth, async (req, reply) => {
    const { rows } = await pool.query(
      'SELECT p.*, u.full_name as owner_name FROM projects p LEFT JOIN users u ON u.id=p.owner_id WHERE p.id=$1',
      [req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' });
    const { rows: members } = await pool.query(
      'SELECT u.id, u.email, u.full_name, pm.role FROM project_members pm JOIN users u ON u.id=pm.user_id WHERE pm.project_id=$1',
      [req.params.id]
    );
    return { ...rows[0], members };
  });

  // PATCH /projects/:id
  fastify.patch('/projects/:id', auth, async (req, reply) => {
    const { name, description, status } = req.body;
    const { rows } = await pool.query(
      'UPDATE projects SET name=COALESCE($1,name), description=COALESCE($2,description), status=COALESCE($3,status), updated_at=NOW() WHERE id=$4 RETURNING *',
      [name, description, status, req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' });
    return rows[0];
  });

  // DELETE /projects/:id
  fastify.delete('/projects/:id', auth, async (req, reply) => {
    await pool.query('DELETE FROM projects WHERE id=$1 AND owner_id=$2', [req.params.id, req.user.id]);
    return reply.code(204).send();
  });

  // POST /projects/:id/members
  fastify.post('/projects/:id/members', auth, async (req, reply) => {
    const { user_id, role } = req.body;
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (project_id, user_id) DO UPDATE SET role=$3',
      [req.params.id, user_id, role]
    );
    return reply.code(201).send({ project_id: req.params.id, user_id, role });
  });
};
