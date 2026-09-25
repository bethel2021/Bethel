import { Router, Request, Response } from 'express';
import {
  classes,
  students,
  records,
  systemConfig,
  adminAccounts,
  deletedRecordKeys,
  teachers,
  getActiveSundayDate,
  getSyncVersion,
  getLastModifiedTimestamp,
  onDataChange
} from '../dataStore.js';

export const realtimeRouter = Router();

const sseClients = new Set<Response>();
const wsClients = new Set<any>();
const pollWaiters = new Set<{ res: Response; timer: NodeJS.Timeout; clientVersion: number }>();

export function getCurrentStatePayload(eventType: string = 'state_update', extraData?: any) {
  const currentSunday = getActiveSundayDate();
  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
  systemConfig.hiddenClassIds = hiddenIds;

  return {
    type: eventType,
    syncVersion: getSyncVersion(),
    lastModified: getLastModifiedTimestamp(),
    config: {
      ...systemConfig,
      hiddenClassIds: hiddenIds
    },
    hiddenClassIds: hiddenIds,
    classes: classes.map(c => ({
      ...c,
      isHiddenFromHome: hiddenIds.includes(c.id)
    })),
    students,
    records,
    deletedRecordKeys: Array.from(deletedRecordKeys),
    teachers,
    accounts: adminAccounts.map(a => ({
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      role: a.role,
      assignedClassId: a.assignedClassId,
      createdAt: a.createdAt
    })),
    activeSunday: currentSunday,
    serverTime: new Date().toISOString(),
    extra: extraData
  };
}

export function broadcastRealtimeState(eventType: string = 'state_update', extraData?: any) {
  const payload = getCurrentStatePayload(eventType, extraData);
  const jsonString = JSON.stringify(payload);

  // 1. WebSocket Broadcast to all online clients (<20ms)
  for (const ws of Array.from(wsClients)) {
    if (ws && ws.readyState === 1 /* OPEN */) {
      try {
        ws.send(jsonString);
      } catch (err) {
        wsClients.delete(ws);
      }
    } else if (ws && ws.readyState > 1) {
      wsClients.delete(ws);
    }
  }

  // 2. Server-Sent Events (SSE) Broadcast (<20ms)
  for (const res of Array.from(sseClients)) {
    try {
      res.write(`event: update\ndata: ${jsonString}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
      if (res.socket) {
        res.socket.uncork();
      }
    } catch (err) {
      sseClients.delete(res);
    }
  }

  // 3. Resolve all pending Long-Polling clients instantly (<10ms)
  for (const waiter of Array.from(pollWaiters)) {
    clearTimeout(waiter.timer);
    try {
      waiter.res.json({
        changed: true,
        ...payload
      });
    } catch (err) {}
  }
  pollWaiters.clear();
}

// Automatically broadcast whenever server data changes
onDataChange((changeData) => {
  broadcastRealtimeState('data_change', changeData.extra);
});

export function registerWebSocketClient(ws: any) {
  wsClients.add(ws);

  // Instantly send current state upon connection
  try {
    const initialPayload = getCurrentStatePayload('ws_init');
    ws.send(JSON.stringify(initialPayload));
  } catch (err) {}

  ws.on('message', (message: any) => {
    try {
      const data = JSON.parse(message.toString());
      if (data && data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
      } else if (data && data.type === 'request_state') {
        ws.send(JSON.stringify(getCurrentStatePayload('state_response')));
      }
    } catch (err) {}
  });

  ws.on('close', () => {
    wsClients.delete(ws);
  });

  ws.on('error', () => {
    wsClients.delete(ws);
  });
}

// 1.1 Micro-Pulse Fast Version Check (<5ms execution)
realtimeRouter.get('/sync-version', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.json({
    syncVersion: getSyncVersion(),
    lastModified: getLastModifiedTimestamp(),
    recordsCount: records.length,
    activeSunday: getActiveSundayDate(),
    serverTime: Date.now()
  });
});

// 1.2 Real-time Server-Sent Events (SSE) Stream (<20ms ultra-low latency push)
realtimeRouter.get('/realtime-stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  sseClients.add(res);

  // Send initial full state immediately upon connection
  const initialData = JSON.stringify(getCurrentStatePayload('sse_init'));
  res.write(`event: initial\ndata: ${initialData}\n\n`);
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }
  if (res.socket) {
    res.socket.uncork();
  }

  // Adaptive keepalive ping: send heartbeat comment every 4 seconds to maintain active TCP socket
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
      if (res.socket) {
        res.socket.uncork();
      }
    } catch {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 4000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

// 1.3 Adaptive Real-time Long-Polling (Instantly resolves on mutation, or timeout)
realtimeRouter.get('/realtime-poll', async (req: Request, res: Response) => {
  const clientVersion = parseInt(req.query.version as string, 10) || 0;
  const timeoutMs = Math.min(Math.max(parseInt(req.query.timeout as string, 10) || 5000, 1000), 15000);
  const currentVer = getSyncVersion();

  // If server has newer data, respond immediately (<10ms)
  if (clientVersion !== currentVer && currentVer > 0) {
    return res.json({
      changed: true,
      ...getCurrentStatePayload('poll_immediate')
    });
  }

  // Otherwise, register long-poll waiter
  let waiter: any = null;
  const timer = setTimeout(() => {
    if (waiter) pollWaiters.delete(waiter);
    try {
      res.json({
        changed: false,
        syncVersion: getSyncVersion(),
        lastModified: getLastModifiedTimestamp(),
        recordsCount: records.length,
        serverTime: new Date().toISOString()
      });
    } catch {}
  }, timeoutMs);

  waiter = { res, timer, clientVersion };
  pollWaiters.add(waiter);

  req.on('close', () => {
    clearTimeout(timer);
    if (waiter) pollWaiters.delete(waiter);
  });
});
