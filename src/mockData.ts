import type { ClassGroup, Student, SystemConfig, AttendanceRecord, AdminUser } from './types';

export const initialClasses: ClassGroup[] = [
  { 
    id: 'class-1', 
    name: '小小班', 
    ageRange: '2-3岁', 
    teacher: '李路得 老师', 
    subjectTeacher: '陈约瑟 老师',
    classroom: '副堂101课室', 
    color: 'bg-emerald-500',
    groupType: 'sunday_school',
    description: '小小班启蒙，圣经故事与赞美诗律动'
  },
  { 
    id: 'class-2', 
    name: '小班', 
    ageRange: '3-4岁', 
    teacher: '张爱华 老师', 
    subjectTeacher: '王信实 老师',
    classroom: '副堂102课室', 
    color: 'bg-teal-500',
    groupType: 'sunday_school',
    description: '幼儿诗歌、圣经小品格与常规模范'
  },
  { 
    id: 'class-3', 
    name: '中班', 
    ageRange: '4-5岁', 
    teacher: '王恩典 老师', 
    subjectTeacher: '刘喜乐 老师',
    classroom: '副堂201课室', 
    color: 'bg-amber-500',
    groupType: 'sunday_school',
    description: '主日学中班，研读神造万物与感恩顺服'
  },
  { 
    id: 'class-4', 
    name: '大班', 
    ageRange: '5-6岁', 
    teacher: '张大卫 老师', 
    subjectTeacher: '周和平 老师',
    classroom: '副堂202课室', 
    color: 'bg-orange-500',
    groupType: 'sunday_school',
    description: '幼小衔接班，研读圣经品格与敬拜学习'
  },
  { 
    id: 'class-5', 
    name: '初中班', 
    ageRange: '12-14岁', 
    teacher: '王提摩太 传道', 
    subjectTeacher: '赵忍耐 老师',
    classroom: '宣教楼301室', 
    color: 'bg-blue-500',
    groupType: 'sunday_school',
    description: '初中学生班，圣经真理根基、门徒训练与少年团契'
  },
  { 
    id: 'class-6', 
    name: '高中班', 
    ageRange: '15-17岁', 
    teacher: '陈保罗 同工', 
    subjectTeacher: '孙恩慈 老师',
    classroom: '宣教楼302室', 
    color: 'bg-indigo-500',
    groupType: 'sunday_school',
    description: '高中门徒，圣经世界观、信仰思辨与基督徒侍奉实践'
  },
  { 
    id: 'class-7', 
    name: '以斯拉团契', 
    ageRange: '18-35岁', 
    teacher: '林腓利 同工', 
    subjectTeacher: '钱良善 老师',
    classroom: '多功能青年活动厅', 
    color: 'bg-purple-500',
    groupType: 'fellowship',
    description: '青年团契，职场得胜见证、诗歌敬拜与专案服侍'
  }
];

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

  // 高中班 (15-17岁)
  { id: 's-601', name: '朱以赛亚 (Isaiah)', gender: 'boy', birthDate: '2010-07-17', age: 16, classId: 'class-6', parentName: '朱明礼', parentPhone: '13900562233', memberCode: 'BTL-14', joinDate: '2023-09-01' },
  { id: 's-602', name: '钱以斯帖 (Esther)', gender: 'girl', birthDate: '2009-09-28', age: 17, classId: 'class-6', parentName: '钱桂英', parentPhone: '13800676611', memberCode: 'BTL-15', joinDate: '2023-09-01' },
  { id: 's-603', name: '许约瑟 (Joseph)', gender: 'boy', birthDate: '2011-03-03', age: 15, classId: 'class-6', parentName: '许德盛', parentPhone: '13600785522', memberCode: 'BTL-16', joinDate: '2023-03-01' },

  // 以斯拉团契 (18-35岁青年)
  { id: 's-701', name: '何保罗 (Paul)', gender: 'boy', birthDate: '2001-08-21', age: 25, classId: 'class-7', parentName: '本人', parentPhone: '18900891100', memberCode: 'BTL-17', joinDate: '2024-03-01' },
  { id: 's-702', name: '梁迦勒 (Caleb Jr)', gender: 'boy', birthDate: '1998-05-12', age: 28, classId: 'class-7', parentName: '本人', parentPhone: '13700902233', memberCode: 'BTL-18', joinDate: '2022-09-01' }
];

export const initialSystemConfig: SystemConfig = {
  churchName: '伯特利教会',
  schoolTitle: '主日学与团契',
  allowedDayOfWeek: 0,
  checkinStartTime: '08:30',
  checkinEndTime: '12:30',
  testMode: true,
  currentYear: 2026,
  currentSemester: '2026年秋季学期',
  weeklyMemoryVerse: '雅各就给那地方起名叫伯特利。他说：这地方何等可畏！这不是别的，乃是神的殿，也是天的门。',
  memoryVerseReference: '创世记 28:17,19',
  qrSecretToken: 'BETHEL_SUNDAY_2026_TOKEN',
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

export const presetAdmins: AdminUser[] = [
  { username: 'admin', displayName: '伯特利教会 • 总管理员', role: 'superadmin' },
  { username: 'teacher', displayName: '主日学上课老师', role: 'teacher' },
  { username: 'fellowship', displayName: '团契带领同工', role: 'fellowship_leader' }
];

export function generateInitialRecords(studentsList: Student[] = initialStudents): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const pastSundays = [
    '2026-06-07', '2026-06-14', '2026-06-21', '2026-06-28',
    '2026-07-05', '2026-07-12', '2026-07-19', '2026-07-26',
    '2026-08-02', '2026-08-09', '2026-08-16', '2026-08-23', '2026-08-30',
    '2026-09-06'
  ];

  pastSundays.forEach((sundayDate, sIdx) => {
    studentsList.forEach((student, stuIdx) => {
      const seed = (sIdx * 19 + stuIdx * 13) % 100;
      let status: 'present' | 'late' | 'excused' | 'absent' = 'present';
      let memoryVerse = true;

      if (seed < 4) {
        status = 'absent';
        memoryVerse = false;
      } else if (seed < 10) {
        status = 'excused';
        memoryVerse = false;
      } else if (seed < 22) {
        status = 'late';
        memoryVerse = true;
      }

      records.push({
        id: `rec-${sundayDate}-${student.id}`,
        studentId: student.id,
        studentName: student.name,
        classId: student.classId,
        date: sundayDate,
        timestamp: `${sundayDate}T${status === 'late' ? '09:42:15' : '09:05:30'}Z`,
        timeStr: status === 'late' ? '09:42' : '09:05',
        status,
        method: 'attendance',
        memoryVerseCompleted: memoryVerse,
        offeringCompleted: (seed % 3) === 0,
        notes: status === 'excused' ? '家长微信提前请假' : ''
      });
    });
  });

  return records;
}
