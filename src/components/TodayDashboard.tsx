import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Trash2,
  AlertCircle,
  Phone,
  ChevronDown,
  Church,
  Lock,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import type { Student, ClassGroup, AttendanceRecord, SystemConfig, AdminUser } from '../types';
import { formatChineseDate, checkIsWithinSundayWindow } from '../utils/dateUtils';
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
  const visibleClasses = useMemo(() => classes.filter(c => !c.isHiddenFromHome), [classes]);
  const visibleClassIdSet = useMemo(() => new Set(visibleClasses.map(c => c.id)), [visibleClasses]);
  const homeStudents = useMemo(() => students.filter(s => visibleClassIdSet.has(s.classId)), [students, visibleClassIdSet]);

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    const firstVisible = classes.find(c => !c.isHiddenFromHome);
    return firstVisible ? firstVisible.id : '';
  });
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [excuseModalStudent, setExcuseModalStudent] = useState<Student | null>(null);
  const [excuseReason, setExcuseReason] = useState<string>('');
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);
  const [noticeDialog, setNoticeDialog] = useState<{ title: string; content: string } | null>(null);
  const processingRef = useRef<Set<string>>(new Set());

  const showCheckinErrorDialog = (err: any) => {
    const isNonWindow = err.message?.includes('非主日') || err.message?.includes('开放时段') || err.message?.includes('开放时间') || err.message?.includes('请等待下一个主日');
    if (isNonWindow) {
      setNoticeDialog({
        title: '温馨提醒',
        content: '非主日签到开放时段，请等待下一个主日！\n（可联系管理员开启｛测试模式｝）',
      });
    } else {
      setNoticeDialog({
        title: '温馨提醒',
        content: err.message || '签到打卡失败',
      });
    }
  };

  // Today's records
  const todayRecords = records.filter(r => r.date === activeSunday);

  // If selectedClassId points to a class that is invalid or hidden, automatically select first visible class
  useEffect(() => {
    if (visibleClasses.length > 0) {
      if (!selectedClassId || !visibleClassIdSet.has(selectedClassId)) {
        setSelectedClassId(visibleClasses[0].id);
      }
    }
  }, [selectedClassId, visibleClasses, visibleClassIdSet]);

  // Current selected class group
  const currentSelectedClass = useMemo(() => {
    return visibleClasses.find(c => c.id === selectedClassId) || visibleClasses[0] || null;
  }, [visibleClasses, selectedClassId]);

  // Filter students (never leak hidden classes on home page)
  const filteredStudents = useMemo(() => {
    const isSearching = searchKeyword.trim() !== '';
    return students.filter(student => {
      const inVisibleClass = visibleClassIdSet.has(student.classId);
      const matchClass = isSearching
        ? inVisibleClass
        : (student.classId === selectedClassId && inVisibleClass);
      const matchSearch = !isSearching || 
        student.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        student.parentPhone.includes(searchKeyword) ||
        student.parentName.includes(searchKeyword);
      return matchClass && matchSearch;
    });
  }, [students, visibleClassIdSet, selectedClassId, searchKeyword]);

  // Calculate statistics (scoped to the currently selected class on home page)
  const activeScopeStudents = useMemo(() => {
    if (selectedClassId) {
      return students.filter(s => s.classId === selectedClassId && visibleClassIdSet.has(s.classId));
    }
    return visibleClasses.length > 0
      ? students.filter(s => s.classId === visibleClasses[0].id)
      : [];
  }, [students, selectedClassId, visibleClassIdSet, visibleClasses]);

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
    if (processingRef.current.has(studentId)) return;
    processingRef.current.add(studentId);
    setLoadingStudentId(studentId);
    try {
      await onManualUpdate({
        studentId,
        date: activeSunday,
        status,
        memoryVerseCompleted: false,
        offeringCompleted: false,
      });
    } catch (err: any) {
      showCheckinErrorDialog(err);
    } finally {
      processingRef.current.delete(studentId);
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
    } catch (err: any) {
      showCheckinErrorDialog(err);
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
            <p className="text-xs sm:text-sm text-amber-100/90 max-w-3xl leading-relaxed">
              为保护主日学未成年孩童与团契成员的隐私安全，学生姓名、出生年月及考勤点名功能仅对本堂主日学教师及同工开放。访客仅可查看各班级与团契基本情况。
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
              各班级宗旨、适龄标准、上课教室与老师介绍
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

  const windowStatus = checkIsWithinSundayWindow(
    new Date(),
    config.checkinStartTime,
    config.checkinEndTime,
    config.testMode
  );

  return (
    <div className="space-y-6">

      {config.testMode && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold">🧪 全天候测试模式运行中：</span>
              <span className="text-[11px] text-blue-800 ml-1">已突破主日及时间限制，允许在任意时间进行打卡点名与考勤测试。</span>
            </div>
          </div>
          <span className="text-[10px] bg-blue-200/80 text-blue-900 px-2.5 py-0.5 rounded-md font-mono font-bold shrink-0">
            TEST MODE
          </span>
        </div>
      )}

      {/* Top Banner & Statistics Card */}
      <div className="today-dashboard-card bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 sm:p-4.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-700" />
                <span>今日主日学实时签到看板</span>
              </h2>
              {currentSelectedClass && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200/80">
                  {currentSelectedClass.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>当前主日：{formatChineseDate(activeSunday)}</span>
              <span className="text-slate-300">•</span>
              <span>应到总人数：<strong className="text-slate-900 font-bold">{totalCount}</strong> 人</span>
              <span className="text-slate-300">•</span>
              <span>请假：<strong className="text-blue-700 font-bold">{excusedCount}</strong> 人</span>
              <span className="text-slate-300">•</span>
              <span>综合到勤率：<strong className="text-emerald-700 font-bold">{attendanceRate}%</strong></span>
            </p>
          </div>
        </div>

        {/* 3 Horizontal Equal-Width Statistics via Flex Layout */}
        <div className="today-dashboard-stats today-dashboard-stats-row flex flex-row items-stretch gap-4 pt-2.5 border-t border-slate-100">
          
          {/* Stat 1: 已签到 */}
          <div className="today-dashboard-stat-item flex-1 min-w-0 bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-2 sm:p-3 text-center flex flex-col justify-center">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-800 flex items-center justify-center gap-1 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>已签到</span>
            </span>
            <div className="my-0.5 sm:my-1 flex items-baseline justify-center gap-0.5">
              <span className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-700 font-mono tracking-tight">
                {checkedInTotal}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-600">人</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-700/80 truncate">
              准时 {presentCount}
            </div>
          </div>

          {/* Stat 2: 未签到 */}
          <div className="today-dashboard-stat-item flex-1 min-w-0 bg-slate-50/90 border border-slate-200/90 rounded-xl p-2 sm:p-3 text-center flex flex-col justify-center">
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center justify-center gap-1 truncate">
              <UserX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>未签到</span>
            </span>
            <div className="my-0.5 sm:my-1 flex items-baseline justify-center gap-0.5">
              <span className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 font-mono tracking-tight">
                {absentCount > 0 ? absentCount : 0}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500">人</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              {excusedCount > 0 ? `请假 ${excusedCount} 人` : '等待打卡'}
            </div>
          </div>

          {/* Stat 3: 迟到 */}
          <div className="today-dashboard-stat-item flex-1 min-w-0 bg-amber-50/70 border border-amber-200/90 rounded-xl p-2 sm:p-3 text-center flex flex-col justify-center">
            <span className="text-[11px] sm:text-xs font-bold text-amber-800 flex items-center justify-center gap-1 truncate">
              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>迟到</span>
            </span>
            <div className="my-0.5 sm:my-1 flex items-baseline justify-center gap-0.5">
              <span className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-800 font-mono tracking-tight">
                {lateCount}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-amber-700">人</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-amber-700/80 truncate">
              迟到打卡
            </div>
          </div>

        </div>
      </div>

      {/* Filter & Operations Bar - All Classes Fully Visible Without Horizontal Scroll */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
        
        {/* Class Tabs Header & 3-Column Grid Layout */}
        <div>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 mb-2.5">
            <Church className="w-4 h-4 text-amber-700 shrink-0" />
            <span>班级与团契快速切换</span>
          </div>

          {/* 3 items per row Grid Layout, perfectly aligned */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {visibleClasses.map(cls => {
              const clsStudentCount = students.filter(s => s.classId === cls.id).length;
              const clsPresentCount = todayRecords.filter(r => r.classId === cls.id && (r.status === 'present' || r.status === 'late')).length;
              const isSelected = selectedClassId === cls.id;

              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`w-full py-2 px-1.5 sm:px-3 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 shadow-2xs min-w-0 ${
                    isSelected
                      ? 'bg-amber-700 text-white shadow-xs ring-2 ring-amber-700/25'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200/90 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-bold tracking-tight truncate max-w-full">
                    {cls.name.split(' ')[0]}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold shrink-0 ${
                    isSelected ? 'bg-amber-800 text-amber-100' : 'bg-slate-200/90 text-slate-600'
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
              {searchKeyword.trim() ? (
                <>搜索结果：<strong className="text-amber-800">{filteredStudents.length}</strong> 位学员</>
              ) : (
                <>{currentSelectedClass ? `${currentSelectedClass.name}：` : '当前班级：'}<strong className="text-slate-900">{filteredStudents.length}</strong> 位学员</>
              )}
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

                {/* Status Badge - Constant Height Container */}
                <div className="h-9 flex flex-col items-end justify-center shrink-0">
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
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono leading-none">
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
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 text-[10px] truncate max-w-full" title={record.notes}>
                    备注: {record.notes}
                  </span>
                </div>
              )}

              {/* Teacher Quick Action Buttons - Fixed 4-Column Grid to prevent layout jumping */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-4 gap-1.5 items-center">
                <button
                  type="button"
                  onClick={() => handleQuickStatus(student.id, 'present')}
                  className={`text-[11px] font-medium px-1.5 py-1 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    record?.status === 'present'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600'
                  }`}
                >
                  <Check className="w-3 h-3 shrink-0" />
                  <span>到校</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickStatus(student.id, 'late')}
                  className={`text-[11px] font-medium px-1.5 py-1 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    record?.status === 'late'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600'
                  }`}
                >
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>迟到</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenExcuseModal(student)}
                  className={`text-[11px] font-medium px-1.5 py-1 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    record?.status === 'excused'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-600'
                  }`}
                >
                  <FileText className="w-3 h-3 shrink-0" />
                  <span>请假</span>
                </button>

                {record ? (
                  <button
                    type="button"
                    onClick={() => handleQuickStatus(student.id, 'absent')}
                    className="text-[11px] font-medium px-1.5 py-1 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-500"
                    title="删除/清除签到记录，恢复为未打卡状态"
                    aria-label="删除考勤记录"
                  >
                    <Trash2 className="w-3 h-3 shrink-0" />
                    <span>删除</span>
                  </button>
                ) : (
                  <div className="w-full text-center text-[10px] text-slate-300 py-1 font-medium select-none">
                    未打卡
                  </div>
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

      {/* Custom Notice Dialog */}
      {noticeDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-amber-50/80 p-4.5 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 border border-amber-200/50">
                  <ShieldAlert className="w-5 h-5 text-amber-700 animate-bounce" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-amber-950 font-serif">
                  {noticeDialog.title}
                </h3>
              </div>
              <button
                onClick={() => setNoticeDialog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-semibold whitespace-pre-line">
                {noticeDialog.content}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setNoticeDialog(null)}
                className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
