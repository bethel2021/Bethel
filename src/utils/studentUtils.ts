/**
 * 学员出生年月与年龄计算工具
 */

/**
 * 自动根据出生年月计算周岁年龄
 * @param birthDate 出生年月，支持 'YYYY-MM', 'YYYY-MM-DD' 或 'YYYY'
 * @param fallbackAge 若出生年月缺失时的备选年龄
 * @returns 自动计算出的周岁年龄
 */
export function calculateAge(birthDate?: string, fallbackAge?: number): number {
  if (!birthDate) return fallbackAge ?? 0;
  
  const parts = birthDate.split('-');
  const birthYear = parseInt(parts[0], 10);
  if (isNaN(birthYear)) return fallbackAge ?? 0;
  
  const birthMonth = parts[1] ? parseInt(parts[1], 10) : 1;
  const birthDay = parts[2] ? parseInt(parts[2], 10) : 1;

  // 使用系统当前时间（或模拟主日当前年份 2026）
  const now = new Date();
  let age = now.getFullYear() - birthYear;
  const monthDiff = (now.getMonth() + 1) - birthMonth;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDay)) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * 格式化输出中文出生年月日（如：2019年5月12日）
 */
export function formatBirthDate(birthDate?: string): string {
  if (!birthDate) return '—';
  const parts = birthDate.split('-');
  if (parts.length >= 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${year}年${month}月${day}日`;
  }
  if (parts.length === 2) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    return `${year}年${month}月01日`;
  }
  return birthDate;
}

/**
 * 将年龄反向生成默认出生年月日（如 7 岁 -> 2019-06-01）
 */
export function getDefaultBirthDateForAge(age: number): string {
  const now = new Date();
  const year = now.getFullYear() - age;
  return `${year}-06-01`;
}
