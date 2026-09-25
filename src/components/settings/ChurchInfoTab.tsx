import React, { useState, useEffect } from 'react';
import { Church, Lock, Save, Download, Upload, Copy, FileText, ClipboardCheck } from 'lucide-react';
import type { SystemConfig } from '../../types';
import { exportLocalBackup } from '../../utils/localStore';

interface ChurchInfoTabProps {
  config: SystemConfig;
  isSuperAdmin: boolean;
  onSaveConfig: (updated: Partial<SystemConfig>) => Promise<void>;
  onExportData?: () => void;
  onImportData?: (fileOrJson: File | string) => Promise<void>;
  showNotice: (type: 'success' | 'error', msg: string) => void;
  setIsSaveSuccessModalOpen: (open: boolean) => void;
}

export const ChurchInfoTab: React.FC<ChurchInfoTabProps> = ({
  config,
  isSuperAdmin,
  onSaveConfig,
  onExportData,
  onImportData,
  showNotice,
  setIsSaveSuccessModalOpen,
}) => {
  const [churchName, setChurchName] = useState(config.churchName || '伯特利教会');
  const [schoolTitle, setSchoolTitle] = useState(config.schoolTitle || '主日学与团契IMS');
  const [startTime, setStartTime] = useState(config.checkinStartTime || '11:00');
  const [endTime, setEndTime] = useState(config.checkinEndTime || '16:00');
  const [memoryVerse, setMemoryVerse] = useState(config.weeklyMemoryVerse || '');
  const [verseRef, setVerseRef] = useState(config.memoryVerseReference || '');
  const [isSavingSystem, setIsSavingSystem] = useState(false);

  // Backup & Restore states
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');
  const [isCopySuccess, setIsCopySuccess] = useState(false);

  useEffect(() => {
    setChurchName(config.churchName || '伯特利教会');
    setSchoolTitle(config.schoolTitle || '主日学与团契IMS');
    setStartTime(config.checkinStartTime || '11:00');
    setEndTime(config.checkinEndTime || '16:00');
    setMemoryVerse(config.weeklyMemoryVerse || '');
    setVerseRef(config.memoryVerseReference || '');
  }, [config]);

  const handleSaveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限锁定：仅总管理员可修改教会信息与主日签到规则！');
      return;
    }
    setIsSavingSystem(true);
    try {
      await onSaveConfig({
        churchName: churchName.trim(),
        schoolTitle: schoolTitle.trim(),
        checkinStartTime: startTime,
        checkinEndTime: endTime,
        weeklyMemoryVerse: memoryVerse.trim(),
        memoryVerseReference: verseRef.trim()
      });
      showNotice('success', '教会设置与签到时段已成功保存！');
      setIsSaveSuccessModalOpen(true);
    } catch (err: any) {
      showNotice('error', err.message || '保存设置失败');
    } finally {
      setIsSavingSystem(false);
    }
  };

  const handleCopyBackupJson = async () => {
    try {
      const jsonStr = exportLocalBackup();
      await navigator.clipboard.writeText(jsonStr);
      setIsCopySuccess(true);
      showNotice('success', '备份 JSON 文本已成功复制到剪贴板！');
      setTimeout(() => setIsCopySuccess(false), 2500);
    } catch {
      showNotice('error', '复制失败，请直接点击“下载 JSON 备份文件”');
    }
  };

  const handlePasteImportSubmit = async () => {
    if (!pastedJsonText.trim()) {
      showNotice('error', '请先粘贴有效的 JSON 备份文本！');
      return;
    }
    try {
      if (onImportData) {
        await onImportData(pastedJsonText.trim());
        showNotice('success', '备份数据已成功解析，并更新至云端与本设备！');
        setPastedJsonText('');
        setIsPasteModalOpen(false);
      }
    } catch (err: any) {
      showNotice('error', err.message || '解析 JSON 备份失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* Permission warning banner for non-superadmin */}
      {!isSuperAdmin && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs px-4 py-3 rounded-2xl flex items-center gap-3 font-medium shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex-1 leading-relaxed">
            <p className="font-bold text-slate-900 text-xs sm:text-sm">教会信息设置处于锁定状态</p>
            <p className="text-amber-800 text-[11px] mt-0.5">
              您当前登录的是同工账号（仅限主日签到点名权限）。教会全称、时段窗口限制、主日金句与系统密码仅供查阅；所有编辑与修改操作已锁定，仅总管理员可变更。
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveSystemConfig} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
              <Church className="w-5 h-5 text-amber-700" />
              <span>伯特利教会 • 教会信息设置</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              修改系统显示的教会全称、时段窗口限制、金句内容及管理员登入密码
            </p>
          </div>
          {!isSuperAdmin && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0">
              <Lock className="w-3.5 h-3.5" />
              <span>已锁定 (只读)</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              教会全称 {!isSuperAdmin && <span className="text-[10px] text-amber-800">(锁定)</span>}
            </label>
            <input
              type="text"
              required
              disabled={!isSuperAdmin}
              value={churchName}
              onChange={e => setChurchName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              部门/系统名称 {!isSuperAdmin && <span className="text-[10px] text-amber-800">(锁定)</span>}
            </label>
            <input
              type="text"
              required
              disabled={!isSuperAdmin}
              value={schoolTitle}
              onChange={e => setSchoolTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              礼拜天签到开放起始时间 {!isSuperAdmin && <span className="text-[10px] text-amber-800">(锁定)</span>}
            </label>
            <input
              type="time"
              disabled={!isSuperAdmin}
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-mono disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              礼拜天签到截止时间 {!isSuperAdmin && <span className="text-[10px] text-amber-800">(锁定)</span>}
            </label>
            <input
              type="time"
              disabled={!isSuperAdmin}
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-mono disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Scripture Verse */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold text-slate-700">
            每周主日学金句 (Memory Verse) {!isSuperAdmin && <span className="text-[10px] text-amber-800 font-normal">(只读锁定)</span>}
          </label>
          <textarea
            rows={2}
            disabled={!isSuperAdmin}
            value={memoryVerse}
            onChange={e => setMemoryVerse(e.target.value)}
            className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white leading-relaxed font-serif disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">经文出处:</span>
            <input
              type="text"
              disabled={!isSuperAdmin}
              value={verseRef}
              onChange={e => setVerseRef(e.target.value)}
              className="w-64 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-100">
          {isSuperAdmin ? (
            <button
              type="submit"
              disabled={isSavingSystem}
              className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingSystem ? '保存中...' : '保存教会信息与规则'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-500 font-semibold text-xs flex items-center gap-2 cursor-not-allowed shadow-none"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>内容已锁定 (仅总管理员可修改)</span>
            </button>
          )}
        </div>
      </form>

      {/* DATA BACKUP & RESTORE SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-amber-200/80 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-serif font-bold text-sm">
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Download className="w-4 h-4" />
              </span>
              <span>数据完整备份与跨设备导入恢复 (JSON / Supabase 云端)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              支持 JSON 文件下载/上传，以及数据文本快捷复制与粘贴导入，导入后同步强推写回 Supabase PostgreSQL 云端数据库。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Export Backup Card */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-amber-700" />
                <span>导出系统数据备份</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                打包现有所有班级、在册学生花名册、教师资料、主日签到历史及后台管理员账号为标准 JSON。
              </p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={onExportData}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下载 JSON 备份文件</span>
              </button>
              <button
                type="button"
                onClick={handleCopyBackupJson}
                className="w-full py-2 px-3 rounded-xl bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-300/70 transition-all cursor-pointer"
              >
                {isCopySuccess ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-800" />}
                <span>{isCopySuccess ? '已复制 JSON 文本！' : '复制 JSON 备份文本 (微信/剪贴板)'}</span>
              </button>
            </div>
          </div>

          {/* Import Backup Card */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${isSuperAdmin ? 'bg-sky-50/50 border-sky-200/80' : 'bg-slate-50 border-slate-200/80'}`}>
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Upload className={`w-4 h-4 ${isSuperAdmin ? 'text-sky-700' : 'text-slate-400'}`} />
                <span>导入恢复系统数据</span>
                {!isSuperAdmin && (
                  <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    <span>总管理员专属</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                一键恢复全部资料。导入后将立即更新本设备名册并实时同步至云端与所有已登录终端。
              </p>
            </div>
            {isSuperAdmin ? (
              <div className="space-y-2">
                <label className="w-full py-2.5 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors text-center">
                  <Upload className="w-3.5 h-3.5" />
                  <span>选择备份文件 (.json) 导入</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        if (onImportData) {
                          await onImportData(file);
                          showNotice('success', '备份数据已成功导入并同步至云端！');
                        }
                      } catch (err: any) {
                        showNotice('error', err.message || '导入文件解析失败');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-sky-100/80 hover:bg-sky-200/80 text-sky-900 font-bold text-xs flex items-center justify-center gap-1.5 border border-sky-300/70 transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-800" />
                  <span>粘贴 JSON 文本快速恢复</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-2.5 px-4 rounded-xl bg-slate-200 text-slate-400 font-semibold text-xs flex items-center justify-center gap-2 cursor-not-allowed text-center"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>导入权限已锁定 (仅总管理员)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PASTE JSON IMPORT MODAL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-sky-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-linear-to-r from-sky-700 to-sky-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-200" />
                  <span>粘贴 JSON 备份文本恢复</span>
                </h3>
                <p className="text-xs text-sky-200 mt-0.5">
                  适用于移动端设备或跨设备快速迁移，直接粘贴导出的 JSON 字符串
                </p>
              </div>
              <button
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setPastedJsonText('');
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  备份 JSON 字符串 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={8}
                  value={pastedJsonText}
                  onChange={(e) => setPastedJsonText(e.target.value)}
                  placeholder="在此处粘贴由系统导出的 JSON 备份文本内容..."
                  className="w-full text-xs font-mono p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-slate-50/50 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasteModalOpen(false);
                    setPastedJsonText('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handlePasteImportSubmit}
                  className="px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>解析并同步导入</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
