// server.js — Render start script for Next.js standalone
// Standalone server reads process.env.PORT automatically.
// This wrapper ensures the correct path is used.
const path = require('path');
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = '0.0.0.0';

// Load the standalone server
require(path.join(__dirname, '.next', 'standalone', 'server.js'));
