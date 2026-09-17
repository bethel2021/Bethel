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
            <span>主日学月度出勤与成长进度公报</span>
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

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-3 font-semibold w-12 text-center">序号</th>
                <th className="px-4 py-3 font-semibold">学员姓名</th>
                <th className="px-4 py-3 font-semibold">所属班级</th>
                {sundaysInMonth.map(sun => (
                  <th key={sun} className="px-3 py-3 font-semibold text-center whitespace-nowrap">
                    {formatShortChineseDate(sun)} (主日)
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold text-center">出勤/总周</th>
                <th className="px-3 py-3 font-semibold text-center">月度出勤率</th>
                <th className="px-4 py-3 font-semibold text-center">评级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentStats.map((item, idx) => {
                const cls = classes.find(c => c.id === item.student.classId);
                return (
                  <tr key={item.student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{item.student.name}</span>
                        {item.isFullAttendance && (
                          <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full font-medium">
                            全勤
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {cls?.name.split(' ')[0]}
                    </td>
                    
                    {/* Each Sunday Status */}
                    {item.sundayRecords.map(({ date, record }) => (
                      <td key={date} className="px-3 py-3 text-center">
                        {record ? (
                          <div className="inline-flex flex-col items-center">
                            <span 
                              className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
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
                          <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-slate-300 font-mono">
                            -
                          </span>
                        )}
                      </td>
                    ))}

                    <td className="px-3 py-3 text-center font-semibold text-slate-800 font-mono">
                      {item.attendedCount} / {sundaysInMonth.length}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-bold text-slate-900 font-mono">{item.rate}%</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
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
