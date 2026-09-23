import type { ClassGroup, Student, SystemConfig, AttendanceRecord, AdminUser, Teacher } from './types';

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
    description: '「定志考究神道，立志行道教导」效法以斯拉专心考究遵行神律法的心志，在校园与职场中作得胜见证，同心服侍教会、传承信仰使命。',
    isHiddenFromHome: false
  }
];

export const initialStudents: Student[] = [
  // 高中班 (从照片数据全新导入，共 27 位学员)
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

export const initialSystemConfig: SystemConfig = {
  churchName: '伯特利教会',
  schoolTitle: '主日学与团契IMS',
  allowedDayOfWeek: 0,
  checkinStartTime: '11:00',
  checkinEndTime: '16:00',
  testMode: false,
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
  lateThresholdTime: '15:00',
  enableExcusedNote: true,
  enableCheckinPopup: true,
  adminPassword: 'bethel2026',
};

export const presetAdmins: AdminUser[] = [
  { username: 'admin', displayName: '总管理员', role: 'superadmin' },
  { username: 'teacher', displayName: '主日学上课老师', role: 'teacher' },
  { username: 'fellowship', displayName: '团契带领同工', role: 'fellowship_leader' }
];

export const initialTeachers: Teacher[] = [
  // 1. 小小班 (class-1)
  { id: 't-1-1', name: '春来', gender: 'girl', phone: '13812345671', wechat: 'chunlai_teacher', classId: 'class-1', roleTitle: '班级负责', joinDate: '2026-01-01' },
  { id: 't-1-2', name: '洁如', gender: 'girl', phone: '13812345681', wechat: 'jieru_teacher', classId: 'class-1', roleTitle: '上课老师', joinDate: '2026-01-01' },
  { id: 't-1-3', name: '彩霞', gender: 'girl', phone: '13812345691', wechat: 'caixia_teacher', classId: 'class-1', roleTitle: '辅助老师', joinDate: '2026-01-01' },

  // 2. 小班 (class-2)
  { id: 't-2-1', name: '秋娟', gender: 'girl', phone: '13812345672', wechat: 'qiujuan_teacher', classId: 'class-2', roleTitle: '班级负责', joinDate: '2026-01-01' },
  { id: 't-2-2', name: '雪峰', gender: 'boy', phone: '13812345682', wechat: 'xuefeng_teacher', classId: 'class-2', roleTitle: '上课老师', joinDate: '2026-01-01' },
  { id: 't-2-3', name: '勤洁', gender: 'girl', phone: '13812345692', wechat: 'qinjie_teacher', classId: 'class-2', roleTitle: '辅助老师', joinDate: '2026-01-01' },
  { id: 't-2-4', name: '贴柔', gender: 'girl', phone: '13812345693', wechat: 'tierou_teacher', classId: 'class-2', roleTitle: '辅助老师', joinDate: '2026-01-01' },

  // 3. 中班 (class-3)
  { id: 't-3-1', name: '若雪', gender: 'girl', phone: '13812345673', wechat: 'ruoxue_teacher', classId: 'class-3', roleTitle: '班级负责', joinDate: '2026-01-01' },
  { id: 't-3-2', name: '约斯', gender: 'boy', phone: '13812345683', wechat: 'yuesi_teacher', classId: 'class-3', roleTitle: '上课老师', joinDate: '2026-01-01' },
  { id: 't-3-3', name: '怡欣', gender: 'girl', phone: '13812345694', wechat: 'yixin_teacher', classId: 'class-3', roleTitle: '辅助老师', joinDate: '2026-01-01' },
  { id: 't-3-4', name: '佩帆', gender: 'girl', phone: '13812345695', wechat: 'peifan_teacher', classId: 'class-3', roleTitle: '辅助老师', joinDate: '2026-01-01' },

  // 4. 大班 (class-4)
  { id: 't-4-1', name: '上好', gender: 'girl', phone: '13812345674', wechat: 'shanghao_teacher', classId: 'class-4', roleTitle: '班级负责', joinDate: '2026-01-01' },
  { id: 't-4-2', name: '琴玲', gender: 'girl', phone: '13812345684', wechat: 'qinling_teacher', classId: 'class-4', roleTitle: '上课老师', joinDate: '2026-01-01' },
  { id: 't-4-3', name: '依蕾', gender: 'girl', phone: '13812345696', wechat: 'yilei_teacher', classId: 'class-4', roleTitle: '辅助老师', joinDate: '2026-01-01' },
  { id: 't-4-4', name: '恩溢', gender: 'boy', phone: '13812345697', wechat: 'enyi_teacher', classId: 'class-4', roleTitle: '辅助老师', joinDate: '2026-01-01' },

  // 5. 初中班 (class-5)
  { id: 't-5-1', name: '雪成', gender: 'girl', phone: '13812345675', wechat: 'xuecheng_teacher', classId: 'class-5', roleTitle: '班级负责', joinDate: '2026-01-01' },
  { id: 't-5-2', name: '金若', gender: 'girl', phone: '13812345685', wechat: 'jinruo_teacher', classId: 'class-5', roleTitle: '上课老师', joinDate: '2026-01-01' },
  { id: 't-5-3', name: '洋洋', gender: 'boy', phone: '13812345698', wechat: 'yangyang_teacher', classId: 'class-5', roleTitle: '辅助老师', joinDate: '2026-01-01' },
  { id: 't-5-4', name: '督军', gender: 'boy', phone: '13812345699', wechat: 'dujun_teacher', classId: 'class-5', roleTitle: '辅助老师', joinDate: '2026-01-01' },

  // 6. 高中班 (class-6)
  { id: 't-6-1', name: '任志安', gender: 'boy', phone: '13812345676', wechat: 'zhian_teacher', classId: 'class-6', roleTitle: '班级负责', joinDate: '2026-01-01' },
  { id: 't-6-2', name: '陈师母', gender: 'girl', phone: '13812345686', wechat: 'chenshim_teacher', classId: 'class-6', roleTitle: '上课老师', joinDate: '2026-01-01' },
  { id: 't-6-3', name: '显美', gender: 'girl', phone: '13812345700', wechat: 'xianmei_teacher', classId: 'class-6', roleTitle: '辅助老师', joinDate: '2026-01-01' },
  { id: 't-6-4', name: '周妹', gender: 'girl', phone: '13812345701', wechat: 'zhoumei_teacher', classId: 'class-6', roleTitle: '辅助老师', joinDate: '2026-01-01' },

  // 7. 以斯拉团契 (class-7)
  { id: 't-7-1', name: '毛东丽', gender: 'girl', phone: '13812345677', wechat: 'dongli_teacher', classId: 'class-7', roleTitle: '班级负责', joinDate: '2026-01-01' },
  { id: 't-7-2', name: '陈海伟牧师', gender: 'boy', phone: '13812345687', wechat: 'haiwei_pastor', classId: 'class-7', roleTitle: '上课老师', joinDate: '2026-01-01' },
  { id: 't-7-3', name: '来俊', gender: 'boy', phone: '13812345702', wechat: 'laijun_teacher', classId: 'class-7', roleTitle: '辅助老师', joinDate: '2026-01-01' },
  { id: 't-7-4', name: '张国', gender: 'boy', phone: '13812345703', wechat: 'zhangguo_teacher', classId: 'class-7', roleTitle: '辅助老师', joinDate: '2026-01-01' }
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
