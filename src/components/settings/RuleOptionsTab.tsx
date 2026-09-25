import React from 'react';
import { Sliders, ToggleLeft, ToggleRight } from 'lucide-react';
import type { SystemConfig } from '../../types';

interface RuleOptionsTabProps {
  config: SystemConfig;
  isSuperAdmin: boolean;
  onSaveConfig: (updated: Partial<SystemConfig>) => Promise<void>;
  showNotice: (type: 'success' | 'error', msg: string) => void;
}

export const RuleOptionsTab: React.FC<RuleOptionsTabProps> = ({
  config,
  isSuperAdmin,
  onSaveConfig,
  showNotice,
}) => {
  const [optionsState, setOptionsState] = React.useState({
    testMode: config.testMode ?? false,
    enableLateRule: config.enableLateRule ?? true,
    lateThresholdTime: config.lateThresholdTime || '15:00',
    enableExcusedNote: config.enableExcusedNote ?? true,
  });

  React.useEffect(() => {
    setOptionsState({
      testMode: config.testMode ?? false,
      enableLateRule: config.enableLateRule ?? true,
      lateThresholdTime: config.lateThresholdTime || '15:00',
      enableExcusedNote: config.enableExcusedNote ?? true,
    });
  }, [config]);

  const handleToggleOption = async (key: keyof typeof optionsState, val: any) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限锁定：仅总管理员有权变更系统规则与默认选项！');
      return;
    }
    const next = { ...optionsState, [key]: val };
    setOptionsState(next);
    try {
      await onSaveConfig(next);
      showNotice('success', '选项状态已即刻更新并同步！');
    } catch (err: any) {
      showNotice('error', err.message || '配置更新失败');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-700" />
          <span>主日学签到系统 • 默认选项与业务开关中心</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          在此集中控制签到页面各个默认选项的状态。开关调整后即刻生效，无需重启服务。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 0. 全天候测试模式 */}
        <div className={`p-4.5 rounded-2xl border transition-all md:col-span-2 ${
          optionsState.testMode 
            ? 'border-blue-300 bg-blue-50/80 shadow-xs' 
            : 'border-slate-200 bg-slate-50/60'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                  optionsState.testMode ? 'bg-blue-600 text-white shadow-xs' : 'bg-amber-100 text-amber-800'
                }`}>
                  🧪
                </span>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>全天候测试模式 (仅限总管理员开关)</span>
                  {optionsState.testMode ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      测试模式已开启 (任意时间可打卡)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                      正常模式 (仅主日限定时间可打卡)
                    </span>
                  )}
                </h4>
              </div>
              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                <strong>开启测试模式：</strong>突破【仅限星期天限定时间段】限制，允许总管理员与教师在任意星期、任意时间自由执行打卡与点名测试；<br />
                <strong>退出测试模式：</strong>恢复正常主日签到模式（仅限星期天指定时段开放），并<strong>自动重置清理测试模式下产生的签到数据</strong>，保留正常模式下的所有正式签到记录。
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleOption('testMode', !optionsState.testMode)}
              disabled={!isSuperAdmin}
              className={`shrink-0 ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={isSuperAdmin ? '切换测试模式' : '权限锁定：仅总管理员可开启/关闭测试模式'}
            >
              {optionsState.testMode ? (
                <ToggleRight className="w-10 h-10 text-blue-600" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-slate-300" />
              )}
            </button>
          </div>
        </div>
        
        {/* 1. 迟到判定规则开关与时刻 */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h4 className="text-xs font-bold text-slate-900">
                  是否启用「迟到」判定规则
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                开启后，超过设定时刻提交打卡的学员，系统将自动标记考勤状态为「迟到」。
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleOption('enableLateRule', !optionsState.enableLateRule)}
              className="cursor-pointer shrink-0"
            >
              {optionsState.enableLateRule ? (
                <ToggleRight className="w-9 h-9 text-amber-700" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-slate-300" />
              )}
            </button>
          </div>

          {optionsState.enableLateRule && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 text-xs">
              <span className="text-slate-600 font-semibold">迟到判定时刻:</span>
              <input
                type="time"
                value={optionsState.lateThresholdTime || ''}
                onChange={e => {
                  const val = e.target.value;
                  setOptionsState(prev => ({ ...prev, lateThresholdTime: val }));
                  if (val) {
                    handleToggleOption('lateThresholdTime', val);
                  }
                }}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs"
              />
              <span className="text-[11px] text-slate-400">超过此时间打卡将计为迟到</span>
            </div>
          )}
        </div>

        {/* 2. 请假与随行代祷备注功能开关 */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h4 className="text-xs font-bold text-slate-900">
                是否开启「代祷/随行事项」输入项
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              点名时可为学生填写代祷事项、请假理由或随行状况备注。
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleOption('enableExcusedNote', !optionsState.enableExcusedNote)}
            className="cursor-pointer shrink-0"
          >
            {optionsState.enableExcusedNote ? (
              <ToggleRight className="w-9 h-9 text-amber-700" />
            ) : (
              <ToggleLeft className="w-9 h-9 text-slate-300" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
