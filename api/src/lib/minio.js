// api/src/lib/minio.js
// MinIO client wrapper — S3-compatible object storage for media attachments
// and scheduled export delivery.
//
// REPLACE existing api/src/lib/minio.js with this file.
// Changes from original:
//   - presignedUrl() now accepts an optional expirySeconds param
//     (defaults to 7 days — same as before, fully backward compatible)
//   - No other changes; bucket policy setup is preserved exactly

const Minio = require('minio');

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT     = parseInt(process.env.MINIO_PORT || '9000');
const MINIO_USE_SSL  = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS   = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET   = process.env.MINIO_SECRET_KEY || 'minioadmin';
const BUCKET         = process.env.MINIO_BUCKET || 'geocollect-media';

const client = new Minio.Client({
  endPoint:  MINIO_ENDPOINT,
  port:      MINIO_PORT,
  useSSL:    MINIO_USE_SSL,
  accessKey: MINIO_ACCESS,
  secretKey: MINIO_SECRET,
});

/** Ensure the media bucket exists (idempotent). */
async function ensureBucket() {
  const exists = await client.bucketExists(BUCKET);
  if (!exists) {
    await client.makeBucket(BUCKET, 'us-east-1');
    // Set public-read policy so presigned URLs work without extra auth
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect:    'Allow',
        Principal: { AWS: ['*'] },
        Action:    ['s3:GetObject'],
        Resource:  [`arn:aws:s3:::${BUCKET}/*`],
      }],
    });
    await client.setBucketPolicy(BUCKET, policy);
  }
}

/**
 * Upload a stream to MinIO.
 * @param {string} objectKey  — storage path, e.g. "features/uuid/photo_0.jpg"
 * @param {import('stream').Readable} stream
 * @param {number} size       — byte length
 * @param {string} mimeType
 */
async function upload(objectKey, stream, size, mimeType) {
  await ensureBucket();
  await client.putObject(BUCKET, objectKey, stream, size, { 'Content-Type': mimeType });
}

/**
 * Generate a presigned GET URL.
 * @param {string} objectKey
 * @param {number} [expirySeconds=604800]  — defaults to 7 days
 * @returns {Promise<string>}
 */
async function presignedUrl(objectKey, expirySeconds = 7 * 24 * 60 * 60) {
  return client.presignedGetObject(BUCKET, objectKey, expirySeconds);
}

/** Delete an object from MinIO. */
async function remove(objectKey) {
  await client.removeObject(BUCKET, objectKey);
}

module.exports = { client, upload, presignedUrl, remove, BUCKET };
