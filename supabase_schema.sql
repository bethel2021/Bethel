-- ==============================================================================
-- 伯特利教会主日学与团契 (Bethel Church) - Supabase PostgreSQL Database Schema
-- ==============================================================================
-- 使用方法：
-- 1. 打开 Supabase 项目管理控制台 (https://supabase.com/dashboard)
-- 2. 进入左侧导航栏的 "SQL Editor"
-- 3. 将本脚本内容全选复制并粘贴到 SQL Editor 中，点击右下角 "Run" 执行
-- 4. 执行完成后，所有考勤、班级、学员、教师、系统配置表均会自动就绪
-- 5. 在设置中将 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY 配置到环境变量中即可
-- ==============================================================================

-- 1. 主状态文档表 (保证 Vercel Serverless 全球边缘节点亚毫秒级原子持久化与双向同步)
CREATE TABLE IF NOT EXISTS church_app_state (
  id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  sync_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 班级与团契表 (Classes & Fellowships)
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 学员花名册表 (Students)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  birth_date TEXT,
  age INTEGER,
  class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  parent_name TEXT,
  parent_phone TEXT,
  member_code TEXT,
  avatar_icon TEXT,
  join_date TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 主日考勤签到记录表 (Attendance Records)
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class_id TEXT NOT NULL,
  date TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  time_str TEXT,
  status TEXT NOT NULL,
  method TEXT DEFAULT 'attendance',
  memory_verse_completed BOOLEAN DEFAULT FALSE,
  offering_completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 教师同工表 (Teachers)
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT,
  wechat TEXT,
  class_id TEXT,
  role_title TEXT,
  join_date TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 管理员账号表 (Admin Accounts)
CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',
  password TEXT NOT NULL,
  created_at TEXT DEFAULT NOW()
);

-- 7. 机构系统配置表 (System Config)
CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY,
  config JSONB NOT NULL,
  active_sunday TEXT,
  sync_version INTEGER DEFAULT 1,
  deleted_record_keys JSONB DEFAULT '[]'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 高频查询性能索引
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_records_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_class_id ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_teachers_class_id ON teachers(class_id);

-- 安全策略：开启行级安全 (RLS)
ALTER TABLE church_app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- 允许服务端 Service Role 拥有完整读写权限 (Bypass RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access church_app_state') THEN
    CREATE POLICY "Allow service_role full access church_app_state" ON church_app_state FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access classes') THEN
    CREATE POLICY "Allow service_role full access classes" ON classes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access students') THEN
    CREATE POLICY "Allow service_role full access students" ON students FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access attendance_records') THEN
    CREATE POLICY "Allow service_role full access attendance_records" ON attendance_records FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access teachers') THEN
    CREATE POLICY "Allow service_role full access teachers" ON teachers FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access admin_accounts') THEN
    CREATE POLICY "Allow service_role full access admin_accounts" ON admin_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow service_role full access system_config') THEN
    CREATE POLICY "Allow service_role full access system_config" ON system_config FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
