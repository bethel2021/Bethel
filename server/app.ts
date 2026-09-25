import express, { Request, Response, NextFunction } from 'express';
import { isSupabaseConfigured, dataStore, initOrLoadData } from './dataStore.js';
import { getAuthContext } from './authHelper.js';
import {
  realtimeRouter,
  registerWebSocketClient,
  broadcastRealtimeState,
  getCurrentStatePayload
} from './routes/realtime.js';
import { authRouter } from './routes/auth.js';
import { attendanceRouter } from './routes/attendance.js';
import { classesRouter } from './routes/classes.js';
import { studentsRouter } from './routes/students.js';
import { teachersRouter } from './routes/teachers.js';
import { systemRouter } from './routes/system.js';

export {
  registerWebSocketClient,
  broadcastRealtimeState,
  getCurrentStatePayload,
  getAuthContext
};

const app = express();

// Enable JSON parsing
app.use(express.json());

// Enable CORS and cache controls for high-speed performance & consistency
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token, X-User-Role, X-Username');

  if (req.url.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/i) || req.url.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Standard path helper (removes any leading/trailing duplicate slashes)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.url.startsWith('/')) {
    req.url = '/' + req.url;
  }
  next();
});

// Ensure Supabase data is loaded on the very first request to avoid serving stale/empty data, then non-blocking thereafter
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (isSupabaseConfigured() && req.url.startsWith('/api')) {
    if (dataStore.getLastSupabaseFetchTime() === 0) {
      try {
        await dataStore.initOrLoadDataAsync();
      } catch (err) {
        console.warn('[Supabase DB Error] Initial blocking load failed:', err);
      }
    } else {
      dataStore.initOrLoadDataAsync().catch(() => {});
    }
  }
  next();
});

// Ensure data is loaded on cold-starts
initOrLoadData();

// Register sub-routers
const apiRouter = express.Router();
apiRouter.use(realtimeRouter);
apiRouter.use(systemRouter);
apiRouter.use(authRouter);
apiRouter.use(attendanceRouter);
apiRouter.use(classesRouter);
apiRouter.use(studentsRouter);
apiRouter.use(teachersRouter);

// Mount router on '/api'
app.use('/api', apiRouter);

// Fallback for unmatched /api routes (ensures JSON response, never HTML)
app.use('/api', (req: Request, res: Response) => {
  console.warn(`[Vercel Serverless Route 404]: No matching endpoint found for ${req.method} ${req.url}`);
  res.status(404).json({
    status: 'error',
    error: 'Endpoint not found',
    path: req.url,
    method: req.method,
    validEndpoints: [
      '/api/health',
      '/api/state',
      '/api/cloud-sync',
      '/api/sync-data',
      '/api/checkin',
      '/api/classes',
      '/api/students',
      '/api/teachers',
      '/api/config',
      '/api/ai/status',
      '/api/ai/generate'
    ]
  });
});

// Global error handling middleware (Prevents Vercel 500 FUNCTION_INVOCATION_FAILED and logs cleanly)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Server Error]:', {
    method: req.method,
    url: req.url,
    error: err?.message || String(err),
    stack: err?.stack ? err.stack.split('\n').slice(0, 3).join('\n') : undefined
  });
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    status: 'error',
    error: 'Internal Server Error',
    message: err?.message ? String(err.message) : 'Server processing exception',
    path: req.url,
    timestamp: new Date().toISOString()
  });
});

export default app;
