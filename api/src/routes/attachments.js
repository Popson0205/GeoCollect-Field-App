// api/src/routes/attachments.js
// Media attachment upload/retrieval for feature records.
//
// POST /features/:featureId/attachments   — upload file (multipart)
// GET  /features/:featureId/attachments   — list attachments for a feature
// GET  /attachments/:id/url               — get fresh presigned download URL
// DELETE /attachments/:id                 — delete attachment + MinIO object

const { v4: uuid } = require('uuid');
const pool   = require('../db/pool');
const minio  = require('../lib/minio');

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
]);

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

module.exports = async function (fastify) {
  const auth = { preHandler: [fastify.authenticate] };

  // ── POST /features/:featureId/attachments ──────────────────────────────────
  fastify.post('/features/:featureId/attachments', {
    ...auth,
    config: { rawBody: true },
  }, async (req, reply) => {
    const { featureId } = req.params;

    // Verify feature exists
    const { rows: feat } = await pool.query(
      'SELECT id FROM features WHERE id = $1', [featureId]
    );
    if (!feat[0]) return reply.code(404).send({ error: 'Feature not found' });

    const parts = req.parts();
    const uploaded = [];

    for await (const part of parts) {
      if (part.type !== 'file') continue;

      const mimeType = part.mimetype;
      if (!ALLOWED_MIME.has(mimeType)) {
        return reply.code(415).send({ error: `Unsupported media type: ${mimeType}` });
      }

      // Buffer the file to check size (streaming to MinIO after)
      const chunks = [];
      let totalSize = 0;
      for await (const chunk of part.file) {
        totalSize += chunk.length;
        if (totalSize > MAX_SIZE_BYTES) {
          return reply.code(413).send({ error: 'File exceeds 50 MB limit' });
        }
        chunks.push(chunk);
      }

      const buffer   = Buffer.concat(chunks);
      const attachId = uuid();
      const ext      = part.filename?.split('.').pop() || 'bin';
      const fieldKey = part.fields?.field_key?.value || 'media';
      const objectKey = `features/${featureId}/${fieldKey}/${attachId}.${ext}`;

      const { Readable } = require('stream');
      const stream = Readable.from(buffer);
      await minio.upload(objectKey, stream, totalSize, mimeType);

      const { rows } = await pool.query(
        `INSERT INTO attachments
          (id, feature_id, field_key, object_key, original_name, mime_type, size_bytes, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [attachId, featureId, fieldKey, objectKey,
         part.filename, mimeType, totalSize, req.user.id]
      );

      const url = await minio.presignedUrl(objectKey);
      uploaded.push({ ...rows[0], url });
    }

    return reply.code(201).send({ uploaded, count: uploaded.length });
  });

  // ── GET /features/:featureId/attachments ───────────────────────────────────
  fastify.get('/features/:featureId/attachments', auth, async (req, reply) => {
    const { featureId } = req.params;
    const { rows } = await pool.query(
      `SELECT a.*, u.full_name as uploader_name
       FROM attachments a
       LEFT JOIN users u ON u.id = a.uploaded_by
       WHERE a.feature_id = $1
       ORDER BY a.uploaded_at ASC`,
      [featureId]
    );

    // Attach fresh presigned URLs
    const withUrls = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        url: await minio.presignedUrl(r.object_key),
      }))
    );

    return withUrls;
  });

  // ── GET /attachments/:id/url ───────────────────────────────────────────────
  fastify.get('/attachments/:id/url', auth, async (req, reply) => {
    const { rows } = await pool.query(
      'SELECT object_key FROM attachments WHERE id = $1', [req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Attachment not found' });
    const url = await minio.presignedUrl(rows[0].object_key);
    return { url, expires_in: '7 days' };
  });

  // ── DELETE /attachments/:id ────────────────────────────────────────────────
  fastify.delete('/attachments/:id', auth, async (req, reply) => {
    const { rows } = await pool.query(
      'SELECT * FROM attachments WHERE id = $1', [req.params.id]
    );
    if (!rows[0]) return reply.code(404).send({ error: 'Attachment not found' });

    // Remove from MinIO
    await minio.remove(rows[0].object_key).catch(() => {/* ignore if already gone */});

    await pool.query('DELETE FROM attachments WHERE id = $1', [req.params.id]);
    return reply.code(204).send();
  });
};
