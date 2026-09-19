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
  Phone,
  Users,
  Sparkles,
  Church,
  X,
  Lock,
  LogIn,
  Heart,
  MessageCircle,
  ChevronRight,
  Filter,
  Layers,
  Award
} from 'lucide-react';
import type { Student, ClassGroup, SystemConfig, AdminUser } from '../types';
import {
  getAllStudentsBirthdayInfo,
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

type PeriodFilter = 'week' | 'month' | 'all';

export const BirthdayReminderView: React.FC<BirthdayReminderViewProps> = ({
  config,
  classes,
  students,
  currentUser,
  onOpenLogin,
}) => {
  // Main view filter: 'week' (本周), 'month' (本月), 'all' (全部)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<'all' | number>('all');
  const [phoneCopiedId, setPhoneCopiedId] = useState<string | null>(null);

  // Modal states
  const [blessingModalInfo, setBlessingModalInfo] = useState<StudentBirthdayInfo | null>(null);
  const [selectedVerseIndex, setSelectedVerseIndex] = useState<number>(0);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [batchCopiedSuccess, setBatchCopiedSuccess] = useState<boolean>(false);
  const [printCardStudent, setPrintCardStudent] = useState<StudentBirthdayInfo | null>(null);

  // All birthdays processed and sorted by upcoming birthday (daysUntil)
  const allBirthdayInfos = useMemo(() => {
    return getAllStudentsBirthdayInfo(students, classes, new Date());
  }, [students, classes]);

  const currentRomeTime = useMemo(() => getRomeTimeParts(), []);
  const currentMonth = currentRomeTime.month; // 1-12

  // Key counts
  const weekCount = useMemo(() => allBirthdayInfos.filter(i => i.isWithinOneWeek).length, [allBirthdayInfos]);
  const monthCount = useMemo(() => allBirthdayInfos.filter(i => i.isWithinOneMonth).length, [allBirthdayInfos]);
  const allCount = allBirthdayInfos.length;
  const todayCount = useMemo(() => allBirthdayInfos.filter(i => i.isToday).length, [allBirthdayInfos]);
  const sundayBirthdayCount = useMemo(
    () => allBirthdayInfos.filter(i => i.isNextSunday).length,
    [allBirthdayInfos]
  );

  // Filtered list based on active period & class & search & month
  const filteredList = useMemo(() => {
    let list = allBirthdayInfos;

    // Filter by period
    if (periodFilter === 'week') {
      list = list.filter(i => i.isWithinOneWeek);
    } else if (periodFilter === 'month') {
      list = list.filter(i => i.isWithinOneMonth);
    } else if (periodFilter === 'all') {
      if (selectedMonthFilter !== 'all') {
        list = list.filter(i => i.birthMonth === selectedMonthFilter);
      }
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
  }, [allBirthdayInfos, periodFilter, selectedClassId, searchQuery, selectedMonthFilter]);

  // Handle Copy Single Student Blessing
  const handleCopyBlessing = (info: StudentBirthdayInfo, verseIdx: number = selectedVerseIndex) => {
    const text = generateBirthdaySmsBlessing(info, config.churchName, verseIdx);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    });
  };

  // Handle Copy Parent Phone
  const handleCopyPhone = (studentId: string, phone: string) => {
    navigator.clipboard.writeText(phone).then(() => {
      setPhoneCopiedId(studentId);
      setTimeout(() => setPhoneCopiedId(null), 1800);
    });
  };

  // Handle Batch Copy Birthday List
  const handleBatchCopyList = () => {
    if (filteredList.length === 0) return;

    let periodLabel = '本周内 (7天)';
    if (periodFilter === 'month') periodLabel = '本月内 (30天)';
    if (periodFilter === 'all') {
      periodLabel = selectedMonthFilter === 'all' ? '全体学员' : `${selectedMonthFilter}月份学员`;
    }

    let text = `🎂【${config.churchName} • 主日学生日关怀汇总】\n`;
    text += `视图范围：${periodLabel} | 统计日期：${currentRomeTime.dateStr} | 共计 ${filteredList.length} 位寿星\n\n`;

    filteredList.forEach((info, idx) => {
      const className = info.classGroup?.name || '主日学';
      const daysText = info.isToday
        ? '★ 今天生日！'
        : info.isTomorrow
        ? '明天生日'
        : `还剩 ${info.daysUntil} 天 (${info.nextBirthdayDayOfWeek})`;
      text += `${idx + 1}. ${info.student.name}（${className}）- 出生：${info.birthDate}（即将迎来 ${info.turningAge} 岁）| ${daysText} | 家长：${info.student.parentName || '未登记'} ${info.student.parentPhone || ''}\n`;
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
        <h3 className="text-base font-bold text-slate-900 mb-2">学生生日关怀档案受权限保护</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          为保护主日学未成年孩童与家长隐私信息，生日关怀、联系方式及祝福短信受权限保护。请使用教师或管理员账号登录后查阅。
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
    <div className="space-y-5">
      
      {/* Top Banner & Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300 shadow-2xs">
            <Cake className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 font-serif tracking-tight">学生生日关怀与主内祝福</h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                主爱相伴 • 年岁冠冕
              </span>
              {todayCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  今天有 {todayCount} 位寿星！
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              按周、月及全年维度追踪主日学寿星，支持一键复制定制经文祝福短信与生成精美实体生日贺卡
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleBatchCopyList}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="一键复制当前筛选出的寿星名单文本"
          >
            {batchCopiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{batchCopiedSuccess ? '已复制清单！' : '复制寿星清单'}</span>
          </button>

          <button
            onClick={handlePrintList}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>打印生日表</span>
          </button>
        </div>
      </div>

      {/* Metric Highlighting Cards (Clickable Quick Views) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        
        {/* Card 1: 本周生日 */}
        <div
          onClick={() => {
            setPeriodFilter('week');
            setSelectedMonthFilter('all');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            periodFilter === 'week'
              ? 'bg-linear-to-br from-amber-50 to-orange-50 border-amber-400 ring-2 ring-amber-300/70 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={periodFilter === 'week' ? 'text-amber-950 font-bold' : 'text-slate-600'}>
              本周生日关怀 (7天内)
            </span>
            <div className={`p-1 rounded-lg ${periodFilter === 'week' ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-900 font-serif">{weekCount}</span>
            <span className="text-xs text-amber-700 font-medium">位同学</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-amber-800">即将过生日，建议重点准备祝福与礼物</span>
            {periodFilter === 'week' && (
              <span className="text-[10px] font-bold text-amber-900 bg-amber-200/60 px-1.5 py-0.5 rounded">当前视图</span>
            )}
          </div>
          {weekCount > 0 && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </div>

        {/* Card 2: 本月生日 */}
        <div
          onClick={() => {
            setPeriodFilter('month');
            setSelectedMonthFilter('all');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            periodFilter === 'month'
              ? 'bg-linear-to-br from-teal-50 to-emerald-50 border-teal-400 ring-2 ring-teal-300/70 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-teal-300 hover:bg-teal-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={periodFilter === 'month' ? 'text-teal-950 font-bold' : 'text-slate-600'}>
              本月生日关怀 (30天内)
            </span>
            <div className={`p-1 rounded-lg ${periodFilter === 'month' ? 'bg-teal-200/80 text-teal-900' : 'bg-slate-100 text-slate-500'}`}>
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-teal-900 font-serif">{monthCount}</span>
            <span className="text-xs text-teal-700 font-medium">位同学</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-teal-800">涵盖近期一个月内全部生日学员</span>
            {periodFilter === 'month' && (
              <span className="text-[10px] font-bold text-teal-900 bg-teal-200/60 px-1.5 py-0.5 rounded">当前视图</span>
            )}
          </div>
        </div>

        {/* Card 3: 全年生日档案 */}
        <div
          onClick={() => setPeriodFilter('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            periodFilter === 'all'
              ? 'bg-linear-to-br from-indigo-50 to-purple-50 border-indigo-400 ring-2 ring-indigo-300/70 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={periodFilter === 'all' ? 'text-indigo-950 font-bold' : 'text-slate-600'}>
              全年生日档案 (全体学员)
            </span>
            <div className={`p-1 rounded-lg ${periodFilter === 'all' ? 'bg-indigo-200/80 text-indigo-900' : 'bg-slate-100 text-slate-500'}`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-900 font-serif">{allCount}</span>
            <span className="text-xs text-indigo-700 font-medium">位已建档学员</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-indigo-800">按临近天数排列，可按月份快速索引</span>
            {periodFilter === 'all' && (
              <span className="text-[10px] font-bold text-indigo-900 bg-indigo-200/60 px-1.5 py-0.5 rounded">当前视图</span>
            )}
          </div>
        </div>

      </div>

      {/* Main Filter & Navigation Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
        
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Quick Period Segmented Filter Switch: 【本周】 【本月】 【全部】 */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 shrink-0">
            <button
              id="birthday-filter-week"
              onClick={() => {
                setPeriodFilter('week');
                setSelectedMonthFilter('all');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                periodFilter === 'week'
                  ? 'bg-white text-amber-900 shadow-xs border border-slate-200/90 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${periodFilter === 'week' ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>本周</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                periodFilter === 'week' ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {weekCount}
              </span>
            </button>

            <button
              id="birthday-filter-month"
              onClick={() => {
                setPeriodFilter('month');
                setSelectedMonthFilter('all');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                periodFilter === 'month'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200/90 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gift className={`w-3.5 h-3.5 ${periodFilter === 'month' ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>本月</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                periodFilter === 'month' ? 'bg-teal-100 text-teal-900 font-bold' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {monthCount}
              </span>
            </button>

            <button
              id="birthday-filter-all"
              onClick={() => setPeriodFilter('all')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                periodFilter === 'all'
                  ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/90 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${periodFilter === 'all' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>全部</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                periodFilter === 'all' ? 'bg-indigo-100 text-indigo-900 font-bold' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {allCount}
              </span>
            </button>
          </div>

          {/* Search & Class Filter */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] sm:min-w-[240px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索学生/家长/电话..."
                className="w-full text-xs pl-8 pr-7 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="清空搜索"
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

        {/* 12 Months Bar (Enhanced when in 'all' view) */}
        {periodFilter === 'all' && (
          <div className="pt-2.5 border-t border-slate-100">
            <div className="text-xs text-slate-500 font-medium mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>按月份精准筛选：</span>
              </span>
              <div className="flex items-center gap-2">
                {selectedMonthFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedMonthFilter('all')}
                    className="text-[11px] text-amber-800 hover:underline font-semibold cursor-pointer"
                  >
                    重置为查看全年所有月份
                  </button>
                )}
                <span className="text-indigo-800 font-bold text-xs">
                  {selectedMonthFilter === 'all' ? '当前：展示全年所有月份' : `当前筛选：${selectedMonthFilter}月份`}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-13 gap-1.5">
              <button
                onClick={() => setSelectedMonthFilter('all')}
                className={`py-1.5 px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center text-xs font-semibold ${
                  selectedMonthFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                }`}
              >
                <span>全部</span>
                <span className={`text-[10px] mt-0.5 font-mono ${selectedMonthFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
                  {allCount}人
                </span>
              </button>

              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                const countInM = allBirthdayInfos.filter(i => i.birthMonth === m).length;
                const isSelected = selectedMonthFilter === m;
                const isCurrent = currentMonth === m;

                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonthFilter(m)}
                    className={`py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                      isSelected
                        ? 'bg-indigo-700 text-white font-bold shadow-xs'
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
                          ? isCurrent ? 'bg-amber-200 text-amber-900 font-bold' : 'bg-slate-200/70 text-slate-700 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      {countInM}人
                    </span>
                    {isCurrent && !isSelected && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-600 ring-2 ring-white" title="当前月份" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Birthday Student Cards Grid View */}
      <div className="space-y-3.5">
        
        {/* Subheader Title & Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">
              {periodFilter === 'week' && '本周内过生日学员名单 (7天)'}
              {periodFilter === 'month' && '本月内过生日学员名单 (30天)'}
              {periodFilter === 'all' && (
                selectedMonthFilter === 'all' ? '全年生日学员档案' : `${selectedMonthFilter}月份全体寿星学员`
              )}
            </span>
            <span className="bg-slate-100 px-2.5 py-0.5 rounded-full font-bold text-slate-700 border border-slate-200/60">
              共 {filteredList.length} 位
            </span>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            按生日临近倒计时自动排序
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <Cake className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-1">
              暂无符合条件的寿星学员
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              在所选的【{periodFilter === 'week' ? '本周' : periodFilter === 'month' ? '本月' : '当前筛选'}】范围或搜索关键词下暂无生日记录。
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              {periodFilter !== 'month' && (
                <button
                  onClick={() => {
                    setPeriodFilter('month');
                    setSelectedClassId('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 cursor-pointer shadow-xs"
                >
                  切换至本月视图 ({monthCount}人)
                </button>
              )}
              {periodFilter !== 'all' && (
                <button
                  onClick={() => {
                    setPeriodFilter('all');
                    setSelectedClassId('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  查看全部学员档案 ({allCount}人)
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredList.map(info => {
              const { student, classGroup, daysUntil, isToday, isTomorrow, isWithinOneWeek, isNextSunday } = info;

              // Countdown badge & styling
              let countdownBadge = {
                text: `还剩 ${daysUntil} 天`,
                subtext: `${info.formattedBirthday} · ${info.nextBirthdayDayOfWeek}`,
                bg: 'bg-slate-100 text-slate-700 border-slate-200',
                icon: Clock
              };

              if (isToday) {
                countdownBadge = {
                  text: '🎉 今天生日！愿主赐福',
                  subtext: '今天 · 华诞之日',
                  bg: 'bg-linear-to-r from-amber-500 to-rose-500 text-white border-amber-600 font-bold shadow-xs',
                  icon: Sparkles
                };
              } else if (isTomorrow) {
                countdownBadge = {
                  text: '🌟 明天生日！',
                  subtext: `明天 · ${info.formattedBirthday}`,
                  bg: 'bg-amber-100 text-amber-950 border-amber-300 font-bold',
                  icon: Sparkles
                };
              } else if (isNextSunday) {
                countdownBadge = {
                  text: `⛪ 本主日生日特别关怀 (剩${daysUntil}天)`,
                  subtext: `${info.formattedBirthday} · 主日`,
                  bg: 'bg-purple-100 text-purple-950 border-purple-300 font-bold',
                  icon: Church
                };
              } else if (isWithinOneWeek) {
                countdownBadge = {
                  text: `⏰ 还剩 ${daysUntil} 天 (${info.nextBirthdayDayOfWeek})`,
                  subtext: info.formattedBirthday,
                  bg: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold',
                  icon: Clock
                };
              } else if (daysUntil <= 30) {
                countdownBadge = {
                  text: `📅 还剩 ${daysUntil} 天`,
                  subtext: `${info.formattedBirthday} · ${info.nextBirthdayDayOfWeek}`,
                  bg: 'bg-teal-50 text-teal-900 border-teal-200 font-semibold',
                  icon: Calendar
                };
              } else {
                countdownBadge = {
                  text: `🎂 距离生日还剩 ${daysUntil} 天`,
                  subtext: `${info.formattedBirthday} (${info.nextBirthdayDateStr.slice(0, 4)}年)`,
                  bg: 'bg-slate-50 text-slate-700 border-slate-200 font-medium',
                  icon: Calendar
                };
              }

              return (
                <div
                  key={student.id}
                  id={`birthday-card-${student.id}`}
                  className={`bg-white rounded-2xl border p-4.5 shadow-2xs transition-all flex flex-col justify-between relative overflow-hidden group hover:shadow-xs ${
                    isToday
                      ? 'border-amber-400 ring-2 ring-amber-300/80 bg-linear-to-b from-amber-50/60 to-white'
                      : isWithinOneWeek
                      ? 'border-amber-300 hover:border-amber-400'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Decorative Corner Glow for Today's Birthday */}
                  {isToday && (
                    <div className="absolute -top-6 -right-6 w-16 h-16 bg-amber-400/20 rounded-full blur-sm pointer-events-none" />
                  )}

                  {/* Card Main Info Section */}
                  <div>
                    {/* Header Row: Student Avatar, Name, Gender, Class, Age */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {/* Gender-Themed Avatar */}
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 border shadow-2xs ${
                            student.gender === 'boy'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {student.name.slice(0, 1)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900 tracking-tight">
                              {student.name}
                            </h4>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                                student.gender === 'boy'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {student.gender === 'boy' ? '男' : '女'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                              {classGroup?.name || '主日学'}
                            </span>
                            {classGroup?.teacher && (
                              <span className="text-slate-400">· {classGroup.teacher}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Age Highlights Pill */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-100/80 text-amber-950 border border-amber-300 block shadow-2xs">
                          迎来 {info.turningAge} 岁
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">
                          现龄 {info.currentAge} 岁
                        </span>
                      </div>
                    </div>

                    {/* Countdown Banner */}
                    <div className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between mb-3.5 ${countdownBadge.bg}`}>
                      <div className="flex items-center gap-1.5">
                        <countdownBadge.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-bold">{countdownBadge.text}</span>
                      </div>
                      <span className="text-[11px] font-mono opacity-90">
                        {countdownBadge.subtext}
                      </span>
                    </div>

                    {/* Student Info Details List */}
                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Cake className="w-3 h-3 text-slate-400" />
                          出生日期：
                        </span>
                        <span className="font-bold text-slate-800 font-mono">
                          {student.birthDate} ({info.nextBirthdayDayOfWeek})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          家长姓名：
                        </span>
                        <span className="font-semibold text-slate-800">
                          {student.parentName || '未登记'}
                        </span>
                      </div>

                      {student.parentPhone && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            家长联系电话：
                          </span>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${student.parentPhone}`}
                              className="font-mono font-bold text-amber-800 hover:text-amber-950 hover:underline"
                              title="点击直接拨打电话"
                            >
                              {student.parentPhone}
                            </a>
                            <button
                              onClick={() => handleCopyPhone(student.id, student.parentPhone)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                phoneCopiedId === student.id
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                  : 'bg-white hover:bg-slate-200 text-slate-600 border-slate-200'
                              }`}
                              title="一键复制电话号码"
                            >
                              {phoneCopiedId === student.id ? '已复制' : '复制'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons (Footer) */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setBlessingModalInfo(info);
                        setSelectedVerseIndex(0);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-amber-700" />
                      <span>祝福短信</span>
                    </button>

                    <button
                      onClick={() => setPrintCardStudent(info)}
                      className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Gift className="w-3.5 h-3.5 text-amber-400" />
                      <span>生成贺卡</span>
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

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  为 {blessingModalInfo.student.name} 生成主内生日祝福短信
                </h3>
                <p className="text-xs text-slate-500">
                  迎向 {blessingModalInfo.turningAge} 岁华诞 · 家长：{blessingModalInfo.student.parentName || '家长'} ({blessingModalInfo.student.parentPhone || '无电话'})
                </p>
              </div>
            </div>

            {/* Bible Verse Selector */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                📖 选择赐福经文组合：
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {BIRTHDAY_BLESSING_VERSES.map((bv, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedVerseIndex(idx)}
                    className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      selectedVerseIndex === idx
                        ? 'bg-amber-50/90 border-amber-400 text-amber-950 font-medium ring-1 ring-amber-300'
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
                <span className="font-bold text-slate-700">📱 祝福短信预览（适用于微信/短信）：</span>
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
                <span>{copiedSuccess ? '已成功复制到剪贴板！' : '一键复制祝福短信'}</span>
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
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
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

