import React, { useState, useEffect } from 'react';
import { 
  Church, 
  Users, 
  CalendarCheck, 
  Cake,
  Contact,
  Award, 
  Settings, 
  Clock, 
  AlertCircle,
  Sparkles,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Smartphone,
  ArrowRightLeft
} from 'lucide-react';
import type { SystemConfig, AdminUser } from '../types';
import { checkIsWithinSundayWindow, getDayOfWeekName } from '../utils/dateUtils';

interface HeaderProps {
  config: SystemConfig;
  activeTab: 'today' | 'attendance' | 'birthday' | 'settings' | 'monthly' | 'annual';
  setActiveTab: (tab: 'today' | 'attendance' | 'birthday' | 'settings') => void;
  onQuickToggleTestMode?: () => void;
  currentUser: AdminUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onManualSync?: () => void;
  onOpenSyncModal?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
  isServerAvailable?: boolean | null;
  serverRuntime?: string | null;
  upcomingBirthdayCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activeTab,
  setActiveTab,
  currentUser,
  onOpenLogin,
  onLogout,
  onManualSync,
  onOpenSyncModal,
  isSyncing = false,
  lastSyncTime = '',
  isServerAvailable = true,
  serverRuntime = null,
  upcomingBirthdayCount = 0,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const windowStatus = checkIsWithinSundayWindow(
    currentTime,
    config.checkinStartTime,
    config.checkinEndTime,
    config.testMode
  );

  const timeString = currentTime.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Rome'
  });

  const dateString = currentTime.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Rome'
  });

  return (
    <header className="bg-white border-b border-amber-200/80 shadow-xs sticky top-0 z-30">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Bethel Church Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-amber-600 to-amber-800 flex items-center justify-center text-amber-50 shadow-md shadow-amber-900/10 shrink-0">
              <Church className="w-6 h-6" />
            </div>
            <div className="whitespace-nowrap">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 font-serif truncate">
                  {config.churchName}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-medium border border-amber-200 shrink-0">
                  {config.currentSemester}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <span className="text-amber-900 font-semibold">{config.schoolTitle}</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-800">学生考勤与资料管理</span>
              </p>
            </div>
          </div>

          {/* Time, Sunday Window Status & Admin Profile */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            
            {/* Clock Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs text-slate-700">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="leading-tight flex items-center">
                <span className="font-semibold text-slate-900 font-mono tabular-nums inline-block w-[64px] shrink-0 text-center">{timeString}</span>
                <span className="text-slate-500 ml-1.5 hidden sm:inline whitespace-nowrap">{dateString} ({getDayOfWeekName(currentTime)})</span>
              </div>
            </div>

            {/* Sunday Status Badge */}
            {windowStatus.isAllowed && (
              <div className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium shadow-2xs ${
                config.testMode 
                  ? 'border border-blue-300 bg-blue-50 text-blue-900' 
                  : 'border border-emerald-300 bg-emerald-50 text-emerald-800'
              }`}>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    config.testMode ? 'bg-blue-400' : 'bg-emerald-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    config.testMode ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}></span>
                </span>
                <span>{windowStatus.statusMsg}</span>
              </div>
            )}

            {/* Cloud Real-Time Sync Status */}
            {onManualSync && (
              <button
                onClick={onManualSync}
                disabled={isSyncing}
                className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-medium border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer group"
                title={`点击立即从云端动态接口同步最新数据${lastSyncTime ? ` (上次同步: ${lastSyncTime})` : ''}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isServerAvailable === false ? 'text-amber-600' : 'text-emerald-600'} ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                <span className="hidden sm:inline">
                  {isSyncing ? '正在同步...' : isServerAvailable === false ? '本地离线' : '实时更新'}
                </span>
                {lastSyncTime && <span className="text-[10px] text-slate-400 hidden md:inline">{lastSyncTime}</span>}
              </button>
            )}

            {/* Admin Login / Logout State Button */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg shadow-2xs">
                {currentUser.role === 'superadmin' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                )}
                <span className="font-semibold truncate max-w-[120px]" title={currentUser.displayName}>
                  {currentUser.displayName}
                </span>
                {currentUser.role === 'superadmin' && (
                  <button
                    onClick={() => setActiveTab(activeTab === 'settings' ? 'today' : 'settings')}
                    className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ml-1 ${
                      activeTab === 'settings'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-2xs'
                    }`}
                    title={activeTab === 'settings' ? '返回主日签到前台' : '进入后台综合管理系统'}
                  >
                    <Settings className="w-3 h-3" />
                    <span>{activeTab === 'settings' ? '返回前台' : '后台管理'}</span>
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="ml-0.5 text-slate-400 hover:text-red-700 cursor-pointer p-0.5"
                  title="退出登录"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="text-xs px-2.5 py-1.5 rounded-lg font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>后台管理登录</span>
              </button>
            )}

          </div>

        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 pt-2.5 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('today')}
            className={`w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              activeTab === 'today'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-slate-50/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4 text-inherit shrink-0" />
            <span className="truncate">主日签到</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              activeTab === 'attendance' || activeTab === 'monthly' || activeTab === 'annual'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-slate-50/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-inherit shrink-0" />
            <span className="truncate">考勤统计</span>
          </button>

          <button
            onClick={() => setActiveTab('birthday')}
            className={`w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              activeTab === 'birthday'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-slate-50/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <Contact className="w-4 h-4 text-inherit shrink-0" />
            <span className="truncate">学生档案</span>
            {upcomingBirthdayCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0 ${
                activeTab === 'birthday' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {upcomingBirthdayCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
