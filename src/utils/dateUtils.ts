// Date & Time utilities configured for Bethel Church (Italy Rome Timezone: Europe/Rome)

export const CHURCH_TIMEZONE = 'Europe/Rome';

export interface RomeTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  fullTimeStr: string; // HH:mm:ss
  dayOfWeek: number; // 0 for Sunday, 1 for Monday, etc.
}

export function getRomeTimeParts(date: Date = new Date()): RomeTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CHURCH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const fullTimeStr = `${timeStr}:${String(second).padStart(2, '0')}`;
  
  // Calculate day of week based on the date in Rome
  const romeDateObj = new Date(`${dateStr}T12:00:00Z`);
  const dayOfWeek = romeDateObj.getUTCDay();

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    timeStr,
    fullTimeStr,
    dayOfWeek
  };
}

export function getCurrentRomeDateStr(date: Date = new Date()): string {
  return getRomeTimeParts(date).dateStr;
}

export function getCurrentRomeTimeStr(date: Date = new Date()): string {
  return getRomeTimeParts(date).timeStr;
}

export function getCurrentRomeFullTimeStr(date: Date = new Date()): string {
  return getRomeTimeParts(date).fullTimeStr;
}

export function getSundaysInMonth(year: number, monthIndex: number): string[] {
  // monthIndex: 0-11
  const sundays: string[] = [];
  const date = new Date(year, monthIndex, 1);
  while (date.getMonth() === monthIndex) {
    if (date.getDay() === 0) {
      sundays.push(formatDateYMD(date));
    }
    date.setDate(date.getDate() + 1);
  }
  return sundays;
}

export function getAllSundaysInYear(year: number): string[] {
  const sundays: string[] = [];
  const date = new Date(year, 0, 1);
  while (date.getFullYear() === year) {
    if (date.getDay() === 0) {
      sundays.push(formatDateYMD(date));
    }
    date.setDate(date.getDate() + 1);
  }
  return sundays;
}

export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatChineseDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

export function formatShortChineseDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return `${parseInt(parts[1], 10)}月${parseInt(parts[2], 10)}日`;
}

export function getDayOfWeekName(date: Date): string {
  const rome = getRomeTimeParts(date);
  const days = ['主日 (周日)', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[rome.dayOfWeek];
}

/**
 * Calculates the active Sunday date (in Europe/Rome timezone).
 * If today is Sunday, returns today's date (YYYY-MM-DD).
 * If today is Mon-Sat, returns the upcoming next Sunday's date (YYYY-MM-DD).
 */
export function getActiveSundayDate(date: Date = new Date()): string {
  const rome = getRomeTimeParts(date);
  if (rome.dayOfWeek === 0) {
    return rome.dateStr;
  }
  const daysUntilNextSunday = 7 - rome.dayOfWeek;
  const targetDateObj = new Date(`${rome.dateStr}T12:00:00Z`);
  targetDateObj.setUTCDate(targetDateObj.getUTCDate() + daysUntilNextSunday);
  const y = targetDateObj.getUTCFullYear();
  const m = String(targetDateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(targetDateObj.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns Sunday label and date information for UI display.
 * If today is Sunday: label is "主日：", isTodaySunday: true
 * If today is Monday-Saturday: label is "下个主日：", isTodaySunday: false
 */
export function getSundayDisplayInfo(date: Date = new Date(), sundayDateStr?: string): {
  isSunday: boolean;
  label: string; // '主日：' or '下个主日：'
  sundayDate: string; // YYYY-MM-DD
  formattedDate: string; // e.g. '2026年9月20日'
  fullDisplay: string; // e.g. '主日：2026年9月20日' or '下个主日：2026年9月20日'
} {
  const rome = getRomeTimeParts(date);
  const isSunday = rome.dayOfWeek === 0;
  const label = isSunday ? '主日：' : '下个主日：';
  const targetSunday = sundayDateStr || getActiveSundayDate(date);
  const formattedDate = formatChineseDate(targetSunday);
  return {
    isSunday,
    label,
    sundayDate: targetSunday,
    formattedDate,
    fullDisplay: `${label}${formattedDate}`
  };
}

export function checkIsWithinSundayWindow(
  now: Date = new Date(),
  checkinStartTime: string = '08:30',
  checkinEndTime: string = '12:30',
  testMode: boolean = false
): { isAllowed: boolean; statusMsg: string; isSunday: boolean } {
  if (testMode) {
    return {
      isAllowed: true,
      statusMsg: '主日签到开放中 (测试模式)',
      isSunday: true,
    };
  }

  const rome = getRomeTimeParts(now);
  const isSunday = rome.dayOfWeek === 0;

  if (!isSunday) {
    return {
      isAllowed: false,
      statusMsg: '请等待下一个主日',
      isSunday: false,
    };
  }

  let startMinutes = 8 * 60 + 30;
  let endMinutes = 12 * 60 + 30;

  if (checkinStartTime) {
    const [sh, sm] = checkinStartTime.split(':').map(Number);
    if (!isNaN(sh) && !isNaN(sm)) {
      startMinutes = sh * 60 + sm;
    }
  }

  if (checkinEndTime) {
    const [eh, em] = checkinEndTime.split(':').map(Number);
    if (!isNaN(eh) && !isNaN(em)) {
      endMinutes = eh * 60 + em;
    }
  }

  const currentMinutes = rome.hour * 60 + rome.minute;

  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    return {
      isAllowed: false,
      statusMsg: '请等待下一个主日',
      isSunday: true,
    };
  }

  return {
    isAllowed: true,
    statusMsg: '主日签到开放中',
    isSunday: true,
  };
}
