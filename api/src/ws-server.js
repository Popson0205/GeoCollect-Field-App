// api/src/ws-server.js
// GeoCollect WebSocket server — Yjs CRDT sync for feature layers.
//
// Each "room" is a project's feature layer: ws://host/sync/:projectId
// Uses y-websocket server utils so the Field app can connect with
// a standard y-websocket provider.
//
// Register in index.js:
//   require('./ws-server')(app);

const { setupWSConnection } = require('y-websocket/bin/utils');
const { WebSocketServer }   = require('ws');

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
module.exports = function setupYjsWebSocket(fastify) {
  // Attach after Fastify server is listening
  fastify.server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    // Only handle /sync/* paths
    if (!url.pathname.startsWith('/sync/')) return;

    // JWT auth check on upgrade
    const token = url.searchParams.get('token');
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      const jwt = require('@fastify/jwt');
      // Verify using the same secret as the REST API
      const payload = fastify.jwt.verify(token);
      request._user = payload;
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, req) => {
    const url      = new URL(req.url, `http://${req.headers.host}`);
    const roomName = url.pathname.replace('/sync/', ''); // e.g. "project-uuid"

    // setupWSConnection handles Yjs protocol, awareness, and persistence
    setupWSConnection(ws, req, {
      docName: roomName,
      gc: true, // garbage-collect deleted items
    });

    console.log(`[WS] Client connected to room: ${roomName} user: ${req._user?.email}`);
  });

  console.log('[WS] Yjs WebSocket server attached on /sync/*');
};
