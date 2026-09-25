import type { Student, ClassGroup, SystemConfig, AdminUser } from '../src/types.js';

export interface ServerAdminAccount {
  id: string;
  username: string;
  displayName: string;
  role: 'superadmin' | 'teacher' | 'fellowship_leader';
  password: string;
  createdAt: string;
  assignedClassId?: string;
}

// Initial Classes for Bethel Church (伯特利教会主日学与团契)
export const initialClasses: ClassGroup[] = [
  { 
    id: 'class-1', 
    name: '小小班', 
    ageRange: '1-6岁', 
    teacher: '春来', 
    subjectTeacher: '洁如,彩霞',
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
    teacher: '秋娟', 
    subjectTeacher: '雪峰,勤洁,贴柔',
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
    teacher: '若雪', 
    subjectTeacher: '约斯,怡欣,佩帆',
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
    teacher: '上好', 
    subjectTeacher: '琴玲,依蕾,恩溢',
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
    teacher: '雪成', 
    subjectTeacher: '金若,洋洋,督军',
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
    teacher: '任志安', 
    subjectTeacher: '陈师母,显美,周妹',
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
    teacher: '毛东丽', 
    subjectTeacher: '陈海伟牧师,来俊,张国',
    classroom: '大堂', 
    color: 'bg-purple-500',
    groupType: 'fellowship',
    description: '「定志考究神道，立志行道教导」效法以斯拉专心考究遵行神律法的心志，在校园与职场中作得胜见证，同心服侍教会、传承信仰使命。',
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
  // 中班 (class-3, 9-10岁) - 只保留 任玮祎
  { id: 's-1790196484064', name: '任玮祎(Vicky)', gender: 'girl', birthDate: '2017-08-16', age: 9, classId: 'class-3', parentName: '毛东丽', parentPhone: '3518818858', memberCode: 'BTL-29', joinDate: '2026-09-23' },

  // 初中班 (class-5, 13-14岁) - 只保留 任玮琛
  { id: 's-1790196426992', name: '任玮琛(Willson)', gender: 'boy', birthDate: '2014-06-06', age: 12, classId: 'class-5', parentName: '任志安', parentPhone: '3273778891', memberCode: 'BTL-28', joinDate: '2026-09-23' },

  // 高中班 (class-6, 共 27 位学员全量保留)
  { id: 's-601', name: '潘恩言 (Lucia)', gender: 'girl', birthDate: '2012-03-04', age: 14, classId: 'class-6', parentName: '柯献利', parentPhone: '3778364308', memberCode: 'BTL-14', joinDate: '2026-09-01' },
  { id: 's-602', name: '涂意豪 (Matteo)', gender: 'boy', birthDate: '2010-07-08', age: 16, classId: 'class-6', parentName: '戴少萍', parentPhone: '3312696885', memberCode: 'BTL-15', joinDate: '2026-09-01' },
  { id: 's-603', name: '周铭哲 (Andy)', gender: 'boy', birthDate: '2012-09-07', age: 14, classId: 'class-6', parentName: '家长', parentPhone: '3274786535', memberCode: 'BTL-16', joinDate: '2026-09-01' },
  { id: 's-604', name: '徐凌霏 (Fiona)', gender: 'girl', birthDate: '2011-07-15', age: 15, classId: 'class-6', parentName: '黄庆伟', parentPhone: '3275791112', memberCode: 'BTL-17', joinDate: '2026-09-01' },
  { id: 's-605', name: '徐时乐 (Gennaro)', gender: 'boy', birthDate: '2008-09-13', age: 18, classId: 'class-6', parentName: '家长', parentPhone: '3761166233', memberCode: 'BTL-18', joinDate: '2026-09-01' },
  { id: 's-606', name: '林哲瀚', gender: 'boy', birthDate: '2009-11-01', age: 16, classId: 'class-6', parentName: '显美', parentPhone: '3778364620', memberCode: 'BTL-19', joinDate: '2026-09-01' },
  { id: 's-607', name: '施欣媛 (Angela)', gender: 'girl', birthDate: '2012-07-29', age: 14, classId: 'class-6', parentName: '郑晶晶', parentPhone: '3778124588', memberCode: 'BTL-20', joinDate: '2026-09-01' },
  { id: 's-608', name: '朱锦泽 (Alex)', gender: 'boy', birthDate: '2011-12-28', age: 14, classId: 'class-6', parentName: '梦思', parentPhone: '3381963090', memberCode: 'BTL-21', joinDate: '2026-09-01' },
  { id: 's-609', name: '陈翰源 (Giovanni)', gender: 'boy', birthDate: '2011-12-16', age: 14, classId: 'class-6', parentName: '陈帖', parentPhone: '3500180705', memberCode: 'BTL-22', joinDate: '2026-09-01' },
  { id: 's-610', name: '蒋智诚 (Daniele)', gender: 'boy', birthDate: '2010-12-04', age: 15, classId: 'class-6', parentName: '姜勤洁', parentPhone: '3858821662', memberCode: 'BTL-23', joinDate: '2026-09-01' },
  { id: 's-611', name: '叶宇昊 (Isacco)', gender: 'boy', birthDate: '2011-07-27', age: 15, classId: 'class-6', parentName: '金若', parentPhone: '3899330046', memberCode: 'BTL-24', joinDate: '2026-09-01' },
  { id: 's-612', name: '王凌鹏 (David)', gender: 'boy', birthDate: '2010-02-16', age: 16, classId: 'class-6', parentName: '陈蓓思', parentPhone: '3275672288', memberCode: 'BTL-25', joinDate: '2026-09-01' },
  { id: 's-613', name: '高雅诗 (Noemi)', gender: 'girl', birthDate: '2010-09-15', age: 16, classId: 'class-6', parentName: '郑向美', parentPhone: '3500082336', memberCode: 'BTL-26', joinDate: '2026-09-01' },
  { id: 's-614', name: '李恩惜 (Rebecca)', gender: 'girl', birthDate: '2011-11-28', age: 14, classId: 'class-6', parentName: '玉燕', parentPhone: '3319916917', memberCode: 'BTL-27', joinDate: '2026-09-01' },
  { id: 's-615', name: '林慕妍 (Monica)', gender: 'girl', birthDate: '2011-11-11', age: 14, classId: 'class-6', parentName: '徐秀', parentPhone: '3270556800', memberCode: 'BTL-28', joinDate: '2026-09-01' },
  { id: 's-616', name: '王若萱 (Jessy)', gender: 'girl', birthDate: '2011-06-21', age: 15, classId: 'class-6', parentName: '黄淑珍', parentPhone: '3881852616', memberCode: 'BTL-29', joinDate: '2026-09-01' },
  { id: 's-617', name: '蔡煊 (Lucas)', gender: 'boy', birthDate: '2012-05-17', age: 14, classId: 'class-6', parentName: '芝慧', parentPhone: '3343551587', memberCode: 'BTL-30', joinDate: '2026-09-01' },
  { id: 's-618', name: '任品瑞 (Giovanna)', gender: 'girl', birthDate: '2010-01-03', age: 16, classId: 'class-6', parentName: '林伟珍', parentPhone: '3501945801', memberCode: 'BTL-31', joinDate: '2026-09-01' },
  { id: 's-619', name: '陈瑞涵 (Sandero)', gender: 'boy', birthDate: '2010-04-27', age: 16, classId: 'class-6', parentName: '家长', parentPhone: '3756763723', memberCode: 'BTL-32', joinDate: '2026-09-01' },
  { id: 's-620', name: '陈欣怡 (Luisa)', gender: 'girl', birthDate: '2011-05-06', age: 15, classId: 'class-6', parentName: '春燕', parentPhone: '3760070543', memberCode: 'BTL-33', joinDate: '2026-09-01' },
  { id: 's-621', name: '季恩韵', gender: 'girl', birthDate: '2012-01-28', age: 14, classId: 'class-6', parentName: '金丹', parentPhone: '3889906062', memberCode: 'BTL-34', joinDate: '2026-09-01' },
  { id: 's-622', name: '邵熙辰 (Oscar)', gender: 'boy', birthDate: '2010-02-27', age: 16, classId: 'class-6', parentName: '亚非', parentPhone: '3939393922', memberCode: 'BTL-35', joinDate: '2026-09-01' },
  { id: 's-623', name: '邵熙佑 (Lucas)', gender: 'boy', birthDate: '2012-11-23', age: 13, classId: 'class-6', parentName: '亚非', parentPhone: '3348369286', memberCode: 'BTL-36', joinDate: '2026-09-01' },
  { id: 's-624', name: '陈乐瑶 (Cristina)', gender: 'girl', birthDate: '2012-12-01', age: 13, classId: 'class-6', parentName: '春燕', parentPhone: '3760061715', memberCode: 'BTL-37', joinDate: '2026-09-01' },
  { id: 's-625', name: '木彦歆 (Ivy)', gender: 'girl', birthDate: '2011-12-04', age: 14, classId: 'class-6', parentName: '家长', parentPhone: '3505988103', memberCode: 'BTL-38', joinDate: '2026-09-01' },
  { id: 's-626', name: '木彦皓 (Alex)', gender: 'boy', birthDate: '2010-05-23', age: 16, classId: 'class-6', parentName: '家长', parentPhone: '3501303703', memberCode: 'BTL-39', joinDate: '2026-09-01' },
  { id: 's-627', name: '木迦熠 (Jonny)', gender: 'boy', birthDate: '2011-08-29', age: 15, classId: 'class-6', parentName: '肖伶俐', parentPhone: '3778349376', memberCode: 'BTL-40', joinDate: '2026-09-01' }
];

// System Config for Bethel Church
export const initialSystemConfig: SystemConfig = {
  churchName: '伯特利教会',
  schoolTitle: '主日学与团契IMS',
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

// Initial Teachers for Bethel Church
export const initialTeachers: any[] = [
  { id: 't-1', name: '胡春来', gender: 'girl', phone: '13888889999', wechat: '', classId: 'class-1', roleTitle: '班主任', joinDate: '2026-01-01' },
  { id: 't-997860', name: '戴洁如', gender: 'girl', phone: '', wechat: '', classId: 'class-1', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-030776', name: '梅彩霞', gender: 'girl', phone: '', wechat: '', classId: 'class-1', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-2', name: '戴秋娟', gender: 'girl', phone: '13812345672', wechat: '', classId: 'class-2', roleTitle: '班主任', joinDate: '2026-01-01' },
  { id: 't-642536', name: '林雪峰', gender: 'girl', phone: '', wechat: '', classId: 'class-2', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-665889', name: '戴贴柔', gender: 'girl', phone: '', wechat: '', classId: 'class-2', roleTitle: '辅助', joinDate: '2026-09-23' },
  { id: 't-693298', name: '姜勤洁', gender: 'girl', phone: '', wechat: '', classId: 'class-2', roleTitle: '辅助', joinDate: '2026-09-23' },
  { id: 't-3', name: '翁若雪', gender: 'girl', phone: '13812345673', wechat: '', classId: 'class-3', roleTitle: '班主任', joinDate: '2026-01-01' },
  { id: 't-733717', name: '徐约斯', gender: 'girl', phone: '', wechat: '', classId: 'class-3', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-750778', name: '陈怡欣', gender: 'girl', phone: '', wechat: '', classId: 'class-3', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-776531', name: '陈佩帆', gender: 'girl', phone: '', wechat: '', classId: 'class-3', roleTitle: '辅助', joinDate: '2026-09-23' },
  { id: 't-4', name: '陈上好', gender: 'girl', phone: '13812345674', wechat: '', classId: 'class-4', roleTitle: '班主任', joinDate: '2026-01-01' },
  { id: 't-822782', name: '李琴玲', gender: 'girl', phone: '', wechat: '', classId: 'class-4', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-861782', name: '徐依蕾', gender: 'girl', phone: '', wechat: '', classId: 'class-4', roleTitle: '辅助', joinDate: '2026-09-23' },
  { id: 't-874954', name: '陈恩溢', gender: 'boy', phone: '', wechat: '', classId: 'class-4', roleTitle: '辅助', joinDate: '2026-09-23' },
  { id: 't-5', name: '林雪成', gender: 'girl', phone: '13812345675', wechat: '', classId: 'class-5', roleTitle: '班主任', joinDate: '2026-01-01' },
  { id: 't-902518', name: '金若', gender: 'girl', phone: '', wechat: '', classId: 'class-5', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-919736', name: '陈洋洋', gender: 'girl', phone: '', wechat: '', classId: 'class-5', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-943990', name: '朱督军', gender: 'boy', phone: '', wechat: '', classId: 'class-5', roleTitle: '辅助', joinDate: '2026-09-23' },
  { id: 't-6', name: '任志安', gender: 'boy', phone: '3273778891', wechat: '', classId: 'class-6', roleTitle: '班主任', joinDate: '2026-01-01' },
  { id: 't-964711', name: '傅丽敏', gender: 'girl', phone: '', wechat: '', classId: 'class-6', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-979816', name: '王显美', gender: 'girl', phone: '', wechat: '', classId: 'class-6', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-996536', name: '周妹', gender: 'girl', phone: '', wechat: '', classId: 'class-6', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-7', name: '毛东丽', gender: 'girl', phone: '3518818858', wechat: '', classId: 'class-7', roleTitle: '班主任', joinDate: '2026-01-01' },
  { id: 't-019975', name: '陈海伟牧师', gender: 'boy', phone: '', wechat: '', classId: 'class-7', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-033752', name: '叶来俊', gender: 'boy', phone: '', wechat: '', classId: 'class-7', roleTitle: '上课', joinDate: '2026-09-23' },
  { id: 't-044781', name: '张国', gender: 'boy', phone: '', wechat: '', classId: 'class-7', roleTitle: '上课', joinDate: '2026-09-23' }
];
