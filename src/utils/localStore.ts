import { initialClasses, initialStudents, initialSystemConfig, generateInitialRecords, initialTeachers } from '../mockData';
import type { ClassGroup, Student, SystemConfig, AttendanceRecord, AdminUser, AdminAccount, Teacher } from '../types';
import { getActiveSundayDate } from './dateUtils';

const STORAGE_KEYS = {
  CLASSES: 'bethel_classes',
  STUDENTS: 'bethel_students',
  CONFIG: 'bethel_config',
  RECORDS: 'bethel_records',
  ACTIVE_SUNDAY: 'bethel_active_sunday',
  INITIALIZED: 'bethel_data_initialized',
  ACCOUNTS: 'bethel_admin_accounts',
  HIDDEN_CLASS_IDS: 'bethel_hidden_class_ids',
  TEACHERS: 'bethel_teachers',
  DELETED_RECORD_KEYS: 'bethel_deleted_record_keys'
};

export function getLocalDeletedRecordKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_RECORD_KEYS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function addLocalDeletedRecordKey(key: string) {
  if (typeof window === 'undefined' || !key) return;
  try {
    const set = getLocalDeletedRecordKeys();
    set.add(key);
    localStorage.setItem(STORAGE_KEYS.DELETED_RECORD_KEYS, JSON.stringify(Array.from(set)));
  } catch {}
}

export function removeLocalDeletedRecordKey(key: string) {
  if (typeof window === 'undefined' || !key) return;
  try {
    const set = getLocalDeletedRecordKeys();
    set.delete(key);
    localStorage.setItem(STORAGE_KEYS.DELETED_RECORD_KEYS, JSON.stringify(Array.from(set)));
  } catch {}
}

export function getLocalHiddenClassIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HIDDEN_CLASS_IDS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveLocalHiddenClassIds(ids: string[] | Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    const arr = Array.from(ids);
    localStorage.setItem(STORAGE_KEYS.HIDDEN_CLASS_IDS, JSON.stringify(arr));
  } catch {}
}

export const DEFAULT_ACCOUNTS: AdminAccount[] = [
  {
    id: 'acc-admin',
    username: 'admin',
    displayName: '总管理员',
    role: 'superadmin',
    password: 'bethel2026',
    createdAt: '2026-01-01'
  },
  {
    id: 'acc-teacher',
    username: 'teacher',
    displayName: '主日学上课老师',
    role: 'teacher',
    password: 'bethel123',
    createdAt: '2026-01-01'
  },
  {
    id: 'acc-fellowship',
    username: 'fellowship',
    displayName: '团契带领同工',
    role: 'fellowship_leader',
    password: 'fellowship123',
    createdAt: '2026-01-01'
  }
];

export function getLocalAccounts(): AdminAccount[] {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ACCOUNTS;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

export function saveLocalAccounts(accounts: AdminAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Failed to save accounts to localStorage', e);
  }
}

export function saveLocalAccount(accountData: Partial<AdminAccount> & { username: string }): AdminAccount[] {
  const accounts = getLocalAccounts();
  const cleanUsername = accountData.username.trim().toLowerCase();
  const index = accounts.findIndex(a => a.username.toLowerCase() === cleanUsername);

  if (index >= 0) {
    // Update existing account
    accounts[index] = {
      ...accounts[index],
      displayName: accountData.displayName || accounts[index].displayName,
      role: (cleanUsername === 'admin' ? 'superadmin' : (accountData.role || accounts[index].role)),
      assignedClassId: accountData.role === 'superadmin' ? undefined : (accountData.assignedClassId !== undefined ? accountData.assignedClassId : accounts[index].assignedClassId),
      password: accountData.password || accounts[index].password
    };
  } else {
    // Create new account
    const newAcc: AdminAccount = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: cleanUsername,
      displayName: accountData.displayName || cleanUsername,
      role: accountData.role || 'teacher',
      assignedClassId: accountData.role === 'superadmin' ? undefined : accountData.assignedClassId,
      password: accountData.password || '123456',
      createdAt: new Date().toISOString().split('T')[0]
    };
    accounts.push(newAcc);
  }

  saveLocalAccounts(accounts);
  return accounts;
}

export function deleteLocalAccount(username: string): AdminAccount[] {
  const accounts = getLocalAccounts();
  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername === 'admin') {
    throw new Error('不能删除系统根总管理员账号（admin）');
  }
  const filtered = accounts.filter(a => a.username.toLowerCase() !== cleanUsername);
  saveLocalAccounts(filtered);
  return filtered;
}

export function updateLocalAccountPassword(username: string, newPassword: string): AdminAccount[] {
  const accounts = getLocalAccounts();
  const cleanUsername = username.trim().toLowerCase();
  const target = accounts.find(a => a.username.toLowerCase() === cleanUsername);
  if (!target) {
    throw new Error(`未找到账号 ${username}`);
  }
  target.password = newPassword.trim();
  saveLocalAccounts(accounts);
  return accounts;
}

export function getLocalData() {
  if (typeof window === 'undefined') {
    return {
      classes: initialClasses,
      students: initialStudents,
      config: initialSystemConfig,
      records: generateInitialRecords(),
      activeSunday: getActiveSundayDate()
    };
  }

  try {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInitialized) {
      const records = generateInitialRecords(initialStudents);
      const currentSunday = getActiveSundayDate();
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(initialClasses));
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initialStudents));
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(initialSystemConfig));
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SUNDAY, currentSunday);
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(initialTeachers));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

      return {
        classes: initialClasses,
        students: initialStudents,
        config: initialSystemConfig,
        records,
        activeSunday: currentSunday,
        teachers: initialTeachers
      };
    }

    const rawClasses = localStorage.getItem(STORAGE_KEYS.CLASSES);
    let classes: ClassGroup[] = rawClasses !== null ? JSON.parse(rawClasses) : initialClasses;

    const rawStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    let students: Student[] = rawStudents !== null ? JSON.parse(rawStudents) : initialStudents;

    // Ensure classes and students are valid arrays
    if (!Array.isArray(classes)) {
      classes = initialClasses;
    }
    if (!Array.isArray(students)) {
      students = initialStudents;
    }

    // Filter out 雅歌团契 completely
    classes = classes.filter(c => c.id !== 'class-8' && c.name !== '雅歌团契');
    students = students.filter(s => s.classId !== 'class-8' && s.id !== 's-801' && s.id !== 's-802');

    const rawConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
    const config: SystemConfig = rawConfig ? { ...initialSystemConfig, ...JSON.parse(rawConfig) } : initialSystemConfig;

    classes = classes.map(c => {
      const isHidden = typeof c.isHiddenFromHome === 'boolean'
        ? c.isHiddenFromHome
        : (Array.isArray(config.hiddenClassIds) ? config.hiddenClassIds.includes(c.id) : false);
      const match = initialClasses.find(ic => ic.id === c.id || ic.name === c.name);
      return {
        ...c,
        subjectTeacher: typeof c.subjectTeacher === 'string' ? c.subjectTeacher : (match?.subjectTeacher || ''),
        isHiddenFromHome: isHidden
      };
    });
    
    // Always persist normalized state
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    const allHiddenIds = classes.filter(c => c.isHiddenFromHome === true).map(c => c.id);
    saveLocalHiddenClassIds(allHiddenIds);
    config.hiddenClassIds = allHiddenIds;
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));

    const rawRecords = localStorage.getItem(STORAGE_KEYS.RECORDS);
    let records: AttendanceRecord[] = rawRecords ? JSON.parse(rawRecords) : generateInitialRecords(students);
    records = Array.isArray(records) ? records.filter(r => r.classId !== 'class-8' && r.studentId !== 's-801' && r.studentId !== 's-802') : [];

    const delSet = getLocalDeletedRecordKeys();
    if (delSet.size > 0) {
      records = records.filter(r => !delSet.has(r.id) && !delSet.has(`${r.studentId}_${r.date}`));
    }

    const rawSunday = localStorage.getItem(STORAGE_KEYS.ACTIVE_SUNDAY);
    const activeSunday = rawSunday || getActiveSundayDate();

    const rawTeachers = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    let teachers: Teacher[] = initialTeachers;
    if (rawTeachers) {
      try {
        const parsed = JSON.parse(rawTeachers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          teachers = parsed;
        }
      } catch {}
    }

    return { classes, students, config, records, activeSunday, teachers };
  } catch (e) {
    console.warn('Failed reading from localStorage, using fallback defaults', e);
    return {
      classes: initialClasses,
      students: initialStudents,
      config: initialSystemConfig,
      records: generateInitialRecords(initialStudents),
      activeSunday: getActiveSundayDate(),
      teachers: initialTeachers
    };
  }
}

export function saveLocalData(data: {
  classes?: ClassGroup[];
  students?: Student[];
  config?: SystemConfig;
  records?: AttendanceRecord[];
  activeSunday?: string;
  accounts?: AdminAccount[];
  teachers?: Teacher[];
  deletedRecordKeys?: string[] | Set<string>;
}) {
  if (typeof window === 'undefined') return;
  try {
    if (data.classes) {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(data.classes));
      const hiddenIds = data.classes.filter(c => !!c.isHiddenFromHome).map(c => c.id);
      saveLocalHiddenClassIds(hiddenIds);
    }
    if (data.students) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(data.students));
    if (data.config) localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data.config));
    if (data.records) localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(data.records));
    if (data.activeSunday) localStorage.setItem(STORAGE_KEYS.ACTIVE_SUNDAY, data.activeSunday);
    if (data.accounts) localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(data.accounts));
    if (data.teachers) localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(data.teachers));
    if (data.deletedRecordKeys) {
      const arr = Array.isArray(data.deletedRecordKeys) ? data.deletedRecordKeys : Array.from(data.deletedRecordKeys);
      localStorage.setItem(STORAGE_KEYS.DELETED_RECORD_KEYS, JSON.stringify(arr));
    }
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  } catch (e) {
    console.warn('Failed saving to localStorage', e);
  }
}

export function resetLocalData() {
  if (typeof window === 'undefined') return;
  try {
    const currentSunday = getActiveSundayDate();
    const records = generateInitialRecords(initialStudents);
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(initialClasses));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initialStudents));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(initialSystemConfig));
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SUNDAY, currentSunday);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
    localStorage.removeItem(STORAGE_KEYS.HIDDEN_CLASS_IDS);
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(initialTeachers));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    return {
      classes: initialClasses,
      students: initialStudents,
      config: initialSystemConfig,
      records,
      accounts: DEFAULT_ACCOUNTS,
      activeSunday: currentSunday,
      teachers: initialTeachers
    };
  } catch (e) {
    console.warn('Failed resetting localStorage', e);
  }
}

export interface BackupData {
  version: string;
  exportDate: string;
  classes: ClassGroup[];
  students: Student[];
  config: SystemConfig;
  records: AttendanceRecord[];
  accounts: AdminAccount[];
  teachers?: Teacher[];
  hiddenClassIds?: string[];
  activeSunday: string;
}

export function exportLocalBackup(): string {
  const local = getLocalData();
  const accounts = getLocalAccounts();
  const hiddenClassIds = Array.from(getLocalHiddenClassIds());
  const backup: BackupData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    classes: local.classes,
    students: local.students,
    config: local.config,
    records: local.records,
    accounts,
    teachers: local.teachers,
    hiddenClassIds,
    activeSunday: local.activeSunday
  };
  return JSON.stringify(backup, null, 2);
}

export function importLocalBackup(jsonStr: string): {
  classes: ClassGroup[];
  students: Student[];
  config: SystemConfig;
  records: AttendanceRecord[];
  accounts: AdminAccount[];
  teachers: Teacher[];
  hiddenClassIds: string[];
  activeSunday: string;
} {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('无效的备份数据格式');
  }
  if (!Array.isArray(parsed.classes) || !Array.isArray(parsed.students)) {
    throw new Error('备份数据中缺少必要的班级或学生数据列表');
  }
  const classes = parsed.classes;
  const students = parsed.students;
  const config = parsed.config ? { ...initialSystemConfig, ...parsed.config } : initialSystemConfig;
  const records = Array.isArray(parsed.records) ? parsed.records : [];
  const accounts = Array.isArray(parsed.accounts) && parsed.accounts.length > 0 ? parsed.accounts : DEFAULT_ACCOUNTS;
  const teachers = Array.isArray(parsed.teachers) ? parsed.teachers : [];
  const hiddenClassIds = Array.isArray(parsed.hiddenClassIds) ? parsed.hiddenClassIds : [];
  const activeSunday = parsed.activeSunday || '2026-09-13';

  saveLocalData({
    classes,
    students,
    config,
    records,
    accounts,
    teachers,
    activeSunday
  });
  saveLocalAccounts(accounts);
  if (hiddenClassIds.length > 0) {
    saveLocalHiddenClassIds(hiddenClassIds);
  }

  return { classes, students, config, records, accounts, teachers, hiddenClassIds, activeSunday };
}

export function localLogin(username: string, password: string): AdminUser | null {
  const cleanU = username.trim().toLowerCase();
  const cleanP = password.trim();

  // 1. Check in stored accounts
  const accounts = getLocalAccounts();
  const matched = accounts.find(a => a.username.toLowerCase() === cleanU);
  if (matched) {
    // For admin account, also allow systemConfig.adminPassword
    const local = getLocalData();
    const isPassMatched = matched.password === cleanP || 
      (cleanU === 'admin' && (cleanP === (local.config.adminPassword || 'bethel2026') || cleanP === 'bethel2026'));
    
    if (isPassMatched) {
      return {
        username: matched.username,
        displayName: matched.displayName,
        role: matched.role,
        assignedClassId: matched.assignedClassId,
        token: `local-${matched.username}-token-${Date.now()}`
      };
    }
  }

  // 2. Superadmin fallback using adminPassword
  const local = getLocalData();
  const adminPass = local.config.adminPassword || 'bethel2026';
  if (cleanU === 'admin' && (cleanP === adminPass || cleanP === 'bethel2026')) {
    return {
      username: 'admin',
      displayName: '总管理员',
      role: 'superadmin',
      token: 'local-admin-token'
    };
  }

  return null;
}
