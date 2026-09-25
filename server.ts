import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import app, { registerWebSocketClient } from './server/app';
import { initOrLoadData } from './server/dataStore';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  console.log('[Server Startup] Initializing data store...');
  await initOrLoadData();
  console.log('[Server Startup] Data store initialized.');

  const server = http.createServer(app);

  // Initialize WebSocket server on /ws
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws: WebSocket) => {
    registerWebSocketClient(ws);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const possibleDistPaths = [
      path.join(process.cwd(), 'dist'),
      path.join(__dirname, 'dist'),
      path.join(__dirname, '../dist'),
      __dirname
    ];
    const distPath = possibleDistPaths.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!DOCTYPE html><html><body><h3>应用加载中...</h3><p>请稍候刷新页面。</p></body></html>');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Bethel Church Sunday School & Fellowship Attendance App (WebSocket & SSE Enabled) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
