import React, { useState } from 'react';
import { 
  CalendarCheck, 
  Award, 
  Printer, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  FileText, 
  XCircle, 
  Download,
  Church,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Star,
  Lock,
  LogIn,
  ShieldCheck,
  User,
  Users,
  Calendar,
  Layers,
  Copy,
  Check,
  X
} from 'lucide-react';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig, AdminUser } from '../types';
import { getSundaysInMonth, formatShortChineseDate, getAllSundaysInYear, formatChineseDate } from '../utils/dateUtils';

interface AttendanceStatsViewProps {
  config: SystemConfig;
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  currentUser: AdminUser | null;
  onOpenLogin: () => void;
}

export const AttendanceStatsView: React.FC<AttendanceStatsViewProps> = ({
  config,
  classes,
  students,
  records,
  currentUser,
  onOpenLogin,
}) => {
  // Sub-view: 'monthly' (月度考勤明细) or 'annual' (年度成绩与荣誉档案)
  const [subTab, setSubTab] = useState<'monthly' | 'annual'>('monthly');

  // Monthly State
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // 8 is September (0-indexed)
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState<boolean>(false);
  const [reportCopied, setReportCopied] = useState<boolean>(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  // Annual State
  const [selectedAnnualYear, setSelectedAnnualYear] = useState<number>(config.currentYear || 2026);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [certificateViewStudent, setCertificateViewStudent] = useState<Student | null>(students[0] || null);

  // --- Monthly Computations ---
  const sundaysInMonth = getSundaysInMonth(selectedYear, selectedMonth);
  const monthName = `${selectedYear}年${selectedMonth + 1}月`;
  const targetStudents = filterClassId === 'all'
    ? students
    : students.filter(s => s.classId === filterClassId);

  const studentStats = targetStudents.map(student => {
    let attendedCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    const sundayRecords = sundaysInMonth.map(sunDate => {
      const rec = records.find(r => r.studentId === student.id && r.date === sunDate);
      if (rec) {
        if (rec.status === 'present') attendedCount++;
        else if (rec.status === 'late') {
          attendedCount++;
          lateCount++;
        } else if (rec.status === 'excused') {
          excusedCount++;
        }
      }
      return { date: sunDate, record: rec };
    });

    const totalSessions = sundaysInMonth.length;
    const rate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0;
    const isFullAttendance = totalSessions > 0 && attendedCount === totalSessions;

    return {
      student,
      sundayRecords,
      attendedCount,
      lateCount,
      excusedCount,
      rate,
      isFullAttendance,
    };
  });

  const totalStudentsCount = targetStudents.length;
  const fullAttendanceStudents = studentStats.filter(s => s.isFullAttendance);
  const totalPossibleAttendances = totalStudentsCount * sundaysInMonth.length;
  const totalActualAttendances = studentStats.reduce((sum, s) => sum + s.attendedCount, 0);
  const overallMonthRate = totalPossibleAttendances > 0 
    ? Math.round((totalActualAttendances / totalPossibleAttendances) * 100) 
    : 0;

  const handlePrint = () => {
    setShowMonthlyReportModal(true);
  };

  const executeReportPrint = () => {
    try {
      window.print();
    } catch (err) {
      console.error('Report print error:', err);
      setReportNotice('若浏览器限制了自动弹出打印，您可直接点击“导出离线打印文件”或使用快捷键 Ctrl+P (Mac按 Cmd+P) 打印。');
      setTimeout(() => setReportNotice(null), 6000);
    }
  };

  const handleCopyReportData = () => {
    const headerLine = ['序号', '学员姓名', '所属班级', ...sundaysInMonth.map(s => s.slice(5)), '出席周数', '出勤率', '综合评定'];
    const rows = studentStats.map((s, idx) => {
      const sundayStatuses = s.sundayRecords.map(r => {
        if (!r.record) return '缺席';
        if (r.record.status === 'present') return '出席';
        if (r.record.status === 'late') return '迟到';
        if (r.record.status === 'excused') return '请假';
        return '缺席';
      });
      const rating = s.isFullAttendance ? '全勤标兵' : s.rate >= 75 ? '优良' : s.rate >= 50 ? '良好' : '需关怀';
      const className = classes.find(c => c.id === s.student.classId)?.name || '未分配';
      return [
        (idx + 1).toString(),
        s.student.name,
        className,
        ...sundayStatuses,
        `${s.attendedCount}/${sundaysInMonth.length}`,
        `${s.rate}%`,
        rating
      ];
    });
    const tsv = [headerLine.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2500);
    });
  };

  const handleDownloadMonthlyReportHTML = () => {
    const churchTitle = config.churchName || '伯特利基督教会';
    const targetClass = filterClassId === 'all' ? null : classes.find(c => c.id === filterClassId);
    const classScopeName = targetClass ? targetClass.name : '全部班级汇总';
    const nowStr = formatChineseDate(new Date());

    const theadSundays = sundaysInMonth.map(s => `<th style="text-align: center; width: 45px;">${s.slice(5)}</th>`).join('');
    const rowsHtml = studentStats.map((s, idx) => {
      const sundayCols = s.sundayRecords.map(r => {
        if (!r.record) return `<td style="text-align: center; color: #94a3b8;">✗</td>`;
        if (r.record.status === 'present') return `<td style="text-align: center; color: #16a34a; font-weight: bold;">✓</td>`;
        if (r.record.status === 'late') return `<td style="text-align: center; color: #d97706;">⏰</td>`;
        if (r.record.status === 'excused') return `<td style="text-align: center; color: #2563eb;">📝</td>`;
        return `<td style="text-align: center; color: #94a3b8;">✗</td>`;
      }).join('');

      const rating = s.isFullAttendance ? '<span style="color: #b45309; font-weight: bold;">★ 全勤标兵</span>' : s.rate >= 75 ? '优良' : s.rate >= 50 ? '良好' : '<span style="color: #e11d48;">需关怀</span>';
      const className = classes.find(c => c.id === s.student.classId)?.name || '未分配';

      return `<tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: bold;">${s.student.name}</td>
        <td>${className}</td>
        ${sundayCols}
        <td style="text-align: center; font-weight: 600;">${s.attendedCount} / ${sundaysInMonth.length}</td>
        <td style="text-align: center; font-weight: bold; color: ${s.rate >= 75 ? '#16a34a' : '#b45309'};">${s.rate}%</td>
        <td style="text-align: center;">${rating}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${churchTitle} - ${monthName}月度考勤统计报表</title>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; }
    .header { text-align: center; border-bottom: 2px solid #b45309; padding-bottom: 12px; margin-bottom: 16px; }
    .church-name { font-size: 20px; font-weight: bold; color: #1e293b; }
    .sheet-title { font-size: 16px; font-weight: 600; color: #b45309; margin-top: 4px; }
    .meta-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 11px; color: #475569; margin-bottom: 14px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
    .kpi-row { display: flex; gap: 12px; margin-bottom: 16px; }
    .kpi-box { flex: 1; border: 1px solid #e2e8f0; background: #fffbeb; border-radius: 8px; padding: 8px 12px; text-align: center; }
    .kpi-num { font-size: 18px; font-weight: bold; color: #92400e; }
    .kpi-label { font-size: 11px; color: #78350f; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #1e293b; }
    tr:nth-child(even) { background-color: #fafaf9; }
    .legend { display: flex; gap: 16px; font-size: 11px; color: #64748b; margin-bottom: 14px; }
    .footer { margin-top: 24px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 28px; padding: 0 16px; font-size: 12px; }
    .sig-line { border-bottom: 1px solid #0f172a; display: inline-block; width: 120px; margin-left: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="church-name">✝️ ${churchTitle}</div>
    <div class="sheet-title">主日学月度考勤统计与出勤花名册</div>
  </div>
  <div class="meta-bar">
    <div><strong>统计月份：</strong>${monthName}</div>
    <div><strong>班级范围：</strong>${classScopeName}</div>
    <div><strong>制表日期：</strong>${nowStr}</div>
    <div><strong>审核同工：</strong>${currentUser?.displayName || '主日学同工'}</div>
  </div>
  <div class="kpi-row">
    <div class="kpi-box"><div class="kpi-num">${totalStudentsCount} 人</div><div class="kpi-label">在册学员总数</div></div>
    <div class="kpi-box"><div class="kpi-num">${sundaysInMonth.length} 周</div><div class="kpi-label">主日聚会周次</div></div>
    <div class="kpi-box"><div class="kpi-num">${overallMonthRate}%</div><div class="kpi-label">全月平均出勤率</div></div>
    <div class="kpi-box"><div class="kpi-num">${fullAttendanceStudents.length} 人</div><div class="kpi-label">全勤模范学员</div></div>
  </div>
  <div class="legend">
    <span>图例说明：</span>
    <span style="color: #16a34a; font-weight: bold;">✓ 出席</span>
    <span style="color: #d97706;">⏰ 迟到</span>
    <span style="color: #2563eb;">📝 请假</span>
    <span style="color: #94a3b8;">✗ 缺勤</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">序号</th>
        <th style="width: 80px;">学员姓名</th>
        <th style="width: 85px;">所属班级</th>
        ${theadSundays}
        <th style="width: 65px; text-align: center;">出席周数</th>
        <th style="width: 55px; text-align: center;">出勤率</th>
        <th style="width: 80px; text-align: center;">综合评定</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div class="footer">
    <div style="font-style: italic; color: #92400e; margin-bottom: 12px;">“人在最小的事上忠心，在大事上也忠心。” —— 路加福音 16:10</div>
    <div class="signatures">
      <div>带班教师签名：<span class="sig-line"></span></div>
      <div>主日学主任/教牧签章：<span class="sig-line"></span></div>
      <div>归档备案日期：<span class="sig-line"></span></div>
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
    a.download = `${churchTitle}_${monthName}_${classScopeName}_月度考勤表.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getClassStats = (classId: string) => {
    const classStudents = students.filter(s => s.classId === classId);
    if (classStudents.length === 0) return { rate: 0, total: 0, fullAttendanceCount: 0 };
    
    let totalAttended = 0;
    let fullAttendanceCount = 0;
    
    classStudents.forEach(student => {
      let attended = 0;
      sundaysInMonth.forEach(sunDate => {
        const rec = records.find(r => r.studentId === student.id && r.date === sunDate);
        if (rec && (rec.status === 'present' || rec.status === 'late')) {
          attended++;
        }
      });
      totalAttended += attended;
      if (sundaysInMonth.length > 0 && attended === sundaysInMonth.length) {
        fullAttendanceCount++;
      }
    });
    
    const possible = classStudents.length * sundaysInMonth.length;
    const rate = possible > 0 ? Math.round((totalAttended / possible) * 100) : 0;
    
    return {
      rate,
      total: classStudents.length,
      fullAttendanceCount
    };
  };

  const handleExportClassPDF = (classId: string) => {
    setFilterClassId(classId);
    setShowMonthlyReportModal(true);
  };

  // --- Annual Computations ---
  const allSundaysInYear = getAllSundaysInYear(selectedAnnualYear);
  const totalSundaysInYear = allSundaysInYear.length;
  const yearRecords = records.filter(r => r.date.startsWith(String(selectedAnnualYear)));

  const studentAnnualStats = students.map(student => {
    const studentRecords = yearRecords.filter(r => r.studentId === student.id);
    const presentCount = studentRecords.filter(r => r.status === 'present').length;
    const lateCount = studentRecords.filter(r => r.status === 'late').length;
    const excusedCount = studentRecords.filter(r => r.status === 'excused').length;
    const totalAttended = presentCount + lateCount;
    
    const pastSundaysRecorded = Array.from(new Set(yearRecords.map(r => r.date))).length || 15;
    const rate = pastSundaysRecorded > 0 ? Math.round((totalAttended / pastSundaysRecorded) * 100) : 0;

    let honorTitle = '勤勉好学奖';
    let badgeColor = 'bg-blue-100 text-blue-900 border-blue-200';
    if (rate >= 95) {
      honorTitle = '年度卓越全勤奖';
      badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
    } else if (rate >= 85) {
      honorTitle = '年度忠心侍奉奖';
      badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
    } else if (rate >= 70) {
      honorTitle = '年度勤勉好学奖';
      badgeColor = 'bg-indigo-100 text-indigo-900 border-indigo-200';
    }

    return {
      student,
      presentCount,
      lateCount,
      excusedCount,
      totalAttended,
      rate,
      honorTitle,
      badgeColor,
      pastSundaysRecorded,
    };
  });

  const fullAttendanceCount = studentAnnualStats.filter(s => s.rate >= 95).length;
  const excellentCount = studentAnnualStats.filter(s => s.rate >= 85 && s.rate < 95).length;
  const averageRate = studentAnnualStats.length > 0 
    ? Math.round(studentAnnualStats.reduce((sum, s) => sum + s.rate, 0) / studentAnnualStats.length)
    : 0;

  const activeStat = studentAnnualStats.find(s => s.student.id === (certificateViewStudent?.id || selectedStudentId)) || studentAnnualStats[0];

  const handlePrintCertificate = () => {
    window.print();
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2">学生考勤统计与年度档案仅供主日学同工查阅</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          为保护主日学未成年孩童与团契成员信息安全，月度考勤明细、出勤档案及荣誉结业证书受权限保护。请使用教师或管理员账号登录后查阅。
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
      
      {/* Top View Toggle Bar: Monthly vs Annual */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-amber-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>主日考勤统计与成长档案</span>
            </h2>
            <p className="text-xs text-slate-500">
              包含月度考勤明细矩阵、班级报表及年度学年成绩与荣誉结业证书
            </p>
          </div>
        </div>

        {/* Seamless Sub-tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setSubTab('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'monthly'
                ? 'bg-white text-amber-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            <span>月度考勤统计</span>
          </button>

          <button
            onClick={() => setSubTab('annual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'annual'
                ? 'bg-white text-amber-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-700" />
            <span>年度学年成绩与荣誉</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          VIEW 1: MONTHLY ATTENDANCE MATRIX & STATS
          ========================================================= */}
      {subTab === 'monthly' && (
        <div className="space-y-6">
          
          {/* Sub-Header & Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-amber-700" />
                <span>{monthName} 月度出勤统计表</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                精美图表、全勤榜单与逐周出席明细，支持一键打印发布
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Date Selector Box */}
              <div className="h-9 w-44 flex items-center justify-between bg-slate-50 hover:bg-white border border-slate-200 rounded-lg px-1 transition-colors shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMonth === 0) {
                      setSelectedMonth(11);
                      setSelectedYear(prev => prev - 1);
                    } else {
                      setSelectedMonth(prev => prev - 1);
                    }
                  }}
                  className="h-7 w-7 flex items-center justify-center hover:bg-slate-200/70 rounded-md text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
                  title="上个月"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-800 select-none whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>{monthName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMonth === 11) {
                      setSelectedMonth(0);
                      setSelectedYear(prev => prev + 1);
                    } else {
                      setSelectedMonth(prev => prev + 1);
                    }
                  }}
                  className="h-7 w-7 flex items-center justify-center hover:bg-slate-200/70 rounded-md text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
                  title="下个月"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Class Filter */}
              <select
                value={filterClassId}
                onChange={e => setFilterClassId(e.target.value)}
                className="h-9 w-44 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white text-slate-700 text-xs font-semibold text-center cursor-pointer transition-colors shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 appearance-none"
              >
                <option value="all">全部班级 ({students.length}人)</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>打印月度报告</span>
              </button>
            </div>
          </div>

          {/* Monthly Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>本月在册总学员</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{totalStudentsCount}</span>
                <span className="text-xs text-slate-400">人</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                涵盖 {classes.length} 个主日学班级与团契
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>本月主日聚会周次</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{sundaysInMonth.length}</span>
                <span className="text-xs text-slate-500 font-medium">周主日</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                {sundaysInMonth.map(s => s.slice(5)).join(' / ')}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>本月综合出勤率</span>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{overallMonthRate}%</span>
                <span className="text-xs text-emerald-600 font-medium">良好</span>
              </div>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className="bg-amber-600 h-1.5 rounded-full" 
                  style={{ width: `${overallMonthRate}%` }}
                />
              </div>
            </div>

            <div className="bg-linear-to-br from-amber-50 to-orange-50/60 p-4 rounded-xl border border-amber-300 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-amber-900 font-medium">
                <span>全勤小天使 (100%)</span>
                <Star className="w-4 h-4 text-amber-700 fill-amber-700" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-900">{fullAttendanceStudents.length}</span>
                <span className="text-xs text-amber-800 font-medium">位忠心学员</span>
              </div>
              <p className="mt-2 text-[11px] text-amber-800">
                忠心坚守主日崇拜与聚会
              </p>
            </div>
          </div>

          {/* Full Attendance Angels Roll */}
          {fullAttendanceStudents.length > 0 && (
            <div className="bg-linear-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-300 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {monthName} 主日学「忠心全勤小天使」光荣榜
                  </h3>
                  <p className="text-xs text-slate-500">
                    本月共计 {fullAttendanceStudents.length} 位学员风雨无阻、每周坚守主日敬拜与真理学习！
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {fullAttendanceStudents.map(({ student }) => {
                  const cls = classes.find(c => c.id === student.classId);
                  return (
                    <div 
                      key={student.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-amber-300 shadow-2xs text-xs font-semibold text-slate-800"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] flex items-center justify-center font-bold">
                        ★
                      </span>
                      <span>{student.name}</span>
                      <span className="text-[10px] font-normal text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {cls?.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Class by Class Overview Cards with Individual PDF Export */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>各班级月度考勤概况与独立报表导出</span>
              </h3>
              <span className="text-xs text-slate-400">点击「导出班级PDF」可单独生成该班级考勤报表</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {classes.map(cls => {
                const stats = getClassStats(cls.id);
                return (
                  <div key={cls.id} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {cls.ageRange}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1.5">{cls.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">班主任: {cls.teacher || '专职老师'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold text-slate-900">{stats.rate}%</span>
                          <p className="text-[10px] text-slate-400">平均出勤率</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400">在册人数：</span>
                          <span className="font-semibold text-slate-800">{stats.total}人</span>
                        </div>
                        <div>
                          <span className="text-slate-400">全勤人数：</span>
                          <span className="font-semibold text-amber-700">{stats.fullAttendanceCount}人</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setFilterClassId(cls.id);
                        }}
                        className="text-xs text-amber-800 hover:text-amber-900 font-semibold cursor-pointer"
                      >
                        在下方查看名单 ↓
                      </button>
                      <button
                        onClick={() => handleExportClassPDF(cls.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>导出班级PDF</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {monthName} 主日出勤总矩阵明细
                </span>
                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  共 {studentStats.length} 名学员
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 已到
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 迟到
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> 请假
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> 缺勤
                </span>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">学员姓名</th>
                    <th className="py-3 px-4">所属班级</th>
                    {sundaysInMonth.map((sun, idx) => (
                      <th key={sun} className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-700">第 {idx + 1} 周</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatShortChineseDate(sun)} (主日)
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-4 text-center">出席周数</th>
                    <th className="py-3 px-4 text-center">月出勤率</th>
                    <th className="py-3 px-4 text-center">全勤表彰</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {studentStats.map((item, index) => {
                    const cls = classes.find(c => c.id === item.student.classId);
                    return (
                      <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.student.name}</div>
                          {item.student.notes && (
                            <div className="text-[10px] text-slate-400">{item.student.notes}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px]">
                            {cls?.name}
                          </span>
                        </td>

                        {/* Each Sunday Status */}
                        {item.sundayRecords.map(({ date, record }) => {
                          let badge = (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-rose-50 text-rose-600 font-medium text-[11px] border border-rose-200">
                              缺
                            </span>
                          );
                          if (record) {
                            if (record.status === 'present') {
                              badge = (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                                  到
                                </span>
                              );
                            } else if (record.status === 'late') {
                              badge = (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                                  迟
                                </span>
                              );
                            } else if (record.status === 'excused') {
                              badge = (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                                  假
                                </span>
                              );
                            }
                          }
                          return (
                            <td key={date} className="py-3 px-3 text-center">
                              {badge}
                            </td>
                          );
                        })}

                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {item.attendedCount} / {sundaysInMonth.length}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span 
                            className={`font-bold font-mono px-2 py-0.5 rounded-full text-xs ${
                              item.rate >= 80 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : item.rate >= 50 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.rate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.isFullAttendance ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300 shadow-2xs">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              全勤之星
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="block md:hidden divide-y divide-slate-100">
              {studentStats.map((item, index) => {
                const cls = classes.find(c => c.id === item.student.classId);
                return (
                  <div key={item.student.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-mono">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{item.student.name}</div>
                          <div className="text-[11px] text-slate-500">{cls?.name}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.isFullAttendance && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                            ★ 全勤
                          </span>
                        )}
                        <span className="font-bold font-mono px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-800">
                          {item.rate}%
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Scrollable Sundays List with Touch Gestures */}
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                        <span>📅 主日逐周考勤 (可左右手势滑动查看 👈👉)</span>
                        <span>共 {sundaysInMonth.length} 周</span>
                      </div>
                      
                      <div 
                        className="flex items-center gap-2 overflow-x-auto pb-1.5 touch-pan-x active:cursor-grabbing select-none"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                      >
                        {item.sundayRecords.map(({ date, record }, sIdx) => {
                          let tag = { text: '缺勤', bg: 'bg-rose-100 text-rose-700 border-rose-200' };
                          if (record) {
                            if (record.status === 'present') tag = { text: '已到', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' };
                            else if (record.status === 'late') tag = { text: '迟到', bg: 'bg-amber-100 text-amber-800 border-amber-300 font-bold' };
                            else if (record.status === 'excused') tag = { text: '请假', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
                          }

                          return (
                            <div key={date} className="flex flex-col items-center shrink-0 min-w-[64px] bg-white p-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-700">第 {sIdx + 1} 周</span>
                              <span className="text-[9px] text-slate-400 font-mono mb-1">{date.slice(5)}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md border ${tag.bg}`}>
                                {tag.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>已出席：<strong className="text-slate-900">{item.attendedCount}</strong> 周主日</span>
                      <span>请假：<strong className="text-slate-900">{item.excusedCount}</strong> 次</span>
                      <span>迟到：<strong className="text-slate-900">{item.lateCount}</strong> 次</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>注：迟到计入出席统计，请假与旷课不计入有效出席率。</span>
              <div className="flex items-center gap-4">
                <span>班主任签名：______________</span>

              </div>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================
          VIEW 2: ANNUAL ACADEMIC PERFORMANCE & HONOR CERTIFICATES
          ========================================================= */}
      {subTab === 'annual' && (
        <div className="space-y-6">
          
          {/* Top Header & Year Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-700" />
                <span>{selectedAnnualYear}年度 主日学学年完成进度与荣誉结业报告</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                全年度52周主日历程追踪、学员年度画像与精美结业/全勤荣誉证书
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                全年度共计 52 次主日
              </div>
              <button
                onClick={handlePrintCertificate}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>打印荣誉证书 / 报告</span>
              </button>
            </div>
          </div>

          {/* Annual Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-linear-to-br from-amber-50 to-orange-50/60 p-4 rounded-xl border border-amber-300 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-amber-900 font-medium">
                <span>年度卓越全勤奖 (≥95%)</span>
                <Award className="w-4 h-4 text-amber-700" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-900">{fullAttendanceCount}</span>
                <span className="text-xs text-amber-800 font-medium">人荣获全勤勋章</span>
              </div>
              <p className="mt-2 text-[11px] text-amber-800">
                风雨无阻、每周坚守主日敬拜
              </p>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
                <span>忠心侍奉奖 (≥85%)</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-700">{excellentCount}</span>
                <span className="text-xs text-emerald-600 font-medium">人荣获优异证书</span>
              </div>
              <p className="mt-2 text-[11px] text-emerald-700">
                出席稳定、表现卓越
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>全年度平均出勤率</span>
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{averageRate}%</span>
                <span className="text-xs text-slate-400">持续保持高位</span>
              </div>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-amber-600 h-1.5 rounded-full" style={{ width: `${averageRate}%` }} />
              </div>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
                <span>年度优秀表彰学员</span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-800">{fullAttendanceCount + excellentCount}</span>
                <span className="text-xs text-emerald-600 font-medium">位优秀小标兵</span>
              </div>
              <p className="mt-2 text-[11px] text-emerald-700">
                年度出勤率达标 85% 以上
              </p>
            </div>
          </div>

          {/* Main Layout: Left Roster & Progress Rankings + Right Certificate Generator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Student Annual Progress List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-amber-700" />
                    <span>年度学员成长榜单 (点击生成证书)</span>
                  </h4>
                  <span className="text-xs text-slate-400">{students.length} 名学员</span>
                </div>

                <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                  {studentAnnualStats.map(item => {
                    const isSelected = certificateViewStudent?.id === item.student.id;
                    const cls = classes.find(c => c.id === item.student.classId);

                    return (
                      <div
                        key={item.student.id}
                        onClick={() => setCertificateViewStudent(item.student)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-600 ring-1 ring-amber-600 shadow-xs'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {item.student.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">{item.student.name}</span>
                              <span className="text-[10px] text-slate-400">
                                {cls?.name.split(' ')[0]}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>已出席 {item.totalAttended} 周</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900 font-mono">
                            {item.rate}%
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 inline-block ${item.badgeColor}`}>
                            {item.honorTitle.replace('年度', '')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Exquisite Printable Annual Honor Certificate */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>精美结业与全勤荣誉证书实时预览</span>
                  </span>
                  <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                    A4纸张标准格式 • 可直接打印
                  </span>
                </div>

                {/* The Actual Certificate Card - Elongated for A4 Paper */}
                {activeStat && (
                  <div 
                    id="printable-certificate" 
                    className="bg-amber-50/20 border-8 border-double border-amber-700/80 p-8 sm:p-12 rounded-2xl relative shadow-md overflow-hidden text-center min-h-[860px] sm:min-h-[960px] flex flex-col justify-between"
                    style={{
                      backgroundImage: 'radial-gradient(#d97706 0.6px, transparent 0.6px)',
                      backgroundSize: '18px 18px',
                      backgroundColor: '#fffdfa'
                    }}
                  >
                    {/* Certificate Corner Ornaments */}
                    <div className="absolute top-3 left-3 text-amber-800/60 text-2xl font-serif">✥</div>
                    <div className="absolute top-3 right-3 text-amber-800/60 text-2xl font-serif">✥</div>
                    <div className="absolute bottom-3 left-3 text-amber-800/60 text-2xl font-serif">✥</div>
                    <div className="absolute bottom-3 right-3 text-amber-800/60 text-2xl font-serif">✥</div>

                    {/* Inner Decorative Border */}
                    <div className="border-2 border-amber-400/90 p-8 sm:p-10 rounded-xl relative flex-1 flex flex-col justify-between">
                      
                      {/* Church & Department Header */}
                      <div>
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-700 text-white shadow-md mb-3">
                          <Church className="w-7 h-7" />
                        </div>
                        <h4 className="text-sm font-serif tracking-[0.25em] text-amber-900 font-bold uppercase">
                          {config.churchName} • {config.schoolTitle}
                        </h4>
                        
                        {/* Certificate Title */}
                        <h3 className="text-2xl sm:text-4xl font-bold text-amber-950 font-serif tracking-widest mt-4">
                          主 日 学 结 业 荣 誉 证 书
                        </h3>
                        <p className="text-xs font-serif text-amber-800 tracking-[0.2em] uppercase mt-1">
                          Certificate of Sunday School Excellence & Attendance
                        </p>

                        <div className="w-36 h-0.5 bg-linear-to-r from-transparent via-amber-700 to-transparent mx-auto my-6" />
                      </div>

                      {/* Body Text */}
                      <div className="max-w-xl mx-auto space-y-5 text-slate-800 text-sm sm:text-base leading-relaxed font-serif my-4">
                        <p className="text-base sm:text-lg">
                          兹证明学员{' '}
                          <span className="text-xl sm:text-2xl font-bold text-amber-900 underline underline-offset-8 decoration-amber-600 decoration-2 px-3">
                            {activeStat.student.name}
                          </span>{' '}
                          同学：
                        </p>
                        <p className="text-justify text-sm sm:text-base text-slate-700 leading-loose">
                          在 <span className="font-semibold text-slate-900">{selectedAnnualYear}年度</span> 参与{' '}
                          <span className="font-semibold text-slate-900">{classes.find(c => c.id === activeStat.student.classId)?.name}</span>{' '}
                          主日学修道与团契生活期间，风雨无阻、渴慕真理，积极背诵经文与参与奉献。全年度出勤率达到{' '}
                          <span className="font-bold text-amber-900 font-mono text-lg">{activeStat.rate}%</span>
                          ，荣获教会师生一致称赞与肯定。
                        </p>
                        
                        <div className="py-2">
                          <span className="inline-block px-6 py-2 rounded-xl bg-amber-100/80 border border-amber-300 font-bold text-base sm:text-lg text-amber-950 shadow-2xs">
                            特授予：『 {activeStat.honorTitle} 』
                          </span>
                        </div>
                      </div>

                      {/* Scripture Verse Card */}
                      <div className="my-6 p-4 sm:p-5 bg-amber-50/80 border border-amber-300/80 rounded-xl text-left max-w-lg mx-auto shadow-2xs">
                        <p className="text-xs sm:text-sm text-slate-800 font-serif italic leading-relaxed">
                          “你当竭力在神面前得蒙喜悦，作无愧的工人，按着正意分解真理的道。”
                        </p>
                        <p className="text-xs text-amber-900 text-right mt-1.5 font-bold">
                          —— 提摩太后书 2:15
                        </p>
                      </div>

                      {/* Signatures & Seal Area */}
                      <div className="mt-8 pt-6 border-t-2 border-amber-200/80 flex items-end justify-between max-w-xl mx-auto text-xs sm:text-sm text-slate-700">
                        <div className="text-left space-y-1.5">
                          <p className="text-xs text-slate-500">主日学授课导师：</p>
                          <p className="font-serif font-bold text-slate-900 text-sm sm:text-base">
                            {classes.find(c => c.id === activeStat.student.classId)?.teacher || '主日学专职教师'}
                          </p>
                          <p className="text-xs text-slate-500">
                            发证日期：{selectedAnnualYear}年9月
                          </p>
                        </div>

                        {/* Red Mock Seal Stamp */}
                        <div className="relative my-[-10px]">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-red-600/90 flex items-center justify-center p-1 transform rotate-[-6deg] opacity-90 shadow-xs">
                            <div className="w-full h-full rounded-full border border-dashed border-red-500 flex flex-col items-center justify-center text-center text-red-600 text-[10px] font-serif font-bold leading-tight">
                              <span>★ {config.churchName} ★</span>
                              <span className="text-xs tracking-wider">主日学印</span>
                              <span className="text-[9px]">BETHEL CHURCH</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right space-y-1.5">
                          <p className="text-xs text-slate-500">教牧长同工签名：</p>
                          <p className="font-serif font-bold text-slate-900 text-sm sm:text-base">教会总管理员 / 牧长</p>
                          <p className="text-xs text-slate-500 font-mono">编号: BTL-{selectedAnnualYear}-{activeStat.student.id.replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase()}</p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Quick Actions under Certificate */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    可点击左侧列表切换其他学员姓名实时生成对应证书
                  </span>
                  <button
                    onClick={handlePrintCertificate}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>立即打印本张荣誉证书</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

      {/* Monthly Report Print & Export Preview Modal */}
      {showMonthlyReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 bg-amber-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-amber-700" />
                  <span>月度考勤统计报表（打印与导出）</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  当前统计：{monthName} • {filterClassId === 'all' ? '全部在册班级' : classes.find(c => c.id === filterClassId)?.name || '指定班级'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={executeReportPrint}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>一键系统打印</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReportData}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="复制表格内容（可直接粘贴到 Excel）"
                >
                  {reportCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{reportCopied ? '已复制表格' : '复制Excel数据'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadMonthlyReportHTML}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="下载独立HTML文件以备随时打印或分发"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出离线打印文件</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMonthlyReportModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-colors ml-1 cursor-pointer"
                  aria-label="关闭"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* In-Modal Filter & Notice */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 no-print shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">筛选导出班级：</span>
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">全部班级汇总</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.teacherName})</option>
                  ))}
                </select>
              </div>
              <div className="text-slate-400">
                提示：若点击打印无响应，可直接点击“导出离线打印文件”双击打开即可打印
              </div>
            </div>

            {reportNotice && (
              <div className="mx-5 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs no-print">
                {reportNotice}
              </div>
            )}

            {/* Printable Preview Sheet */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50">
              <div
                id="printable-monthly-report"
                className="bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 max-w-4xl mx-auto"
              >
                {/* Church & Title Header */}
                <div className="text-center pb-4 mb-4 border-b-2 border-amber-600">
                  <div className="text-lg font-bold text-slate-900 tracking-wide">✝️ {config.churchName || '伯特利基督教会'}</div>
                  <div className="text-sm font-semibold text-amber-800 mt-1">主日学月度考勤统计与出勤花名册</div>
                </div>

                {/* Meta info bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-4">
                  <div><span className="font-semibold text-slate-700">统计月份：</span>{monthName}</div>
                  <div><span className="font-semibold text-slate-700">班级范围：</span>{filterClassId === 'all' ? '全部班级汇总' : classes.find(c => c.id === filterClassId)?.name}</div>
                  <div><span className="font-semibold text-slate-700">制表日期：</span>{formatChineseDate(new Date())}</div>
                  <div><span className="font-semibold text-slate-700">审核同工：</span>{currentUser?.displayName || '主日学同工'}</div>
                </div>

                {/* KPI stats */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="border border-amber-100 bg-amber-50/60 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-amber-900">{totalStudentsCount} 人</div>
                    <div className="text-[11px] text-amber-700">在册学员总数</div>
                  </div>
                  <div className="border border-amber-100 bg-amber-50/60 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-amber-900">{sundaysInMonth.length} 周</div>
                    <div className="text-[11px] text-amber-700">主日聚会周次</div>
                  </div>
                  <div className="border border-amber-100 bg-amber-50/60 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-amber-900">{overallMonthRate}%</div>
                    <div className="text-[11px] text-amber-700">全月平均出勤率</div>
                  </div>
                  <div className="border border-amber-100 bg-amber-50/60 rounded-lg p-2 text-center">
                    <div className="text-base font-bold text-amber-900">{fullAttendanceStudents.length} 人</div>
                    <div className="text-[11px] text-amber-700">全勤模范学员</div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="font-medium text-slate-600">考勤图例：</span>
                  <span className="text-green-600 font-bold">✓ 出席</span>
                  <span className="text-amber-600 font-medium">⏰ 迟到</span>
                  <span className="text-blue-600 font-medium">📝 请假</span>
                  <span className="text-slate-400">✗ 缺勤</span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-300 px-2 py-1.5 text-center w-10">序号</th>
                        <th className="border border-slate-300 px-2.5 py-1.5 text-left w-24">学员姓名</th>
                        <th className="border border-slate-300 px-2.5 py-1.5 text-left w-24">所属班级</th>
                        {sundaysInMonth.map((sunDate) => (
                          <th key={sunDate} className="border border-slate-300 px-1.5 py-1.5 text-center w-14">
                            {sunDate.slice(5)}
                          </th>
                        ))}
                        <th className="border border-slate-300 px-2 py-1.5 text-center w-18">出席周数</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center w-16">出勤率</th>
                        <th className="border border-slate-300 px-2.5 py-1.5 text-center w-20">表现评定</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentStats.length === 0 ? (
                        <tr>
                          <td colSpan={6 + sundaysInMonth.length} className="text-center py-6 text-slate-400 border border-slate-300">
                            暂无符合条件的学员考勤数据
                          </td>
                        </tr>
                      ) : (
                        studentStats.map((item, idx) => {
                          const rating = item.isFullAttendance ? '全勤标兵' : item.rate >= 75 ? '优良' : item.rate >= 50 ? '良好' : '需关怀';
                          const className = classes.find(c => c.id === item.student.classId)?.name || '未分配';
                          return (
                            <tr key={item.student.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                              <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">{idx + 1}</td>
                              <td className="border border-slate-300 px-2.5 py-1.5 font-semibold text-slate-800">{item.student.name}</td>
                              <td className="border border-slate-300 px-2.5 py-1.5 text-slate-600">{className}</td>
                              {item.sundayRecords.map(({ date, record }) => {
                                if (!record) return <td key={date} className="border border-slate-300 px-1.5 py-1.5 text-center text-slate-300">✗</td>;
                                if (record.status === 'present') return <td key={date} className="border border-slate-300 px-1.5 py-1.5 text-center text-green-600 font-bold">✓</td>;
                                if (record.status === 'late') return <td key={date} className="border border-slate-300 px-1.5 py-1.5 text-center text-amber-600 font-medium">⏰</td>;
                                if (record.status === 'excused') return <td key={date} className="border border-slate-300 px-1.5 py-1.5 text-center text-blue-600 font-medium">📝</td>;
                                return <td key={date} className="border border-slate-300 px-1.5 py-1.5 text-center text-slate-300">✗</td>;
                              })}
                              <td className="border border-slate-300 px-2 py-1.5 text-center font-medium text-slate-700">
                                {item.attendedCount} / {sundaysInMonth.length}
                              </td>
                              <td className={`border border-slate-300 px-2 py-1.5 text-center font-bold ${item.rate >= 75 ? 'text-green-700' : 'text-amber-700'}`}>
                                {item.rate}%
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center">
                                {item.isFullAttendance ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">★ 全勤标兵</span>
                                ) : (
                                  <span className={`text-[11px] ${item.rate >= 75 ? 'text-green-700' : item.rate >= 50 ? 'text-slate-600' : 'text-rose-600'}`}>
                                    {rating}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signatures & Footer */}
                <div className="mt-8 pt-4 border-t border-dashed border-slate-300 text-xs text-slate-500">
                  <div className="italic text-amber-800/80 mb-3">“人在最小的事上忠心，在大事上也忠心。” —— 路加福音 16:10</div>
                  <div className="flex flex-wrap items-center justify-between gap-6 pt-2">
                    <div>带班教师签名：<span className="inline-block w-28 border-b border-slate-800 ml-1"></span></div>
                    <div>主日学主任/教牧签章：<span className="inline-block w-28 border-b border-slate-800 ml-1"></span></div>
                    <div>归档备案日期：<span className="inline-block w-28 border-b border-slate-800 ml-1"></span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
