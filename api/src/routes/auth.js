const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

module.exports = async function (fastify) {
  // POST /auth/register
  fastify.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'full_name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          full_name: { type: 'string' },
          role: { type: 'string', enum: ['field_collector','project_manager','gis_analyst','platform_admin'] }
        }
      }
    }
  }, async (req, reply) => {
    const { email, password, full_name, role = 'field_collector' } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
      const { rows } = await pool.query(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1,$2,$3,$4) RETURNING id, email, full_name, role',
        [email, hash, full_name, role]
      );
      const token = fastify.jwt.sign({ id: rows[0].id, email: rows[0].email, role: rows[0].role }, { expiresIn: '7d' });
      return reply.code(201).send({ user: rows[0], token });
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ error: 'Email already registered' });
      throw err;
    }
  });

  // POST /auth/login
  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!rows[0]) return reply.code(401).send({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' });
    const token = fastify.jwt.sign(
      { id: rows[0].id, email: rows[0].email, role: rows[0].role },
      { expiresIn: '7d' }
    );
    return { user: { id: rows[0].id, email: rows[0].email, full_name: rows[0].full_name, role: rows[0].role }, token };
  });

  // GET /auth/me
  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, async (req) => {
    const { rows } = await pool.query('SELECT id, email, full_name, role, created_at FROM users WHERE id=$1', [req.user.id]);
    return rows[0];
  });
};
