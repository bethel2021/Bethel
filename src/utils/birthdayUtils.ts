import type { Student, ClassGroup } from '../types';
import { getRomeTimeParts } from './dateUtils';

export interface StudentBirthdayInfo {
  student: Student;
  classGroup?: ClassGroup;
  birthDate: string; // YYYY-MM-DD
  birthMonth: number; // 1-12
  birthDay: number; // 1-31
  currentAge: number;
  turningAge: number;
  daysUntil: number; // 0 = today, 1 = tomorrow, etc.
  nextBirthdayDateStr: string; // YYYY-MM-DD
  formattedBirthday: string; // e.g. "9月25日"
  nextBirthdayDayOfWeek: string; // e.g. "星期五"
  isToday: boolean;
  isTomorrow: boolean;
  isWithinOneWeek: boolean; // <= 7 days
  isWithinOneMonth: boolean; // <= 30 days
  isNextSunday: boolean; // Whether next birthday falls on next Sunday
}

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

/**
 * Parses YYYY-MM-DD safely
 */
export function parseBirthDate(birthDateStr: string): { year: number; month: number; day: number } | null {
  if (!birthDateStr) return null;
  const parts = birthDateStr.split('-').map(p => parseInt(p, 10));
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  return { year: parts[0], month: parts[1], day: parts[2] };
}

/**
 * Calculates student birthday information against a base date (defaults to current Rome time).
 */
export function getStudentBirthdayInfo(
  student: Student,
  classGroup?: ClassGroup,
  baseDate: Date = new Date()
): StudentBirthdayInfo | null {
  const parsed = parseBirthDate(student.birthDate);
  if (!parsed) return null;

  const rome = getRomeTimeParts(baseDate);
  const currentYear = rome.year;
  const currentMonth = rome.month; // 1-12
  const currentDay = rome.day; // 1-31

  const birthMonth = parsed.month;
  const birthDay = parsed.day;

  // Base date as UTC midnight for clean diff calculation
  const todayUtc = Date.UTC(currentYear, currentMonth - 1, currentDay);

  // Try this year's birthday
  let candidateYear = currentYear;
  let candidateUtc = Date.UTC(candidateYear, birthMonth - 1, birthDay);

  // If already passed this year, the next birthday is next year
  if (candidateUtc < todayUtc) {
    candidateYear = currentYear + 1;
    candidateUtc = Date.UTC(candidateYear, birthMonth - 1, birthDay);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntil = Math.round((candidateUtc - todayUtc) / msPerDay);

  const nextBdayDate = new Date(candidateUtc);
  const nextBirthdayDayOfWeek = WEEKDAY_NAMES[nextBdayDate.getUTCDay()];
  const isNextSunday = nextBdayDate.getUTCDay() === 0 && daysUntil <= 7;

  const currentAge = currentYear - parsed.year - ((currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) ? 1 : 0);
  const turningAge = candidateYear - parsed.year;

  const nextBirthdayDateStr = `${candidateYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
  const formattedBirthday = `${birthMonth}月${birthDay}日`;

  const isToday = daysUntil === 0;
  const isTomorrow = daysUntil === 1;
  const isWithinOneWeek = daysUntil <= 7;
  const isWithinOneMonth = daysUntil <= 30;

  return {
    student,
    classGroup,
    birthDate: student.birthDate,
    birthMonth,
    birthDay,
    currentAge: Math.max(0, currentAge),
    turningAge: Math.max(1, turningAge),
    daysUntil,
    nextBirthdayDateStr,
    formattedBirthday,
    nextBirthdayDayOfWeek,
    isToday,
    isTomorrow,
    isWithinOneWeek,
    isWithinOneMonth,
    isNextSunday
  };
}

/**
 * Get all students' birthday info sorted by days remaining
 */
export function getAllStudentsBirthdayInfo(
  students: Student[],
  classes: ClassGroup[],
  baseDate: Date = new Date()
): StudentBirthdayInfo[] {
  const classMap = new Map(classes.map(c => [c.id, c]));
  
  const list: StudentBirthdayInfo[] = [];
  for (const s of students) {
    const info = getStudentBirthdayInfo(s, classMap.get(s.classId), baseDate);
    if (info) {
      list.push(info);
    }
  }

  // Sort by nearest birthday first
  return list.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Christian Bible verses for birthday blessings
 */
export const BIRTHDAY_BLESSING_VERSES = [
  {
    verse: '愿耶和华赐福给你，保护你；愿耶和华使祂的脸光照你，赐恩给你；愿耶和华向你仰脸，赐你平安。',
    reference: '民数记 6:24-26',
  },
  {
    verse: '你以恩典为年岁的冠冕；你的路径都滴下脂油。',
    reference: '诗篇 65:11',
  },
  {
    verse: '耶稣的智慧和身量，并神和人喜爱他的心，都一齐增长。',
    reference: '路加福音 2:52',
  },
  {
    verse: '教养孩童，使他走当行的道，就是到老他也不偏离。',
    reference: '箴言 22:6',
  },
  {
    verse: '因祂要为你吩咐祂的使者，在你行的一切道路上保护你。',
    reference: '诗篇 91:11',
  },
  {
    verse: '当称谢进入祂的门，当赞美进入祂的院；当感谢祂，称颂祂的名！',
    reference: '诗篇 100:4',
  },
  {
    verse: '我要称谢你，因我受造奇妙可畏；你的作为奇妙，这是我心深知道的。',
    reference: '诗篇 139:14',
  },
];

/**
 * Generates personalized message text for WeChat/SMS sharing
 */
export function generateBirthdaySmsBlessing(
  info: StudentBirthdayInfo,
  churchName: string = '伯特利教会',
  verseIndex: number = 0
): string {
  const selectedVerse = BIRTHDAY_BLESSING_VERSES[verseIndex % BIRTHDAY_BLESSING_VERSES.length];
  const parentGreeting = info.student.parentName ? `${info.student.parentName}家长您好` : '亲爱的家长您好';
  const className = info.classGroup?.name ? `【${info.classGroup.name}】` : '';

  return `🎉【${churchName}主日学 • 生日祝福】🎂\n\n${parentGreeting}！欣逢 ${info.student.name} 同学迎来 ${info.turningAge} 岁生日，${churchName}主日学全体导师献上最真诚的关怀与主内祝福！\n\n愿主耶稣基督看顾保守 ${info.student.name}，赐下聪明、智慧与喜乐，身心灵健壮，如幼苗在溪水旁茂盛成长！\n\n📖【圣经经文赐福】：\n“${selectedVerse.verse}”—— ${selectedVerse.reference}\n\n${churchName}主日学 ${className} 老师 敬祝`;
}
