import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Request } from 'express';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig, AdminUser } from '../src/types';
import { initialClasses, initialStudents, initialSystemConfig, initialAdminAccounts, ServerAdminAccount } from './initialData';

// Active in-memory state
export let classes: ClassGroup[] = [...initialClasses];
export let students: Student[] = [...initialStudents];
export let records: AttendanceRecord[] = [];
export let systemConfig: SystemConfig = { ...initialSystemConfig };
export let adminAccounts: ServerAdminAccount[] = [...initialAdminAccounts];
export const activeSessions = new Map<string, AdminUser>();
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
  return '2026-09-13';
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
}) => void;

const changeListeners = new Set<DataChangeListener>();

export function onDataChange(listener: DataChangeListener): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

export function saveDataToFile() {
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  const hiddenIds = classes.filter(c => !!c.isHiddenFromHome).map(c => c.id);
  systemConfig = {
    ...systemConfig,
    hiddenClassIds: hiddenIds
  };

  const payload = {
    systemConfig,
    classes,
    students,
    records,
    adminAccounts,
    activeSunday,
    syncVersion,
    hiddenClassIds: hiddenIds,
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
        lastModifiedTimestamp
      });
    } catch (err) {
      console.warn('[Realtime Sync Error] Listener callback failed:', err);
    }
  }

  // Also persist to Vercel KV / Upstash Redis if configured
  saveToCloudKV(payload).catch(() => {});
}

export function generateHistoricalRecords() {
  records = [];
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
  classes = classes.filter(c => c.id !== 'class-8' && c.name !== '雅歌团契');
  students = students.filter(s => s.classId !== 'class-8' && s.id !== 's-801' && s.id !== 's-802');
  records = records.filter(r => r.classId !== 'class-8' && r.studentId !== 's-801' && r.studentId !== 's-802');
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
      if (Array.isArray(data.classes) && data.classes.length > 0) {
        classes = data.classes.map((c: any) => ({
          ...c,
          isHiddenFromHome: c.isHiddenFromHome === true || hiddenSet.has(c.id)
        }));
      } else {
        classes = classes.map(c => ({
          ...c,
          isHiddenFromHome: hiddenSet.has(c.id)
        }));
      }
      if (Array.isArray(data.students) && data.students.length > 0) students = data.students;
      if (Array.isArray(data.records)) records = data.records;
      if (Array.isArray(data.adminAccounts) && data.adminAccounts.length > 0) adminAccounts = data.adminAccounts;
      if (data.systemConfig) {
        systemConfig = { ...initialSystemConfig, ...data.systemConfig, hiddenClassIds: Array.from(hiddenSet) };
      }
      if (data.activeSunday) activeSunday = data.activeSunday;
      if (typeof data.syncVersion === 'number') syncVersion = data.syncVersion;
      if (data.updatedAt) lastModifiedTimestamp = data.updatedAt;
      sanitizeYageData();
      return true;
    } else if (hiddenSet.size > 0) {
      classes = classes.map(c => ({
        ...c,
        isHiddenFromHome: hiddenSet.has(c.id)
      }));
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
      const currentHiddenSet = new Set<string>(classes.filter(c => !!c.isHiddenFromHome).map(c => c.id));
      if (Array.isArray(cloudData.hiddenClassIds)) {
        cloudData.hiddenClassIds.forEach((id: string) => currentHiddenSet.add(id));
      }
      if (Array.isArray(cloudData.classes) && cloudData.classes.length > 0) {
        classes = cloudData.classes.map((c: any) => ({
          ...c,
          isHiddenFromHome: c.isHiddenFromHome === true || currentHiddenSet.has(c.id)
        }));
      }
      if (Array.isArray(cloudData.students) && cloudData.students.length > 0) students = cloudData.students;
      if (Array.isArray(cloudData.records)) records = cloudData.records;
      if (Array.isArray(cloudData.adminAccounts) && cloudData.adminAccounts.length > 0) adminAccounts = cloudData.adminAccounts;
      if (cloudData.systemConfig) systemConfig = { ...initialSystemConfig, ...cloudData.systemConfig, hiddenClassIds: Array.from(currentHiddenSet) };
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
  classes = newClasses;
}

export function setStudents(newStudents: Student[]) {
  students = newStudents;
}

export function setRecords(newRecords: AttendanceRecord[]) {
  records = newRecords;
}

export function setSystemConfig(newConfig: SystemConfig) {
  systemConfig = newConfig;
}

export function setAdminAccounts(newAccounts: ServerAdminAccount[]) {
  adminAccounts = newAccounts;
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

    const classMap = new Map<string, ClassGroup>(classes.map(c => [c.id, c]));
    for (const c of payload.classes) {
      if (!classMap.has(c.id)) {
        const isHidden = !!c.isHiddenFromHome || diskHiddenSet.has(c.id);
        classMap.set(c.id, {
          ...c,
          isHiddenFromHome: isHidden
        });
        changed = true;
      } else {
        const existing = classMap.get(c.id)!;
        // Server's authoritative class configuration (including isHiddenFromHome) must be preserved
        // against non-admin background sync payload overwrites
        const authoritativeHidden = existing.isHiddenFromHome === true || diskHiddenSet.has(c.id);
        const mergedClass: ClassGroup = {
          ...c,
          ...existing,
          isHiddenFromHome: authoritativeHidden
        };
        if (JSON.stringify(existing) !== JSON.stringify(mergedClass)) {
          classMap.set(c.id, mergedClass);
          changed = true;
        }
      }
    }
    classes = Array.from(classMap.values());
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
    students = Array.from(studentMap.values());
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
    records = Array.from(recordMap.values());
  }

  // 4. System config & classes are server-authoritative and master-managed via /api/config & /api/classes

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
    lastModifiedTimestamp
  };
}

