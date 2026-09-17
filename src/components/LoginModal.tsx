import React, { useState } from 'react';
import { 
  Church, 
  Lock, 
  User, 
  KeyRound, 
  ArrowRight, 
  X, 
  ShieldCheck, 
  Sparkles,
  AlertCircle,
  Check
} from 'lucide-react';
import type { AdminUser } from '../types';
import { localLogin } from '../utils/localStore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      let loggedUser: AdminUser | null = null;
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        if (res.ok) {
          const data = await res.json();
          loggedUser = data.user;
        }
      } catch (networkErr) {
        // Network or offline
      }

      // If server response didn't yield a user, try local credentials
      if (!loggedUser) {
        loggedUser = localLogin(username, password);
      }

      if (!loggedUser) {
        throw new Error('登录失败：账号或密码错误，请核对后重试');
      }

      onLoginSuccess(loggedUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '网络连接或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-amber-200/90 shadow-2xl max-w-md w-full overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Top Header Banner */}
        <div className="bg-linear-to-r from-amber-700 via-amber-800 to-amber-900 text-white p-6 text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-amber-200 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Church className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-serif tracking-tight">
            伯特利教会 • 后台管理系统
          </h2>
          <p className="text-xs text-amber-200/90 mt-1">
            主日学班级与团契管理 • 规则权限配置
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                管理账号 / 教师同工账号
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="请输入登录用户名"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                登录密码
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入登录密码"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Buttons: 取消 and 立即登入 */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer text-center"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-2 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                {loading ? (
                  <span>正在验证登录...</span>
                ) : (
                  <>
                    <span>立即登入管理后台</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* System Security Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">🔒 权限安全提示：</span>
            总管理员拥有完整管理权限（含班级、学员、账号配置）；教务与同工账号具备主日考勤打卡管理权限。如需新建或修改账号密码，请由总管理员在后台「账号管理」中设置。
          </div>

        </div>

      </div>
    </div>
  );
};
