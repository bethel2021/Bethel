import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Request } from 'express';
import bcrypt from 'bcryptjs';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig, AdminUser } from '../src/types.js';
import { initialClasses, initialStudents, initialSystemConfig, initialAdminAccounts, ServerAdminAccount } from './initialData.js';
import {
  saveToSupabase,
  loadFromSupabase,
  ChurchStatePayload,
  supabaseUpsertClass,
  supabaseDeleteClass,
  supabaseUpsertStudent,
  supabaseUpsertStudentsBatch,
  supabaseDeleteStudent,
  supabaseUpsertTeacher,
  supabaseDeleteTeacher,
  supabaseUpsertAttendanceRecord,
  supabaseDeleteAttendanceRecord,
  supabaseUpsertAdminAccount,
  supabaseDeleteAdminAccount,
  supabaseUpdateAccountPassword,
  supabaseUpsertSystemConfig,
  supabaseResetAllData
} from './supabaseDb.js';
import { getSupabase, isSupabaseConfigured } from './supabase.js';

export { isSupabaseConfigured, getSupabase };

// Active in-memory state (Using const to ensure stable reference bindings across ES modules & CommonJS bundles)
export const classes: ClassGroup[] = [...initialClasses];
export const students: Student[] = [...initialStudents];
export const records: AttendanceRecord[] = [];
export const deletedRecordKeys = new Set<string>();
export const systemConfig: SystemConfig = { ...initialSystemConfig };

export function addDeletedRecordKey(key: string) {
  if (!key) return;
  deletedRecordKeys.add(key);
}

export function removeDeletedRecordKey(key: string) {
  if (!key) return;
  deletedRecordKeys.delete(key);
}
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

// Supabase PostgreSQL Persistent Cloud Database Sync
export function getFullStatePayload(): ChurchStatePayload {
  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
  return {
    systemConfig: { ...systemConfig, hiddenClassIds: hiddenIds },
    classes: classes.map(c => ({ ...c, isHiddenFromHome: hiddenIds.includes(c.id) })),
    students,
    records,
    deletedRecordKeys: Array.from(deletedRecordKeys),
    adminAccounts,
    activeSunday,
    syncVersion,
    hiddenClassIds: hiddenIds,
    teachers,
    updatedAt: lastModifiedTimestamp
  };
}

export async function saveDataToDb(): Promise<boolean> {
  const payload = getFullStatePayload();
  return await saveToSupabase(payload);
}

type DataChangeListener = (data: {
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  deletedRecordKeys?: string[];
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

export let lastSupabaseFetchTime = 0;

export async function saveDataToSupabase(): Promise<boolean> {
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

  const payload = getFullStatePayload();

  // 1. Supabase PostgreSQL is the AUTHORITATIVE, REQUIRED persistent database
  let dbSuccess = false;
  if (isSupabaseConfigured()) {
    try {
      dbSuccess = await saveToSupabase(payload);
      lastSupabaseFetchTime = Date.now();
    } catch (err) {
      console.warn('[Supabase DB Error] Formal data write failed:', err);
    }
  }

  // 2. Persist local file cache (ensures zero-latency read-after-write and fast cold-start bootstrap)
  try {
    const filePath = getStoragePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    const hiddenPath = getHiddenClassStoragePath();
    fs.writeFileSync(hiddenPath, JSON.stringify(hiddenIds, null, 2), 'utf-8');
  } catch (err) {
    // Normal in serverless read-only environment
  }

  // 3. Notify all real-time listeners (WebSocket, SSE, Long-polling)
  for (const listener of changeListeners) {
    try {
      listener({
        classes,
        students,
        records,
        deletedRecordKeys: Array.from(deletedRecordKeys),
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

  return dbSuccess;
}

// Backward-compatibility alias
export const saveDataToFile = saveDataToSupabase;

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

export function reconcileInitialStudents(): boolean {
  let changed = false;
  for (const initStu of initialStudents) {
    const exists = students.some(s => s.id === initStu.id || (s.name === initStu.name && s.classId === initStu.classId));
    if (!exists) {
      students.push({ ...initStu });
      changed = true;
    }
  }
  return changed;
}

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
      if (!t.gender) {
        if (t.name.includes('春来') || t.name.includes('上好') || t.name.includes('雪成') || t.name.includes('秋娟') || t.name.includes('若雪') || t.name.includes('东丽')) {
          t.gender = 'girl';
        } else {
          t.gender = 'boy';
        }
      }
    }
    if (t && !t.roleTitle) {
      t.roleTitle = '班主任';
    }
  });

  reconcileInitialStudents();
  hashAllPasswordsIfNeeded();
}

export function hashPasswordIfNeeded(password: string): string {
  if (!password) return '';
  if (password.startsWith('$2a$') || password.startsWith('$2b$')) {
    return password;
  }
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(plain: string, hashed: string): boolean {
  if (!plain || !hashed) return false;
  if (hashed.startsWith('$2a$') || hashed.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(plain, hashed);
    } catch {
      return false;
    }
  }
  return plain === hashed;
}

export function hashAllPasswordsIfNeeded(): boolean {
  let changed = false;
  adminAccounts.forEach(account => {
    if (account.password && !account.password.startsWith('$2a$') && !account.password.startsWith('$2b$')) {
      account.password = bcrypt.hashSync(account.password, 10);
      changed = true;
    }
  });
  if (systemConfig.adminPassword && !systemConfig.adminPassword.startsWith('$2a$') && !systemConfig.adminPassword.startsWith('$2b$')) {
    systemConfig.adminPassword = bcrypt.hashSync(systemConfig.adminPassword, 10);
    changed = true;
  }
  return changed;
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
          isHiddenFromHome: typeof c.isHiddenFromHome === 'boolean' ? c.isHiddenFromHome : hiddenSet.has(c.id)
        }));
        classes.length = 0;
        classes.push(...mappedClasses);
      } else {
        const mappedClasses = classes.map(c => ({
          ...c,
          isHiddenFromHome: typeof c.isHiddenFromHome === 'boolean' ? c.isHiddenFromHome : hiddenSet.has(c.id)
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
      if (Array.isArray(data.deletedRecordKeys)) {
        deletedRecordKeys.clear();
        data.deletedRecordKeys.forEach((k: string) => {
          if (typeof k === 'string') deletedRecordKeys.add(k);
        });
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
          { id: 't-1', name: '春来', gender: 'girl', phone: '13812345671', wechat: 'chunlai_teacher', classId: 'class-1', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-2', name: '秋娟', gender: 'girl', phone: '13812345672', wechat: 'qiujuan_teacher', classId: 'class-2', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-3', name: '若雪', gender: 'girl', phone: '13812345673', wechat: 'ruoxue_teacher', classId: 'class-3', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-4', name: '上好', gender: 'girl', phone: '13812345674', wechat: 'shanghao_teacher', classId: 'class-4', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-5', name: '雪成', gender: 'girl', phone: '13812345675', wechat: 'xuecheng_teacher', classId: 'class-5', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-6', name: '任志安', gender: 'boy', phone: '13812345676', wechat: 'zhian_teacher', classId: 'class-6', roleTitle: '班主任', joinDate: '2026-01-01' },
          { id: 't-7', name: '毛东丽', gender: 'girl', phone: '13812345677', wechat: 'dongli_teacher', classId: 'class-7', roleTitle: '班主任', joinDate: '2026-01-01' }
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
      if (reconcileInitialStudents()) {
        setTimeout(() => saveDataToFile(), 100);
      }
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
        { id: 't-1', name: '春来', gender: 'girl', phone: '13812345671', wechat: 'chunlai_teacher', classId: 'class-1', roleTitle: '班主任', joinDate: '2026-01-01' },
        { id: 't-2', name: '秋娟', gender: 'girl', phone: '13812345672', wechat: 'qiujuan_teacher', classId: 'class-2', roleTitle: '班主任', joinDate: '2026-01-01' },
        { id: 't-3', name: '若雪', gender: 'girl', phone: '13812345673', wechat: 'ruoxue_teacher', classId: 'class-3', roleTitle: '班主任', joinDate: '2026-01-01' },
        { id: 't-4', name: '上好', gender: 'girl', phone: '13812345674', wechat: 'shanghao_teacher', classId: 'class-4', roleTitle: '班主任', joinDate: '2026-01-01' },
        { id: 't-5', name: '雪成', gender: 'girl', phone: '13812345675', wechat: 'xuecheng_teacher', classId: 'class-5', roleTitle: '班主任', joinDate: '2026-01-01' },
        { id: 't-6', name: '任志安', gender: 'boy', phone: '13812345676', wechat: 'zhian_teacher', classId: 'class-6', roleTitle: '班主任', joinDate: '2026-01-01' },
        { id: 't-7', name: '毛东丽', gender: 'girl', phone: '13812345677', wechat: 'dongli_teacher', classId: 'class-7', roleTitle: '班主任', joinDate: '2026-01-01' }
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
    initOrLoadDataAsync().catch(() => {});
    return;
  }

  // If no file exists, initialize default records in memory
  sanitizeYageData();
  generateHistoricalRecords();

  // Load from Supabase PostgreSQL in background
  initOrLoadDataAsync().catch(() => {});
}

export async function initOrLoadDataAsync(force = false) {
  if (!isInitialized) {
    loadFromDisk();
    isInitialized = true;
  }

  // If Supabase is configured, Supabase PostgreSQL is the sole authoritative persistent database
  if (isSupabaseConfigured()) {
    const now = Date.now();
    if (!force && lastSupabaseFetchTime > 0 && (now - lastSupabaseFetchTime < 15000)) {
      return;
    }

    try {
      const cloudData = await loadFromSupabase();
      lastSupabaseFetchTime = Date.now();
      if (cloudData && typeof cloudData.syncVersion === 'number') {
        // Apply cloud Supabase PostgreSQL data
        if (Array.isArray(cloudData.classes) && cloudData.classes.length > 0) {
          const cloudHiddenList = Array.isArray(cloudData.systemConfig?.hiddenClassIds) 
            ? cloudData.systemConfig.hiddenClassIds 
            : (Array.isArray(cloudData.hiddenClassIds) ? cloudData.hiddenClassIds : []);
          const cloudHiddenSet = new Set<string>(cloudHiddenList);

          const mappedClasses = cloudData.classes.map((c: any) => ({
            ...c,
            isHiddenFromHome: typeof c.isHiddenFromHome === 'boolean' ? c.isHiddenFromHome : cloudHiddenSet.has(c.id)
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
        if (Array.isArray(cloudData.deletedRecordKeys)) {
          deletedRecordKeys.clear();
          cloudData.deletedRecordKeys.forEach(k => {
            if (typeof k === 'string' && k) deletedRecordKeys.add(k);
          });
        }
        if (Array.isArray(cloudData.adminAccounts) && cloudData.adminAccounts.length > 0) {
          adminAccounts.length = 0;
          adminAccounts.push(...cloudData.adminAccounts);
        }
        if (Array.isArray(cloudData.teachers) && cloudData.teachers.length > 0) {
          teachers.length = 0;
          teachers.push(...cloudData.teachers);
        }
        const authoritativeHiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
        if (cloudData.systemConfig) {
          const mergedConfig = { ...initialSystemConfig, ...cloudData.systemConfig, hiddenClassIds: authoritativeHiddenIds };
          Object.keys(systemConfig).forEach(key => delete (systemConfig as any)[key]);
          Object.assign(systemConfig, mergedConfig);
        }
        if (cloudData.activeSunday) activeSunday = cloudData.activeSunday;
        syncVersion = cloudData.syncVersion;
        if (cloudData.updatedAt) lastModifiedTimestamp = cloudData.updatedAt;
        sanitizeYageData();

        if (reconcileInitialStudents()) {
          console.log('[Roster Sync] Reconciled initial students into Supabase DB state.');
          await saveDataToSupabase();
        }

        // Write local backup copy purely for offline migration compatibility
        try {
          const filePath = getStoragePath();
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, JSON.stringify(getFullStatePayload(), null, 2), 'utf-8');
        } catch {}
      } else {
        // Supabase is configured but database is freshly created / empty -> seed initial data!
        console.log('[Supabase DB] Fresh Supabase database detected. Seeding initial church roster to PostgreSQL...');
        await saveDataToDb();
      }
    } catch (err) {
      console.warn('[Supabase DB] Error in initOrLoadDataAsync:', err);
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
        const authoritativeHidden = typeof c.isHiddenFromHome === 'boolean' 
          ? c.isHiddenFromHome 
          : (typeof existing.isHiddenFromHome === 'boolean' ? existing.isHiddenFromHome : diskHiddenSet.has(c.id));
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
  if (Array.isArray((payload as any).deletedRecordKeys)) {
    (payload as any).deletedRecordKeys.forEach((k: string) => {
      if (typeof k === 'string' && k) deletedRecordKeys.add(k);
    });
  }

  if (Array.isArray(payload.records)) {
    const recordMap = new Map<string, AttendanceRecord>(records.map(r => [r.id, r]));

    // Purge any server records matching deletedRecordKeys
    for (const [id, r] of Array.from(recordMap.entries())) {
      const studentDateKey = `${r.studentId}_${r.date}`;
      if (deletedRecordKeys.has(id) || deletedRecordKeys.has(studentDateKey)) {
        recordMap.delete(id);
        changed = true;
      }
    }

    for (const r of payload.records) {
      const studentDateKey = `${r.studentId}_${r.date}`;
      // Skip if marked as deleted
      if (deletedRecordKeys.has(r.id) || deletedRecordKeys.has(studentDateKey)) {
        continue;
      }

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
    if (JSON.stringify(records) !== JSON.stringify(mergedRecords)) {
      records.length = 0;
      records.push(...mergedRecords);
      changed = true;
    }
  }

  // 4. System config & classes are server-authoritative and master-managed via /api/config & /api/classes

  // Teachers are server-authoritative and master-managed via /api/teachers.
  // We do NOT let the client overwrite existing server teacher records to prevent stale client syncs from reverting server-side edits.
  // We only add teachers if they do not exist on the server (e.g. initial setup fallback).
  if (Array.isArray((payload as any).teachers) && (payload as any).teachers.length > 0) {
    const teacherMap = new Map<string, any>(teachers.map(t => [t.id, t]));
    let teachersChanged = false;
    for (const t of (payload as any).teachers) {
      if (t && t.id) {
        if (!teacherMap.has(t.id)) {
          teacherMap.set(t.id, t);
          teachersChanged = true;
          changed = true;
        } else {
          const current = teacherMap.get(t.id);
          const merged = { ...current, ...t };
          teacherMap.set(t.id, merged);
          teachersChanged = true;
          changed = true;
        }
      }
    }
    if (teachersChanged) {
      const mergedTeachers = Array.from(teacherMap.values());
      teachers.length = 0;
      teachers.push(...mergedTeachers);
    }
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
    deletedRecordKeys: Array.from(deletedRecordKeys),
    config: systemConfig,
    activeSunday,
    syncVersion,
    lastModifiedTimestamp,
    teachers
  } as any;
}

// =========================================================================
// UNIFIED SUPABASE DATA ACCESS LAYER (DAL)
// All business logic routes through these data access layer methods.
// =========================================================================

let snapshotTimer: NodeJS.Timeout | null = null;
export function scheduleSupabaseSnapshotSave(delayMs = 1500) {
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    saveDataToSupabase().catch(err => {
      console.warn('[Supabase Snapshot] Background snapshot backup error:', err);
    });
  }, delayMs);
}

// --- Classes ---
export async function getClasses(assignedClassId?: string): Promise<ClassGroup[]> {
  await initOrLoadDataAsync(true);
  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
  const mapped = classes.map(c => ({
    ...c,
    isHiddenFromHome: hiddenIds.includes(c.id)
  }));
  if (assignedClassId) {
    return mapped.filter(c => c.id === assignedClassId);
  }
  return mapped;
}

export async function getClassById(id: string): Promise<ClassGroup | undefined> {
  await initOrLoadDataAsync(true);
  return classes.find(c => c.id === id || c.name === id);
}

export async function saveClass(cls: ClassGroup): Promise<ClassGroup> {
  const existingIdx = classes.findIndex(c => c.id === cls.id || c.name === cls.name);
  let saved: ClassGroup;
  if (existingIdx >= 0) {
    saved = { ...classes[existingIdx], ...cls };
    classes[existingIdx] = saved;
  } else {
    saved = { ...cls };
    classes.push(saved);
  }
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseUpsertClass(saved);
  scheduleSupabaseSnapshotSave();
  return saved;
}

export async function updateClass(id: string, updates: Partial<ClassGroup>): Promise<ClassGroup | null> {
  const existingIdx = classes.findIndex(c => c.id === id || c.name === id);
  if (existingIdx === -1) return null;
  const updated = { ...classes[existingIdx], ...updates };
  classes[existingIdx] = updated;
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseUpsertClass(updated);
  scheduleSupabaseSnapshotSave();
  return updated;
}

export async function saveClassVisibility(classId: string, isHidden: boolean, clientHiddenIds?: string[]): Promise<void> {
  const idx = classes.findIndex(c => c.id === classId);
  if (idx !== -1) {
    classes[idx] = {
      ...classes[idx],
      isHiddenFromHome: isHidden
    };
  }

  if (Array.isArray(clientHiddenIds)) {
    const reconciledSet = new Set<string>(clientHiddenIds.map(item => String(item)));
    if (isHidden) {
      reconciledSet.add(classId);
    } else {
      reconciledSet.delete(classId);
    }
    classes.forEach(c => {
      c.isHiddenFromHome = reconciledSet.has(c.id);
    });
  }

  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
  setSystemConfig({ ...systemConfig, hiddenClassIds: hiddenIds });
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();

  const changedClasses = classes.filter(c => c.id === classId || (Array.isArray(clientHiddenIds) && clientHiddenIds.includes(c.id)));
  
  await Promise.all([
    ...changedClasses.map(c => supabaseUpsertClass(c)),
    supabaseUpsertSystemConfig(systemConfig)
  ]);

  scheduleSupabaseSnapshotSave();
}

export async function deleteClass(id: string): Promise<boolean> {
  const cls = classes.find(c => c.id === id || c.name === id);
  if (!cls) return false;
  const clsId = cls.id;
  const clsName = cls.name;

  const enrolledStudentIds = students.filter(s => s.classId === clsId).map(s => s.id);
  setStudents(students.filter(s => s.classId !== clsId));
  setRecords(records.filter(r => r.classId !== clsId && !enrolledStudentIds.includes(r.studentId)));
  setClasses(classes.filter(c => c.id !== clsId && c.name !== clsName));

  // Clear classId from any teachers associated with the deleted class
  teachers.forEach(t => {
    if (t && t.classId === clsId) {
      t.classId = '';
    }
  });

  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();

  await supabaseDeleteClass(clsId);
  scheduleSupabaseSnapshotSave();
  return true;
}

// --- Students ---
export async function getStudents(classId?: string, assignedClassId?: string): Promise<Student[]> {
  await initOrLoadDataAsync(true);
  let res = [...students];
  if (assignedClassId) {
    res = res.filter(s => s.classId === assignedClassId);
  }
  if (classId) {
    res = res.filter(s => s.classId === classId);
  }
  return res;
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  await initOrLoadDataAsync(true);
  return students.find(s => s.id === id || s.memberCode === id || s.name === id);
}

export async function saveStudent(student: Student): Promise<Student> {
  const existingIdx = students.findIndex(s => s.id === student.id || (student.memberCode && s.memberCode === student.memberCode));
  let saved: Student;
  if (existingIdx >= 0) {
    saved = { ...students[existingIdx], ...student };
    students[existingIdx] = saved;
  } else {
    saved = { ...student };
    students.push(saved);
  }
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseUpsertStudent(saved);
  scheduleSupabaseSnapshotSave();
  return saved;
}

export async function saveStudentsBatch(newStudents: Student[]): Promise<Student[]> {
  const existingIds = new Set(students.map(s => s.id));
  const toAppend: Student[] = [];
  for (const s of newStudents) {
    if (existingIds.has(s.id)) {
      const idx = students.findIndex(e => e.id === s.id);
      if (idx !== -1) students[idx] = { ...students[idx], ...s };
    } else {
      toAppend.push(s);
      existingIds.add(s.id);
    }
  }
  if (toAppend.length > 0) {
    students.push(...toAppend);
  }
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseUpsertStudentsBatch(newStudents);
  scheduleSupabaseSnapshotSave();
  return newStudents;
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student | null> {
  const existingIdx = students.findIndex(s => s.id === id || s.memberCode === id || s.name === id);
  if (existingIdx === -1) return null;
  const updated: Student = { ...students[existingIdx], ...updates };
  students[existingIdx] = updated;
  if (updates.name || updates.classId) {
    setRecords(records.map(r => r.studentId === updated.id ? {
      ...r,
      studentName: updates.name || r.studentName,
      classId: updates.classId || r.classId
    } : r));
  }
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseUpsertStudent(updated);
  scheduleSupabaseSnapshotSave();
  return updated;
}

export async function deleteStudent(id: string): Promise<Student | null> {
  const existingIdx = students.findIndex(s => s.id === id || s.memberCode === id || s.name === id);
  if (existingIdx === -1) return null;
  const removed = students[existingIdx];
  setStudents(students.filter(s => s.id !== removed.id && s.memberCode !== removed.memberCode));
  setRecords(records.filter(r => r.studentId !== removed.id && r.studentName !== removed.name));
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseDeleteStudent(removed.id);
  scheduleSupabaseSnapshotSave();
  return removed;
}

// --- Teachers ---
export async function getTeachers(classId?: string): Promise<any[]> {
  await initOrLoadDataAsync(true);
  return classId ? teachers.filter(t => t.classId === classId) : [...teachers];
}

export async function getTeacherById(id: string): Promise<any | undefined> {
  await initOrLoadDataAsync(true);
  return teachers.find(t => t.id === id || t.name === id);
}

export async function saveTeacher(teacher: any): Promise<any> {
  const teacherId = (teacher.id && String(teacher.id).trim()) || `t-${Date.now().toString().slice(-6)}`;
  const cleanName = teacher.name ? String(teacher.name).trim().replace(/\s*老师$/, '') : '';

  const existingIdx = teachers.findIndex(t => (t.id && t.id === teacherId) || (cleanName && t.name === cleanName));
  let savedTeacher: any;
  if (existingIdx >= 0) {
    const existing = teachers[existingIdx];
    savedTeacher = {
      ...existing,
      ...teacher,
      id: existing.id || teacherId,
      name: cleanName || existing.name
    };
    teachers[existingIdx] = savedTeacher;
  } else {
    savedTeacher = {
      ...teacher,
      id: teacherId,
      name: cleanName
    };
    teachers.push(savedTeacher);
  }
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseUpsertTeacher(savedTeacher);
  scheduleSupabaseSnapshotSave();
  return savedTeacher;
}

export async function updateTeacher(id: string, updates: any): Promise<any | null> {
  const existingIdx = teachers.findIndex(t => t.id === id);
  if (existingIdx === -1) return null;
  teachers[existingIdx] = { ...teachers[existingIdx], ...updates };
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseUpsertTeacher(teachers[existingIdx]);
  scheduleSupabaseSnapshotSave();
  return teachers[existingIdx];
}

export async function deleteTeacher(id: string): Promise<any | null> {
  const existingIdx = teachers.findIndex(t => t.id === id || t.name === id);
  if (existingIdx === -1) return null;
  const removed = teachers.splice(existingIdx, 1)[0];
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseDeleteTeacher(removed.id);
  scheduleSupabaseSnapshotSave();
  return removed;
}

// --- Attendance Records ---
export async function getAttendanceRecords(filter?: { date?: string; studentId?: string; classId?: string }, assignedClassId?: string): Promise<AttendanceRecord[]> {
  await initOrLoadDataAsync(true);
  let res = [...records];
  if (assignedClassId) {
    res = res.filter(r => r.classId === assignedClassId);
  }
  if (filter?.date) res = res.filter(r => r.date === filter.date);
  if (filter?.studentId) res = res.filter(r => r.studentId === filter.studentId);
  if (filter?.classId) res = res.filter(r => r.classId === filter.classId);
  return res;
}

export async function saveAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
  removeDeletedRecordKey(record.id);
  removeDeletedRecordKey(`${record.studentId}_${record.date}`);

  const existingIdx = records.findIndex(r => r.id === record.id || (r.studentId === record.studentId && r.date === record.date));
  if (existingIdx >= 0) {
    records[existingIdx] = { ...records[existingIdx], ...record };
  } else {
    records.push(record);
  }
  await supabaseUpsertAttendanceRecord(record);
  await saveDataToSupabase();
  return record;
}

export async function updateAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
  return saveAttendanceRecord(record);
}

export async function deleteAttendanceRecord(studentId: string, date: string, recordId?: string): Promise<boolean> {
  const recId = recordId || records.find(r => r.studentId === studentId && r.date === date)?.id || `rec-del-${studentId}-${date}`;
  const studentDateKey = `${studentId}_${date}`;

  addDeletedRecordKey(recId);
  addDeletedRecordKey(studentDateKey);

  setRecords(records.filter(r => {
    if (r.id === recId) return false;
    if (r.studentId === studentId && r.date === date) return false;
    return true;
  }));

  await supabaseDeleteAttendanceRecord(studentId, date, recId);
  await saveDataToSupabase();
  return true;
}

// --- System Config ---
export async function getSystemConfig(): Promise<SystemConfig> {
  await initOrLoadDataAsync(true);
  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
  return {
    ...systemConfig,
    hiddenClassIds: hiddenIds
  };
}

export async function saveSystemConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
  await initOrLoadDataAsync(false);
  const hiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
  const nextConfig = {
    ...systemConfig,
    ...updates,
    hiddenClassIds: Array.isArray(updates.hiddenClassIds) ? updates.hiddenClassIds : (systemConfig.hiddenClassIds || hiddenIds)
  };
  setSystemConfig(nextConfig);
  await supabaseUpsertSystemConfig(systemConfig);
  await saveDataToSupabase();
  return systemConfig;
}

// --- Admin Accounts ---
export async function getAdminAccounts(): Promise<ServerAdminAccount[]> {
  await initOrLoadDataAsync(true);
  return [...adminAccounts];
}

export async function saveAdminAccount(account: ServerAdminAccount): Promise<ServerAdminAccount> {
  account.password = hashPasswordIfNeeded(account.password);
  const existingIdx = adminAccounts.findIndex(a => a.username.toLowerCase() === account.username.toLowerCase());
  let targetAccount: ServerAdminAccount;
  if (existingIdx >= 0) {
    adminAccounts[existingIdx] = { 
      ...adminAccounts[existingIdx], 
      ...account,
      id: adminAccounts[existingIdx].id // preserve ID
    };
    targetAccount = adminAccounts[existingIdx];
  } else {
    targetAccount = { ...account };
    adminAccounts.push(targetAccount);
  }
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseUpsertAdminAccount(targetAccount);
  scheduleSupabaseSnapshotSave();
  return targetAccount;
}

export async function updateAdminAccount(username: string, updates: Partial<ServerAdminAccount>): Promise<ServerAdminAccount | null> {
  const existingIdx = adminAccounts.findIndex(a => a.username.toLowerCase() === username.toLowerCase());
  if (existingIdx === -1) return null;
  if (updates.password) {
    updates.password = hashPasswordIfNeeded(updates.password);
  }
  adminAccounts[existingIdx] = { ...adminAccounts[existingIdx], ...updates };
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseUpsertAdminAccount(adminAccounts[existingIdx]);
  scheduleSupabaseSnapshotSave();
  return adminAccounts[existingIdx];
}

export async function updateAccountPassword(username: string, newPassword: string): Promise<boolean> {
  const target = adminAccounts.find(a => a.username.toLowerCase() === username.toLowerCase());
  if (!target) return false;
  const hashed = hashPasswordIfNeeded(newPassword);
  target.password = hashed;
  if (username.toLowerCase() === 'admin') {
    systemConfig.adminPassword = hashed;
  }
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseUpdateAccountPassword(username, hashed);
  scheduleSupabaseSnapshotSave();
  return true;
}

export async function deleteAdminAccount(username: string): Promise<ServerAdminAccount | null> {
  const existingIdx = adminAccounts.findIndex(a => a.username.toLowerCase() === username.toLowerCase());
  if (existingIdx === -1) return null;
  const deleted = adminAccounts.splice(existingIdx, 1)[0];
  syncVersion++;
  lastModifiedTimestamp = new Date().toISOString();
  saveDataToFile();
  await supabaseDeleteAdminAccount(username);
  scheduleSupabaseSnapshotSave();
  return deleted;
}

// --- State Reset & Sync ---
export function getLastSupabaseFetchTime(): number {
  return lastSupabaseFetchTime;
}

export async function resetAllData(payload?: ChurchStatePayload): Promise<void> {
  const resetPayload = payload || getFullStatePayload();
  await supabaseResetAllData(resetPayload);
  await saveDataToSupabase();
}

/**
 * Unified Data Access Layer interface export
 */
export const dataStore = {
  // Classes
  getClasses,
  getClassById,
  saveClass,
  updateClass,
  saveClassVisibility,
  deleteClass,

  // Students
  getStudents,
  getStudentById,
  saveStudent,
  saveStudentsBatch,
  updateStudent,
  deleteStudent,

  // Teachers
  getTeachers,
  getTeacherById,
  saveTeacher,
  updateTeacher,
  deleteTeacher,

  // Attendance Records
  getAttendanceRecords,
  saveAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,

  // System Config
  getSystemConfig,
  saveSystemConfig,

  // Admin Accounts
  getAdminAccounts,
  saveAdminAccount,
  updateAdminAccount,
  updateAccountPassword,
  deleteAdminAccount,

  // State & Sync
  resetAllData,
  getFullState: getFullStatePayload,
  initOrLoadDataAsync,
  saveDataToSupabase,
  mergeClientData,
  getLastSupabaseFetchTime
};

