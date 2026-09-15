import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { getLocalIpAddress } from './utils/lan.js';
import { setupWebSocket } from './websocket/wsHandler.js';
import { roomManager } from './room/RoomManager.js';
import { LanInfo } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

const app = express();
app.use(cors());
app.use(express.json());

// Determine path to built client files
const clientDistCandidates = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../../../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist')
];
const clientDistPath = clientDistCandidates.find((p) => fs.existsSync(p)) || clientDistCandidates[0];
const hasClientDist = fs.existsSync(clientDistPath);

const localIp = getLocalIpAddress();

// API endpoint for frontend to discover the host's LAN URL for QR code generation
app.get('/api/lan-info', (_req, res) => {
  const lanInfo: LanInfo = {
    localUrl: `http://localhost:${PORT}`,
    lanUrl: `http://${localIp}:${PORT}`,
    ip: localIp,
    port: PORT
  };
  res.json(lanInfo);
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    rooms: roomManager.getRoomCount(),
    timestamp: Date.now()
  });
});

// Serve built React client if available
if (hasClientDist) {
  console.log(`[HTTP] Serving client build from ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  console.log('[HTTP] Client build not found. Running in API-only / development mode.');
  app.get('/', (_req, res) => {
    res.send(`
      <div style="font-family: system-ui; padding: 2rem; background: #0b0c10; color: #fff; min-height: 100vh;">
        <h1>🕵️ LAN Mafia Backend Running</h1>
        <p>Listening on <code>0.0.0.0:${PORT}</code></p>
        <p>Local: <code>http://localhost:${PORT}</code></p>
        <p>LAN: <code>http://${localIp}:${PORT}</code></p>
        <p style="color: #888;">To serve the web UI, run <code>npm run build:client</code> or use the Vite dev server.</p>
      </div>
    `);
  });
}

// Create HTTP server & WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

setupWebSocket(wss);

// Periodic cleanup of stale abandoned rooms
setInterval(() => {
  roomManager.cleanupStaleRooms();
}, 60000);

server.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}`;
  const lanUrl = `http://${localIp}:${PORT}`;

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║               🕵️  LAN MAFIA SERVER IS READY                   ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  Local:  ${localUrl.padEnd(52)} ║`);
  console.log(`║  LAN:    ${lanUrl.padEnd(52)} ║`);
  console.log('║                                                               ║');
  console.log('║  • Connect phones to the same Wi-Fi network                   ║');
  console.log('║  • No internet connection required                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
});
