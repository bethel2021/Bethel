-- ==============================================================================
-- 伯特利教会主日学与团契 (Bethel Church) - Supabase PostgreSQL Database Schema
-- ==============================================================================
-- 数据库关系图谱：
-- classes
--   ↓
-- students
--   ↓
-- attendance_records
--
-- classes
--   ↓
-- teachers
--
-- 核心规范化数据表（8张表）：
-- 1. classes (班级与团契)
-- 2. students (学员花名册，关联 classes)
-- 3. teachers (教师同工，关联 classes)
-- 4. attendance_records (考勤记录，关联 students 与 classes)
-- 5. admin_accounts (管理员账号)
-- 6. system_config (机构系统配置)
-- 7. deleted_attendance_records (删除记录追踪表，防分布式多端冲突)
-- 8. app_sync_state (多终端增量同步版本与状态表)
-- ==============================================================================

-- 1. 班级与团契表 (Classes & Fellowships)
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age_range TEXT,
  teacher TEXT,
  subject_teacher TEXT,
  classroom TEXT,
  color TEXT,
  group_type TEXT DEFAULT 'sunday_school',
  description TEXT,
  is_hidden_from_home BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 学员花名册表 (Students)
-- 关系：classes -> students
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  age INTEGER,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  parent_name TEXT,
  parent_phone TEXT,
  member_code TEXT,
  avatar_icon TEXT,
  join_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 教师同工表 (Teachers)
-- 关系：classes -> teachers
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT,
  wechat TEXT,
  class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  role_title TEXT,
  join_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 主日考勤签到记录表 (Attendance Records)
-- 关系：students -> attendance_records, classes -> attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  time_str TEXT,
  status TEXT NOT NULL,
  method TEXT DEFAULT 'attendance',
  memory_verse_completed BOOLEAN DEFAULT FALSE,
  offering_completed BOOLEAN DEFAULT FALSE,
  is_test_mode BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 管理员账号表 (Admin Accounts)
CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',
  password TEXT NOT NULL,
  assigned_class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 机构系统配置表 (System Config)
CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY DEFAULT 'bethel_config',
  church_name TEXT DEFAULT '伯特利教会',
  school_title TEXT DEFAULT '主日学与团契IMS',
  allowed_day_of_week INTEGER DEFAULT 0,
  checkin_start_time TEXT DEFAULT '08:30',
  checkin_end_time TEXT DEFAULT '12:30',
  test_mode BOOLEAN DEFAULT FALSE,
  current_year INTEGER DEFAULT 2026,
  current_semester TEXT DEFAULT '2026年秋季学期',
  weekly_memory_verse TEXT,
  memory_verse_reference TEXT,
  qr_secret_token TEXT DEFAULT 'BETHEL_SUNDAY_2026_TOKEN',
  enable_memory_verse_option BOOLEAN DEFAULT TRUE,
  default_memory_verse_checked BOOLEAN DEFAULT TRUE,
  enable_offering_option BOOLEAN DEFAULT FALSE,
  default_offering_checked BOOLEAN DEFAULT FALSE,
  enable_late_rule BOOLEAN DEFAULT TRUE,
  late_threshold_time TEXT DEFAULT '09:30',
  enable_excused_note BOOLEAN DEFAULT TRUE,
  enable_checkin_popup BOOLEAN DEFAULT TRUE,
  admin_password TEXT DEFAULT 'bethel2026',
  hidden_class_ids JSONB DEFAULT '[]'::JSONB,
  config JSONB,
  active_sunday TEXT,
  sync_version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 考勤删除记录追踪表 (Deleted Attendance Records)
-- 追踪被删除的考勤记录，保证多端离线及跨终端同步时不被覆盖复活
CREATE TABLE IF NOT EXISTS deleted_attendance_records (
  id TEXT PRIMARY KEY,
  record_id TEXT,
  student_id TEXT,
  date TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 系统全局同步状态表 (App Sync State)
-- 维护全局增量同步版本号、当前主日及原子缓存快照
CREATE TABLE IF NOT EXISTS app_sync_state (
  id TEXT PRIMARY KEY DEFAULT 'bethel_sync_state',
  sync_version INTEGER NOT NULL DEFAULT 1,
  active_sunday TEXT,
  last_sync_time TIMESTAMPTZ DEFAULT NOW(),
  snapshot JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 兼容性辅助表（用于旧版本平滑过渡）
CREATE TABLE IF NOT EXISTS church_app_state (
  id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  sync_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 高频查询外键与过滤索引
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_teachers_class_id ON teachers(class_id);
CREATE INDEX IF NOT EXISTS idx_records_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_class_id ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_deleted_records_date ON deleted_attendance_records(date);

-- 安全策略：开启行级安全 (RLS)
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_app_state ENABLE ROW LEVEL SECURITY;

-- 允许服务端 Service Role 拥有完整读写权限 (Bypass RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access classes') THEN
    CREATE POLICY "Allow service_role full access classes" ON classes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access students') THEN
    CREATE POLICY "Allow service_role full access students" ON students FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access teachers') THEN
    CREATE POLICY "Allow service_role full access teachers" ON teachers FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access attendance_records') THEN
    CREATE POLICY "Allow service_role full access attendance_records" ON attendance_records FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access admin_accounts') THEN
    CREATE POLICY "Allow service_role full access admin_accounts" ON admin_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access system_config') THEN
    CREATE POLICY "Allow service_role full access system_config" ON system_config FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access deleted_attendance_records') THEN
    CREATE POLICY "Allow service_role full access deleted_attendance_records" ON deleted_attendance_records FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access app_sync_state') THEN
    CREATE POLICY "Allow service_role full access app_sync_state" ON app_sync_state FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access church_app_state') THEN
    CREATE POLICY "Allow service_role full access church_app_state" ON church_app_state FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
