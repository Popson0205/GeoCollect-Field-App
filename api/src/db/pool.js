const { Pool } = require('pg');

// Works with both Render Postgres and Neon:
// - Render: DATABASE_URL has ?ssl=true or we detect render.com
// - Neon:   DATABASE_URL has neon.tech — needs rejectUnauthorized:false
const isNeon = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech');
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: false }  // Works for both Render Postgres and Neon
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

module.exports = pool;
