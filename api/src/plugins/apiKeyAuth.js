// api/src/plugins/apiKeyAuth.js
// Middleware: validates GeoCollect API keys (Bearer gc_live_* tokens).
// Attaches req.apiKey and req.user (synthetic) on success.
// Rate limit: 1,000 requests/hour per key, tracked in Redis.

const fp = require('fastify-plugin');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = parseInt(process.env.API_KEY_RATE_LIMIT_PER_HOUR || '1000', 10);

module.exports = fp(async function (fastify) {
  fastify.decorate('authenticateApiKey', async function (request, reply) {
    const authHeader = request.headers['authorization'] || '';
    const queryKey = request.query?.api_key;
    const rawKey = authHeader.startsWith('Bearer gc_')
      ? authHeader.slice(7)
      : queryKey?.startsWith('gc_') ? queryKey : null;

    if (!rawKey) {
      return reply.code(401).send({ error: 'API key required' });
    }

    // Look up by prefix (first 16 chars) then verify hash
    const prefix = rawKey.slice(0, 16);
    const { rows } = await pool.query(
      `SELECT ak.*, u.id as user_id, u.email, u.role
       FROM api_keys ak
       JOIN users u ON u.id = ak.created_by
       WHERE ak.key_prefix = $1
         AND ak.revoked_at IS NULL
         AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [prefix]
    );

    if (!rows[0]) return reply.code(401).send({ error: 'Invalid or revoked API key' });

    const valid = await bcrypt.compare(rawKey, rows[0].key_hash);
    if (!valid) return reply.code(401).send({ error: 'Invalid API key' });

    // Redis rate limit check
    const redis = fastify.redis;
    if (redis) {
      const rateLimitKey = `ratelimit:apikey:${rows[0].id}`;
      const count = await redis.incr(rateLimitKey);
      if (count === 1) await redis.pexpire(rateLimitKey, RATE_LIMIT_WINDOW_MS);
      if (count > RATE_LIMIT_MAX) {
        return reply.code(429).send({ error: 'Rate limit exceeded. Max 1,000 requests/hour.' });
      }
    }

    // Update last_used_at (fire-and-forget)
    pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [rows[0].id]).catch(() => {});

    request.apiKey = rows[0];
    request.user = { id: rows[0].user_id, email: rows[0].email, role: rows[0].role };
  });

  // Combined: accepts either JWT or API key
  fastify.decorate('authenticateAny', async function (request, reply) {
    const hasBearer = (request.headers['authorization'] || '').startsWith('Bearer gc_');
    const hasApiKeyQuery = request.query?.api_key?.startsWith('gc_');

    if (hasBearer || hasApiKeyQuery) {
      return fastify.authenticateApiKey(request, reply);
    }
    // Fall back to JWT
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});
