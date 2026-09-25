import { Router, Request, Response } from 'express';
import { initialSystemConfig } from '../initialData.js';
import {
  classes,
  students,
  records,
  systemConfig,
  adminAccounts,
  deletedRecordKeys,
  teachers,
  syncVersion,
  lastModifiedTimestamp,
  activeSunday,
  getActiveSundayDate,
  getSyncVersion,
  saveDataToSupabase,
  initOrLoadDataAsync,
  verifySuperAdminPermission,
  setSystemConfig,
  generateHistoricalRecords,
  mergeClientData,
  notifyDataChange,
  scheduleSupabaseSnapshotSave,
  getFullStatePayload,
  isSupabaseConfigured,
  dataStore
} from '../dataStore.js';
import { isGeminiConfigured, generateDevotionalOrSummary } from '../geminiService.js';
import { getAuthContext } from '../authHelper.js';

export const systemRouter = Router();

// 0. Health check endpoint
systemRouter.get('/health', (req: Request, res: Response) => {
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

// 0.1 AI Service endpoints
systemRouter.get('/ai/status', (req: Request, res: Response) => {
  res.json({
    configured: isGeminiConfigured(),
    model: 'gemini-3.8-flash',
    architecture: 'Server-Side API Proxy (Secure, Zero Client-side Key Exposure)'
  });
});

systemRouter.post('/ai/generate', async (req: Request, res: Response) => {
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
systemRouter.get('/state', async (req: Request, res: Response) => {
  await initOrLoadDataAsync(false);
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

// System Config GET & POST
systemRouter.get('/config', async (req: Request, res: Response) => {
  const configPayload = await dataStore.getSystemConfig();
  res.json({
    success: true,
    config: configPayload,
    data: configPayload
  });
});

systemRouter.post('/config', async (req: Request, res: Response) => {
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

// 1.1 Cloud Multi-Device Sync endpoints
systemRouter.get('/cloud-sync', async (req: Request, res: Response) => {
  await initOrLoadDataAsync(true);
  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true || String(c.isHiddenFromHome) === 'true').map(c => c.id);
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
      isHiddenFromHome: c.isHiddenFromHome === true || String(c.isHiddenFromHome) === 'true' || hiddenIds.includes(c.id)
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

systemRouter.post('/cloud-sync', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: '无效的同步数据格式' });
    }
    await dataStore.initOrLoadDataAsync(false);
    const merged = mergeClientData(payload);
    notifyDataChange();
    scheduleSupabaseSnapshotSave(2000);
    res.json({
      success: true,
      message: '多设备终端云端数据已成功双向同步！',
      ...merged,
      syncVersion: getSyncVersion(),
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

// 9. Reset data with default dataset (Superadmin only)
systemRouter.post('/reset-data', async (req: Request, res: Response) => {
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

// 11. Bi-directional Sync API
systemRouter.post('/sync-data', async (req: Request, res: Response) => {
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
