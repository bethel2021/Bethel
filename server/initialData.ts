import type { Student, ClassGroup, SystemConfig, AdminUser } from '../src/types';

export interface ServerAdminAccount {
  id: string;
  username: string;
  displayName: string;
  role: 'superadmin' | 'teacher' | 'fellowship_leader';
  password: string;
  createdAt: string;
}

// Initial Classes for Bethel Church (伯特利教会主日学与团契)
export const initialClasses: ClassGroup[] = [
  { 
    id: 'class-1', 
    name: '小小班', 
    ageRange: '1-6岁', 
    teacher: '春来 老师', 
    subjectTeacher: '洁如、彩霞 老师',
    classroom: '7号教室', 
    color: 'bg-emerald-500',
    groupType: 'sunday_school',
    description: '「播撒真光幼苗，感受基督大爱」藉着诗歌律动与生动圣经故事，在温馨陪伴中建立安全感与敬拜初体验，让主爱从小扎根于幼小心田。',
    isHiddenFromHome: false
  },
  { 
    id: 'class-2', 
    name: '小班', 
    ageRange: '7-8岁', 
    teacher: '秋娟 老师', 
    subjectTeacher: '雪峰、勤洁、贴柔 老师',
    classroom: '5号教室', 
    color: 'bg-teal-500',
    groupType: 'sunday_school',
    description: '「学习圣经品格，培养敬畏顺服」引导孩童朗读圣经话语、认识造物主作为，在团契生活中建立诚实、友爱与顺服的基督徒好品行。',
    isHiddenFromHome: false
  },
  { 
    id: 'class-3', 
    name: '中班', 
    ageRange: '9-10岁', 
    teacher: '若雪 老师', 
    subjectTeacher: '约斯、怡欣、佩帆 老师',
    classroom: '6号教室', 
    color: 'bg-amber-500',
    groupType: 'sunday_school',
    description: '「扎根圣经真理，常存感恩相爱」研读圣经救赎故事与信心榜样，学习凡事谢恩、彼此相顾，在家庭与学校日常中活出神喜悦的样式。',
    isHiddenFromHome: false
  },
  { 
    id: 'class-4', 
    name: '大班', 
    ageRange: '11-12岁', 
    teacher: '上好 老师', 
    subjectTeacher: '琴玲、依蕾、恩溢 老师',
    classroom: '3号教室', 
    color: 'bg-orange-500',
    groupType: 'sunday_school',
    description: '「建立个人信仰，结出品行果子」帮助学生养成自主灵修与祷告习惯，明辨是非真理，预备身心灵步入少年期，勇于在校园中为主发光。',
    isHiddenFromHome: false
  },
  { 
    id: 'class-5', 
    name: '初中班', 
    ageRange: '13-14岁', 
    teacher: '雪成 老师', 
    subjectTeacher: '金若、洋洋、督军 老师',
    classroom: '1号教室', 
    color: 'bg-blue-500',
    groupType: 'sunday_school',
    description: '「筑牢真理根基，作主无畏门徒」引导青少年在成长困惑与思潮中坚立信仰世界观，操练团契扶持，不从世俗，总在言语行为上作榜样。',
    isHiddenFromHome: false
  },
  { 
    id: 'class-6', 
    name: '高中班', 
    ageRange: '15-16岁', 
    teacher: '志安 老师', 
    subjectTeacher: '陈师母、显美、周妹 老师',
    classroom: '2号教室', 
    color: 'bg-indigo-500',
    groupType: 'sunday_school',
    description: '「深化信仰思辨，操练侍奉见证」引导高中门徒将真理融入学业与未来异象，积极参与教会服侍与福音见证，成长为有基督生命担当的青年。',
    isHiddenFromHome: false
  },
  { 
    id: 'class-7', 
    name: '以斯拉团契', 
    ageRange: '16-20岁', 
    teacher: '东丽 老师', 
    subjectTeacher: '陈海伟牧师，来俊、张国 老师',
    classroom: '大堂', 
    color: 'bg-purple-500',
    groupType: 'fellowship',
    description: '「定志考究神道，立志行道教导」效法以斯拉专心考究遵行神律法的心志，在大学、职场与社会中作得胜见证，同心服侍教会、传承信仰使命。',
    isHiddenFromHome: false
  }
];

// Helper to compute age from birthDate
export function calculateAge(birthDate?: string, fallbackAge?: number): number {
  if (!birthDate) return fallbackAge ?? 0;
  const parts = birthDate.split('-');
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear)) return fallbackAge ?? 0;
  const birthMonth = parts[1] ? parseInt(parts[1], 10) : 1;
  const birthDay = parts[2] ? parseInt(parts[2], 10) : 1;

  const now = new Date();
  let age = now.getFullYear() - birthYear;
  const monthDiff = (now.getMonth() + 1) - birthMonth;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDay)) {
    age--;
  }
  return Math.max(0, age);
}

// Initial Students / Fellowship Members for Bethel Church (with 出生年月日)
export const initialStudents: Student[] = [
  // 小小班 (2-3岁)
  { id: 's-101', name: '陈恩诺 (Enoch)', gender: 'boy', birthDate: '2023-04-12', age: 3, classId: 'class-1', parentName: '陈建国', parentPhone: '13800111201', memberCode: 'BTL-01', joinDate: '2025-09-01' },
  { id: 's-102', name: '周迦南 (Canaan)', gender: 'girl', birthDate: '2023-08-15', age: 3, classId: 'class-1', parentName: '周小芳', parentPhone: '13600448811', memberCode: 'BTL-02', joinDate: '2025-09-01' },
  { id: 's-103', name: '黄乐天 (Joy)', gender: 'boy', birthDate: '2024-02-18', age: 2, classId: 'class-1', parentName: '黄明辉', parentPhone: '13700335621', memberCode: 'BTL-03', joinDate: '2026-03-01' },

  // 小班 (3-4岁)
  { id: 's-201', name: '林恩雅 (Grace)', gender: 'girl', birthDate: '2022-07-20', age: 4, classId: 'class-2', parentName: '林海燕', parentPhone: '13900223342', memberCode: 'BTL-04', joinDate: '2025-09-01' },
  { id: 's-202', name: '赵便雅悯 (Benjamin)', gender: 'boy', birthDate: '2022-11-10', age: 4, classId: 'class-2', parentName: '赵志强', parentPhone: '13100998844', memberCode: 'BTL-05', joinDate: '2026-02-15' },

  // 中班 (4-5岁)
  { id: 's-301', name: '吴主恩 (Charis)', gender: 'girl', birthDate: '2021-05-18', age: 5, classId: 'class-3', parentName: '吴振华', parentPhone: '15900772311', memberCode: 'BTL-06', joinDate: '2025-09-01' },
  { id: 's-302', name: '孙所罗门 (Solomon)', gender: 'boy', birthDate: '2021-09-08', age: 5, classId: 'class-3', parentName: '孙国平', parentPhone: '18800236633', memberCode: 'BTL-07', joinDate: '2025-03-01' },

  // 大班 (5-6岁)
  { id: 's-401', name: '张以诺 (Samuel)', gender: 'boy', birthDate: '2020-03-22', age: 6, classId: 'class-4', parentName: '张建军', parentPhone: '13800559922', memberCode: 'BTL-08', joinDate: '2025-03-01' },
  { id: 's-402', name: '李哈拿 (Hannah)', gender: 'girl', birthDate: '2020-06-25', age: 6, classId: 'class-4', parentName: '李美华', parentPhone: '13500664477', memberCode: 'BTL-09', joinDate: '2024-09-01' },
  { id: 's-403', name: '刘提摩太 (Timothy)', gender: 'boy', birthDate: '2020-10-05', age: 6, classId: 'class-4', parentName: '刘晓琴', parentPhone: '18600887765', memberCode: 'BTL-10', joinDate: '2025-09-01' },

  // 初中班 (12-14岁)
  { id: 's-501', name: '杨多加 (Dorcas)', gender: 'girl', birthDate: '2013-04-14', age: 13, classId: 'class-5', parentName: '杨立新', parentPhone: '13300121122', memberCode: 'BTL-11', joinDate: '2024-09-01' },
  { id: 's-502', name: '冯司提反 (Stephen)', gender: 'boy', birthDate: '2012-11-06', age: 14, classId: 'class-5', parentName: '冯伟民', parentPhone: '15800459090', memberCode: 'BTL-12', joinDate: '2025-09-01' },
  { id: 's-503', name: '郑路得 (Ruth)', gender: 'girl', birthDate: '2014-02-19', age: 12, classId: 'class-5', parentName: '郑晓春', parentPhone: '13400347788', memberCode: 'BTL-13', joinDate: '2024-09-01' },

  // 高中班 (15-16岁)
  { id: 's-601', name: '林哲瀚', gender: 'boy', birthDate: '2009-11-01', age: 16, classId: 'class-6', parentName: '显美', parentPhone: '3778364620', memberCode: 'BTL-14', joinDate: '2023-09-01' },
  { id: 's-602', name: '王凌鹏 (David)', gender: 'boy', birthDate: '2010-02-16', age: 16, classId: 'class-6', parentName: '陈蓓思', parentPhone: '3332659108', memberCode: 'BTL-15', joinDate: '2023-09-01' },
  { id: 's-603', name: '邵熙辰 (Oscar)', gender: 'boy', birthDate: '2010-02-27', age: 16, classId: 'class-6', parentName: '亚非', parentPhone: '3939393922', memberCode: 'BTL-16', joinDate: '2023-03-01' },

  // 以斯拉团契 (18-35岁青年)
  { id: 's-701', name: '何保罗 (Paul)', gender: 'boy', birthDate: '2001-08-21', age: 25, classId: 'class-7', parentName: '本人', parentPhone: '18900891100', memberCode: 'BTL-17', joinDate: '2024-03-01' },
  { id: 's-702', name: '梁迦勒 (Caleb Jr)', gender: 'boy', birthDate: '1998-05-12', age: 28, classId: 'class-7', parentName: '本人', parentPhone: '13700902233', memberCode: 'BTL-18', joinDate: '2022-09-01' }
];

// System Config for Bethel Church
export const initialSystemConfig: SystemConfig = {
  churchName: '伯特利教会',
  schoolTitle: '主日学与团契',
  allowedDayOfWeek: 0, // 0 is Sunday
  checkinStartTime: '08:30',
  checkinEndTime: '12:30',
  testMode: false,
  currentYear: 2026,
  currentSemester: '2026年秋季学期',
  weeklyMemoryVerse: '雅各就给那地方起名叫伯特利。他说：这地方何等可畏！这不是别的，乃是神的殿，也是天的门。',
  memoryVerseReference: '创世记 28:17,19',
  qrSecretToken: 'BETHEL_SUNDAY_2026_TOKEN',

  // Customizable Default Options
  enableMemoryVerseOption: true,
  defaultMemoryVerseChecked: true,
  enableOfferingOption: false,
  defaultOfferingChecked: false,
  enableLateRule: true,
  lateThresholdTime: '09:30',
  enableExcusedNote: true,
  enableCheckinPopup: true,
  adminPassword: 'bethel2026',
};

// Preset Admin Accounts for Bethel Church
export const initialAdminAccounts: ServerAdminAccount[] = [
  { id: 'acc-admin', username: 'admin', displayName: '总管理员', role: 'superadmin', password: 'bethel2026', createdAt: '2026-01-01' },
  { id: 'acc-teacher', username: 'teacher', displayName: '主日学上课老师', role: 'teacher', password: 'bethel123', createdAt: '2026-01-01' },
  { id: 'acc-fellowship', username: 'fellowship', displayName: '团契带领同工', role: 'fellowship_leader', password: 'fellowship123', createdAt: '2026-01-01' }
];
