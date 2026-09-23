import express, { Request, Response, NextFunction } from 'express';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig, AdminUser } from '../src/types.js';
import { calculateAge, initialSystemConfig, ServerAdminAccount } from './initialData.js';
import {
  classes,
  students,
  records,
  systemConfig,
  adminAccounts,
  activeSessions,
  activeSunday,
  getActiveSundayDate,
  getRomeTimeParts,
  saveDataToSupabase,
  saveDataToFile,
  initOrLoadData,
  initOrLoadDataAsync,
  verifySuperAdminPermission,
  setClasses,
  setStudents,
  setRecords,
  setSystemConfig,
  setAdminAccounts,
  generateHistoricalRecords,
  syncVersion,
  lastModifiedTimestamp,
  mergeClientData,
  onDataChange,
  teachers,
  deletedRecordKeys,
  addDeletedRecordKey,
  removeDeletedRecordKey,
  getFullStatePayload,
  isSupabaseConfigured,
  comparePassword,
  dataStore
} from './dataStore.js';
import { isGeminiConfigured, generateDevotionalOrSummary } from './geminiService.js';

const app = express();

// ==========================================
// Multi-Terminal Real-Time Synchronization Engine (WebSocket + SSE + Fast Long-Polling)
// ==========================================
const sseClients = new Set<Response>();
const wsClients = new Set<any>();
const pollWaiters = new Set<{ res: Response; timer: NodeJS.Timeout; clientVersion: number }>();

export function getCurrentStatePayload(eventType: string = 'state_update', extraData?: any) {
  const currentSunday = getActiveSundayDate();
  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
  systemConfig.hiddenClassIds = hiddenIds;

  return {
    type: eventType,
    syncVersion,
    lastModified: lastModifiedTimestamp,
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

  // 1. WebSocket Broadcast to all online clients (<50ms)
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

  // 2. Server-Sent Events (SSE) Broadcast (<50ms)
  for (const res of Array.from(sseClients)) {
    try {
      res.write(`event: update\ndata: ${jsonString}\n\n`);
    } catch (err) {
      sseClients.delete(res);
    }
  }

  // 3. Resolve all pending Long-Polling clients instantly (<50ms)
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

// Automatically broadcast whenever server data changes (from any endpoint or save)
onDataChange(() => {
  broadcastRealtimeState('data_change');
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
  // Ensure req.url has standard formatting
  if (!req.url.startsWith('/')) {
    req.url = '/' + req.url;
  }
  next();
});

// Ensure Supabase data is fully loaded on the very first request to avoid serving stale/empty data, then non-blocking thereafter
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

export function getAuthContext(req: Request): {
  isSuperAdmin: boolean;
  role?: string;
  username?: string;
  assignedClassId?: string;
} {
  const authHeader = req.headers['authorization'];
  const tokenHeader = req.headers['x-admin-token'] as string;
  const userRoleHeader = req.headers['x-user-role'] as string;
  const usernameHeader = req.headers['x-username'] as string;

  let token = tokenHeader;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token)!;
    const isSuper = session.role === 'superadmin' || session.username.toLowerCase() === 'admin';
    return {
      isSuperAdmin: isSuper,
      role: session.role,
      username: session.username,
      assignedClassId: session.assignedClassId
    };
  }

  if (usernameHeader) {
    const acc = adminAccounts.find(a => a.username.toLowerCase() === usernameHeader.toLowerCase());
    if (acc) {
      const isSuper = acc.role === 'superadmin' || acc.username.toLowerCase() === 'admin';
      return {
        isSuperAdmin: isSuper,
        role: acc.role,
        username: acc.username,
        assignedClassId: acc.assignedClassId
      };
    }
  }

  if (userRoleHeader === 'superadmin' || (usernameHeader && usernameHeader.toLowerCase() === 'admin')) {
    return { isSuperAdmin: true, role: 'superadmin', username: usernameHeader || 'admin' };
  }

  if (userRoleHeader === 'teacher' || userRoleHeader === 'fellowship_leader') {
    return {
      isSuperAdmin: false,
      role: userRoleHeader,
      username: usernameHeader
    };
  }

  return { isSuperAdmin: true };
}

const apiRouter = express.Router();

// 0. Health check endpoint (for Vercel & client status probing)
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-express',
    church: systemConfig.churchName,
    config: systemConfig,
    classesCount: classes.length,
    studentsCount: students.length,
    recordsCount: records.length,
    syncVersion,
    lastModified: lastModifiedTimestamp,
    supabaseConnected: isSupabaseConfigured(),
    database: isSupabaseConfigured() ? 'supabase-postgresql' : 'local-cache-migration',
    storageEngine: isSupabaseConfigured() ? 'Supabase PostgreSQL (Official Persistent Database)' : 'Local File (Migration & Offline Fallback)',
    isOfficialDatabase: isSupabaseConfigured(),
    geminiConnected: isGeminiConfigured(),
    serverTime: new Date().toISOString()
  });
});

// 0.1 AI Service endpoints (Strictly Server-Side: Browser -> Vercel/Node API -> Gemini API)
apiRouter.get('/ai/status', (req: Request, res: Response) => {
  res.json({
    configured: isGeminiConfigured(),
    model: 'gemini-3.8-flash',
    architecture: 'Server-Side API Proxy (Secure, Zero Client-side Key Exposure)'
  });
});

apiRouter.post('/ai/generate', async (req: Request, res: Response) => {
  const { prompt, context } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: '缺少有效的 prompt 生成需求参数' });
  }

  const result = await generateDevotionalOrSummary(prompt, context);
  if (!result.success) {
    return res.status(500).json(result);
  }
  return res.json(result);
});

// 1. Get entire app state
apiRouter.get('/state', async (req: Request, res: Response) => {
  await initOrLoadDataAsync(true);
  const auth = getAuthContext(req);
  const assignedClassId = !auth.isSuperAdmin ? auth.assignedClassId : undefined;

  const currentSunday = getActiveSundayDate();
  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
  systemConfig.hiddenClassIds = hiddenIds;

  let stateClasses = classes.map(c => ({
    ...c,
    isHiddenFromHome: hiddenIds.includes(c.id)
  }));
  let stateStudents = students;
  let stateRecords = records;

  if (assignedClassId) {
    stateClasses = stateClasses.filter(c => c.id === assignedClassId);
    stateStudents = students.filter(s => s.classId === assignedClassId);
    stateRecords = records.filter(r => r.classId === assignedClassId);
  }

  res.json({
    config: {
      ...systemConfig,
      hiddenClassIds: hiddenIds
    },
    hiddenClassIds: hiddenIds,
    classes: stateClasses,
    students: stateStudents,
    records: stateRecords,
    deletedRecordKeys: Array.from(deletedRecordKeys),
    teachers: dataStore.sortTeachersList(teachers),
    accounts: adminAccounts.map(a => ({
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      role: a.role,
      assignedClassId: a.assignedClassId,
      createdAt: a.createdAt
    })),
    activeSunday: currentSunday,
    syncVersion,
    lastModified: lastModifiedTimestamp,
    supabaseConnected: isSupabaseConfigured(),
    database: isSupabaseConfigured() ? 'supabase-postgresql' : 'local-cache-migration',
    storageEngine: isSupabaseConfigured() ? 'Supabase PostgreSQL (Official Persistent Database)' : 'Local File (Migration & Offline Fallback)',
    isOfficialDatabase: isSupabaseConfigured(),
    serverTime: new Date().toISOString(),
    runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-express'
  });
});

// Dedicated Resource GET Endpoints (100% backward-compatible with REST expectations)
apiRouter.get('/classes', async (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  const assignedClassId = !auth.isSuperAdmin ? auth.assignedClassId : undefined;
  const mapped = await dataStore.getClasses(assignedClassId);
  res.json({
    success: true,
    classes: mapped,
    data: mapped,
    count: mapped.length
  });
});

apiRouter.get('/classes/:id', async (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  const { id } = req.params;
  if (!auth.isSuperAdmin && auth.assignedClassId && id !== auth.assignedClassId) {
    return res.status(403).json({ error: '权限不足：无法访问非负责班级信息' });
  }
  const cls = await dataStore.getClassById(id);
  if (!cls) return res.status(404).json({ error: '班级不存在' });
  res.json({ success: true, class: cls, data: cls });
});

apiRouter.get('/students', async (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  const assignedClassId = !auth.isSuperAdmin ? auth.assignedClassId : undefined;
  const classId = req.query.classId as string | undefined;
  const filtered = await dataStore.getStudents(classId, assignedClassId);
  res.json({
    success: true,
    students: filtered,
    data: filtered,
    count: filtered.length
  });
});

apiRouter.get('/students/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const stu = await dataStore.getStudentById(id);
  if (!stu) return res.status(404).json({ error: '学员不存在' });
  res.json({ success: true, student: stu, data: stu });
});

apiRouter.get('/teachers', async (req: Request, res: Response) => {
  const classId = req.query.classId as string | undefined;
  const filtered = await dataStore.getTeachers(classId);
  res.json({
    success: true,
    teachers: filtered,
    data: filtered,
    count: filtered.length
  });
});

apiRouter.get('/teachers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const tch = await dataStore.getTeacherById(id);
  if (!tch) return res.status(404).json({ error: '教师不存在' });
  res.json({ success: true, teacher: tch, data: tch });
});

const getRecordsHandler = async (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  const assignedClassId = !auth.isSuperAdmin ? auth.assignedClassId : undefined;
  const date = (req.query.date as string) || undefined;
  const studentId = (req.query.studentId as string) || undefined;
  const classId = (req.query.classId as string) || undefined;
  const filtered = await dataStore.getAttendanceRecords({ date, studentId, classId }, assignedClassId);
  res.json({
    success: true,
    records: filtered,
    data: filtered,
    count: filtered.length,
    activeSunday: getActiveSundayDate()
  });
};

apiRouter.get('/records', getRecordsHandler);
apiRouter.get('/attendance', getRecordsHandler);
apiRouter.get('/attendance-records', getRecordsHandler);
apiRouter.get('/attendance_records', getRecordsHandler);

apiRouter.get('/config', async (req: Request, res: Response) => {
  const configPayload = await dataStore.getSystemConfig();
  res.json({
    success: true,
    config: configPayload,
    data: configPayload
  });
});

// 1.1 Cloud Multi-Device Sync endpoints
apiRouter.get('/cloud-sync', async (req: Request, res: Response) => {
  await initOrLoadDataAsync(true);
  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
  systemConfig.hiddenClassIds = hiddenIds;
  res.json({
    status: 'ok',
    syncVersion,
    lastModified: lastModifiedTimestamp,
    supabaseConnected: isSupabaseConfigured(),
    database: isSupabaseConfigured() ? 'supabase-postgresql' : 'local-cache-migration',
    storageEngine: isSupabaseConfigured() ? 'Supabase PostgreSQL (Official Persistent Database)' : 'Local File (Migration & Offline Fallback)',
    isOfficialDatabase: isSupabaseConfigured(),
    classes: classes.map(c => ({
      ...c,
      isHiddenFromHome: hiddenIds.includes(c.id)
    })),
    students,
    records,
    teachers,
    deletedRecordKeys: Array.from(deletedRecordKeys),
    config: systemConfig,
    activeSunday,
    serverTime: new Date().toISOString()
  });
});

apiRouter.post('/cloud-sync', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: '无效的同步数据格式' });
    }
    await dataStore.initOrLoadDataAsync(true);
    const merged = mergeClientData(payload);
    await saveDataToSupabase();
    res.json({
      success: true,
      message: '多设备终端云端数据已成功双向同步！',
      ...merged,
      supabaseConnected: isSupabaseConfigured(),
      database: isSupabaseConfigured() ? 'supabase-postgresql' : 'local-cache-migration',
      storageEngine: isSupabaseConfigured() ? 'Supabase PostgreSQL (Official Persistent Database)' : 'Local File (Migration & Offline Fallback)',
      isOfficialDatabase: isSupabaseConfigured(),
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1.2 Real-time Server-Sent Events (SSE) Stream (<50ms ultra-low latency push)
apiRouter.get('/realtime-stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
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

  // Send keep-alive comment every 15 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
});

// 1.3 High-frequency Real-time Long-Polling (Instantly resolves on mutation, or timeouts)
apiRouter.get('/realtime-poll', async (req: Request, res: Response) => {
  const clientVersion = parseInt(req.query.version as string, 10) || 0;
  const timeoutMs = Math.min(Math.max(parseInt(req.query.timeout as string, 10) || 20000, 1000), 30000);

  // If server has newer data, respond immediately (<10ms)
  if (clientVersion !== syncVersion && syncVersion > 0) {
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
        syncVersion,
        lastModified: lastModifiedTimestamp,
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

// 2. Admin Authentication Login
apiRouter.post('/login', async (req: Request, res: Response) => {
  try {
    await initOrLoadDataAsync(false);
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和登录密码' });
    }

    const trimmedUser = String(username).trim();
    const cleanPassword = String(password).trim();
    const targetAccount = adminAccounts.find(a => a.username.toLowerCase() === trimmedUser.toLowerCase());

    if (targetAccount) {
      const isMatch = comparePassword(cleanPassword, targetAccount.password) ||
        (targetAccount.role === 'superadmin' && comparePassword(cleanPassword, systemConfig.adminPassword || 'bethel2026'));

      if (isMatch) {
        const userSession: AdminUser = {
          username: targetAccount.username,
          displayName: targetAccount.displayName,
          role: targetAccount.role,
          assignedClassId: targetAccount.assignedClassId,
          token: `btl_session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        };
        activeSessions.set(userSession.token, userSession);
        return res.json({ success: true, user: userSession, message: `欢迎登录，${userSession.displayName}！` });
      }
      return res.status(401).json({ error: '密码错误，请核对后重试' });
    }

    // Generic match if user enters custom username with correct admin password
    if (comparePassword(cleanPassword, systemConfig.adminPassword || 'bethel2026')) {
      const userSession: AdminUser = {
        username: trimmedUser,
        displayName: `伯特利教会管理员 (${trimmedUser})`,
        role: 'superadmin',
        token: `btl_session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };
      activeSessions.set(userSession.token, userSession);
      return res.json({ success: true, user: userSession, message: '登录成功！' });
    }

    return res.status(401).json({ error: '账号不存在或密码错误，请核对后重试' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function isServerCheckinAllowed(now: Date = new Date()): { isAllowed: boolean; message?: string } {
  if (systemConfig.testMode) {
    return { isAllowed: true };
  }

  const romeTime = getRomeTimeParts(now);
  const isSunday = romeTime.dayOfWeek === 0;

  if (!isSunday) {
    return {
      isAllowed: false,
      message: '非主日签到开放时段，请等待下一个主日！（可联系管理员开启｛测试模式｝）'
    };
  }

  let startMinutes = 8 * 60 + 30; // 08:30
  let endMinutes = 12 * 60 + 30; // 12:30

  if (systemConfig.checkinStartTime) {
    const [sh, sm] = systemConfig.checkinStartTime.split(':').map(Number);
    if (!isNaN(sh) && !isNaN(sm)) {
      startMinutes = sh * 60 + sm;
    }
  }

  if (systemConfig.checkinEndTime) {
    const [eh, em] = systemConfig.checkinEndTime.split(':').map(Number);
    if (!isNaN(eh) && !isNaN(em)) {
      endMinutes = eh * 60 + em;
    }
  }

  const currentMinutes = romeTime.hour * 60 + romeTime.minute;

  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    return {
      isAllowed: false,
      message: '非主日签到开放时段，请等待下一个主日！（可联系管理员开启｛测试模式｝）'
    };
  }

  return { isAllowed: true };
}

// 3. Student / Member check-in (WeChat scan / mobile QR / quick attendance)
apiRouter.post('/checkin', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const check = isServerCheckinAllowed(now);
    if (!check.isAllowed) {
      return res.status(400).json({ error: check.message });
    }

    const { studentId, memoryVerseCompleted, offeringCompleted, notes = '' } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ error: '请选择或输入打卡学员姓名' });
    }

    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: '未在伯特利教会名册中找到该学员，请联系老师登记' });
    }

    const auth = getAuthContext(req);
    if (!auth.isSuperAdmin && auth.assignedClassId) {
      if (student.classId !== auth.assignedClassId) {
        return res.status(403).json({ error: '权限受限：您只能为您负责的班级学员进行打卡签到' });
      }
    }

    const targetDate = getActiveSundayDate();
    const existing = records.find(r => r.studentId === studentId && r.date === targetDate);
    if (existing) {
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        record: existing,
        student,
        message: `${student.name} 今天已经完成打卡啦！签到时间：${existing.timeStr}。`
      });
    }

    // Determine late status:
    // 1) If enableLateRule is true and exceeds lateThresholdTime (e.g. 09:30)
    // 2) Or if time exceeds the background set check-in end deadline (checkinEndTime, e.g. 12:30), still mark as 'late'
    const romeTime = getRomeTimeParts(now);
    const curTimeStr = romeTime.timeStr;
    
    let isLate = false;
    if (systemConfig.enableLateRule) {
      const [lateH, lateM] = (systemConfig.lateThresholdTime || '09:30').split(':').map(Number);
      if (romeTime.hour > lateH || (romeTime.hour === lateH && romeTime.minute > lateM)) {
        isLate = true;
      }
    }
    if (systemConfig.checkinEndTime) {
      const [endH, endM] = systemConfig.checkinEndTime.split(':').map(Number);
      if (!isNaN(endH) && !isNaN(endM)) {
        if (romeTime.hour > endH || (romeTime.hour === endH && romeTime.minute > endM)) {
          isLate = true;
        }
      }
    }
    const status: 'present' | 'late' = isLate ? 'late' : 'present';

    const verseCheck = memoryVerseCompleted !== undefined 
      ? Boolean(memoryVerseCompleted) 
      : systemConfig.defaultMemoryVerseChecked;
    const offCheck = offeringCompleted !== undefined 
      ? Boolean(offeringCompleted) 
      : systemConfig.defaultOfferingChecked;

    const newRecord: AttendanceRecord = {
      id: `rec-${targetDate}-${student.id}-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      date: targetDate,
      timestamp: now.toISOString(),
      timeStr: curTimeStr,
      status,
      method: 'wechat_scan',
      memoryVerseCompleted: systemConfig.enableMemoryVerseOption ? verseCheck : false,
      offeringCompleted: systemConfig.enableOfferingOption ? offCheck : false,
      notes: notes ? String(notes).trim() : undefined
    };

    await dataStore.saveAttendanceRecord(newRecord);

    res.json({
      success: true,
      record: newRecord,
      student,
      message: `🎉 签到成功！愿主赐福 ${student.name}，主日蒙恩！`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '打卡失败，请重试' });
  }
});

// 4. Manual checkin / excuse / absent
apiRouter.post('/manual-checkin', async (req: Request, res: Response) => {
  try {
    const check = isServerCheckinAllowed();
    if (!check.isAllowed) {
      return res.status(400).json({ error: check.message });
    }

    const { studentId, date, status, memoryVerseCompleted, offeringCompleted, notes } = req.body;
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: '学员不存在' });
    }

    const auth = getAuthContext(req);
    if (!auth.isSuperAdmin && auth.assignedClassId) {
      if (student.classId !== auth.assignedClassId) {
        return res.status(403).json({ error: '权限受限：您只能记录或修改您负责班级的考勤信息' });
      }
    }

    const targetDate = date || getActiveSundayDate();
    const studentDateKey = `${studentId}_${targetDate}`;
    const existingIdx = records.findIndex(r => r.studentId === studentId && r.date === targetDate);

    if (status === 'absent') {
      let removedRecId: string | undefined;
      if (existingIdx !== -1) {
        removedRecId = records[existingIdx]?.id;
      }
      await dataStore.deleteAttendanceRecord(studentId, targetDate, removedRecId);
      return res.json({ success: true, deletedKey: studentDateKey, message: '已标记为缺席/未签到' });
    }

    removeDeletedRecordKey(studentDateKey);

    const now = new Date();
    const romeTime = getRomeTimeParts(now);
    const timeStr = romeTime.timeStr;

    let finalStatus = status || 'present';
    if (finalStatus === 'present') {
      let isLate = false;
      if (systemConfig.enableLateRule) {
        const [lateH, lateM] = (systemConfig.lateThresholdTime || '09:30').split(':').map(Number);
        if (romeTime.hour > lateH || (romeTime.hour === lateH && romeTime.minute > lateM)) {
          isLate = true;
        }
      }
      if (systemConfig.checkinEndTime) {
        const [endH, endM] = systemConfig.checkinEndTime.split(':').map(Number);
        if (!isNaN(endH) && !isNaN(endM)) {
          if (romeTime.hour > endH || (romeTime.hour === endH && romeTime.minute > endM)) {
            isLate = true;
          }
        }
      }
      if (isLate) {
        finalStatus = 'late';
      }
    }

    if (existingIdx !== -1) {
      const updatedRecord = {
        ...records[existingIdx],
        status: finalStatus,
        memoryVerseCompleted: memoryVerseCompleted !== undefined ? memoryVerseCompleted : records[existingIdx].memoryVerseCompleted,
        offeringCompleted: offeringCompleted !== undefined ? offeringCompleted : records[existingIdx].offeringCompleted,
        notes: notes !== undefined ? notes : records[existingIdx].notes
      };
      await dataStore.saveAttendanceRecord(updatedRecord);
      return res.json({ success: true, record: updatedRecord, message: '考勤记录已更新' });
    }

    const record: AttendanceRecord = {
      id: `rec-${targetDate}-${student.id}-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      date: targetDate,
      timestamp: now.toISOString(),
      timeStr,
      status: finalStatus,
      method: 'manual_teacher',
      memoryVerseCompleted: memoryVerseCompleted !== undefined ? Boolean(memoryVerseCompleted) : systemConfig.defaultMemoryVerseChecked,
      offeringCompleted: offeringCompleted !== undefined ? Boolean(offeringCompleted) : systemConfig.defaultOfferingChecked,
      notes
    };
    await dataStore.saveAttendanceRecord(record);

    res.json({ success: true, record, message: '老师/同工登记成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '操作失败' });
  }
});

// 5. Batch Check-in
apiRouter.post('/batch-checkin', async (req: Request, res: Response) => {
  try {
    const check = isServerCheckinAllowed();
    if (!check.isAllowed) {
      return res.status(400).json({ error: check.message });
    }

    const { classId, date, status = 'present' } = req.body;
    const auth = getAuthContext(req);
    if (!auth.isSuperAdmin && auth.assignedClassId) {
      if (classId && classId !== 'all' && classId !== auth.assignedClassId) {
        return res.status(403).json({ error: '权限受限：您只能为您负责的班级进行批量打卡' });
      }
    }

    const targetDate = date || getActiveSundayDate();
    const now = new Date();
    const romeTime = getRomeTimeParts(now);
    const timeStr = romeTime.timeStr;

    let finalStatus = status;
    if (finalStatus === 'present') {
      let isLate = false;
      if (systemConfig.enableLateRule) {
        const [lateH, lateM] = (systemConfig.lateThresholdTime || '09:30').split(':').map(Number);
        if (romeTime.hour > lateH || (romeTime.hour === lateH && romeTime.minute > lateM)) {
          isLate = true;
        }
      }
      if (systemConfig.checkinEndTime) {
        const [endH, endM] = systemConfig.checkinEndTime.split(':').map(Number);
        if (!isNaN(endH) && !isNaN(endM)) {
          if (romeTime.hour > endH || (romeTime.hour === endH && romeTime.minute > endM)) {
            isLate = true;
          }
        }
      }
      if (isLate) {
        finalStatus = 'late';
      }
    }

    const effectiveClassId = (!auth.isSuperAdmin && auth.assignedClassId) ? auth.assignedClassId : classId;
    const targetStudents = effectiveClassId && effectiveClassId !== 'all'
      ? students.filter(s => s.classId === effectiveClassId)
      : students;

    let updatedCount = 0;
    targetStudents.forEach(stu => {
      removeDeletedRecordKey(`${stu.id}_${targetDate}`);
      const existingIdx = records.findIndex(r => r.studentId === stu.id && r.date === targetDate);
      if (existingIdx !== -1) {
        records[existingIdx].status = finalStatus;
      } else {
        records.push({
          id: `rec-${targetDate}-${stu.id}-${Date.now()}`,
          studentId: stu.id,
          studentName: stu.name,
          classId: stu.classId,
          date: targetDate,
          timestamp: now.toISOString(),
          timeStr,
          status: finalStatus,
          method: 'manual_teacher',
          memoryVerseCompleted: systemConfig.defaultMemoryVerseChecked,
          offeringCompleted: systemConfig.defaultOfferingChecked
        });
      }
      updatedCount++;
    });

    await saveDataToSupabase();

    res.json({ success: true, message: `已成功为 ${updatedCount} 位学员登记到校！` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Manage Classes (添加/修改班级) - 仅限总管理员
apiRouter.post('/classes', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    await initOrLoadDataAsync(false);

    const { id, name, ageRange, teacher, subjectTeacher, classroom, color, groupType, description, isHiddenFromHome } = req.body;
    if (!name) {
      return res.status(400).json({ error: '班级/团契名称为必填项' });
    }

    const idx = classes.findIndex(c => (id && c.id === id) || (name && c.name === name));
    if (idx !== -1) {
      const updatedClass: ClassGroup = {
        ...classes[idx],
        name,
        ageRange: ageRange !== undefined ? ageRange : classes[idx].ageRange,
        teacher: teacher !== undefined ? teacher : classes[idx].teacher,
        subjectTeacher: subjectTeacher !== undefined ? subjectTeacher : classes[idx].subjectTeacher,
        classroom: classroom !== undefined ? classroom : classes[idx].classroom,
        color: color !== undefined ? color : classes[idx].color,
        groupType: groupType !== undefined ? groupType : (classes[idx].groupType || 'sunday_school'),
        description: description !== undefined ? description : classes[idx].description,
        isHiddenFromHome: isHiddenFromHome !== undefined ? !!isHiddenFromHome : (classes[idx].isHiddenFromHome || false),
      };
      const saved = await dataStore.saveClass(updatedClass);
      systemConfig.hiddenClassIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
      await dataStore.saveSystemConfig(systemConfig);
      return res.json({ success: true, class: saved, classes, syncVersion, message: '班级信息修改成功' });
    }

    const newClass: ClassGroup = {
      id: (id && String(id).trim()) || `class-${Date.now().toString().slice(-6)}`,
      name,
      ageRange: ageRange || '自选年龄段',
      teacher: teacher || '班级负责人',
      subjectTeacher: subjectTeacher || '上课老师',
      classroom: classroom || '主堂教室',
      color: color || 'bg-amber-500',
      groupType: groupType || 'sunday_school',
      description: description || '',
      isHiddenFromHome: !!isHiddenFromHome,
    };
    const saved = await dataStore.saveClass(newClass);
    systemConfig.hiddenClassIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
    await dataStore.saveSystemConfig(systemConfig);
    res.json({ success: true, class: saved, classes, syncVersion, message: '成功新增班级/团契' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Class Home Visibility - 仅限总管理员
apiRouter.post('/classes/:id/visibility', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    const { id } = req.params;
    const { isHiddenFromHome, hiddenClassIds: clientHiddenIds } = req.body;

    // Use the optimized and atomic batch save in dataStore to avoid slow nested loops
    await dataStore.saveClassVisibility(id, !!isHiddenFromHome, clientHiddenIds);

    const updatedClass = classes.find(c => c.id === id);
    if (!updatedClass) {
      return res.status(404).json({ error: '未找到指定班级' });
    }

    res.json({
      success: true,
      class: updatedClass,
      classes,
      config: systemConfig,
      syncVersion,
      message: `班级【${updatedClass.name}】已成功设置为首页${isHiddenFromHome ? '隐藏' : '显示'}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Class - 仅限总管理员
apiRouter.delete('/classes/:id', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    const { id } = req.params;
    let idx = classes.findIndex(c => c.id === id);
    if (idx === -1) {
      idx = classes.findIndex(c => c.name === id);
    }

    if (idx !== -1) {
      const targetClass = classes[idx];
      const clsId = targetClass.id;
      const clsName = targetClass.name;
      const enrolledStudents = students.filter(s => s.classId === clsId);
      await dataStore.deleteClass(clsId);
      return res.json({ 
        success: true, 
        message: `班级【${clsName}】已成功删除${enrolledStudents.length > 0 ? `（同时清除了 ${enrolledStudents.length} 名在册学员档案）` : ''}` 
      });
    }
    res.status(404).json({ error: '班级不存在或已被删除' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Manage Students (添加/修改学员) - 仅限总管理员
apiRouter.post('/students', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    await initOrLoadDataAsync(false);

    let { id, name, gender, birthDate, age, classId, parentName, parentPhone, memberCode } = req.body;
    if (!name || !classId) {
      return res.status(400).json({ error: '姓名与所属班级/团契为必填项' });
    }

    if (!birthDate && age) {
      const year = new Date().getFullYear() - Number(age);
      birthDate = `${year}-06-01`;
    } else if (!birthDate) {
      birthDate = '2019-06-01';
    }

    const computedAge = calculateAge(birthDate, Number(age) || 7);

    const idx = students.findIndex(s => 
      (id && s.id === id) || 
      (memberCode && s.memberCode === memberCode) ||
      (name && s.name === name && (classId ? s.classId === classId : true))
    );
    if (idx !== -1) {
      const targetId = students[idx].id;
      const updatedStudent: Student = { 
        ...students[idx], 
        name, 
        gender: gender || students[idx].gender || 'boy', 
        birthDate,
        age: computedAge, 
        classId, 
        parentName: parentName || '', 
        parentPhone: parentPhone || '',
        memberCode: memberCode || students[idx].memberCode
      };
      // Also update studentName in historical records
      setRecords(records.map(r => r.studentId === targetId ? { ...r, studentName: name, classId } : r));
      const saved = await dataStore.saveStudent(updatedStudent);
      return res.json({ success: true, student: saved, students, syncVersion, message: '学员信息已更新' });
    }

    const nextCodeNum = students.length + 1;
    const studentId = (id && String(id).trim()) || `s-${Date.now().toString().slice(-6)}`;
    const newStudent: Student = {
      id: studentId,
      name,
      gender: gender || 'boy',
      birthDate,
      age: computedAge,
      classId,
      parentName: parentName || '',
      parentPhone: parentPhone || '',
      memberCode: memberCode || `BTL-${String(nextCodeNum).padStart(2, '0')}`,
      joinDate: new Date().toISOString().split('T')[0]
    };
    const saved = await dataStore.saveStudent(newStudent);
    res.json({ success: true, student: saved, students, syncVersion, message: '学员档案建立成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch Import Students - 仅限总管理员
apiRouter.post('/students/batch', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    await initOrLoadDataAsync(false);

    const { classId, namesText, defaultGender = 'boy', defaultBirthDate, defaultAge } = req.body;
    if (!classId || !namesText) {
      return res.status(400).json({ error: '请选择班级并输入学员姓名列表' });
    }

    let birthDate = defaultBirthDate;
    if (!birthDate) {
      const ageNum = Number(defaultAge) || 7;
      birthDate = `${new Date().getFullYear() - ageNum}-06-01`;
    }
    const computedAge = calculateAge(birthDate, Number(defaultAge) || 7);

    const rawNames = String(namesText)
      .split(/[\n,，\s]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (rawNames.length === 0) {
      return res.status(400).json({ error: '未识别到有效姓名' });
    }

    const added: Student[] = [];
    rawNames.forEach((name, i) => {
      const nextCodeNum = students.length + 1;
      const stu: Student = {
        id: `s-${Date.now().toString().slice(-5)}${i}`,
        name,
        gender: defaultGender,
        birthDate,
        age: computedAge,
        classId,
        parentName: '家长/联系人',
        parentPhone: '138****0000',
        memberCode: `BTL-${String(nextCodeNum).padStart(2, '0')}`,
        joinDate: new Date().toISOString().split('T')[0]
      };
      added.push(stu);
    });

    await dataStore.saveStudentsBatch(added);

    res.json({ success: true, count: added.length, students, syncVersion, message: `成功批量录入 ${added.length} 名学员，已自动推算年龄为 ${computedAge} 岁！` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student - 仅限总管理员
apiRouter.delete('/students/:id', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    await initOrLoadDataAsync(false);

    const { id } = req.params;
    let idx = students.findIndex(s => s.id === id);
    if (idx === -1) {
      idx = students.findIndex(s => s.memberCode === id || s.name === id);
    }
    if (idx !== -1) {
      const removed = students[idx];
      await dataStore.deleteStudent(removed.id);
      return res.json({ success: true, students, syncVersion, message: `学员【${removed.name}】已成功从名册中彻底删除！` });
    }
    res.status(404).json({ error: '学员不存在或已被删除' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7.1 Manage Teachers (添加/修改/删除教师资料) - 仅限总管理员
apiRouter.post('/teachers', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    const { id, name, gender, phone, wechat, classId, roleTitle, joinDate, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: '教师姓名均为必填项' });
    }

    const cleanName = String(name).trim().replace(/\s*老师$/, '');
    const teacherId = (id && String(id).trim()) || `t-${Date.now().toString().slice(-6)}`;

    const savedTeacher = await dataStore.saveTeacher({
      id: teacherId,
      name: cleanName,
      gender: gender || 'boy',
      phone: phone || '',
      wechat: wechat || '',
      classId: classId || '',
      roleTitle: roleTitle || '班主任',
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      notes: notes || ''
    });

    // Broadcast real-time update
    broadcastRealtimeState('teachers_updated');
    return res.json({ success: true, teacher: savedTeacher, teachers, syncVersion, message: '教师资料已成功保存' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/teachers/:id', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    const { id } = req.params;
    const removed = await dataStore.deleteTeacher(id);
    if (!removed) {
      return res.status(404).json({ error: '未找到该教师资料' });
    }

    // Broadcast real-time update
    broadcastRealtimeState('teachers_updated');
    return res.json({ success: true, teachers, syncVersion, message: `教师【${removed.name}】已成功从名册中彻底删除！` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Update System Config & Default Options - 仅限总管理员
apiRouter.post('/config', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    const updates = req.body;
    await dataStore.saveSystemConfig(updates);
    res.json({ success: true, config: systemConfig, message: '系统设置与默认选项已成功保存！' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Reset data with default dataset - 仅限总管理员
apiRouter.post('/reset-data', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message });
    }

    setSystemConfig({
      ...initialSystemConfig,
      churchName: '伯特利教会',
      schoolTitle: '主日学与团契IMS',
    });
    generateHistoricalRecords();
    await dataStore.resetAllData(getFullStatePayload());
    res.json({ success: true, message: '已重置为伯特利教会主日学与团契官方示范数据' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Account Management - 仅限总管理员
apiRouter.get('/accounts', async (req: Request, res: Response) => {
  try {
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || '仅总管理员有权限管理后台账号' });
    }

    const accs = await dataStore.getAdminAccounts();

    res.json({
      success: true,
      accounts: accs.map(a => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        assignedClassId: a.assignedClassId,
        createdAt: a.createdAt
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/accounts', async (req: Request, res: Response) => {
  try {
    await initOrLoadDataAsync(true);
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || '仅总管理员有权限添加或修改账号' });
    }

    const { username, displayName, role, password, assignedClassId } = req.body;
    if (!username || !displayName) {
      return res.status(400).json({ error: '用户名和显示称谓不能为空' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanDisplayName = String(displayName).trim();
    const cleanRole = (role === 'superadmin' || role === 'teacher' || role === 'fellowship_leader') 
      ? role 
      : 'teacher';
    const cleanAssignedClassId = cleanRole === 'superadmin' ? undefined : (assignedClassId ? String(assignedClassId).trim() : undefined);

    const existingIndex = adminAccounts.findIndex(a => a.username.toLowerCase() === cleanUsername);

    if (existingIndex >= 0) {
      const existing = adminAccounts[existingIndex];
      const finalRole = cleanUsername === 'admin' ? 'superadmin' : cleanRole;
      
      adminAccounts[existingIndex] = {
        ...existing,
        displayName: cleanDisplayName,
        role: finalRole,
        assignedClassId: finalRole === 'superadmin' ? undefined : cleanAssignedClassId,
        password: password ? String(password).trim() : existing.password
      };

      if (cleanUsername === 'admin' && password) {
        systemConfig.adminPassword = String(password).trim();
      }

      await dataStore.saveAdminAccount(adminAccounts[existingIndex]);
      broadcastRealtimeState('accounts_updated');

      return res.json({
        success: true,
        message: `账号【${cleanUsername}】信息已成功更新！`,
        accounts: adminAccounts.map(a => ({
          id: a.id,
          username: a.username,
          displayName: a.displayName,
          role: a.role,
          assignedClassId: a.assignedClassId,
          createdAt: a.createdAt
        }))
      });
    } else {
      if (!password || String(password).trim().length < 4) {
        return res.status(400).json({ error: '新建账号密码不能为空且不少于4位字符' });
      }

      const newAccount: ServerAdminAccount = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username: cleanUsername,
        displayName: cleanDisplayName,
        role: cleanRole,
        assignedClassId: cleanRole === 'superadmin' ? undefined : cleanAssignedClassId,
        password: String(password).trim(),
        createdAt: new Date().toISOString().split('T')[0]
      };

      await dataStore.saveAdminAccount(newAccount);
      broadcastRealtimeState('accounts_updated');

      return res.json({
        success: true,
        message: `新账号【${cleanUsername}】已成功创建！`,
        accounts: adminAccounts.map(a => ({
          id: a.id,
          username: a.username,
          displayName: a.displayName,
          role: a.role,
          assignedClassId: a.assignedClassId,
          createdAt: a.createdAt
        }))
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/accounts/password', async (req: Request, res: Response) => {
  try {
    await initOrLoadDataAsync(true);
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || '仅总管理员有权限修改账号密码' });
    }

    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
      return res.status(400).json({ error: '请提供用户名和新密码' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(newPassword).trim();
    if (cleanPassword.length < 4) {
      return res.status(400).json({ error: '新密码长度至少需要4个字符' });
    }

    const target = adminAccounts.find(a => a.username.toLowerCase() === cleanUsername);
    if (!target) {
      return res.status(404).json({ error: `未找到账号【${username}】` });
    }

    await dataStore.updateAccountPassword(cleanUsername, cleanPassword);
    broadcastRealtimeState('accounts_updated');

    res.json({
      success: true,
      message: `账号【${target.displayName}】密码已成功修改！`,
      accounts: adminAccounts.map(a => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        assignedClassId: a.assignedClassId,
        createdAt: a.createdAt
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/accounts/:username', async (req: Request, res: Response) => {
  try {
    await initOrLoadDataAsync(true);
    const auth = verifySuperAdminPermission(req);
    if (!auth.allowed) {
      return res.status(403).json({ error: auth.message || '仅总管理员有权限删除账号' });
    }

    const username = String(req.params.username).trim().toLowerCase();
    if (username === 'admin') {
      return res.status(400).json({ error: '禁止删除系统根总管理员账号（admin）' });
    }

    const deleted = await dataStore.deleteAdminAccount(username);
    if (!deleted) {
      return res.status(404).json({ error: `未找到账号【${username}】` });
    }
    broadcastRealtimeState('accounts_updated');

    res.json({
      success: true,
      message: `账号【${deleted.displayName} (${deleted.username})】已成功删除！`,
      accounts: adminAccounts.map(a => ({
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        role: a.role,
        assignedClassId: a.assignedClassId,
        createdAt: a.createdAt
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Bi-directional Sync API (Allows client to seed cloud serverless state from local cache or vice versa)
apiRouter.post('/sync-data', async (req: Request, res: Response) => {
  try {
    await dataStore.initOrLoadDataAsync(true);
    const result = mergeClientData(req.body);
    await saveDataToSupabase();
    res.json({
      success: true,
      message: '云端动态服务数据已同步完成！',
      supabaseConnected: isSupabaseConfigured(),
      database: isSupabaseConfigured() ? 'supabase-postgresql' : 'local-cache-migration',
      storageEngine: isSupabaseConfigured() ? 'Supabase PostgreSQL (Official Persistent Database)' : 'Local File (Migration & Offline Fallback)',
      isOfficialDatabase: isSupabaseConfigured(),
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
    validEndpoints: ['/api/health', '/api/state', '/api/cloud-sync', '/api/sync-data', '/api/checkin', '/api/classes', '/api/students', '/api/teachers', '/api/config', '/api/ai/status', '/api/ai/generate']
  });
});

// Global error handling middleware (Prevents Vercel 500 FUNCTION_INVOCATION_FAILED and logs cleanly)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Vercel Serverless API Error]:', {
    method: req.method,
    url: req.url,
    error: err?.message || String(err),
    stack: err?.stack ? err.stack.split('\n').slice(0, 3).join('\n') : undefined
  });
  if (res.headersSent) {
    return next(err);
  }
  // Safe client response (no sensitive keys or environment variables leaked)
  res.status(500).json({
    status: 'error',
    error: 'Internal Server Error',
    message: err?.message ? String(err.message) : 'Server processing exception',
    path: req.url,
    timestamp: new Date().toISOString()
  });
});

export default app;
