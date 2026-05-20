// server.js — ensures Next.js standalone uses Render's $PORT
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = '0.0.0.0';
require('./.next/standalone/server.js');
