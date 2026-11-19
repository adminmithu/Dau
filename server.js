/**
 * Nova Meet - Multi-Device Signaling & Static Server
 * Runs a lightweight HTTP server & WebSocket signaling gateway for WebRTC peers.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Rooms state for real-time SSE streaming
const roomClients = new Map(); // roomId => Set<http.ServerResponse>

// Create HTTP Server
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = parsedUrl.pathname;

  // Real-Time SSE Endpoint: GET /api/events?room=...
  if (reqPath === '/api/events') {
    const roomId = parsedUrl.searchParams.get('room') || 'default';
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    if (!roomClients.has(roomId)) {
      roomClients.set(roomId, new Set());
    }
    const clients = roomClients.get(roomId);
    clients.add(res);

    // Initial keepalive
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', roomId })}\n\n`);

    req.on('close', () => {
      clients.delete(res);
      if (clients.size === 0) roomClients.delete(roomId);
    });
    return;
  }

  // Real-Time Broadcast Endpoint: POST /api/broadcast
  if (reqPath === '/api/broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const roomId = payload.roomId || 'default';
        const clients = roomClients.get(roomId);
        if (clients) {
          const msg = `data: ${JSON.stringify(payload.data)}\n\n`;
          for (const client of clients) {
            try { client.write(msg); } catch (e) {}
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, deliveredTo: clients ? clients.size : 0 }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Static File Serving
  let filePathName = reqPath;
  if (filePathName === '/' || filePathName === '') filePathName = '/index.html';

  const filePath = path.join(PUBLIC_DIR, filePathName);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found - Nova Meet');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Helper to get local network IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('====================================================');
  console.log('🚀 Nova Meet Multi-Device Server is LIVE!');
  console.log(`💻 Local:   http://localhost:${PORT}`);
  console.log(`📱 Phone:   http://${localIP}:${PORT} (Connect from mobile on same Wi-Fi)`);
  console.log('====================================================');
});
