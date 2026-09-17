import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  UserX, 
  FileText, 
  Search, 
  Filter, 
  Check, 
  X, 
  AlertCircle,
  Phone,
  ChevronDown,
  Church,
  Lock,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig, AdminUser } from '../types';
import { formatChineseDate } from '../utils/dateUtils';
import { calculateAge, formatBirthDate } from '../utils/studentUtils';

interface TodayDashboardProps {
  config: SystemConfig;
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  activeSunday: string;
  currentUser: AdminUser | null;
  onOpenLogin: () => void;
  onManualUpdate: (data: {
    studentId: string;
    date: string;
    status: 'present' | 'late' | 'excused' | 'absent';
    memoryVerseCompleted?: boolean;
    offeringCompleted?: boolean;
    notes?: string;
  }) => Promise<void>;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  config,
  classes,
  students,
  records,
  activeSunday,
  currentUser,
  onOpenLogin,
  onManualUpdate,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [excuseModalStudent, setExcuseModalStudent] = useState<Student | null>(null);
  const [excuseReason, setExcuseReason] = useState<string>('');
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);

  // Today's records
  const todayRecords = records.filter(r => r.date === activeSunday);

  // Filter visible classes for the home page (respects isHiddenFromHome)
  const visibleClasses = classes.filter(c => !c.isHiddenFromHome);
  const visibleClassIdSet = new Set(visibleClasses.map(c => c.id));
  const homeStudents = students.filter(s => visibleClassIdSet.has(s.classId));

  // Filter students
  const filteredStudents = students.filter(student => {
    const inVisibleClass = visibleClassIdSet.has(student.classId);
    const matchClass = selectedClassId === 'all' ? inVisibleClass : student.classId === selectedClassId;
    const matchSearch = searchKeyword.trim() === '' || 
      student.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      student.parentPhone.includes(searchKeyword) ||
      student.parentName.includes(searchKeyword);
    return matchClass && matchSearch;
  });

  // Calculate statistics (scoped to visible classes on home page)
  const activeScopeStudents = selectedClassId === 'all' 
    ? homeStudents 
    : students.filter(s => s.classId === selectedClassId);
  const totalCount = activeScopeStudents.length;
  const activeScopeStudentIds = new Set(activeScopeStudents.map(s => s.id));
  const scopedTodayRecords = todayRecords.filter(r => activeScopeStudentIds.has(r.studentId));

  const presentCount = scopedTodayRecords.filter(r => r.status === 'present').length;
  const lateCount = scopedTodayRecords.filter(r => r.status === 'late').length;
  const excusedCount = scopedTodayRecords.filter(r => r.status === 'excused').length;
  const checkedInTotal = presentCount + lateCount;
  const absentCount = Math.max(0, totalCount - checkedInTotal - excusedCount);
  const attendanceRate = totalCount > 0 ? Math.round((checkedInTotal / totalCount) * 100) : 0;

  const handleQuickStatus = async (
    studentId: string,
    status: 'present' | 'late' | 'excused' | 'absent'
  ) => {
    setLoadingStudentId(studentId);
    try {
      await onManualUpdate({
        studentId,
        date: activeSunday,
        status,
        memoryVerseCompleted: false,
        offeringCompleted: false,
      });
    } finally {
      setLoadingStudentId(null);
    }
  };

  const handleOpenExcuseModal = (student: Student) => {
    const existing = todayRecords.find(r => r.studentId === student.id);
    setExcuseReason(existing?.notes || '主日随父母探亲外出请假');
    setExcuseModalStudent(student);
  };

  const handleConfirmExcuse = async () => {
    if (!excuseModalStudent) return;
    setLoadingStudentId(excuseModalStudent.id);
    try {
      await onManualUpdate({
        studentId: excuseModalStudent.id,
        date: activeSunday,
        status: 'excused',
        memoryVerseCompleted: false,
        offeringCompleted: false,
        notes: excuseReason,
      });
      setExcuseModalStudent(null);
    } finally {
      setLoadingStudentId(null);
    }
  };

  // 访客页面：只能看到班级列表，不能看到学生姓名等资料；签到需登录后才能使用
  if (!currentUser) {
    return (
      <div className="space-y-6">
        {/* Visitor Welcome & Login Notice */}
        <div className="bg-linear-to-r from-amber-700 via-amber-800 to-amber-900 rounded-2xl p-6 text-white shadow-md">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-amber-100 text-xs font-semibold backdrop-blur-xs flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-200" />
                <span>访客模式（学生隐私受保护）</span>
              </span>
              <span className="text-xs text-amber-200">
                当前主日：{formatChineseDate(activeSunday)}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif">
              {config.churchName} {config.schoolTitle}
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/90 max-w-3xl leading-relaxed">
              为保护主日学未成年孩童与团契成员的隐私安全，学生姓名、出生年月及考勤点名功能仅对本堂主日学教师及同工开放。访客可在此查阅各班级与团契基本设置。
            </p>
          </div>
        </div>

        {/* Class Directory Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Church className="w-5 h-5 text-amber-700" />
              <span>主日学与团契班级总览（共 {visibleClasses.length} 个班级）</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              各年龄段班级宗旨、适龄标准、活动教室与负责同工介绍
            </p>
          </div>
        </div>

        {/* Class Cards Grid (Strictly no student names or personal data) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleClasses.map(cls => {
            const classStudentCount = students.filter(s => s.classId === cls.id).length;
            const isFellowship = cls.groupType === 'fellowship';

            return (
              <div
                key={cls.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
                        <Church className="w-5 h-5 text-amber-800" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{cls.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-medium">
                            适龄：{cls.ageRange}
                          </span>
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${
                            isFellowship
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {isFellowship ? '青年团契' : '主日学'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 my-3.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">班级负责：</span>
                      <span className="font-semibold text-slate-800">{cls.teacher}</span>
                    </div>
                    {cls.subjectTeacher && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">上课老师：</span>
                        <span className="font-semibold text-slate-800">{cls.subjectTeacher}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">活动课室：</span>
                      <span className="font-semibold text-slate-800">{cls.classroom}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">学员规模：</span>
                      <span className="font-semibold text-amber-800 font-mono">
                        {classStudentCount} 人
                      </span>
                    </div>
                  </div>

                  {cls.description && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                      {cls.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>学生资料仅登录可见</span>
                  </span>
                  <button
                    onClick={onOpenLogin}
                    className="text-amber-800 hover:text-amber-950 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>登录签到</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Statistics Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-700" />
              <span>今日主日学实时签到看板</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              当前主日：{formatChineseDate(activeSunday)} • 学生实时出勤统计
            </p>
          </div>
        </div>

        {/* 5 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">应到总人数</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{totalCount}</span>
              <span className="text-xs text-slate-400">人</span>
            </div>
          </div>

          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs">
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>准时出勤</span>
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-700">{presentCount}</span>
              <span className="text-xs text-emerald-600 font-medium">人</span>
            </div>
          </div>

          <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
            <span className="text-xs text-amber-800 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>迟到人数</span>
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-800">{lateCount}</span>
              <span className="text-xs text-amber-700 font-medium">人</span>
            </div>
          </div>

          <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/80 shadow-2xs">
            <span className="text-xs text-blue-700 font-medium flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>请假人数</span>
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-blue-700">{excusedCount}</span>
              <span className="text-xs text-blue-600 font-medium">人</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
              <UserX className="w-3.5 h-3.5 text-slate-400" />
              <span>暂未到校</span>
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-700">{absentCount > 0 ? absentCount : 0}</span>
              <span className="text-xs text-slate-400">人</span>
            </div>
          </div>

          <div className="bg-linear-to-br from-amber-700 to-amber-800 p-3.5 rounded-xl text-white shadow-xs">
            <span className="text-xs text-amber-100 font-medium">今日到勤率</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold">{attendanceRate}%</span>
              <span className="text-[10px] text-amber-200">已到 {checkedInTotal} 人</span>
            </div>
          </div>

        </div>
      </div>

      {/* Filter & Operations Bar - All Classes Fully Visible Without Horizontal Scroll */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
        
        {/* Class Tabs Header & Wrapped Chips */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2.5">
            <Church className="w-4 h-4 text-amber-700" />
            <span>班级与团契快速切换</span>
          </div>

          {/* All classes wrapped */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedClassId('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                selectedClassId === 'all'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <span>全部班级</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                selectedClassId === 'all' ? 'bg-amber-800 text-amber-100' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {todayRecords.filter(r => (r.status === 'present' || r.status === 'late') && visibleClassIdSet.has(r.classId)).length}/{homeStudents.length}人
              </span>
            </button>

            {visibleClasses.map(cls => {
              const clsStudentCount = students.filter(s => s.classId === cls.id).length;
              const clsPresentCount = todayRecords.filter(r => r.classId === cls.id && (r.status === 'present' || r.status === 'late')).length;
              const isSelected = selectedClassId === cls.id;

              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    isSelected
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  <span>{cls.name.split(' ')[0]}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isSelected ? 'bg-amber-800 text-amber-100' : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    {clsPresentCount}/{clsStudentCount}人
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input & Quick Batch Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="搜索学员姓名、学号或家长联系电话..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500">
              当前名单：<strong className="text-slate-900">{filteredStudents.length}</strong> 位学员
            </span>
          </div>
        </div>

      </div>

      {/* Students Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredStudents.map(student => {
          const record = todayRecords.find(r => r.studentId === student.id);
          const classGroup = classes.find(c => c.id === student.classId);
          const isLoading = loadingStudentId === student.id;

          return (
            <div
              key={student.id}
              className={`bg-white rounded-xl border p-4 shadow-2xs transition-all relative ${
                record?.status === 'present'
                  ? 'border-emerald-200/90 ring-1 ring-emerald-500/20'
                  : record?.status === 'late'
                    ? 'border-amber-300 ring-1 ring-amber-500/20'
                    : record?.status === 'excused'
                      ? 'border-blue-200 bg-blue-50/20'
                      : 'border-slate-200/80 hover:border-amber-300'
              }`}
            >
              {/* Top Row: Name, Class, Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    student.gender === 'boy' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                  }`}>
                    {student.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">{student.name}</span>
                      <span className="text-[10px] text-amber-900 bg-amber-100/80 font-medium px-1.5 py-0.2 rounded-md">
                        {calculateAge(student.birthDate, student.age)}岁
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {classGroup?.name.split(' ')[0]} • 出生:{formatBirthDate(student.birthDate)}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {record ? (
                    <div className="text-right">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        record.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : record.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}>
                        {record.status === 'present' && <Check className="w-3 h-3" />}
                        {record.status === 'late' && <Clock className="w-3 h-3" />}
                        {record.status === 'excused' && <FileText className="w-3 h-3" />}
                        <span>
                          {record.status === 'present' ? '已准时签到' : record.status === 'late' ? '迟到打卡' : '已请假'}
                        </span>
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        ⏰ {record.timeStr}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      未打卡
                    </span>
                  )}
                </div>
              </div>

              {/* Notes row if present */}
              {record && record.notes && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 text-[10px] truncate max-w-full" title={record.notes}>
                    备注: {record.notes}
                  </span>
                </div>
              )}

              {/* Teacher Quick Action Buttons */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                <button
                  disabled={isLoading}
                  onClick={() => handleQuickStatus(student.id, 'present')}
                  className={`text-[11px] font-medium px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    record?.status === 'present'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>到校</span>
                </button>

                <button
                  disabled={isLoading}
                  onClick={() => handleQuickStatus(student.id, 'late')}
                  className={`text-[11px] font-medium px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    record?.status === 'late'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>迟到</span>
                </button>

                <button
                  disabled={isLoading}
                  onClick={() => handleOpenExcuseModal(student)}
                  className={`text-[11px] font-medium px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    record?.status === 'excused'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-600'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>请假</span>
                </button>

                {record && (
                  <button
                    disabled={isLoading}
                    onClick={() => handleQuickStatus(student.id, 'absent')}
                    className="text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                    title="撤销签到：点击回到未打卡状态"
                    aria-label="撤销签到回到未打卡状态"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Excuse Modal */}
      {excuseModalStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              学员请假登记 - {excuseModalStudent.name}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              请录入本次主日请假原因（将计入请假统计，不扣减品行分）：
            </p>
            <textarea
              rows={3}
              value={excuseReason}
              onChange={e => setExcuseReason(e.target.value)}
              placeholder="例如：身体不适就医 / 家中有事外出 / 参加学校期末考..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExcuseModalStudent(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmExcuse}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white cursor-pointer shadow-xs"
              >
                确认登记请假
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
