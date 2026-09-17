import React, { useState } from 'react';
import { 
  Award, 
  Printer, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Download, 
  Church, 
  User,
  ChevronRight,
  ShieldCheck,
  Star,
  Lock,
  LogIn
} from 'lucide-react';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig, AdminUser } from '../types';
import { getAllSundaysInYear, formatChineseDate } from '../utils/dateUtils';

interface AnnualReportViewProps {
  config: SystemConfig;
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  currentUser: AdminUser | null;
  onOpenLogin: () => void;
}

export const AnnualReportView: React.FC<AnnualReportViewProps> = ({
  config,
  classes,
  students,
  records,
  currentUser,
  onOpenLogin,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(config.currentYear || 2026);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [certificateViewStudent, setCertificateViewStudent] = useState<Student | null>(students[0] || null);

  // All Sundays in 2026 (52 sundays)
  const allSundaysInYear = getAllSundaysInYear(selectedYear);
  const totalSundaysInYear = allSundaysInYear.length;

  // Filter records for the selected year
  const yearRecords = records.filter(r => r.date.startsWith(String(selectedYear)));

  // Calculate annual stats for each student
  const studentAnnualStats = students.map(student => {
    const studentRecords = yearRecords.filter(r => r.studentId === student.id);
    const presentCount = studentRecords.filter(r => r.status === 'present').length;
    const lateCount = studentRecords.filter(r => r.status === 'late').length;
    const excusedCount = studentRecords.filter(r => r.status === 'excused').length;
    const totalAttended = presentCount + lateCount;
    
    // Using recorded past sundays count (e.g. 15 past Sundays up to current month) or full year
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

  // Top tiers
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
        <h3 className="text-base font-bold text-slate-900 mb-2">学员年度成长档案与证书仅供同工查阅</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          年度学员名单、出勤榜单及荣誉证书印制涉及学生个人隐私。请使用教师或管理员账号登录后查阅与导出证书。
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
      
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-700" />
            <span>{selectedYear}年度 主日学学年完成进度与荣誉结业报告</span>
          </h2>
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
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-700" />
                <span>年度学员成长榜单 (点击生成证书)</span>
              </h3>
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
                      在 <span className="font-semibold text-slate-900">{selectedYear}年度</span> 参与{' '}
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
                        发证日期：{selectedYear}年9月
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
                      <p className="text-xs text-slate-500 font-mono">编号: BTL-{selectedYear}-{activeStat.student.id.replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase()}</p>
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
  );
};
