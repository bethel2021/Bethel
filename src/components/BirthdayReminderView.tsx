import React, { useState, useMemo } from 'react';
import {
  Cake,
  Contact,
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
  Award,
  Download,
  FileText
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
  const [printCardStudent, setPrintCardStudent] = useState<StudentBirthdayInfo | null>(null);
  const [showPrintListModal, setShowPrintListModal] = useState<boolean>(false);
  const [printTableCopied, setPrintTableCopied] = useState<boolean>(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

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

  // Open Print List Modal
  const handlePrintList = () => {
    setShowPrintListModal(true);
  };

  // Safe execute print
  const executePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.error('Window print error:', err);
      setPrintNotice('若浏览器限制了自动弹出打印，您可直接点击“导出离线打印文件”或在键盘按 Ctrl+P (Mac按 Cmd+P) 打印。');
      setTimeout(() => setPrintNotice(null), 6000);
    }
  };

  // Copy table TSV for Excel/Word
  const handleCopyTableData = () => {
    const headers = ['序号', '学生姓名', '性别', '所属班级', '公历生日', '年龄', '家长姓名', '家长电话', '牧养备注'];
    const rows = filteredList.map((info, idx) => {
      const birthYear = info.student.birthDate ? parseInt(info.student.birthDate.split('-')[0]) : null;
      const ageStr = birthYear && !isNaN(birthYear) ? `${new Date().getFullYear() - birthYear}岁` : '-';
      return [
        (idx + 1).toString(),
        info.student.name,
        info.student.gender === 'male' ? '男' : info.student.gender === 'female' ? '女' : '-',
        info.classGroup?.name || '未分配',
        info.formattedBirthDate,
        ageStr,
        info.student.parentName || '-',
        info.student.parentPhone || '-',
        info.student.notes || '-'
      ];
    });
    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setPrintTableCopied(true);
      setTimeout(() => setPrintTableCopied(false), 2500);
    });
  };

  // Standalone HTML Printable file download
  const handleDownloadPrintHTML = () => {
    const churchTitle = config.churchName || '伯特利基督教会';
    const filterDesc = periodFilter === 'week' ? '本周寿星 (7天内)' : periodFilter === 'month' ? '本月寿星 (30天内)' : selectedMonthFilter !== 'all' ? `${selectedMonthFilter}月份寿星` : '全年在册寿星花名册';
    const classDesc = selectedClassId === 'all' ? '全部班级' : classes.find(c => c.id === selectedClassId)?.name || '指定班级';
    const nowStr = formatChineseDate(new Date());

    const rowsHtml = filteredList.map((info, idx) => {
      const birthYear = info.student.birthDate ? parseInt(info.student.birthDate.split('-')[0]) : null;
      const ageStr = birthYear && !isNaN(birthYear) ? `${new Date().getFullYear() - birthYear}岁` : '-';
      const genderText = info.student.gender === 'male' ? '男' : info.student.gender === 'female' ? '女' : '-';
      return `<tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: bold; color: #0f172a;">${info.student.name}</td>
        <td style="text-align: center;">${genderText}</td>
        <td>${info.classGroup?.name || '未分班'}</td>
        <td style="text-align: center; color: #b45309; font-weight: 600;">${info.formattedBirthDate}</td>
        <td style="text-align: center;">${ageStr}</td>
        <td>${info.student.parentName || '-'}</td>
        <td>${info.student.parentPhone || '-'}</td>
        <td style="color: #64748b;">${info.student.notes || '主恩丰盛'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${churchTitle} - 主日学生日档案打印表</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; }
    .header { text-align: center; border-bottom: 2px solid #b45309; padding-bottom: 12px; margin-bottom: 16px; }
    .church-name { font-size: 20px; font-weight: bold; color: #1e293b; }
    .sheet-title { font-size: 16px; font-weight: 600; color: #b45309; margin-top: 4px; }
    .meta-bar { display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 12px; padding: 6px 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #1e293b; }
    tr:nth-child(even) { background-color: #fafaf9; }
    .footer { margin-top: 24px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
    .verse { font-style: italic; color: #92400e; margin-bottom: 16px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 24px; padding: 0 20px; font-size: 12px; }
    .sig-line { border-bottom: 1px solid #0f172a; display: inline-block; width: 120px; margin-left: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="church-name">✝️ ${churchTitle}</div>
    <div class="sheet-title">主日学学生档案与生日花名册</div>
  </div>
  <div class="meta-bar">
    <div><strong>范围：</strong>${filterDesc} (${classDesc})</div>
    <div><strong>寿星总计：</strong>${filteredList.length} 人</div>
    <div><strong>制表日期：</strong>${nowStr}</div>
    <div><strong>制表同工：</strong>${currentUser?.displayName || '主日学同工'}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">序号</th>
        <th style="width: 70px;">姓名</th>
        <th style="width: 35px; text-align: center;">性别</th>
        <th style="width: 80px;">班级</th>
        <th style="width: 75px; text-align: center;">生日</th>
        <th style="width: 45px; text-align: center;">年龄</th>
        <th style="width: 75px;">家长</th>
        <th style="width: 95px;">联系电话</th>
        <th>备注 / 祝福寄语</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div class="footer">
    <div class="verse">“你以恩典为年岁的冠冕；你的路径都滴下脂油。” —— 诗篇 65:11</div>
    <div class="signatures">
      <div>主日学带班教师签名：<span class="sig-line"></span></div>
      <div>教牧长执签章：<span class="sig-line"></span></div>
      <div>归档日期：<span class="sig-line"></span></div>
    </div>
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 350); };
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${churchTitle}_学生生日档案表_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2">学生档案受权限保护</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          为保护主日学未成年孩童与家长隐私信息，学生档案、联系方式及生日祝福受权限保护。请使用教师或管理员账号登录后查阅。
        </p>
        <button
          onClick={onOpenLogin}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>主日学 / 同工登录</span>
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
            <Contact className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 font-serif tracking-tight">学生档案与生日关怀</h2>
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
                <div>班级导师：{printCardStudent.classGroup?.teacher || '主日学'}</div>
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

      {/* PRINTABLE BIRTHDAY LIST MODAL (生日花名册预览、打印与导出) */}
      {showPrintListModal && (
        <div className="print-modal-backdrop fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="print-modal-container bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            
            {/* Top Toolbar (Hidden during print) */}
            <div className="no-print p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Printer className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    学生档案与生日表打印预览
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  当前筛选：{periodFilter === 'week' ? '本周寿星 (7天内)' : periodFilter === 'month' ? '本月寿星 (30天内)' : selectedMonthFilter !== 'all' ? `${selectedMonthFilter}月份寿星` : '全年在册寿星'} · 共 {filteredList.length} 位学员
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={executePrint}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  title="唤起浏览器系统打印窗口"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>立即打印</span>
                </button>

                <button
                  onClick={handleCopyTableData}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="复制制表符格式文本，可直接粘贴到 Excel 或 WPS 中"
                >
                  {printTableCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{printTableCopied ? '已复制表格！' : '复制表格数据'}</span>
                </button>

                <button
                  onClick={handleDownloadPrintHTML}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="下载独立完整的 HTML 打印单文件，可在任意浏览器双击打开并打印"
                >
                  <Download className="w-3.5 h-3.5 text-amber-700" />
                  <span>导出离线打印单</span>
                </button>

                <button
                  onClick={() => setShowPrintListModal(false)}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-500 border border-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                  title="关闭预览"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Print notice tip banner if any */}
            {printNotice && (
              <div className="no-print bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between">
                <span>{printNotice}</span>
                <button onClick={() => setPrintNotice(null)} className="text-amber-700 hover:text-amber-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Document Preview (Scrollable container on screen, prints cleanly) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60">
              <div
                id="printable-birthday-sheet"
                className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-6 sm:p-10 max-w-4xl mx-auto"
              >
                {/* Header */}
                <div className="text-center pb-5 border-b-2 border-amber-700 mb-5">
                  <div className="flex items-center justify-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-widest mb-1">
                    <Church className="w-4 h-4" />
                    <span>{config.churchName || '伯特利基督教会'} 主日学部</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    学生档案与主日学生日花名册
                  </h2>
                  <p className="text-xs text-amber-800 font-medium mt-1">
                    SUNDAY SCHOOL STUDENT PROFILE & BIRTHDAY ROSTER
                  </p>
                </div>

                {/* Meta Information Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 mb-5">
                  <div>
                    <span className="text-slate-400">统计周期：</span>
                    <span className="font-semibold text-slate-800">
                      {periodFilter === 'week' ? '本周寿星 (7天内)' : periodFilter === 'month' ? '本月寿星 (30天内)' : selectedMonthFilter !== 'all' ? `${selectedMonthFilter}月份寿星` : '全年在册寿星'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">班级范围：</span>
                    <span className="font-semibold text-slate-800">
                      {selectedClassId === 'all' ? '全部班级' : classes.find(c => c.id === selectedClassId)?.name || '指定班级'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">寿星总计：</span>
                    <span className="font-bold text-amber-700">{filteredList.length} 人</span>
                  </div>
                  <div>
                    <span className="text-slate-400">制表同工：</span>
                    <span className="font-medium text-slate-800">{currentUser?.displayName || '主日学同工'}</span>
                  </div>
                </div>

                {/* Main Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-300">
                        <th className="py-2.5 px-2 text-center w-10 border border-slate-300">序号</th>
                        <th className="py-2.5 px-3 border border-slate-300">学员姓名</th>
                        <th className="py-2.5 px-2 text-center w-12 border border-slate-300">性别</th>
                        <th className="py-2.5 px-3 border border-slate-300">所属班级</th>
                        <th className="py-2.5 px-3 text-center border border-slate-300">公历生日</th>
                        <th className="py-2.5 px-2 text-center w-14 border border-slate-300">年龄</th>
                        <th className="py-2.5 px-3 border border-slate-300">家长姓名</th>
                        <th className="py-2.5 px-3 border border-slate-300">家长联系电话</th>
                        <th className="py-2.5 px-3 border border-slate-300">备注 / 属灵祝福</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-slate-400 border border-slate-300">
                            当前筛选条件下暂无学员生日档案记录
                          </td>
                        </tr>
                      ) : (
                        filteredList.map((info, idx) => {
                          const birthYear = info.student.birthDate ? parseInt(info.student.birthDate.split('-')[0]) : null;
                          const ageStr = birthYear && !isNaN(birthYear) ? `${new Date().getFullYear() - birthYear}岁` : '-';
                          const genderText = info.student.gender === 'male' ? '男' : info.student.gender === 'female' ? '女' : '-';

                          return (
                            <tr key={info.student.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                              <td className="py-2 px-2 text-center text-slate-500 font-mono border border-slate-300">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900 border border-slate-300">
                                {info.student.name}
                                {info.isToday && (
                                  <span className="ml-1 text-[10px] text-amber-700 font-normal">🎂今天</span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 border border-slate-300">
                                {genderText}
                              </td>
                              <td className="py-2 px-3 text-slate-700 border border-slate-300">
                                {info.classGroup?.name || '未分配'}
                              </td>
                              <td className="py-2 px-3 text-center font-semibold text-amber-800 border border-slate-300">
                                {info.formattedBirthDate}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-600 font-medium border border-slate-300">
                                {ageStr}
                              </td>
                              <td className="py-2 px-3 text-slate-700 border border-slate-300">
                                {info.student.parentName || '-'}
                              </td>
                              <td className="py-2 px-3 text-slate-600 font-mono border border-slate-300">
                                {info.student.parentPhone || '-'}
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px] border border-slate-300">
                                {info.student.notes || '愿耶和华赐福给你，保护你'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Section */}
                <div className="mt-8 pt-5 border-t border-slate-200">
                  <div className="text-center italic text-xs text-amber-900 mb-6 bg-amber-50/60 py-2.5 px-4 rounded-lg border border-amber-200/60">
                    “你以恩典为年岁的冠冕；你的路径都滴下脂油。” —— 诗篇 65:11
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-700 pt-2">
                    <div className="border-t border-slate-400 pt-2">
                      <span className="text-slate-400">主日学带班教师签名：</span>
                    </div>
                    <div className="border-t border-slate-400 pt-2">
                      <span className="text-slate-400">教牧长执审核签章：</span>
                    </div>
                    <div className="border-t border-slate-400 pt-2">
                      <span className="text-slate-400">打印归档日期：</span>
                      <span className="ml-1 text-slate-800">{formatChineseDate(new Date())}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Tip Footer (Hidden in print) */}
            <div className="no-print px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span>💡</span>
                <span>提示：若浏览器直接打印受限，可使用“导出离线打印单”或直接复制表格粘贴到 Excel。</span>
              </span>
              <button
                onClick={() => setShowPrintListModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer text-xs"
              >
                关闭
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

