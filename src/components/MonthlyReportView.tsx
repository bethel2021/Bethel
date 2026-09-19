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
  LogIn
} from 'lucide-react';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig, AdminUser } from '../types';
import { getSundaysInMonth, formatShortChineseDate } from '../utils/dateUtils';

interface MonthlyReportViewProps {
  config: SystemConfig;
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  currentUser: AdminUser | null;
  onOpenLogin: () => void;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  config,
  classes,
  students,
  records,
  currentUser,
  onOpenLogin,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // 8 is September (0-indexed)
  const [filterClassId, setFilterClassId] = useState<string>('all');

  // Sundays in this month
  const sundaysInMonth = getSundaysInMonth(selectedYear, selectedMonth);

  // Month name
  const monthName = `${selectedYear}年${selectedMonth + 1}月`;

  // Filter students
  const targetStudents = filterClassId === 'all'
    ? students
    : students.filter(s => s.classId === filterClassId);

  // Analyze each student's monthly performance
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

  // Overall monthly stats
  const totalStudentsCount = targetStudents.length;
  const fullAttendanceStudents = studentStats.filter(s => s.isFullAttendance);
  const totalPossibleAttendances = totalStudentsCount * sundaysInMonth.length;
  const totalActualAttendances = studentStats.reduce((sum, s) => sum + s.attendedCount, 0);
  const overallMonthRate = totalPossibleAttendances > 0 
    ? Math.round((totalActualAttendances / totalPossibleAttendances) * 100) 
    : 0;

  const handlePrint = () => {
    window.print();
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
    const targetClass = classes.find(c => c.id === classId);
    if (!targetClass) return;

    const classStudents = students.filter(s => s.classId === classId);
    const sundays = getSundaysInMonth(selectedYear, selectedMonth);
    const classMonthName = `${selectedYear}年${selectedMonth + 1}月`;

    const classStudentStats = classStudents.map(student => {
      let attendedCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      const sundayRecords = sundays.map(sunDate => {
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

      const totalSessions = sundays.length;
      const rate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0;
      const isFullAttendance = totalSessions > 0 && attendedCount === totalSessions;

      return {
        student,
        sundayRecords,
        attendedCount,
        rate,
        isFullAttendance,
      };
    });

    const totalStud = classStudents.length;
    const fullStudCount = classStudentStats.filter(s => s.isFullAttendance).length;
    const totalPoss = totalStud * sundays.length;
    const totalAct = classStudentStats.reduce((sum, s) => sum + s.attendedCount, 0);
    const classRate = totalPoss > 0 ? Math.round((totalAct / totalPoss) * 100) : 0;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('弹出窗口被浏览器拦截，请允许弹出窗口以导出 PDF。');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${config.churchName} - ${targetClass.name} - ${classMonthName}月度考勤明细</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Noto Serif SC";
            color: #334155;
            padding: 40px;
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #d97706;
            padding-bottom: 20px;
          }
          .church-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .report-subtitle {
            font-size: 16px;
            color: #b45309;
            font-weight: 600;
            margin-bottom: 15px;
          }
          .stats-grid {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 25px;
          }
          .stats-card {
            flex: 1;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          .stats-card-amber {
            background-color: #fffbeb;
            border-color: #fde68a;
          }
          .stats-card-emerald {
            background-color: #ecfdf5;
            border-color: #a7f3d0;
          }
          .stats-label {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 5px;
          }
          .stats-value {
            font-size: 20px;
            font-weight: bold;
            color: #0f172a;
          }
          .stats-value-amber {
            color: #92400e;
          }
          .stats-value-emerald {
            color: #047857;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 15px;
            margin-bottom: 40px;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 10px 8px;
            text-align: center;
            white-space: nowrap;
          }
          th {
            background-color: #f1f5f9;
            color: #475569;
            font-weight: bold;
          }
          td.student-name {
            font-weight: bold;
            color: #0f172a;
            text-align: left;
            padding-left: 12px;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            font-size: 10px;
            font-weight: bold;
          }
          .status-present {
            background-color: #d1fae5;
            color: #065f46;
          }
          .status-late {
            background-color: #fef3c7;
            color: #92400e;
          }
          .status-excused {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .status-absent {
            color: #cbd5e1;
          }
          .status-tag {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 9999px;
            font-weight: 500;
          }
          .tag-full {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
          }
          .tag-good {
            background-color: #d1fae5;
            color: #065f46;
          }
          .tag-fair {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .tag-need {
            background-color: #f1f5f9;
            color: #475569;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #475569;
          }
          .verse {
            font-style: italic;
            color: #b45309;
            margin-top: 15px;
            text-align: center;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="church-title">${config.churchName}</div>
          <div class="report-subtitle">${targetClass.name} - ${classMonthName}月度出勤统计表</div>
        </div>

        <div class="stats-grid">
          <div class="stats-card">
            <div class="stats-label">本月主日周次</div>
            <div class="stats-value">${sundays.length}周</div>
          </div>
          <div class="stats-card stats-card-amber">
            <div class="stats-label">全勤学员数</div>
            <div class="stats-value stats-value-amber">${fullStudCount}人</div>
          </div>
          <div class="stats-card stats-card-emerald">
            <div class="stats-label">班级平均出勤率</div>
            <div class="stats-value stats-value-emerald">${classRate}%</div>
          </div>
          <div class="stats-card">
            <div class="stats-label">在册总人数</div>
            <div class="stats-value">${totalStud}人</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px;">序号</th>
              <th style="text-align: left; padding-left: 12px;">姓名</th>
              ${sundays.map(s => `<th>${formatShortChineseDate(s)}</th>`).join('')}
              <th>出勤数 / 总周</th>
              <th>出勤率</th>
              <th>表现评价</th>
            </tr>
          </thead>
          <tbody>
            ${classStudentStats.map((item, idx) => {
              const ratingClass = item.rate >= 100 ? 'tag-full' : item.rate >= 75 ? 'tag-good' : item.rate >= 50 ? 'tag-fair' : 'tag-need';
              const ratingText = item.rate >= 100 ? '卓越全勤' : item.rate >= 75 ? '优良表现' : item.rate >= 50 ? '勉励进步' : '需关怀';
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="student-name">
                    ${item.student.name}
                    ${item.isFullAttendance ? ' <span class="status-tag tag-full" style="font-size:9px;">全勤</span>' : ''}
                  </td>
                  ${item.sundayRecords.map(({ record }) => {
                    if (!record) return `<td><span class="status-absent">-</span></td>`;
                    const statusClass = record.status === 'present' ? 'status-present' : record.status === 'late' ? 'status-late' : 'status-excused';
                    const statusText = record.status === 'present' ? '到' : record.status === 'late' ? '迟' : '假';
                    return `<td><span class="status-badge ${statusClass}">${statusText}</span></td>`;
                  }).join('')}
                  <td style="font-weight: bold;">${item.attendedCount} / ${sundays.length}</td>
                  <td style="font-weight: bold; color: #1e293b;">${item.rate}%</td>
                  <td><span class="status-tag ${ratingClass}">${ratingText}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="verse">
          “教养孩童，使他走当行的道，就是到老他也不偏离。”（箴言 22:6）
        </div>

        <div class="footer">
          <div>主日学校长/团长 签名：__________________</div>
          <div>班级任课老师：__________________</div>
          <div>日期：${new Date().toLocaleDateString('zh-CN')}</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2">学生月度考勤明细仅供主日学同工查阅</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          为保护主日学未成年孩童与团契成员信息安全，月度考勤明细及出勤档案受权限保护。请使用教师或管理员账号登录后查阅。
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
      
      {/* Top Header & Month Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-amber-700" />
            <span>主日学月度出勤统计表</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            精美图表、全勤榜单与逐周出席明细，支持一键打印发布
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs">
            <button
              onClick={() => setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1))}
              className="p-1.5 hover:bg-white rounded-md text-slate-700 cursor-pointer"
              title="上个月"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold px-2 text-slate-800 font-serif">
              {monthName}
            </span>
            <button
              onClick={() => setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1))}
              className="p-1.5 hover:bg-white rounded-md text-slate-700 cursor-pointer"
              title="下个月"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Class Filter */}
          <select
            value={filterClassId}
            onChange={e => setFilterClassId(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">全部班级 ({students.length}人)</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
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
            <span>本月主日聚会周次</span>
            <CalendarCheck className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{sundaysInMonth.length}</span>
            <span className="text-xs text-slate-500 font-medium">周主日</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap gap-1">
            {sundaysInMonth.map(s => (
              <span key={s} className="bg-slate-100 px-1.5 py-0.5 rounded-sm">
                {formatShortChineseDate(s)}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-linear-to-br from-amber-50 to-amber-100/60 p-4 rounded-xl border border-amber-300 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-900 font-medium">
            <span>本月全勤小天使 🌟</span>
            <Award className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-900">{fullAttendanceStudents.length}</span>
            <span className="text-xs text-amber-800 font-medium">位学员 (100%全勤)</span>
          </div>
          <p className="mt-2 text-[11px] text-amber-800 truncate">
            {fullAttendanceStudents.length > 0 
              ? fullAttendanceStudents.map(s => s.student.name).join('、')
              : '暂无全勤学员'}
          </p>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span>本月综合出勤率</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-700">{overallMonthRate}%</span>
            <span className="text-xs text-emerald-600">
              ({totalActualAttendances}/{totalPossibleAttendances}人次)
            </span>
          </div>
          <div className="mt-2 w-full bg-emerald-100 rounded-full h-1.5">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full" 
              style={{ width: `${overallMonthRate}%` }} 
            />
          </div>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-900 font-medium">
            <span>月度全勤达标人数</span>
            <Award className="w-4 h-4 text-amber-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-900">{fullAttendanceStudents.length}</span>
            <span className="text-xs text-amber-700 font-medium">人</span>
          </div>
          <p className="mt-2 text-[11px] text-amber-800">
            忠心坚守主日崇拜与聚会
          </p>
        </div>

      </div>

      {/* Full-Attendance Stars Honor Gallery */}
      {fullAttendanceStudents.length > 0 && (
        <div className="bg-linear-to-r from-amber-600 to-amber-800 rounded-2xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-200" />
              <h3 className="text-sm font-bold font-serif tracking-wide">
                {monthName} 主日学「忠心全勤小天使」光荣榜
              </h3>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs font-medium text-amber-100">
              颁发全勤荣誉纪念奖
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {fullAttendanceStudents.map(({ student }) => (
              <div 
                key={student.id}
                className="bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-xl border border-white/15 text-center backdrop-blur-xs"
              >
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-200 text-amber-900 font-bold text-sm flex items-center justify-center shadow-xs mb-1.5">
                  {student.name.slice(0, 1)}
                </div>
                <div className="text-xs font-bold truncate text-white">{student.name}</div>
                <div className="text-[10px] text-amber-200 truncate mt-0.5">
                  {classes.find(c => c.id === student.classId)?.name.split(' ')[0]}
                </div>
                <div className="mt-1 text-[10px] text-amber-100 bg-black/20 px-1.5 py-0.5 rounded-md inline-block">
                  全勤达标 ⭐
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class Monthly Report & PDF Export Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4.5 h-4.5 text-amber-700" />
            <span>班级月度考勤明细一键导出 (PDF 报表)</span>
          </h3>
          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-md md:hidden font-medium">
            👈 手机端支持左右手势滑动
          </span>
        </div>
        
        {/* Swipeable Class Cards row */}
        <div className="flex overflow-x-auto gap-3.5 pb-3 pt-0.5 scrollbar-none snap-x snap-mandatory touch-pan-x md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:overflow-x-visible md:pb-0">
          {classes.map(cls => {
            const stats = getClassStats(cls.id);
            return (
              <div 
                key={cls.id}
                className="snap-center shrink-0 w-[270px] md:w-auto bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/50">
                      {cls.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      教室: {cls.classroom || '未设置'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 my-3">
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <div className="text-[10px] text-slate-400">在册人数</div>
                      <div className="text-base font-bold text-slate-800">{stats.total}人</div>
                    </div>
                    <div className="bg-emerald-50/50 p-2 rounded-lg text-center">
                      <div className="text-[10px] text-slate-400">月出勤率</div>
                      <div className="text-base font-bold text-emerald-700">{stats.rate}%</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mb-4 flex items-center justify-between">
                    <span>全勤学员: <strong className="text-amber-700 font-bold">{stats.fullAttendanceCount}</strong>人</span>
                    <span className="text-slate-400">老师: {cls.teachers && cls.teachers.length > 0 ? cls.teachers.join('、') : '暂无'}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleExportClassPDF(cls.id)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>导出 {cls.name} PDF</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Monthly Attendance Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {monthName} 主日出勤总矩阵明细
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              图例说明： 🟢 准时到校 | 🟡 迟到 | 🔵 请假 | ⚪ 缺勤
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              准时
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              迟到
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              请假
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
              缺席
            </span>
          </div>
        </div>

        {/* Desktop View: Full attendance matrix table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-3 font-semibold w-12 text-center whitespace-nowrap">序号</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">姓名</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">所属班级</th>
                {sundaysInMonth.map(sun => (
                  <th key={sun} className="px-3 py-3 font-semibold text-center whitespace-nowrap">
                    {formatShortChineseDate(sun)} (主日)
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">出勤数/总周</th>
                <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">出勤率</th>
                <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">表现评价</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentStats.map((item, idx) => {
                const cls = classes.find(c => c.id === item.student.classId);
                return (
                  <tr key={item.student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="whitespace-nowrap">{item.student.name}</span>
                        {item.isFullAttendance && (
                          <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full font-medium whitespace-nowrap">
                            全勤
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {cls?.name.split(' ')[0]}
                    </td>
                    
                    {/* Each Sunday Status */}
                    {item.sundayRecords.map(({ date, record }) => (
                      <td key={date} className="px-3 py-3 text-center whitespace-nowrap">
                        {record ? (
                          <div className="inline-flex flex-col items-center whitespace-nowrap">
                            <span 
                              className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold whitespace-nowrap ${
                                record.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : record.status === 'late'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}
                              title={`${record.status === 'present' ? '准时签到' : record.status === 'late' ? '迟到打卡' : '已请假'} - ${record.timeStr}`}
                            >
                              {record.status === 'present' ? '到' : record.status === 'late' ? '迟' : '假'}
                            </span>
                          </div>
                        ) : (
                          <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-slate-300 font-mono whitespace-nowrap">
                            -
                          </span>
                        )}
                      </td>
                    ))}

                    <td className="px-3 py-3 text-center font-semibold text-slate-800 font-mono whitespace-nowrap">
                      {item.attendedCount} / {sundaysInMonth.length}
                    </td>

                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 font-mono whitespace-nowrap">{item.rate}%</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        item.rate >= 100
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : item.rate >= 75
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.rate >= 50
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.rate >= 100 ? '卓越全勤' : item.rate >= 75 ? '优良表现' : item.rate >= 50 ? '勉励进步' : '需关怀'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Swipable Card-based List */}
        <div className="block md:hidden divide-y divide-slate-100">
          {studentStats.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              该筛选条件下暂无学员月度统计数据
            </div>
          ) : (
            studentStats.map((item, idx) => {
              const cls = classes.find(c => c.id === item.student.classId);
              return (
                <div key={item.student.id} className="p-4 space-y-3 bg-white">
                  {/* Student Header Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-200">
                        {item.student.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{item.student.name}</span>
                          {item.isFullAttendance && (
                            <span className="text-[9px] text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.1 rounded font-medium">
                              全勤
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {cls?.name.split(' ')[0]}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {item.rate}%
                      </div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                        item.rate >= 100
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : item.rate >= 75
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            : item.rate >= 50
                              ? 'bg-blue-50 text-blue-800 border border-blue-100'
                              : 'bg-slate-50 text-slate-500'
                      }`}>
                        {item.rate >= 100 ? '卓越全勤' : item.rate >= 75 ? '优良表现' : item.rate >= 50 ? '勉励进步' : '需关怀'}
                      </span>
                    </div>
                  </div>

                  {/* Attendance Rate Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>月度出席: {item.attendedCount} / {sundaysInMonth.length} 次</span>
                      <span>达标进度</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full ${
                          item.rate >= 100 ? 'bg-amber-500' : item.rate >= 75 ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${item.rate}%` }}
                      />
                    </div>
                  </div>

                  {/* Horizontal Scrollable Sundays List with Touch Gestures */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] text-slate-400 font-medium">
                      📅 主日逐周考勤 (可左右手势滑动查看 👈👉)
                    </div>
                    
                    <div className="flex overflow-x-auto gap-2 pb-1.5 pt-0.5 scrollbar-none snap-x snap-mandatory touch-pan-x">
                      {item.sundayRecords.map(({ date, record }) => {
                        const dateFormatted = formatShortChineseDate(date);
                        return (
                          <div 
                            key={date} 
                            className="snap-center shrink-0 w-[95px] bg-slate-50 border border-slate-200/50 p-2 rounded-lg text-center flex flex-col items-center justify-between space-y-1"
                          >
                            <span className="text-[9px] text-slate-400 font-medium font-serif">{dateFormatted}</span>
                            {record ? (
                              <span 
                                className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold shadow-2xs ${
                                  record.status === 'present'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : record.status === 'late'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {record.status === 'present' ? '到' : record.status === 'late' ? '迟' : '假'}
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-full inline-flex items-center justify-center bg-slate-100 text-slate-300 text-[10px] font-bold">
                                -
                              </span>
                            )}
                            <span className="text-[8px] text-slate-400 truncate w-full">
                              {record ? (record.timeStr || (record.status === 'excused' ? '请假' : '已打卡')) : '缺勤'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Signature & Verse Benediction for Printing */}
        <div className="p-5 bg-amber-50/40 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-serif text-slate-700 italic">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
            <span>“教养孩童，使他走当行的道，就是到老他也不偏离。”（箴言 22:6）</span>
          </div>

          <div className="flex items-center gap-6 text-slate-500 font-medium">
            <span>主日学校长/团长 签名：______________</span>
            <span>教会牧长印鉴：[ {config.churchName}堂印 ]</span>
          </div>
        </div>

      </div>

    </div>
  );
};
