import type { SupabaseClient } from '@supabase/supabase-js';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig, Teacher } from '../src/types.js';
import type { ServerAdminAccount } from './initialData.js';
import { getSupabase, isSupabaseConfigured } from './supabase.js';

export { getSupabase, isSupabaseConfigured };

export interface ChurchStatePayload {
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  teachers: Teacher[];
  adminAccounts: ServerAdminAccount[];
  systemConfig: SystemConfig;
  activeSunday: string;
  syncVersion: number;
  deletedRecordKeys: string[];
  hiddenClassIds?: string[];
  updatedAt: string;
}

/**
 * Loads the latest authoritative state from Supabase PostgreSQL using the 8 canonical tables:
 * 1. classes
 * 2. students (classes -> students)
 * 3. teachers (classes -> teachers)
 * 4. attendance_records (students -> attendance_records, classes -> attendance_records)
 * 5. admin_accounts
 * 6. system_config
 * 7. deleted_attendance_records
 * 8. app_sync_state
 */
export async function loadFromSupabase(): Promise<ChurchStatePayload | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    // Query the 8 canonical relational tables in parallel
    const [
      classesRes,
      studentsRes,
      teachersRes,
      recordsRes,
      adminsRes,
      configRes,
      deletedRecsRes,
      syncStateRes,
      legacyStateRes
    ] = await Promise.allSettled([
      client.from('classes').select('*').order('id'),
      client.from('students').select('*').order('id'),
      client.from('teachers').select('*').order('id'),
      client.from('attendance_records').select('*'),
      client.from('admin_accounts').select('*'),
      client.from('system_config').select('*').eq('id', 'bethel_config').maybeSingle(),
      client.from('deleted_attendance_records').select('*'),
      client.from('app_sync_state').select('*').eq('id', 'bethel_sync_state').maybeSingle(),
      client.from('church_app_state').select('state, sync_version').eq('id', 'bethel_church_data').maybeSingle()
    ]);

    if (classesRes.status === 'rejected') {
      throw new Error(`Supabase query 'classes' failed: ${classesRes.reason?.message || JSON.stringify(classesRes.reason)}`);
    }
    if (studentsRes.status === 'rejected') {
      throw new Error(`Supabase query 'students' failed: ${studentsRes.reason?.message || JSON.stringify(studentsRes.reason)}`);
    }

    const rawClasses = classesRes.status === 'fulfilled' && classesRes.value.data ? classesRes.value.data : [];
    const rawStudents = studentsRes.status === 'fulfilled' && studentsRes.value.data ? studentsRes.value.data : [];
    const rawTeachers = teachersRes.status === 'fulfilled' && teachersRes.value.data ? teachersRes.value.data : [];
    const rawRecords = recordsRes.status === 'fulfilled' && recordsRes.value.data ? recordsRes.value.data : [];
    const rawAdmins = adminsRes.status === 'fulfilled' && adminsRes.value.data ? adminsRes.value.data : [];
    const rawConfig = configRes.status === 'fulfilled' && configRes.value.data ? configRes.value.data : null;
    const rawDeleted = deletedRecsRes.status === 'fulfilled' && deletedRecsRes.value.data ? deletedRecsRes.value.data : [];
    const rawSyncState = syncStateRes.status === 'fulfilled' && syncStateRes.value.data ? syncStateRes.value.data : null;
    const rawLegacyState = legacyStateRes.status === 'fulfilled' && legacyStateRes.value.data?.state ? legacyStateRes.value.data.state : null;

    // Check if the relational tables contain populated state
    if (rawClasses.length > 0 || rawStudents.length > 0) {
      const mappedClasses: ClassGroup[] = rawClasses.map(c => ({
        id: c.id,
        name: c.name,
        ageRange: c.age_range || c.ageRange || '',
        teacher: c.teacher || '',
        subjectTeacher: typeof c.subject_teacher === 'string' ? c.subject_teacher : (typeof c.subjectTeacher === 'string' ? c.subjectTeacher : (c.subject_teachers || '')),
        classroom: c.classroom || '',
        color: c.color || 'bg-amber-500',
        groupType: c.group_type || c.groupType || 'sunday_school',
        description: c.description || undefined,
        isHiddenFromHome: Boolean(c.is_hidden_from_home ?? c.is_hidden ?? c.isHiddenFromHome)
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

      let mappedTeachers: Teacher[] = rawTeachers.map(t => ({
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

      // Fallback to snapshot teachers only if the relational table is completely empty
      const snapshotTeachers = rawSyncState?.snapshot?.teachers || rawLegacyState?.teachers || rawConfig?.config?.teachers;
      if (mappedTeachers.length === 0 && Array.isArray(snapshotTeachers) && snapshotTeachers.length > 0) {
        mappedTeachers = snapshotTeachers;
      }

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

      const mappedAdmins: ServerAdminAccount[] = rawAdmins.map(a => ({
        id: a.id || `acc-${a.username}`,
        username: a.username,
        displayName: a.display_name || a.displayName || a.username,
        role: a.role || 'teacher',
        password: a.password,
        createdAt: a.created_at || a.createdAt || '2026-01-01',
        assignedClassId: a.assigned_class_id || a.assignedClassId || undefined
      }));

      // Deleted record keys from deleted_attendance_records table
      const deletedKeysFromTable: string[] = rawDeleted.map(d => d.id || `${d.student_id}_${d.date}`).filter(Boolean);
      const deletedKeysFromConfig = Array.isArray(rawConfig?.deleted_record_keys) ? rawConfig.deleted_record_keys : [];
      const combinedDeletedKeys = Array.from(new Set([...deletedKeysFromTable, ...deletedKeysFromConfig]));

      // Determine active Sunday and sync version from app_sync_state or system_config
      const syncVersion = rawSyncState?.sync_version ?? rawConfig?.sync_version ?? 1;
      const activeSunday = rawSyncState?.active_sunday ?? rawConfig?.active_sunday ?? '';

      // Construct systemConfig from system_config columns or JSON
      const systemConfigData: SystemConfig = {
        churchName: rawConfig?.church_name || rawConfig?.config?.churchName || '伯特利教会',
        schoolTitle: rawConfig?.school_title || rawConfig?.config?.schoolTitle || '主日学与团契IMS',
        allowedDayOfWeek: rawConfig?.allowed_day_of_week ?? rawConfig?.config?.allowedDayOfWeek ?? 0,
        checkinStartTime: rawConfig?.checkin_start_time || rawConfig?.config?.checkinStartTime || '11:00',
        checkinEndTime: rawConfig?.checkin_end_time || rawConfig?.config?.checkinEndTime || '16:00',
        testMode: rawConfig?.test_mode ?? rawConfig?.config?.testMode ?? false,
        currentYear: rawConfig?.current_year ?? rawConfig?.config?.currentYear ?? 2026,
        currentSemester: rawConfig?.current_semester || rawConfig?.config?.currentSemester || '2026年秋季学期',
        weeklyMemoryVerse: rawConfig?.weekly_memory_verse || rawConfig?.config?.weeklyMemoryVerse || '',
        memoryVerseReference: rawConfig?.memory_verse_reference || rawConfig?.config?.memoryVerseReference || '',
        qrSecretToken: rawConfig?.qr_secret_token || rawConfig?.config?.qrSecretToken || 'BETHEL_SUNDAY_2026_TOKEN',
        enableMemoryVerseOption: rawConfig?.enable_memory_verse_option ?? rawConfig?.config?.enableMemoryVerseOption ?? true,
        defaultMemoryVerseChecked: rawConfig?.default_memory_verse_checked ?? rawConfig?.config?.defaultMemoryVerseChecked ?? true,
        enableOfferingOption: rawConfig?.enable_offering_option ?? rawConfig?.config?.enableOfferingOption ?? false,
        defaultOfferingChecked: rawConfig?.default_offering_checked ?? rawConfig?.config?.defaultOfferingChecked ?? false,
        enableLateRule: rawConfig?.enable_late_rule ?? rawConfig?.config?.enableLateRule ?? true,
        lateThresholdTime: rawConfig?.late_threshold_time || rawConfig?.config?.lateThresholdTime || '15:00',
        enableExcusedNote: rawConfig?.enable_excused_note ?? rawConfig?.config?.enableExcusedNote ?? true,
        enableCheckinPopup: rawConfig?.enable_checkin_popup ?? rawConfig?.config?.enableCheckinPopup ?? true,
        adminPassword: rawConfig?.admin_password || rawConfig?.config?.adminPassword || 'bethel2026',
        hiddenClassIds: Array.isArray(rawConfig?.hidden_class_ids) ? rawConfig.hidden_class_ids : (rawConfig?.config?.hiddenClassIds || [])
      };

      return {
        classes: mappedClasses,
        students: mappedStudents,
        records: mappedRecords,
        teachers: mappedTeachers,
        adminAccounts: mappedAdmins,
        systemConfig: systemConfigData,
        activeSunday,
        syncVersion,
        deletedRecordKeys: combinedDeletedKeys,
        updatedAt: rawSyncState?.updated_at || rawConfig?.updated_at || new Date().toISOString()
      };
    }

    // Fallback: Check app_sync_state snapshot or church_app_state
    if (rawSyncState?.snapshot) {
      return rawSyncState.snapshot as ChurchStatePayload;
    }
    if (rawLegacyState) {
      return rawLegacyState as ChurchStatePayload;
    }
  } catch (err) {
    console.warn('[Supabase DB] Failed to load data from Supabase relational tables:', err);
    throw err;
  }

  return null;
}

/**
 * Persists data to Supabase PostgreSQL using the 8 canonical tables:
 *
 * Execution order adheres strictly to Foreign Key dependencies:
 * 1. classes (parent of students, teachers, and attendance_records)
 * 2. teachers (references classes)
 * 3. students (references classes)
 * 4. attendance_records (references students and classes)
 * 5. admin_accounts
 * 6. system_config
 * 7. deleted_attendance_records
 * 8. app_sync_state
 */
export async function saveToSupabase(payload: ChurchStatePayload): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    // --------------------------------------------------------------------------
    // Step 1: Upsert 'classes' table (Root parent entity) & reconcile deleted
    // --------------------------------------------------------------------------
    if (Array.isArray(payload.classes) && payload.classes.length > 0) {
      const classRows = payload.classes.map(c => ({
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
      await Promise.resolve(client.from('classes').upsert(classRows, { onConflict: 'id' }));

      // Reconcile deleted classes in Supabase
      try {
        const { data: existingClasses } = await client.from('classes').select('id');
        if (existingClasses && existingClasses.length > 0) {
          const keepSet = new Set(payload.classes.map(c => c.id));
          const toDelete = existingClasses.map(c => c.id).filter(id => !keepSet.has(id));
          if (toDelete.length > 0) {
            await client.from('classes').delete().in('id', toDelete);
          }
        }
      } catch (e) {}
    }

    // --------------------------------------------------------------------------
    // Step 2: Upsert 'teachers' table (Relationship: classes -> teachers) & reconcile deleted
    // --------------------------------------------------------------------------
    if (Array.isArray(payload.teachers) && payload.teachers.length > 0) {
      const validClassIds = new Set(Array.isArray(payload.classes) ? payload.classes.map(c => String(c.id)) : []);
      const teacherRows = payload.teachers.map(t => ({
        id: t.id,
        name: t.name,
        gender: t.gender || 'girl',
        phone: t.phone || null,
        wechat: t.wechat || null,
        class_id: (t.classId && String(t.classId).trim() !== '' && validClassIds.has(String(t.classId).trim())) ? String(t.classId).trim() : null,
        role_title: t.roleTitle || '班主任',
        join_date: t.joinDate || '2026-01-01',
        notes: t.notes || null,
        updated_at: new Date().toISOString()
      }));
      const { error: upsertError } = await client.from('teachers').upsert(teacherRows, { onConflict: 'id' });
      if (upsertError) {
        console.warn('[Supabase DB Error] saveToSupabase teachers upsert failed:', upsertError);
      }

      // Reconcile deleted teachers in Supabase
      try {
        const { data: existingTeachers, error: selectError } = await client.from('teachers').select('id');
        if (selectError) {
          console.warn('[Supabase DB Error] saveToSupabase teachers select failed:', selectError);
        }
        if (existingTeachers && existingTeachers.length > 0) {
          const keepSet = new Set(payload.teachers.map(t => t.id));
          const toDelete = existingTeachers.map(t => t.id).filter(id => !keepSet.has(id));
          if (toDelete.length > 0) {
            const { error: deleteError } = await client.from('teachers').delete().in('id', toDelete);
            if (deleteError) {
              console.warn('[Supabase DB Error] saveToSupabase teachers delete failed:', deleteError);
            }
          }
        }
      } catch (e) {}
    }

    // --------------------------------------------------------------------------
    // Step 3: Upsert 'students' table (Relationship: classes -> students) & reconcile deleted
    // --------------------------------------------------------------------------
    if (Array.isArray(payload.students) && payload.students.length > 0) {
      const studentRows = payload.students.map(s => ({
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
      await Promise.resolve(client.from('students').upsert(studentRows, { onConflict: 'id' }));

      // Reconcile deleted students in Supabase
      try {
        const { data: existingStudents } = await client.from('students').select('id');
        if (existingStudents && existingStudents.length > 0) {
          const keepSet = new Set(payload.students.map(s => s.id));
          const toDelete = existingStudents.map(s => s.id).filter(id => !keepSet.has(id));
          if (toDelete.length > 0) {
            await client.from('students').delete().in('id', toDelete);
          }
        }
      } catch (e) {}
    }

    // --------------------------------------------------------------------------
    // Step 4: Upsert 'attendance_records' table (Relationship: students -> attendance_records)
    // --------------------------------------------------------------------------
    if (Array.isArray(payload.records) && payload.records.length > 0) {
      const recordRows = payload.records.map(r => ({
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

      // Chunk in blocks of 100 for network efficiency
      for (let i = 0; i < recordRows.length; i += 100) {
        const chunk = recordRows.slice(i, i + 100);
        await Promise.resolve(client.from('attendance_records').upsert(chunk, { onConflict: 'id' }));
      }
    }

    // --------------------------------------------------------------------------
    // Step 5: Upsert 'admin_accounts' table & reconcile deleted
    // --------------------------------------------------------------------------
    if (Array.isArray(payload.adminAccounts) && payload.adminAccounts.length > 0) {
      const validClassIds = new Set((payload.classes || []).map(c => c.id));
      for (const a of payload.adminAccounts) {
        if (!a || !a.username) continue;
        const validClassId = (a.assignedClassId && validClassIds.has(a.assignedClassId)) ? a.assignedClassId : null;
        const row = {
          id: a.id,
          username: a.username.toLowerCase(),
          display_name: a.displayName,
          role: a.role,
          password: a.password,
          created_at: a.createdAt || new Date().toISOString().split('T')[0],
          assigned_class_id: validClassId
        };

        const { error: err1 } = await client.from('admin_accounts').upsert(row, { onConflict: 'username' });
        if (err1) {
          const { error: err2 } = await client.from('admin_accounts').upsert(row, { onConflict: 'id' });
          if (err2) {
            const { data: existing } = await client.from('admin_accounts').select('id').ilike('username', a.username).maybeSingle();
            if (existing) {
              await client.from('admin_accounts').update({
                display_name: a.displayName,
                role: a.role,
                password: a.password,
                assigned_class_id: validClassId
              }).eq('id', existing.id);
            } else {
              await client.from('admin_accounts').insert(row);
            }
          }
        }
      }
    }

    // --------------------------------------------------------------------------
    // Step 6: Upsert 'system_config' table
    // --------------------------------------------------------------------------
    const cfg = payload.systemConfig;
    if (cfg) {
      const configRow = {
        id: 'bethel_config',
        church_name: cfg.churchName || '伯特利教会',
        school_title: cfg.schoolTitle || '主日学与团契IMS',
        allowed_day_of_week: cfg.allowedDayOfWeek ?? 0,
        checkin_start_time: cfg.checkinStartTime || '11:00',
        checkin_end_time: cfg.checkinEndTime || '16:00',
        test_mode: cfg.testMode ?? false,
        current_year: cfg.currentYear ?? 2026,
        current_semester: cfg.currentSemester || '2026年秋季学期',
        weekly_memory_verse: cfg.weeklyMemoryVerse || '',
        memory_verse_reference: cfg.memoryVerseReference || '',
        qr_secret_token: cfg.qrSecretToken || 'BETHEL_SUNDAY_2026_TOKEN',
        enable_memory_verse_option: cfg.enableMemoryVerseOption ?? true,
        default_memory_verse_checked: cfg.defaultMemoryVerseChecked ?? true,
        enable_offering_option: cfg.enableOfferingOption ?? false,
        default_offering_checked: cfg.defaultOfferingChecked ?? false,
        enable_late_rule: cfg.enableLateRule ?? true,
        late_threshold_time: cfg.lateThresholdTime || '15:00',
        enable_excused_note: cfg.enableExcusedNote ?? true,
        enable_checkin_popup: cfg.enableCheckinPopup ?? true,
        admin_password: cfg.adminPassword || 'bethel2026',
        hidden_class_ids: cfg.hiddenClassIds || [],
        config: cfg,
        active_sunday: payload.activeSunday,
        sync_version: payload.syncVersion,
        updated_at: payload.updatedAt || new Date().toISOString()
      };
      await Promise.resolve(client.from('system_config').upsert(configRow, { onConflict: 'id' }));
    }

    // --------------------------------------------------------------------------
    // Step 7: Manage 'deleted_attendance_records' table and purge from attendance_records
    // --------------------------------------------------------------------------
    if (Array.isArray(payload.deletedRecordKeys) && payload.deletedRecordKeys.length > 0) {
      const deletedRows = payload.deletedRecordKeys.map(key => {
        let studentId: string | null = null;
        let dateStr: string | null = null;
        if (typeof key === 'string' && key.includes('_')) {
          const parts = key.split('_');
          studentId = parts[0] || null;
          dateStr = parts[1] || null;
        }
        return {
          id: key,
          record_id: key,
          student_id: studentId,
          date: dateStr,
          deleted_at: new Date().toISOString()
        };
      });

      await Promise.resolve(client.from('deleted_attendance_records').upsert(deletedRows, { onConflict: 'id' }));

      // Purge matching records from attendance_records table
      for (const item of deletedRows) {
        if (item.student_id && item.date) {
          await Promise.resolve(
            client.from('attendance_records')
              .delete()
              .eq('student_id', item.student_id)
              .eq('date', item.date)
          );
        } else if (item.id) {
          await Promise.resolve(
            client.from('attendance_records')
              .delete()
              .eq('id', item.id)
          );
        }
      }
    }

    // --------------------------------------------------------------------------
    // Step 8: Upsert 'app_sync_state' table (Global version and state hub)
    // --------------------------------------------------------------------------
    await Promise.resolve(
      client.from('app_sync_state').upsert({
        id: 'bethel_sync_state',
        sync_version: payload.syncVersion,
        active_sunday: payload.activeSunday,
        last_sync_time: new Date().toISOString(),
        snapshot: payload,
        updated_at: payload.updatedAt || new Date().toISOString()
      }, { onConflict: 'id' })
    );

    // Backward-compatibility: also update church_app_state
    try {
      await Promise.resolve(
        client.from('church_app_state').upsert({
          id: 'bethel_church_data',
          state: payload,
          sync_version: payload.syncVersion,
          updated_at: payload.updatedAt || new Date().toISOString()
        }, { onConflict: 'id' })
      );
    } catch {
      // Non-fatal
    }

    return true;
  } catch (err) {
    console.warn('[Supabase DB] Error persisting to 8 Supabase relational tables:', err);
    return false;
  }
}

// ----------------------------------------------------------------------------
// Granular Direct Supabase CRUD Operations for the 8 Tables
// ----------------------------------------------------------------------------

export async function supabaseUpsertClass(c: ClassGroup): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    await client.from('classes').upsert({
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
    }, { onConflict: 'id' });
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseUpsertClass failed:', err);
    return false;
  }
}

export async function supabaseDeleteClass(classId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    await client.from('classes').delete().eq('id', classId);
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseDeleteClass failed:', err);
    return false;
  }
}

export async function supabaseUpsertStudent(s: Student): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    let classIdVal = (s.classId && String(s.classId).trim() !== '') ? String(s.classId).trim() : null;
    if (classIdVal) {
      const { data: clsExists } = await client.from('classes').select('id').eq('id', classIdVal).maybeSingle();
      if (!clsExists) {
        classIdVal = null;
      }
    }
    const { error } = await client.from('students').upsert({
      id: s.id,
      name: s.name,
      gender: s.gender || 'boy',
      birth_date: s.birthDate || '2019-06-01',
      age: s.age || null,
      class_id: classIdVal,
      parent_name: s.parentName || null,
      parent_phone: s.parentPhone || null,
      member_code: s.memberCode || null,
      avatar_icon: s.avatarIcon || null,
      join_date: s.joinDate || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase DB Error] supabaseUpsertStudent failed with error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseUpsertStudent failed:', err);
    return false;
  }
}

export async function supabaseUpsertStudentsBatch(students: Student[]): Promise<boolean> {
  const client = getSupabase();
  if (!client || students.length === 0) return false;
  try {
    // Collect valid class IDs to prevent FK violations
    const { data: existingClasses } = await client.from('classes').select('id');
    const validClassSet = new Set((existingClasses || []).map(c => c.id));

    const rows = students.map(s => {
      const classIdVal = (s.classId && validClassSet.has(s.classId)) ? s.classId : null;
      return {
        id: s.id,
        name: s.name,
        gender: s.gender || 'boy',
        birth_date: s.birthDate || '2019-06-01',
        age: s.age || null,
        class_id: classIdVal,
        parent_name: s.parentName || null,
        parent_phone: s.parentPhone || null,
        member_code: s.memberCode || null,
        avatar_icon: s.avatarIcon || null,
        join_date: s.joinDate || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };
    });
    const { error } = await client.from('students').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase DB Error] supabaseUpsertStudentsBatch failed with error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseUpsertStudentsBatch failed:', err);
    return false;
  }
}

export async function supabaseDeleteStudent(studentId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    // Cascade delete attendance records in Supabase
    await client.from('attendance_records').delete().eq('student_id', studentId);
    await client.from('students').delete().eq('id', studentId);
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseDeleteStudent failed:', err);
    return false;
  }
}

export async function supabaseUpsertTeacher(t: Teacher): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    let classIdVal = (t.classId && String(t.classId).trim() !== '') ? String(t.classId).trim() : null;
    if (classIdVal) {
      // Safely verify if class exists to prevent FK violation
      const { data: clsExists } = await client.from('classes').select('id').eq('id', classIdVal).maybeSingle();
      if (!clsExists) {
        classIdVal = null;
      }
    }
    const { error } = await client.from('teachers').upsert({
      id: t.id,
      name: t.name,
      gender: t.gender || 'girl',
      phone: t.phone || null,
      wechat: t.wechat || null,
      class_id: classIdVal,
      role_title: t.roleTitle || '班主任',
      join_date: t.joinDate || '2026-01-01',
      notes: t.notes || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase DB Error] supabaseUpsertTeacher failed with error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseUpsertTeacher failed:', err);
    return false;
  }
}

export async function supabaseDeleteTeacher(teacherId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('teachers').delete().eq('id', teacherId);
    if (error) {
      console.warn('[Supabase DB Error] supabaseDeleteTeacher failed with error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseDeleteTeacher failed:', err);
    return false;
  }
}

export async function supabaseUpsertAttendanceRecord(r: AttendanceRecord): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    await client.from('attendance_records').upsert({
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
    }, { onConflict: 'id' });

    // Remove from deleted_attendance_records if it was there
    const key = `${r.studentId}_${r.date}`;
    await client.from('deleted_attendance_records').delete().in('id', [r.id, key]);
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseUpsertAttendanceRecord failed:', err);
    return false;
  }
}

export async function supabaseDeleteAttendanceRecord(studentId: string, date: string, recordId?: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const key = `${studentId}_${date}`;
    const idsToPurge = [key];
    if (recordId) idsToPurge.push(recordId);

    // 1. Delete from attendance_records
    await client.from('attendance_records').delete().eq('student_id', studentId).eq('date', date);
    if (recordId) {
      await client.from('attendance_records').delete().eq('id', recordId);
    }

    // 2. Track in deleted_attendance_records
    const rows = idsToPurge.map(k => ({
      id: k,
      record_id: k,
      student_id: studentId,
      date: date,
      deleted_at: new Date().toISOString()
    }));
    await client.from('deleted_attendance_records').upsert(rows, { onConflict: 'id' });
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseDeleteAttendanceRecord failed:', err);
    return false;
  }
}

export async function supabaseUpsertAdminAccount(a: ServerAdminAccount): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    let validClassId: string | null = null;
    if (a.assignedClassId && String(a.assignedClassId).trim() !== '') {
      const candidate = String(a.assignedClassId).trim();
      const { data: clsExists } = await client.from('classes').select('id').eq('id', candidate).maybeSingle();
      if (clsExists) {
        validClassId = candidate;
      }
    }

    const rowId = a.id || `acc-${a.username.toLowerCase()}`;
    const row = {
      id: rowId,
      username: a.username.toLowerCase(),
      display_name: a.displayName,
      role: a.role,
      password: a.password,
      created_at: a.createdAt || new Date().toISOString().split('T')[0],
      assigned_class_id: validClassId
    };

    // 1. Check if user already exists by username
    const { data: existingByUsername } = await client.from('admin_accounts').select('id').ilike('username', a.username).maybeSingle();
    if (existingByUsername) {
      const { error: updateErr } = await client.from('admin_accounts').update({
        display_name: a.displayName,
        role: a.role,
        password: a.password,
        assigned_class_id: validClassId
      }).eq('id', existingByUsername.id);
      if (!updateErr) return true;
    }

    // 2. Try upsert with onConflict: 'username'
    let { error: err1 } = await client.from('admin_accounts').upsert(row, { onConflict: 'username' });
    if (err1) {
      // 3. Try upsert with onConflict: 'id'
      let { error: err2 } = await client.from('admin_accounts').upsert(row, { onConflict: 'id' });
      if (err2) {
        await client.from('admin_accounts').insert(row);
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseUpsertAdminAccount failed:', err);
    return false;
  }
}

export async function supabaseUpdateAccountPassword(username: string, newPasswordHash: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    await client.from('admin_accounts').update({ password: newPasswordHash }).ilike('username', username);
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseUpdateAccountPassword failed:', err);
    return false;
  }
}

export async function supabaseDeleteAdminAccount(username: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    await client.from('admin_accounts').delete().ilike('username', username);
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseDeleteAdminAccount failed:', err);
    return false;
  }
}

export async function supabaseGetAccounts(): Promise<ServerAdminAccount[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client.from('admin_accounts').select('*');
    if (error || !data) return null;
    return data.map(a => ({
      id: a.id,
      username: a.username,
      displayName: a.display_name,
      role: a.role,
      password: a.password,
      createdAt: a.created_at,
      assignedClassId: a.assigned_class_id || a.assignedClassId || undefined
    }));
  } catch {
    return null;
  }
}

export async function supabaseUpsertSystemConfig(cfg: SystemConfig, activeSunday?: string, syncVersion?: number): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const configRow = {
      id: 'bethel_config',
      church_name: cfg.churchName || '伯特利教会',
      school_title: cfg.schoolTitle || '主日学与团契IMS',
      allowed_day_of_week: cfg.allowedDayOfWeek ?? 0,
      checkin_start_time: cfg.checkinStartTime || '11:00',
      checkin_end_time: cfg.checkinEndTime || '16:00',
      test_mode: cfg.testMode ?? false,
      current_year: cfg.currentYear ?? 2026,
      current_semester: cfg.currentSemester || '2026年秋季学期',
      weekly_memory_verse: cfg.weeklyMemoryVerse || '',
      memory_verse_reference: cfg.memoryVerseReference || '',
      qr_secret_token: cfg.qrSecretToken || 'BETHEL_SUNDAY_2026_TOKEN',
      enable_memory_verse_option: cfg.enableMemoryVerseOption ?? true,
      default_memory_verse_checked: cfg.defaultMemoryVerseChecked ?? true,
      enable_offering_option: cfg.enableOfferingOption ?? false,
      default_offering_checked: cfg.defaultOfferingChecked ?? false,
      enable_late_rule: cfg.enableLateRule ?? true,
      late_threshold_time: cfg.lateThresholdTime || '15:00',
      enable_excused_note: cfg.enableExcusedNote ?? true,
      enable_checkin_popup: cfg.enableCheckinPopup ?? true,
      admin_password: cfg.adminPassword || 'bethel2026',
      hidden_class_ids: cfg.hiddenClassIds || [],
      config: cfg,
      active_sunday: activeSunday || '2026-09-20',
      sync_version: syncVersion || 1,
      updated_at: new Date().toISOString()
    };
    await client.from('system_config').upsert(configRow, { onConflict: 'id' });
    return true;
  } catch (err) {
    console.warn('[Supabase DB] supabaseUpsertSystemConfig failed:', err);
    return false;
  }
}

export async function supabaseResetAllData(payload: ChurchStatePayload): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    // Delete in reverse FK order
    await client.from('attendance_records').delete().neq('id', '___none___');
    await client.from('deleted_attendance_records').delete().neq('id', '___none___');
    await client.from('students').delete().neq('id', '___none___');
    await client.from('teachers').delete().neq('id', '___none___');
    await client.from('classes').delete().neq('id', '___none___');
    await client.from('admin_accounts').delete().neq('id', '___none___');
    
    // Save fresh initial payload
    return await saveToSupabase(payload);
  } catch (err) {
    console.warn('[Supabase DB] supabaseResetAllData failed:', err);
    return false;
  }
}
