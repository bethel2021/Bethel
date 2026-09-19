import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Request } from 'express';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig, AdminUser } from '../src/types';
import { initialClasses, initialStudents, initialSystemConfig, initialAdminAccounts, ServerAdminAccount } from './initialData';

// Active in-memory state (Using const to ensure stable reference bindings across ES modules & CommonJS bundles)
export const classes: ClassGroup[] = [...initialClasses];
export const students: Student[] = [...initialStudents];
export const records: AttendanceRecord[] = [];
export const systemConfig: SystemConfig = { ...initialSystemConfig };
export const adminAccounts: ServerAdminAccount[] = [...initialAdminAccounts];
export const activeSessions = new Map<string, AdminUser>();
export const teachers: any[] = [];
export let syncVersion = 1;
export let lastModifiedTimestamp = new Date().toISOString();

export function getRomeTimeParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const fullTimeStr = `${timeStr}:${String(second).padStart(2, '0')}`;
  const dayOfWeek = new Date(`${dateStr}T12:00:00Z`).getUTCDay();

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    timeStr,
    fullTimeStr,
    dayOfWeek
  };
}

export function getActiveSundayDate(): string {
  const rome = getRomeTimeParts();
  if (rome.dayOfWeek === 0) {
    return rome.dateStr;
  }
  const daysUntilNextSunday = 7 - rome.dayOfWeek;
  const targetDateObj = new Date(`${rome.dateStr}T12:00:00Z`);
  targetDateObj.setUTCDate(targetDateObj.getUTCDate() + daysUntilNextSunday);
  const y = targetDateObj.getUTCFullYear();
  const m = String(targetDateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(targetDateObj.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export let activeSunday = getActiveSundayDate();

// Safe storage path detection (Vercel Serverless Function filesystem vs Local Node)
function getStoragePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), 'church-data.json');
  }
  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, 'church-data.json');
  } catch {
    return path.join(os.tmpdir(), 'church-data.json');
  }
}

function getHiddenClassStoragePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), 'bethel-hidden-classes.json');
  }
  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, 'hidden-classes.json');
  } catch {
    return path.join(os.tmpdir(), 'bethel-hidden-classes.json');
  }
}

// Vercel KV / Upstash Redis Persistent Cloud Database Sync (Zero-config on Vercel)
async function saveToCloudKV(payload: any) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;

  try {
    const rawUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    await fetch(`${rawUrl}/set/bethel_church_data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(JSON.stringify(payload)),
      signal: AbortSignal.timeout(2000)
    });
  } catch (err) {
    console.warn('[Cloud KV Warning] Could not persist to Upstash/Vercel KV:', err);
  }
}

async function loadFromCloudKV(): Promise<any | null> {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const rawUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const res = await fetch(`${rawUrl}/get/bethel_church_data`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      const json: any = await res.json();
      if (json && json.result) {
        return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
      }
    }
  } catch (err) {
    console.warn('[Cloud KV Warning] Could not load from Upstash/Vercel KV:', err);
  }
  return null;
}

type DataChangeListener = (data: {
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  config: SystemConfig;
  adminAccounts: ServerAdminAccount[];
  activeSunday: string;
  syncVersion: number;
  lastModifiedTimestamp: string;
  teachers?: any[];
}) => void;

const changeListeners = new Set<DataChangeListener>();

export function onDataChange(listener: DataChangeListener): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

export function saveDataToFile() {
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
  systemConfig.hiddenClassIds = hiddenIds;
  classes.forEach(c => {
    c.isHiddenFromHome = hiddenIds.includes(c.id);
  });

  const updatedConfig = {
    ...systemConfig,
    hiddenClassIds: hiddenIds
  };
  Object.keys(systemConfig).forEach(key => delete (systemConfig as any)[key]);
  Object.assign(systemConfig, updatedConfig);

  const payload = {
    systemConfig,
    classes,
    students,
    records,
    adminAccounts,
    activeSunday,
    syncVersion,
    hiddenClassIds: hiddenIds,
    teachers,
    updatedAt: lastModifiedTimestamp
  };

  try {
    const filePath = getStoragePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    // Also persist dedicated hidden classes file for fast fallback
    const hiddenPath = getHiddenClassStoragePath();
    fs.writeFileSync(hiddenPath, JSON.stringify(hiddenIds, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Storage Notice] Could not write to disk cache (normal in read-only serverless environment):', err);
  }

  // Notify all real-time listeners (WebSocket, SSE, Long-polling)
  for (const listener of changeListeners) {
    try {
      listener({
        classes,
        students,
        records,
        config: systemConfig,
        adminAccounts,
        activeSunday,
        syncVersion,
        lastModifiedTimestamp,
        teachers
      });
    } catch (err) {
      console.warn('[Realtime Sync Error] Listener callback failed:', err);
    }
  }

  // Also persist to Vercel KV / Upstash Redis if configured
  saveToCloudKV(payload).catch(() => {});
}

export function generateHistoricalRecords() {
  records.length = 0;
  const pastSundays = [
    '2026-06-07', '2026-06-14', '2026-06-21', '2026-06-28',
    '2026-07-05', '2026-07-12', '2026-07-19', '2026-07-26',
    '2026-08-02', '2026-08-09', '2026-08-16', '2026-08-23', '2026-08-30',
    '2026-09-06'
  ];

  pastSundays.forEach((sundayDate, sIdx) => {
    students.forEach((student, stuIdx) => {
      const seed = (sIdx * 19 + stuIdx * 13) % 100;
      let status: 'present' | 'late' | 'excused' | 'absent' = 'present';
      let memoryVerse = true;

      if (seed < 4) {
        status = 'absent';
        memoryVerse = false;
      } else if (seed < 10) {
        status = 'excused';
        memoryVerse = false;
      } else if (seed < 18) {
        status = 'late';
        memoryVerse = seed % 2 === 0;
      } else {
        status = 'present';
        memoryVerse = seed > 20;
      }

      if (status !== 'absent') {
        const hour = status === 'late' ? 9 : 8;
        const minute = status === 'late' ? 35 + (seed % 20) : 45 + (seed % 14);
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        records.push({
          id: `rec-${sundayDate}-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          classId: student.classId,
          date: sundayDate,
          timestamp: `${sundayDate}T${timeStr}:00.000Z`,
          timeStr,
          status,
          method: 'attendance',
          memoryVerseCompleted: memoryVerse,
          offeringCompleted: false,
          notes: status === 'excused' ? '外出事由请假' : undefined
        });
      }
    });
  });
}

let isInitialized = false;

function sanitizeYageData() {
  const filteredClasses = classes.filter(c => c.id !== 'class-8' && c.name !== '雅歌团契');
  classes.length = 0;
  classes.push(...filteredClasses);

  const filteredStudents = students.filter(s => s.classId !== 'class-8' && s.id !== 's-801' && s.id !== 's-802');
  students.length = 0;
  students.push(...filteredStudents);

  const filteredRecords = records.filter(r => r.classId !== 'class-8' && r.studentId !== 's-801' && r.studentId !== 's-802');
  records.length = 0;
  records.push(...filteredRecords);

  teachers.forEach(t => {
    if (t && typeof t.name === 'string') {
      t.name = t.name.replace(/\s*老师$/, '');
      if (t.name.includes('春来') || t.name.includes('上好') || t.name.includes('雪成')) {
        t.gender = 'girl';
      }
    }
    if (t) {
      if (t.roleTitle === '主日学班主任') t.roleTitle = '班主任';
      else if (t.roleTitle === '主日学同工') t.roleTitle = '上课老师';
      else if (t.roleTitle === '助教老师' || t.roleTitle === '助教') t.roleTitle = '辅助老师';
      else if (t.roleTitle === '主日学校长' || t.roleTitle === '主日学讲员') t.roleTitle = '班主任';
      else if (!t.roleTitle) t.roleTitle = '班主任';
    }
  });
}

export function loadFromDisk(): boolean {
  try {
    const hiddenPath = getHiddenClassStoragePath();
    const hiddenSet = new Set<string>();
    if (fs.existsSync(hiddenPath)) {
      try {
        const rawHidden = JSON.parse(fs.readFileSync(hiddenPath, 'utf-8'));
        if (Array.isArray(rawHidden)) {
          rawHidden.forEach(id => hiddenSet.add(id));
        }
      } catch {}
    }

    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.hiddenClassIds)) {
        data.hiddenClassIds.forEach((id: string) => hiddenSet.add(id));
      }
      if (data.systemConfig && Array.isArray(data.systemConfig.hiddenClassIds)) {
        data.systemConfig.hiddenClassIds.forEach((id: string) => hiddenSet.add(id));
      }
      if (data.config && Array.isArray(data.config.hiddenClassIds)) {
        data.config.hiddenClassIds.forEach((id: string) => hiddenSet.add(id));
      }
      if (Array.isArray(data.classes) && data.classes.length > 0) {
        const mappedClasses = data.classes.map((c: any) => ({
          ...c,
          isHiddenFromHome: c.isHiddenFromHome === true || hiddenSet.has(c.id)
        }));
        classes.length = 0;
        classes.push(...mappedClasses);
      } else {
        const mappedClasses = classes.map(c => ({
          ...c,
          isHiddenFromHome: c.isHiddenFromHome === true || hiddenSet.has(c.id)
        }));
        classes.length = 0;
        classes.push(...mappedClasses);
      }
      if (Array.isArray(data.students) && data.students.length > 0) {
        students.length = 0;
        students.push(...data.students);
      }
      if (Array.isArray(data.records)) {
        const originalCount = data.records.length;
        const cleanedRecords = data.records.filter((r: any) => r.date !== '2026-09-06' && r.date !== '2026-09-13');
        records.length = 0;
        records.push(...cleanedRecords);
        if (originalCount !== cleanedRecords.length) {
          console.log(`[Storage Cleanup] Reset ${originalCount - cleanedRecords.length} records for September 6th and 13th, 2026.`);
          setTimeout(() => saveDataToFile(), 100);
        }
      }
      if (Array.isArray(data.adminAccounts) && data.adminAccounts.length > 0) {
        adminAccounts.length = 0;
        adminAccounts.push(...data.adminAccounts);
      }
      if (Array.isArray(data.teachers)) {
        teachers.length = 0;
        teachers.push(...data.teachers);
      } else {
        const defaultTeachers = [
          { id: 't-1', name: '春来 老师', gender: 'girl', phone: '13812345671', wechat: 'chunlai_teacher', classId: 'class-1', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-2', name: '秋娟 老师', gender: 'girl', phone: '13812345672', wechat: 'qiujuan_teacher', classId: 'class-2', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-3', name: '若雪 老师', gender: 'girl', phone: '13812345673', wechat: 'ruoxue_teacher', classId: 'class-3', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-4', name: '上好 老师', gender: 'girl', phone: '13812345674', wechat: 'shanghao_teacher', classId: 'class-4', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-5', name: '雪成 老师', gender: 'girl', phone: '13812345675', wechat: 'xuecheng_teacher', classId: 'class-5', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-6', name: '志安 老师', gender: 'boy', phone: '13812345676', wechat: 'zhian_teacher', classId: 'class-6', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-7', name: '东丽 老师', gender: 'girl', phone: '13812345677', wechat: 'dongli_teacher', classId: 'class-7', roleTitle: '班主任', joinDate: '2026-01-01' }
        ];
        teachers.length = 0;
        teachers.push(...defaultTeachers);
      }
      if (data.systemConfig) {
        const mergedConfig = { ...initialSystemConfig, ...data.systemConfig, hiddenClassIds: Array.from(hiddenSet) };
        Object.keys(systemConfig).forEach(key => delete (systemConfig as any)[key]);
        Object.assign(systemConfig, mergedConfig);
      }
      if (data.activeSunday) activeSunday = data.activeSunday;
      if (typeof data.syncVersion === 'number') syncVersion = data.syncVersion;
      if (data.updatedAt) lastModifiedTimestamp = data.updatedAt;
      sanitizeYageData();
      return true;
    } else if (hiddenSet.size > 0) {
      const mappedClasses = classes.map(c => ({
        ...c,
        isHiddenFromHome: hiddenSet.has(c.id)
      }));
      classes.length = 0;
      classes.push(...mappedClasses);
    }

    if (!fs.existsSync(filePath)) {
      const defaultTeachers = [
        { id: 't-1', name: '春来', gender: 'girl', phone: '13812345671', classId: 'class-1', roleTitle: '班主任' },
        { id: 't-2', name: '秋娟', gender: 'girl', phone: '13812345672', classId: 'class-2', roleTitle: '班主任' },
        { id: 't-3', name: '若雪', gender: 'girl', phone: '13812345673', classId: 'class-3', roleTitle: '班主任' },
        { id: 't-4', name: '上好', gender: 'girl', phone: '13812345674', classId: 'class-4', roleTitle: '班主任' },
        { id: 't-5', name: '雪成', gender: 'girl', phone: '13812345675', classId: 'class-5', roleTitle: '班主任' },
        { id: 't-6', name: '志安', gender: 'boy', phone: '13812345676', classId: 'class-6', roleTitle: '班主任' },
        { id: 't-7', name: '东丽', gender: 'girl', phone: '13812345677', classId: 'class-7', roleTitle: '班主任' }
      ];
      teachers.length = 0;
      teachers.push(...defaultTeachers);
    }
  } catch (err) {
    console.warn('[Storage Notice] Could not read disk cache:', err);
  }
  sanitizeYageData();
  return false;
}

export function initOrLoadData() {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  const loaded = loadFromDisk();
  if (loaded) {
    sanitizeYageData();
    saveDataToFile();
    initOrLoadDataAsync().catch(() => {});
    return;
  }

  // If no file exists, initialize default records and write to file
  sanitizeYageData();
  generateHistoricalRecords();
  saveDataToFile();

  // Try loading from Cloud KV in background
  initOrLoadDataAsync().catch(() => {});
}

export async function initOrLoadDataAsync() {
  if (!isInitialized) {
    loadFromDisk();
    isInitialized = true;
  }
  const cloudData = await loadFromCloudKV();
  if (cloudData && typeof cloudData.syncVersion === 'number') {
    // Only apply cloud KV data if it is NEWER than current in-memory syncVersion
    if (cloudData.syncVersion > syncVersion) {
      const cloudHiddenSet = new Set<string>([
        ...(Array.isArray(cloudData.hiddenClassIds) ? cloudData.hiddenClassIds : []),
        ...(Array.isArray(cloudData.systemConfig?.hiddenClassIds) ? cloudData.systemConfig.hiddenClassIds : []),
        ...(Array.isArray(cloudData.config?.hiddenClassIds) ? cloudData.config.hiddenClassIds : [])
      ]);
      if (Array.isArray(cloudData.classes) && cloudData.classes.length > 0) {
        const mappedClasses = cloudData.classes.map((c: any) => ({
          ...c,
          isHiddenFromHome: c.isHiddenFromHome === true || cloudHiddenSet.has(c.id)
        }));
        classes.length = 0;
        classes.push(...mappedClasses);
      }
      if (Array.isArray(cloudData.students) && cloudData.students.length > 0) {
        students.length = 0;
        students.push(...cloudData.students);
      }
      if (Array.isArray(cloudData.records)) {
        records.length = 0;
        records.push(...cloudData.records);
      }
      if (Array.isArray(cloudData.adminAccounts) && cloudData.adminAccounts.length > 0) {
        adminAccounts.length = 0;
        adminAccounts.push(...cloudData.adminAccounts);
      }
      if (Array.isArray(cloudData.teachers)) {
        teachers.length = 0;
        teachers.push(...cloudData.teachers);
      }
      if (cloudData.systemConfig) {
        const mergedConfig = { ...initialSystemConfig, ...cloudData.systemConfig, hiddenClassIds: Array.from(cloudHiddenSet) };
        Object.keys(systemConfig).forEach(key => delete (systemConfig as any)[key]);
        Object.assign(systemConfig, mergedConfig);
      }
      if (cloudData.activeSunday) activeSunday = cloudData.activeSunday;
      syncVersion = cloudData.syncVersion;
      if (cloudData.updatedAt) lastModifiedTimestamp = cloudData.updatedAt;
      sanitizeYageData();
      saveDataToFile();
    }
  }
}

// Helper to verify if requester is superadmin
export function verifySuperAdminPermission(req: Request): { allowed: boolean; role: string; message?: string } {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7).trim() 
    : (req.headers['x-admin-token'] as string);
  const userRoleHeader = req.headers['x-user-role'] as string;
  const usernameHeader = req.headers['x-username'] as string;

  // 1. Explicit non-superadmin check from role header (unless user is logged-in admin)
  if ((userRoleHeader === 'teacher' || userRoleHeader === 'fellowship_leader') && (!usernameHeader || usernameHeader.toLowerCase() !== 'admin')) {
    return {
      allowed: false,
      role: userRoleHeader,
      message: '权限不足：除了总管理员之外，其他账号只有管理签到权限，没有添加或删除班级与学生的权限！'
    };
  }

  // 2. Check session token if present in activeSessions
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token)!;
    if (session.role === 'superadmin') {
      return { allowed: true, role: 'superadmin' };
    }
    return {
      allowed: false,
      role: session.role,
      message: '权限不足：除了总管理员之外，其他账号只有管理签到权限，没有添加或删除班级与学生的权限！'
    };
  }

  // 3. Superadmin check (e.g. token format from admin login or headers)
  if (userRoleHeader === 'superadmin' || (usernameHeader && usernameHeader.toLowerCase() === 'admin')) {
    return { allowed: true, role: 'superadmin' };
  }

  // 4. Token format check (valid session prefix from client that logged in as admin)
  if (token && token.startsWith('btl_session_') && (userRoleHeader === 'superadmin' || !userRoleHeader)) {
    return { allowed: true, role: 'superadmin' };
  }

  // 5. Also check if username matches a known account with superadmin role
  if (usernameHeader) {
    const acc = adminAccounts.find(a => a.username.toLowerCase() === usernameHeader.toLowerCase());
    if (acc && acc.role === 'superadmin') {
      return { allowed: true, role: 'superadmin' };
    }
  }

  return {
    allowed: false,
    role: 'guest',
    message: '权限不足：除了总管理员之外，其他账号只有管理签到权限，没有添加或删除班级与学生的权限！'
  };
}

// Mutators for clean external usage
export function setClasses(newClasses: ClassGroup[]) {
  classes.length = 0;
  classes.push(...newClasses);
}

export function setStudents(newStudents: Student[]) {
  students.length = 0;
  students.push(...newStudents);
}

export function setRecords(newRecords: AttendanceRecord[]) {
  records.length = 0;
  records.push(...newRecords);
}

export function setSystemConfig(newConfig: SystemConfig) {
  Object.keys(systemConfig).forEach(key => delete (systemConfig as any)[key]);
  Object.assign(systemConfig, newConfig);
}

export function setAdminAccounts(newAccounts: ServerAdminAccount[]) {
  adminAccounts.length = 0;
  adminAccounts.push(...newAccounts);
}

export interface SyncPayload {
  classes?: ClassGroup[];
  students?: Student[];
  records?: AttendanceRecord[];
  config?: Partial<SystemConfig>;
  activeSunday?: string;
  accounts?: ServerAdminAccount[];
}

export function mergeClientData(payload: SyncPayload): {
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  config: SystemConfig;
  activeSunday: string;
  syncVersion: number;
  lastModifiedTimestamp: string;
} {
  let changed = false;

  // 1. Merge classes (by ID)
  if (Array.isArray(payload.classes) && payload.classes.length > 0) {
    const hiddenPath = getHiddenClassStoragePath();
    const diskHiddenSet = new Set<string>();
    try {
      if (fs.existsSync(hiddenPath)) {
        const raw = JSON.parse(fs.readFileSync(hiddenPath, 'utf-8'));
        if (Array.isArray(raw)) raw.forEach(id => diskHiddenSet.add(id));
      }
    } catch {}

    if (Array.isArray(systemConfig.hiddenClassIds)) {
      systemConfig.hiddenClassIds.forEach(id => diskHiddenSet.add(id));
    }
    classes.forEach(c => {
      if (c.isHiddenFromHome === true) diskHiddenSet.add(c.id);
    });

    const classMap = new Map<string, ClassGroup>(classes.map(c => [c.id, c]));
    for (const c of payload.classes) {
      if (!classMap.has(c.id)) {
        const isHidden = c.isHiddenFromHome === true || diskHiddenSet.has(c.id);
        classMap.set(c.id, {
          ...c,
          isHiddenFromHome: isHidden
        });
        changed = true;
      } else {
        const existing = classMap.get(c.id)!;
        // The server's settings (including isHiddenFromHome, teachers, and classroom) are authoritative for existing classes.
        // Routine client background syncs must preserve the server's existing isHiddenFromHome status.
        const authoritativeHidden = existing.isHiddenFromHome === true || diskHiddenSet.has(c.id);
        const mergedClass: ClassGroup = {
          ...existing,
          ...c,
          isHiddenFromHome: authoritativeHidden
        };
        if (JSON.stringify(existing) !== JSON.stringify(mergedClass)) {
          classMap.set(c.id, mergedClass);
          changed = true;
        }
      }
    }
    const mergedClasses = Array.from(classMap.values());
    classes.length = 0;
    classes.push(...mergedClasses);
  }

  // 2. Merge students (by ID)
  if (Array.isArray(payload.students) && payload.students.length > 0) {
    const studentMap = new Map<string, Student>(students.map(s => [s.id, s]));
    for (const s of payload.students) {
      if (!studentMap.has(s.id)) {
        studentMap.set(s.id, s);
        changed = true;
      } else {
        const existing = studentMap.get(s.id)!;
        if (JSON.stringify(existing) !== JSON.stringify(s)) {
          studentMap.set(s.id, { ...existing, ...s });
          changed = true;
        }
      }
    }
    const mergedStudents = Array.from(studentMap.values());
    students.length = 0;
    students.push(...mergedStudents);
  }

  // 3. Merge attendance records (by unique ID)
  if (Array.isArray(payload.records) && payload.records.length > 0) {
    const recordMap = new Map<string, AttendanceRecord>(records.map(r => [r.id, r]));
    for (const r of payload.records) {
      if (!recordMap.has(r.id)) {
        recordMap.set(r.id, r);
        changed = true;
      } else {
        const existing = recordMap.get(r.id)!;
        if (JSON.stringify(existing) !== JSON.stringify(r)) {
          recordMap.set(r.id, { ...existing, ...r });
          changed = true;
        }
      }
    }
    const mergedRecords = Array.from(recordMap.values());
    records.length = 0;
    records.push(...mergedRecords);
  }

  // 4. System config & classes are server-authoritative and master-managed via /api/config & /api/classes

  // Merge teachers (by ID)
  if (Array.isArray((payload as any).teachers) && (payload as any).teachers.length > 0) {
    const teacherMap = new Map<string, any>(teachers.map(t => [t.id, t]));
    for (const t of (payload as any).teachers) {
      if (!teacherMap.has(t.id)) {
        teacherMap.set(t.id, t);
        changed = true;
      } else {
        const existing = teacherMap.get(t.id)!;
        if (JSON.stringify(existing) !== JSON.stringify(t)) {
          teacherMap.set(t.id, { ...existing, ...t });
          changed = true;
        }
      }
    }
    const mergedTeachers = Array.from(teacherMap.values());
    teachers.length = 0;
    teachers.push(...mergedTeachers);
  }

  if (payload.activeSunday) {
    activeSunday = payload.activeSunday;
  }

  if (changed) {
    saveDataToFile();
  }

  return {
    classes,
    students,
    records,
    config: systemConfig,
    activeSunday,
    syncVersion,
    lastModifiedTimestamp,
    teachers
  } as any;
}

