import React, { useState, useMemo } from 'react';
import {
  Cake,
  Gift,
  Calendar,
  Clock,
  Search,
  Printer,
  Copy,
  Check,
  Share2,
  Phone,
  User,
  Users,
  Sparkles,
  Award,
  Heart,
  BookOpen,
  Filter,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  X,
  Church,
  Smile,
  ShieldCheck,
  Lock,
  LogIn
} from 'lucide-react';
import type { Student, ClassGroup, SystemConfig, AdminUser } from '../types';
import {
  getAllStudentsBirthdayInfo,
  getStudentBirthdayInfo,
  StudentBirthdayInfo,
  BIRTHDAY_BLESSING_VERSES,
  generateBirthdaySmsBlessing
} from '../utils/birthdayUtils';
import { getRomeTimeParts, formatChineseDate } from '../utils/dateUtils';

interface BirthdayReminderViewProps {
  config: SystemConfig;
  classes: ClassGroup[];
  students: Student[];
  currentUser: AdminUser | null;
  onOpenLogin: () => void;
}

type PeriodFilter = 'week' | 'month' | 'all_year';

export const BirthdayReminderView: React.FC<BirthdayReminderViewProps> = ({
  config,
  classes,
  students,
  currentUser,
  onOpenLogin,
}) => {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonthTab, setSelectedMonthTab] = useState<number>(() => {
    return getRomeTimeParts().month; // 1-12
  });

  // Modal states
  const [blessingModalInfo, setBlessingModalInfo] = useState<StudentBirthdayInfo | null>(null);
  const [selectedVerseIndex, setSelectedVerseIndex] = useState<number>(0);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [batchCopiedSuccess, setBatchCopiedSuccess] = useState<boolean>(false);
  const [printCardStudent, setPrintCardStudent] = useState<StudentBirthdayInfo | null>(null);

  // All birthdays processed
  const allBirthdayInfos = useMemo(() => {
    return getAllStudentsBirthdayInfo(students, classes, new Date());
  }, [students, classes]);

  const currentRomeTime = useMemo(() => getRomeTimeParts(), []);
  const currentMonth = currentRomeTime.month; // 1-12
  const currentYear = currentRomeTime.year;

  // Counts for top cards
  const weekCount = useMemo(() => allBirthdayInfos.filter(i => i.isWithinOneWeek).length, [allBirthdayInfos]);
  const monthCount = useMemo(() => allBirthdayInfos.filter(i => i.isWithinOneMonth).length, [allBirthdayInfos]);
  const sundayBirthdayCount = useMemo(
    () => allBirthdayInfos.filter(i => i.isNextSunday).length,
    [allBirthdayInfos]
  );

  // Filtered list based on active period & class & search
  const filteredList = useMemo(() => {
    let list = allBirthdayInfos;

    // Filter by period
    if (periodFilter === 'week') {
      list = list.filter(i => i.isWithinOneWeek);
    } else if (periodFilter === 'month') {
      list = list.filter(i => i.isWithinOneMonth);
    } else if (periodFilter === 'all_year') {
      list = list.filter(i => i.birthMonth === selectedMonthTab);
    }

    // Filter by class
    if (selectedClassId !== 'all') {
      list = list.filter(i => i.student.classId === selectedClassId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        i =>
          i.student.name.toLowerCase().includes(q) ||
          (i.student.parentName && i.student.parentName.toLowerCase().includes(q)) ||
          (i.student.parentPhone && i.student.parentPhone.includes(q)) ||
          (i.classGroup && i.classGroup.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allBirthdayInfos, periodFilter, selectedClassId, searchQuery, selectedMonthTab]);

  // Handle Copy Single Student Blessing
  const handleCopyBlessing = (info: StudentBirthdayInfo, verseIdx: number = selectedVerseIndex) => {
    const text = generateBirthdaySmsBlessing(info, config.churchName, verseIdx);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    });
  };

  // Handle Batch Copy Birthday List
  const handleBatchCopyList = () => {
    if (filteredList.length === 0) return;

    let periodLabel = '最近一周内';
    if (periodFilter === 'month') periodLabel = '最近一个月内';
    if (periodFilter === 'all_year') periodLabel = `${selectedMonthTab}月份`;

    let text = `🎂【${config.churchName}主日学 • ${periodLabel}学生生日汇总】\n`;
    text += `统计时间：${currentRomeTime.dateStr} | 共计 ${filteredList.length} 位寿星\n\n`;

    filteredList.forEach((info, idx) => {
      const className = info.classGroup?.name || '主日学';
      const daysText = info.isToday
        ? '★ 今天生日！'
        : info.isTomorrow
        ? '明天生日'
        : `还剩 ${info.daysUntil} 天 (${info.nextBirthdayDayOfWeek})`;
      text += `${idx + 1}. ${info.student.name}（${className}）- 出生：${info.birthDate}（即将迎来 ${info.turningAge} 岁）| ${daysText} | 家长：${info.student.parentName || '未填'} ${info.student.parentPhone || ''}\n`;
    });

    text += `\n愿神赐福所有亲爱的主日学学员与家庭！🙏`;

    navigator.clipboard.writeText(text).then(() => {
      setBatchCopiedSuccess(true);
      setTimeout(() => setBatchCopiedSuccess(false), 2500);
    });
  };

  // Handle Print List
  const handlePrintList = () => {
    window.print();
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2">学生生日提醒与关怀档案受权限保护</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          为保护主日学未成年孩童与家长隐私信息，生日提醒、联系方式及关怀祝福短信受权限保护。请使用教师或管理员账号登录后查阅。
        </p>
        <button
          onClick={onOpenLogin}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>主日学老师 / 同工登录</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
            <Cake className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 font-serif">学生生日提醒与主内关怀</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                主爱相伴 • 年岁冠冕
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              实时统计最近一周内、最近一个月内的学生生日，支持一键发送经文祝福与生成精美生日贺卡
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBatchCopyList}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="一键复制当前筛选的寿星名单文本"
          >
            {batchCopiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{batchCopiedSuccess ? '已复制名单！' : '复制寿星清单'}</span>
          </button>

          <button
            onClick={handlePrintList}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>打印生日统计表</span>
          </button>
        </div>
      </div>

      {/* Metric Highlighting Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Card 1: 7 Days */}
        <div
          onClick={() => setPeriodFilter('week')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            periodFilter === 'week'
              ? 'bg-linear-to-br from-amber-50 to-orange-50 border-amber-400 ring-2 ring-amber-300/60 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={periodFilter === 'week' ? 'text-amber-900' : 'text-slate-600'}>
              最近 1 周内生日 (7天)
            </span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-900 font-serif">{weekCount}</span>
            <span className="text-xs text-amber-700 font-medium">位同学</span>
          </div>
          <p className="mt-2 text-[11px] text-amber-800 flex items-center gap-1">
            <span>即将过生日，建议重点准备祝福礼物</span>
          </p>
          {weekCount > 0 && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </div>

        {/* Card 2: 30 Days */}
        <div
          onClick={() => setPeriodFilter('month')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            periodFilter === 'month'
              ? 'bg-linear-to-br from-teal-50 to-emerald-50 border-teal-400 ring-2 ring-teal-300/60 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={periodFilter === 'month' ? 'text-teal-900' : 'text-slate-600'}>
              最近 1 个月内生日 (30天)
            </span>
            <Gift className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-teal-900 font-serif">{monthCount}</span>
            <span className="text-xs text-teal-700 font-medium">位同学</span>
          </div>
          <p className="mt-2 text-[11px] text-teal-800">
            涵盖未来 30 天内所有主日学生日
          </p>
        </div>

        {/* Card 3: Sunday Blessings */}
        <div
          onClick={() => setPeriodFilter('week')}
          className="bg-linear-to-br from-purple-50 to-fuchsia-50/70 p-4 rounded-2xl border border-purple-300 shadow-2xs cursor-pointer hover:border-purple-400 transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-purple-900">
            <span>本主日特别关怀</span>
            <Church className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-purple-900 font-serif">{sundayBirthdayCount}</span>
            <span className="text-xs text-purple-700 font-medium">位同学</span>
          </div>
          <p className="mt-2 text-[11px] text-purple-800">
            主日当天或邻近主日过生日
          </p>
        </div>

      </div>

      {/* Main Filter & Navigation Tabs Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
        
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Quick Period Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/70">
            <button
              onClick={() => setPeriodFilter('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                periodFilter === 'week'
                  ? 'bg-white text-amber-900 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>最近一周内 ({weekCount})</span>
            </button>

            <button
              onClick={() => setPeriodFilter('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                periodFilter === 'month'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-teal-600" />
              <span>最近一个月内 ({monthCount})</span>
            </button>

            <button
              onClick={() => setPeriodFilter('all_year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                periodFilter === 'all_year'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>全年月份日历</span>
            </button>
          </div>

          {/* Search & Class Filter */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative min-w-[180px] sm:min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索学生/家长/电话..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Class Filter */}
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 font-medium cursor-pointer"
            >
              <option value="all">全部班级 ({students.length}人)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* 12 Months Bar (Only shown when periodFilter is 'all_year') */}
        {periodFilter === 'all_year' && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500 font-medium mb-2 flex items-center justify-between">
              <span>选择查看各自然月份生日学员：</span>
              <span className="text-amber-800 font-bold">当前查看：{selectedMonthTab}月份</span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                const countInM = allBirthdayInfos.filter(i => i.birthMonth === m).length;
                const isSelected = selectedMonthTab === m;
                const isCurrent = currentMonth === m;

                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonthTab(m)}
                    className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                      isSelected
                        ? 'bg-amber-700 text-white font-bold shadow-xs'
                        : isCurrent
                        ? 'bg-amber-50 text-amber-900 border border-amber-300 font-semibold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                    }`}
                  >
                    <span className="text-xs">{m}月</span>
                    <span
                      className={`text-[10px] mt-0.5 px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : countInM > 0
                          ? 'bg-amber-100 text-amber-800 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {countInM}人
                    </span>
                    {isCurrent && !isSelected && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-600 ring-2 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Birthday Student Cards Grid / List */}
      <div className="space-y-3">
        
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">
              {periodFilter === 'week' && '最近一周内过生日学员名单'}
              {periodFilter === 'month' && '最近一个月内过生日学员名单'}
              {periodFilter === 'all_year' && `${selectedMonthTab}月份全体寿星名单`}
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded-full font-semibold text-slate-700">
              共 {filteredList.length} 位
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            按离今天生日天数由近及远排序
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Cake className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              暂无符合条件的生日学生
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              在所选的时间范围或筛选班级中暂无生日记录，您可以尝试切换至「最近一个月内」或查看「全年月份日历」。
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setPeriodFilter('month');
                  setSelectedClassId('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 cursor-pointer"
              >
                查看最近一个月寿星
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredList.map(info => {
              const { student, classGroup, daysUntil, isToday, isTomorrow, isWithinOneWeek, isNextSunday } = info;

              // Countdown badge styling
              let countdownBadge = {
                text: `还剩 ${daysUntil} 天`,
                bg: 'bg-slate-100 text-slate-700 border-slate-200',
                icon: Clock
              };

              if (isToday) {
                countdownBadge = {
                  text: '🎉 今天生日！愿主赐福',
                  bg: 'bg-amber-500 text-white border-amber-600 font-bold animate-pulse',
                  icon: Sparkles
                };
              } else if (isTomorrow) {
                countdownBadge = {
                  text: '🌟 明天生日',
                  bg: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
                  icon: Sparkles
                };
              } else if (isWithinOneWeek) {
                countdownBadge = {
                  text: `⏰ 还剩 ${daysUntil} 天 (${info.nextBirthdayDayOfWeek})`,
                  bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
                  icon: Clock
                };
              } else if (daysUntil <= 30) {
                countdownBadge = {
                  text: `📅 还剩 ${daysUntil} 天 (${info.formattedBirthday})`,
                  bg: 'bg-teal-50 text-teal-800 border-teal-200 font-medium',
                  icon: Calendar
                };
              }

              return (
                <div
                  key={student.id}
                  className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all flex flex-col justify-between relative overflow-hidden ${
                    isToday
                      ? 'border-amber-400 ring-2 ring-amber-300/80 bg-linear-to-b from-amber-50/50 to-white'
                      : isWithinOneWeek
                      ? 'border-amber-300 hover:border-amber-400 hover:shadow-xs'
                      : 'border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  {/* Top status & Class */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        {/* Gender Avatar Icon */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                            student.gender === 'boy'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {student.name.slice(0, 1)}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-slate-900">
                              {student.name}
                            </h4>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                student.gender === 'boy'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {student.gender === 'boy' ? '男' : '女'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="font-semibold text-amber-800">
                              {classGroup?.name || '主日学'}
                            </span>
                            {classGroup?.teacher && (
                              <span className="text-slate-400">· 导师: {classGroup.teacher}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Age Pill */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 block">
                          满 {info.turningAge} 岁
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          现 {info.currentAge} 岁
                        </span>
                      </div>
                    </div>

                    {/* Countdown Banner */}
                    <div className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between mb-3 ${countdownBadge.bg}`}>
                      <div className="flex items-center gap-1.5">
                        <countdownBadge.icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{countdownBadge.text}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80">
                        {info.formattedBirthday}
                      </span>
                    </div>

                    {/* Student Info Details */}
                    <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">出生日期：</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {student.birthDate} ({info.nextBirthdayDayOfWeek})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">家长姓名：</span>
                        <span className="font-medium text-slate-800">
                          {student.parentName || '未登记'}
                        </span>
                      </div>

                      {student.parentPhone && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            联系电话：
                          </span>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${student.parentPhone}`}
                              className="font-mono font-bold text-amber-800 hover:underline"
                            >
                              {student.parentPhone}
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(student.parentPhone);
                                alert(`已复制电话号码：${student.parentPhone}`);
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer"
                              title="复制电话"
                            >
                              复制
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setBlessingModalInfo(info);
                        setSelectedVerseIndex(0);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-amber-700" />
                      <span>祝福短信</span>
                    </button>

                    <button
                      onClick={() => setPrintCardStudent(info)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Gift className="w-3.5 h-3.5 text-amber-400" />
                      <span>生成生日贺卡</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* =========================================================
          BLESSING SMS MODAL (经文生日祝福短信生成与复制)
          ========================================================= */}
      {blessingModalInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setBlessingModalInfo(null)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  为 {blessingModalInfo.student.name} 生成主内生日祝福短信
                </h3>
                <p className="text-xs text-slate-500">
                  迎向 {blessingModalInfo.turningAge} 岁生日 · 家长：{blessingModalInfo.student.parentName || '家长'} ({blessingModalInfo.student.parentPhone || '无电话'})
                </p>
              </div>
            </div>

            {/* Bible Verse Selector */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                📖 选择赐福圣经经文（可切换不同经文组合）：
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {BIRTHDAY_BLESSING_VERSES.map((bv, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedVerseIndex(idx)}
                    className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      selectedVerseIndex === idx
                        ? 'bg-amber-50/80 border-amber-400 text-amber-950 font-medium ring-1 ring-amber-300'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-amber-900 mb-0.5">{bv.reference}</div>
                    <div className="text-[11px] text-slate-600 leading-relaxed">“{bv.verse}”</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generated Message Preview */}
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-bold text-slate-700">📱 祝福短信内容预览（适用于微信/短信发送）：</span>
                <span className="text-[10px] text-slate-400">支持一键复制到剪贴板</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto border border-slate-800">
                {generateBirthdaySmsBlessing(blessingModalInfo, config.churchName, selectedVerseIndex)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setBlessingModalInfo(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                关闭
              </button>

              <button
                onClick={() => handleCopyBlessing(blessingModalInfo, selectedVerseIndex)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {copiedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSuccess ? '复制成功！已存入剪贴板' : '一键复制祝福短信'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          PRINTABLE BIRTHDAY CARD MODAL (精美生日贺卡生成与打印)
          ========================================================= */}
      {printCardStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {printCardStudent.student.name} 主日学精美生日贺卡预览
                </h3>
              </div>
              <button
                onClick={() => setPrintCardStudent(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* The Actual Birthday Card Template */}
            <div id="printable-birthday-card" className="border-4 border-amber-600/30 rounded-3xl p-8 bg-linear-to-b from-amber-50/60 via-white to-amber-50/40 relative overflow-hidden shadow-inner text-center">
              
              {/* Corner Ornaments */}
              <div className="absolute top-3 left-3 text-amber-400 text-xl">✨</div>
              <div className="absolute top-3 right-3 text-amber-400 text-xl">✨</div>
              <div className="absolute bottom-3 left-3 text-amber-400 text-xl">🎈</div>
              <div className="absolute bottom-3 right-3 text-amber-400 text-xl">🎂</div>

              {/* Church Title */}
              <div className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">
                {config.churchName} • {config.schoolTitle}
              </div>
              <h2 className="text-2xl font-black text-amber-950 font-serif mb-3">
                HAPPY BIRTHDAY • 生日快乐
              </h2>

              <div className="w-16 h-1 bg-amber-600 mx-auto rounded-full mb-6" />

              <div className="text-sm text-slate-600 mb-2">亲爱的主内宝贝</div>
              <div className="text-3xl font-extrabold text-slate-900 font-serif mb-2 tracking-wide">
                {printCardStudent.student.name} 同学
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-bold border border-amber-300 mb-6">
                <span>🎉 欣逢 {printCardStudent.turningAge} 岁华诞 · {printCardStudent.formattedBirthday}</span>
                <span>·</span>
                <span>{printCardStudent.classGroup?.name || '主日学'}</span>
              </div>

              {/* Scripture Blessing Box */}
              <div className="bg-white/90 border border-amber-200/80 rounded-2xl p-5 max-w-lg mx-auto mb-6 shadow-2xs">
                <p className="text-xs text-amber-900/80 font-bold mb-1">【经文赐福】</p>
                <p className="text-sm font-serif text-slate-800 italic leading-relaxed mb-2">
                  “愿耶和华赐福给你，保护你；愿耶和华使祂的脸光照你，赐恩给你；愿耶和华向你仰脸，赐你平安。”
                </p>
                <p className="text-xs font-bold text-amber-800 text-right">
                  —— 民数记 6:24-26
                </p>
              </div>

              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
                愿主耶稣保守你在真理与慈爱中茁壮成长，聪明、智慧与身量一同增长，作主所喜悦的光明之子！
              </p>

              {/* Signatures */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-amber-200/60 max-w-md mx-auto">
                <div>班级导师：{printCardStudent.classGroup?.teacher || '主日学老师'}</div>
                <div>日期：{formatChineseDate(printCardStudent.nextBirthdayDateStr)}</div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setPrintCardStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                关闭预览
              </button>

              <button
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>立即打印此贺卡</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
