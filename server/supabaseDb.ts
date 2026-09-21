import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig } from '../src/types';
import type { ServerAdminAccount } from './initialData';

let supabaseClient: SupabaseClient | null = null;
let hasLoggedConfigStatus = false;

/**
 * Lazy-initializes and returns the server-side Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY (preferred for backend administrative access) or SUPABASE_ANON_KEY.
 * Returns null if Supabase environment variables are not configured, preventing cold-start crashes.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (!hasLoggedConfigStatus) {
      console.log('[Supabase DB] Notice: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Using local storage fallback.');
      hasLoggedConfigStatus = true;
    }
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      if (!hasLoggedConfigStatus) {
        console.log(`[Supabase DB] Connected to Supabase PostgreSQL at ${url}`);
        hasLoggedConfigStatus = true;
      }
    } catch (err) {
      console.error('[Supabase DB] Error initializing Supabase client:', err);
      return null;
    }
  }

  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export interface ChurchStatePayload {
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  teachers: any[];
  adminAccounts: ServerAdminAccount[];
  systemConfig: SystemConfig;
  activeSunday: string;
  syncVersion: number;
  deletedRecordKeys: string[];
  hiddenClassIds?: string[];
  updatedAt: string;
}

/**
 * Loads the latest authoritative state from Supabase PostgreSQL.
 * First queries church_app_state for instantaneous atomic restore.
 * If not present, falls back to relational tables (classes, students, attendance_records, etc.).
 */
export async function loadFromSupabase(): Promise<ChurchStatePayload | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    // 1. Primary path: query church_app_state (high-speed JSONB snapshot)
    const { data: stateRow, error: stateErr } = await client
      .from('church_app_state')
      .select('state, sync_version, updated_at')
      .eq('id', 'bethel_church_data')
      .maybeSingle();

    if (!stateErr && stateRow && stateRow.state) {
      const parsed = stateRow.state as ChurchStatePayload;
      if (typeof stateRow.sync_version === 'number' && (!parsed.syncVersion || parsed.syncVersion < stateRow.sync_version)) {
        parsed.syncVersion = stateRow.sync_version;
      }
      return parsed;
    }

    // 2. Relational fallback: read from individual relational tables if created
    const [
      classesRes,
      studentsRes,
      recordsRes,
      teachersRes,
      adminsRes,
      configRes
    ] = await Promise.allSettled([
      client.from('classes').select('*'),
      client.from('students').select('*'),
      client.from('attendance_records').select('*'),
      client.from('teachers').select('*'),
      client.from('admin_accounts').select('*'),
      client.from('system_config').select('*').eq('id', 'bethel_config').maybeSingle()
    ]);

    const hasClasses = classesRes.status === 'fulfilled' && classesRes.value.data && classesRes.value.data.length > 0;
    const hasStudents = studentsRes.status === 'fulfilled' && studentsRes.value.data && studentsRes.value.data.length > 0;

    if (hasClasses || hasStudents) {
      const rawClasses = classesRes.status === 'fulfilled' && classesRes.value.data ? classesRes.value.data : [];
      const rawStudents = studentsRes.status === 'fulfilled' && studentsRes.value.data ? studentsRes.value.data : [];
      const rawRecords = recordsRes.status === 'fulfilled' && recordsRes.value.data ? recordsRes.value.data : [];
      const rawTeachers = teachersRes.status === 'fulfilled' && teachersRes.value.data ? teachersRes.value.data : [];
      const rawAdmins = adminsRes.status === 'fulfilled' && adminsRes.value.data ? adminsRes.value.data : [];
      const rawConfig = configRes.status === 'fulfilled' && configRes.value.data ? configRes.value.data : null;

      const mappedClasses: ClassGroup[] = rawClasses.map(c => ({
        id: c.id,
        name: c.name,
        ageRange: c.age_range || '',
        teacher: c.teacher || '',
        subjectTeacher: c.subject_teacher || undefined,
        classroom: c.classroom || '',
        color: c.color || 'bg-blue-500',
        groupType: c.group_type || 'sunday_school',
        description: c.description || undefined,
        isHiddenFromHome: Boolean(c.is_hidden_from_home)
      }));

      const mappedStudents: Student[] = rawStudents.map(s => ({
        id: s.id,
        name: s.name,
        gender: s.gender || 'boy',
        birthDate: s.birth_date || '2015-01-01',
        age: typeof s.age === 'number' ? s.age : undefined,
        classId: s.class_id || '',
        parentName: s.parent_name || '',
        parentPhone: s.parent_phone || '',
        memberCode: s.member_code || undefined,
        avatarIcon: s.avatar_icon || undefined,
        joinDate: s.join_date || '2026-01-01'
      }));

      const mappedRecords: AttendanceRecord[] = rawRecords.map(r => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        classId: r.class_id,
        date: r.date,
        timestamp: r.timestamp,
        timeStr: r.time_str || '09:00',
        status: r.status,
        method: r.method || 'attendance',
        memoryVerseCompleted: Boolean(r.memory_verse_completed),
        offeringCompleted: Boolean(r.offering_completed),
        notes: r.notes || undefined
      }));

      const mappedTeachers = rawTeachers.map(t => ({
        id: t.id,
        name: t.name,
        gender: t.gender || 'girl',
        phone: t.phone || '',
        wechat: t.wechat || '',
        classId: t.class_id || '',
        roleTitle: t.role_title || '班主任',
        joinDate: t.join_date || '2026-01-01',
        notes: t.notes || undefined
      }));

      const mappedAdmins: ServerAdminAccount[] = rawAdmins.map(a => ({
        id: a.id,
        username: a.username,
        displayName: a.display_name,
        role: a.role,
        password: a.password,
        createdAt: a.created_at
      }));

      const configData = rawConfig?.config || {};
      const activeSunday = rawConfig?.active_sunday || '';
      const syncVersion = rawConfig?.sync_version || 1;
      const deletedRecordKeys = Array.isArray(rawConfig?.deleted_record_keys) ? rawConfig.deleted_record_keys : [];

      return {
        classes: mappedClasses,
        students: mappedStudents,
        records: mappedRecords,
        teachers: mappedTeachers,
        adminAccounts: mappedAdmins,
        systemConfig: configData,
        activeSunday,
        syncVersion,
        deletedRecordKeys,
        updatedAt: rawConfig?.updated_at || new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('[Supabase DB] Failed to load data from Supabase:', err);
  }

  return null;
}

/**
 * Persists data to Supabase PostgreSQL.
 * Executes atomic upsert into church_app_state, and syncs to relational tables if present.
 */
export async function saveToSupabase(payload: ChurchStatePayload): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // 1. Primary write: church_app_state (atomic state snapshot)
    const { error: stateErr } = await client
      .from('church_app_state')
      .upsert({
        id: 'bethel_church_data',
        state: payload,
        sync_version: payload.syncVersion,
        updated_at: payload.updatedAt || new Date().toISOString()
      }, { onConflict: 'id' });

    if (stateErr) {
      console.warn('[Supabase DB] church_app_state upsert notice:', stateErr.message);
    }

    // 2. Relational write (non-blocking best-effort sync for SQL Editor / Dashboard exploration)
    syncToRelationalTables(client, payload).catch(err => {
      // Relational sync error is non-fatal if tables are not yet created via SQL Editor
    });

    return !stateErr;
  } catch (err) {
    console.warn('[Supabase DB] Error saving to Supabase:', err);
    return false;
  }
}

/**
 * Synchronizes individual arrays to PostgreSQL relational tables.
 */
async function syncToRelationalTables(client: SupabaseClient, payload: ChurchStatePayload) {
  try {
    // Sync system_config
    if (payload.systemConfig) {
      await client.from('system_config').upsert({
        id: 'bethel_config',
        config: payload.systemConfig,
        active_sunday: payload.activeSunday,
        sync_version: payload.syncVersion,
        deleted_record_keys: payload.deletedRecordKeys || [],
        updated_at: payload.updatedAt || new Date().toISOString()
      }, { onConflict: 'id' });
    }

    // Sync classes
    if (Array.isArray(payload.classes) && payload.classes.length > 0) {
      const rows = payload.classes.map(c => ({
        id: c.id,
        name: c.name,
        age_range: c.ageRange,
        teacher: c.teacher,
        subject_teacher: c.subjectTeacher || null,
        classroom: c.classroom,
        color: c.color,
        group_type: c.groupType || 'sunday_school',
        description: c.description || null,
        is_hidden_from_home: Boolean(c.isHiddenFromHome),
        updated_at: new Date().toISOString()
      }));
      await client.from('classes').upsert(rows, { onConflict: 'id' });
    }

    // Sync students
    if (Array.isArray(payload.students) && payload.students.length > 0) {
      const rows = payload.students.map(s => ({
        id: s.id,
        name: s.name,
        gender: s.gender,
        birth_date: s.birthDate,
        age: s.age || null,
        class_id: s.classId,
        parent_name: s.parentName,
        parent_phone: s.parentPhone,
        member_code: s.memberCode || null,
        avatar_icon: s.avatarIcon || null,
        join_date: s.joinDate,
        updated_at: new Date().toISOString()
      }));
      await client.from('students').upsert(rows, { onConflict: 'id' });
    }

    // Sync teachers
    if (Array.isArray(payload.teachers) && payload.teachers.length > 0) {
      const rows = payload.teachers.map(t => ({
        id: t.id,
        name: t.name,
        gender: t.gender || 'girl',
        phone: t.phone || null,
        wechat: t.wechat || null,
        class_id: t.classId || null,
        role_title: t.roleTitle || '班主任',
        join_date: t.joinDate || '2026-01-01',
        notes: t.notes || null,
        updated_at: new Date().toISOString()
      }));
      await client.from('teachers').upsert(rows, { onConflict: 'id' });
    }

    // Sync admin accounts
    if (Array.isArray(payload.adminAccounts) && payload.adminAccounts.length > 0) {
      const rows = payload.adminAccounts.map(a => ({
        id: a.id,
        username: a.username,
        display_name: a.displayName,
        role: a.role,
        password: a.password,
        created_at: a.createdAt
      }));
      await client.from('admin_accounts').upsert(rows, { onConflict: 'id' });
    }

    // Sync attendance records (batching to avoid payload limit)
    if (Array.isArray(payload.records) && payload.records.length > 0) {
      const rows = payload.records.map(r => ({
        id: r.id,
        student_id: r.studentId,
        student_name: r.studentName,
        class_id: r.classId,
        date: r.date,
        timestamp: r.timestamp,
        time_str: r.timeStr,
        status: r.status,
        method: r.method || 'attendance',
        memory_verse_completed: Boolean(r.memoryVerseCompleted),
        offering_completed: Boolean(r.offeringCompleted),
        notes: r.notes || null,
        updated_at: new Date().toISOString()
      }));

      // Upsert in chunks of 100
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        await client.from('attendance_records').upsert(chunk, { onConflict: 'id' });
      }
    }
  } catch (err) {
    // Non-fatal error
  }
}
