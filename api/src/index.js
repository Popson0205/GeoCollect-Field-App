// api/src/index.js
require('dotenv').config();
const Fastify = require('fastify');

const app = Fastify({ logger: true });

// ── Plugins ───────────────────────────────────────────────────────────────────
app.register(require('@fastify/cors'), {
  origin: [
    'https://geocollect-portal.onrender.com',
    'https://geocollect-studio.onrender.com',
    'http://localhost:3000',
    'http://localhost:3004',
    /geocollect/,  // Mobile app deep links
  ],
  credentials: true,
});
app.register(require('./plugins/jwt'));
app.register(require('@fastify/multipart'));

// Phase 3: API key auth + rate limiting
app.register(require('./plugins/apiKeyAuth'));
app.register(require('@fastify/rate-limit'), {
  global: false,
  max: 60,
  timeWindow: '1 minute',
});

// ── Health / Root ─────────────────────────────────────────────────────────────
app.get('/', async () => ({
  status: 'ok',
  service: 'geocollect-api',
  ts: new Date().toISOString(),
}));

app.get('/health', async () => ({
  status: 'ok',
  service: 'geocollect-api',
  ts: new Date().toISOString(),
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.register(require('./routes/auth'));
app.register(require('./routes/projects'));
app.register(require('./routes/forms'));
app.register(require('./routes/features'));
app.register(require('./routes/attachments'));
app.register(require('./routes/portal'));
app.register(require('./routes/mobile'));  // Mobile app: orgs, assigned forms, batch submissions

// ── WebSocket (Yjs CRDT sync) ─────────────────────────────────────────────────
if (process.env.REDIS_URL) {
  require('./ws-server')(app);
} else {
  app.log.warn('REDIS_URL not set — WebSocket sync and BullMQ workers disabled.');
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  console.log(`GeoCollect API running on :${PORT}`);
});
