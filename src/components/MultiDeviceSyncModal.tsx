import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  Laptop,
  QrCode,
  RefreshCw,
  CheckCircle2,
  Cloud,
  Database,
  Copy,
  Check,
  ShieldCheck,
  ArrowRightLeft,
  Server,
  Wifi,
  Info
} from 'lucide-react';
import type { SystemConfig, Student, ClassGroup, AttendanceRecord } from '../types';

interface MultiDeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  classes: ClassGroup[];
  students: Student[];
  records: AttendanceRecord[];
  isServerAvailable: boolean | null;
  serverRuntime: string | null;
  lastSyncTime: string;
  onManualSync: () => Promise<void>;
  isSyncing: boolean;
}

export const MultiDeviceSyncModal: React.FC<MultiDeviceSyncModalProps> = ({
  isOpen,
  onClose,
  config,
  classes,
  students,
  records,
  isServerAvailable,
  serverRuntime,
  lastSyncTime,
  onManualSync,
  isSyncing
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [syncCode, setSyncCode] = useState<string>('BTL-CHURCH-2026');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Generate QR code for mobile device interconnection
  useEffect(() => {
    if (!isOpen) return;
    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://vercel.app';
      QRCode.toDataURL(currentUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      }).then(url => {
        setQrCodeUrl(url);
      }).catch(err => {
        console.error('Failed to generate sync QR code:', err);
      });
    } catch (e) {
      console.error(e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = () => {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleTriggerSync = async () => {
    try {
      await onManualSync();
      setSyncSuccessMsg('✅ 已成功与云端服务完成多端资料同步！');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch {
      // handled
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-8">
        
        {/* Modal Header */}
        <div className="bg-linear-to-r from-amber-700 via-amber-800 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <ArrowRightLeft className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif flex items-center gap-2">
                <span>多设备终端云端实时同步枢纽</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Multi-Device Sync
                </span>
              </h2>
              <p className="text-xs text-amber-100/80 mt-0.5">
                手机、平板与电脑跨终端资料即时互联与签到同步
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-700 text-xs">
          
          {/* Status Bar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isServerAvailable === false ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isServerAvailable === false ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                </span>
                <span className="font-semibold text-sm text-slate-900">
                  {isServerAvailable === false ? '静态存储/离线模式' : '实时更新服务已就绪'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                当前在册班级：<strong className="text-slate-800">{classes.length}</strong> 个 ｜ 
                学员资料：<strong className="text-slate-800">{students.length}</strong> 人 ｜ 
                今日考勤：<strong className="text-slate-800">{records.length}</strong> 条记录
              </p>
            </div>

            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-medium flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? '正在同步云端...' : '立即同步最新资料'}</span>
            </button>
          </div>

          {syncSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* Device Interconnection QR Code (手机电脑互通) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-2xl bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200/70">
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="设备互联二维码" className="w-44 h-44 rounded-lg" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center bg-slate-100 rounded-lg text-slate-400">
                  <QrCode className="w-10 h-10" />
                </div>
              )}
              <span className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                <span>手机微信或浏览器扫一扫即可连接</span>
              </span>
            </div>

            <div className="flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 font-serif">
                  <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
                    1
                  </span>
                  <span>手机端微信 / 浏览器直连</span>
                </div>
                <p className="text-slate-600 mt-1.5 leading-relaxed text-[11px]">
                  主日学老师在课室使用手机点名时，直接扫描左侧二维码，即可在手机上加载最新班级与学员名单。手机完成的签到将自动汇入总大屏。
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-semibold text-slate-600 block">教会系统专属网址：</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-700 truncate select-all"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-1 border border-slate-300 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? '已复制' : '复制网址'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Supabase PostgreSQL 官方云端持久化数据库 */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3.5 shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Supabase PostgreSQL 官方持久化云数据库</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                企业级唯一持久化数据库
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              系统核心数据已全部接入 <strong>Supabase PostgreSQL</strong> 关系型数据库，完美支持 Vercel Serverless 无状态容器。多台手机、平板和电脑<strong>永久且实时共享同一个数据库</strong>，确保考勤记录与学生档案永久保存不丢失：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-semibold text-amber-200">1. PostgreSQL 存储</div>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  所有学生名单、签到历史、班级与账号全部存入 Supabase PostgreSQL 实体表，高可靠性保障。
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-semibold text-emerald-200">2. 服务端安全鉴权</div>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Supabase Service Role Key 仅保存在服务器环境变量中，绝不暴露到前端浏览器，安全合规。
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-semibold text-sky-200">3. 全端毫秒级同步</div>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  老师在手机微信端扫码或快速登记考勤，数据瞬间存入数据库，主屏与所有终端同步呈现。
                </p>
              </div>
            </div>
          </div>

          {/* Sync Code & Auto-Merge Details */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>智能增量合并防丢失机制</span>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              系统内置了<strong>智能无损合并引擎</strong>：当不同老师在各自手机上为不同学员点名，或者总管理员在电脑上录入新学生资料时，云端接口采用<strong>唯一 ID 联合去重算法</strong>，确保多端同时操作时互不覆盖，各自提交的考勤与学员均会完整保留并实时聚合。
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            上次全网同步检查：{lastSyncTime || '刚刚'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            完成并关闭
          </button>
        </div>

      </div>
    </div>
  );
};
