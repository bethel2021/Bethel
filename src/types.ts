export type Gender = 'boy' | 'girl';

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

export type CheckinMethod = 'attendance' | 'manual_teacher' | 'wechat_scan';

export type GroupType = 'sunday_school' | 'fellowship';

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  birthDate: string; // 出生年月日，格式为 'YYYY-MM-DD'
  age?: number; // 系统根据出生年月自动计算得出
  classId: string;
  parentName: string;
  parentPhone: string;
  memberCode?: string; // e.g. BTL-01
  avatarIcon?: string;
  joinDate: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  ageRange: string;
  teacher: string; // 班级负责
  subjectTeacher?: string; // 上课老师
  classroom: string; // 活动课室
  color: string;
  groupType?: GroupType; // 班级性质: 主日学 或 团契
  targetCapacity?: number; // (已取消定额功能，保留以兼容历史字段)
  description?: string;
  isHiddenFromHome?: boolean; // 首页是否隐藏 (true 为在首页隐藏，false 或 undefined 为在首页显示)
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  timeStr: string; // HH:mm
  status: AttendanceStatus;
  method: CheckinMethod;
  memoryVerseCompleted: boolean;
  offeringCompleted?: boolean;
  notes?: string;
}

export interface SystemConfig {
  churchName: string; // '伯特利教会'
  schoolTitle: string; // '主日学与团契'
  allowedDayOfWeek: number; // 0 = Sunday
  checkinStartTime: string; // e.g. "11:00"
  checkinEndTime: string; // e.g. "16:00"
  testMode: boolean; // if true, bypass Sunday & time restrictions for easy testing
  currentYear: number;
  currentSemester: string;
  weeklyMemoryVerse: string;
  memoryVerseReference: string;
  qrSecretToken: string;

  // Customizable Default Options (开启 / 关闭)
  enableMemoryVerseOption: boolean; // 是否启用「金句背诵」选项
  defaultMemoryVerseChecked: boolean; // 打卡时默认是否勾选金句已背诵
  enableOfferingOption?: boolean;
  defaultOfferingChecked?: boolean;
  enableLateRule: boolean; // 是否启用迟到计算规则
  lateThresholdTime: string; // 迟到判定分界时刻, e.g. "15:00"
  enableExcusedNote: boolean; // 是否启用请假事由备注功能
  enableCheckinPopup: boolean; // 是否在大屏模式显示实时打卡悬浮喜报
  hiddenClassIds?: string[]; // 在首页隐藏的班级ID列表
  adminPassword?: string; // 后台管理员密码 (默认 bethel2026)
  config?: any; // 动态元数据配置存储，作为数据库表缺少特定列时的自愈型备用存储
}

export interface AdminUser {
  username: string;
  displayName: string;
  role: 'superadmin' | 'teacher' | 'fellowship_leader';
  avatar?: string;
  token?: string;
  assignedClassId?: string;
}

export interface AdminAccount {
  id?: string;
  username: string;
  displayName: string;
  role: 'superadmin' | 'teacher' | 'fellowship_leader';
  password?: string;
  createdAt?: string;
  assignedClassId?: string;
}

export interface AttendanceStats {
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  attendanceRate: number;
  verseCompletedCount: number;
}

export interface Teacher {
  id: string;
  name: string;
  gender: 'boy' | 'girl';
  phone: string;
  wechat?: string;
  classId?: string;
  roleTitle?: string;
  joinDate?: string;
  notes?: string;
}

export interface DeletedAttendanceRecord {
  id: string; // e.g. "s-601_2026-09-20" or record id
  recordId?: string;
  studentId?: string;
  date?: string;
  deletedAt?: string;
}

export interface AppSyncState {
  id: string; // 'bethel_sync_state'
  syncVersion: number;
  activeSunday?: string;
  lastSyncTime?: string;
  snapshot?: any;
  updatedAt?: string;
}

