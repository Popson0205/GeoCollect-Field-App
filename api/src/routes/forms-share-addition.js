// api/src/routes/forms-share-addition.js
// ADD THIS BLOCK to the existing forms.js route file.
// Public share endpoint — no auth required.
// Rate-limited to 60 req/min per IP via @fastify/rate-limit.

// ── GET /forms/share/:token ────────────────────────────────────────────────
// fastify.get('/forms/share/:token', async (req, reply) => {
//   const { rows } = await pool.query(
//     `SELECT fs.*,
//             COALESCE(json_agg(
//               json_build_object(
//                 'id', f.id,
//                 'geometry', ST_AsGeoJSON(f.geometry)::json,
//                 'attributes', f.attributes,
//                 'created_at', f.created_at
//               )
//             ) FILTER (WHERE f.id IS NOT NULL), '[]') AS features
//      FROM form_schemas fs
//      LEFT JOIN features f ON f.form_schema_id = fs.id
//      WHERE fs.share_token = $1
//        AND fs.visibility IN ('public', 'organization')
//      GROUP BY fs.id`,
//     [req.params.token]
//   );
//   if (!rows[0]) return reply.code(404).send({ error: 'Share link not found or expired' });
//   return normaliseForm(rows[0]);
// });

// NOTE: Uncomment and paste into forms.js inside the module.exports async function.
// Ensure @fastify/rate-limit is registered in index.js before this route.
