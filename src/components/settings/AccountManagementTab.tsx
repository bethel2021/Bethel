import React, { useState } from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';
import type { AdminAccount, AdminUser, ClassGroup } from '../../types';

interface AccountManagementTabProps {
  accounts: AdminAccount[];
  classes: ClassGroup[];
  currentUser: AdminUser | null;
  isSuperAdmin: boolean;
  isSyncing: boolean;
  lastSyncTime: string;
  onManualSync?: () => Promise<void>;
  onSaveAccount?: (accountData: Partial<AdminAccount> & { username: string; password?: string }) => Promise<void>;
  onDeleteAccount?: (username: string) => Promise<void>;
  onChangeAccountPassword?: (username: string, newPassword: string) => Promise<void>;
  onRequestDeleteAccount: (acc: AdminAccount) => void;
  onOpenLogin: () => void;
  showNotice: (type: 'success' | 'error', msg: string) => void;
  setIsSaveSuccessModalOpen: (open: boolean) => void;
}

export const AccountManagementTab: React.FC<AccountManagementTabProps> = ({
  accounts,
  classes,
  currentUser,
  isSuperAdmin,
  isSyncing,
  lastSyncTime,
  onManualSync,
  onSaveAccount,
  onChangeAccountPassword,
  onRequestDeleteAccount,
  onOpenLogin,
  showNotice,
  setIsSaveSuccessModalOpen,
}) => {
  // Account modal
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountDisplayName, setAccountDisplayName] = useState('');
  const [accountRole, setAccountRole] = useState<'superadmin' | 'teacher' | 'fellowship_leader'>('teacher');
  const [accountAssignedClassId, setAccountAssignedClassId] = useState<string>('');
  const [accountPassword, setAccountPassword] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Password reset modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetAccount, setPasswordTargetAccount] = useState<AdminAccount | null>(null);
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleOpenNewAccount = () => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员可新建后台管理账号！');
      return;
    }
    setEditingAccount(null);
    setAccountUsername('');
    setAccountDisplayName('');
    setAccountRole('teacher');
    setAccountAssignedClassId('');
    setAccountPassword('');
    setShowPasswordText(false);
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: AdminAccount) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员可编辑后台管理账号！');
      return;
    }
    setEditingAccount(acc);
    setAccountUsername(acc.username);
    setAccountDisplayName(acc.displayName);
    setAccountRole(acc.role);
    setAccountAssignedClassId(acc.assignedClassId || '');
    setAccountPassword('');
    setShowPasswordText(false);
    setIsAccountModalOpen(true);
  };

  const handleOpenChangePassword = (acc: AdminAccount) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员可重置账号密码！');
      return;
    }
    setPasswordTargetAccount(acc);
    setNewAccountPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleSaveAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员可保存管理账号！');
      return;
    }
    if (!accountUsername.trim() || !accountDisplayName.trim()) return;
    setIsSavingAccount(true);
    try {
      if (onSaveAccount) {
        await onSaveAccount({
          id: editingAccount?.id,
          username: accountUsername.trim(),
          displayName: accountDisplayName.trim(),
          role: accountRole,
          assignedClassId: accountRole === 'superadmin' ? undefined : (accountAssignedClassId || undefined),
          password: accountPassword.trim() || undefined
        });
        setIsAccountModalOpen(false);
        showNotice('success', `账号【${accountUsername}】已成功${editingAccount ? '更新' : '创建'}！`);
        setIsSaveSuccessModalOpen(true);
      }
    } catch (err: any) {
      showNotice('error', err.message || '保存管理账号失败');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleSavePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !passwordTargetAccount) return;
    if (!newAccountPassword.trim()) {
      showNotice('error', '请输入新密码！');
      return;
    }
    setIsSavingPassword(true);
    try {
      if (onChangeAccountPassword) {
        await onChangeAccountPassword(passwordTargetAccount.username, newAccountPassword.trim());
        setIsPasswordModalOpen(false);
        setPasswordTargetAccount(null);
        showNotice('success', `账号【${passwordTargetAccount.username}】密码重置成功！`);
      }
    } catch (err: any) {
      showNotice('error', err.message || '修改密码失败');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Card with Stats & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              伯特利教会 • 管理员与教师账号权限中心
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            支持总管理员、主日学上课、团契负责人账号的新建、修改资料、重置密码与删除。修改即刻多端同步生效。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              title={`点击立即与云端同步最新数据${lastSyncTime ? ` (上次同步: ${lastSyncTime})` : ''}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isSyncing ? 'animate-spin text-amber-800' : ''}`} />
              <span>{isSyncing ? '正在同步...' : '云端立即同步'}</span>
              {lastSyncTime && <span className="text-[10px] text-slate-400">({lastSyncTime})</span>}
            </button>
          )}

          {isSuperAdmin ? (
            <button
              type="button"
              onClick={handleOpenNewAccount}
              className="px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建管理账号</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>切换总管理员以管理账号</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-medium">在册管理账号</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-serif flex items-center gap-1.5">
            <span>{accounts.length}</span>
            <span className="text-xs font-normal text-slate-400">位同工</span>
          </div>
        </div>

        <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
          <div className="text-[11px] text-amber-900 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>总管理员 (全部权限)</span>
          </div>
          <div className="text-xl font-bold text-amber-950 mt-1 font-serif">
            {accounts.filter(a => a.role === 'superadmin').length}
          </div>
        </div>

        <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-200/80 shadow-2xs">
          <div className="text-[11px] text-sky-900 font-medium flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-sky-700" />
            <span>主日学 (考勤权限)</span>
          </div>
          <div className="text-xl font-bold text-sky-950 mt-1 font-serif">
            {accounts.filter(a => a.role === 'teacher').length}
          </div>
        </div>

        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs">
          <div className="text-[11px] text-emerald-900 font-medium flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-700" />
            <span>团契负责人 (考勤权限)</span>
          </div>
          <div className="text-xl font-bold text-emerald-950 mt-1 font-serif">
            {accounts.filter(a => a.role === 'fellowship_leader').length}
          </div>
        </div>
      </div>

      {/* Accounts List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>后台账号列表</span>
              <span className="text-[11px] font-normal text-slate-500">
                （共 {accounts.length} 个登录账号）
              </span>
            </h4>
          </div>
          {!isSuperAdmin && (
            <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>当前账号权限受限：仅总管理员可新建、修改或删除账号</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70">
                <th className="py-3 px-4">用户名 (登录标识)</th>
                <th className="py-3 px-4">姓名 / 称呼</th>
                <th className="py-3 px-4">系统权限角色</th>
                <th className="py-3 px-4">权限职能描述</th>
                <th className="py-3 px-4">注册/创建日期</th>
                <th className="py-3 px-4 text-right">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...accounts].sort((a, b) => (a.role === 'superadmin' ? -1 : 1)).map(acc => {
                const isRootAdmin = acc.username.toLowerCase() === 'admin';
                const isCurrentUserAccount = currentUser?.username === acc.username;

                return (
                  <tr key={acc.username} className="hover:bg-amber-50/30 transition-colors">
                    {/* Username */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          acc.role === 'superadmin' 
                            ? 'bg-amber-100 text-amber-900' 
                            : acc.role === 'fellowship_leader'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-sky-100 text-sky-900'
                        }`}>
                          {acc.displayName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{acc.username}</span>
                            {isRootAdmin && (
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded" title="核心根总管">
                                系统根总管
                              </span>
                            )}
                            {isCurrentUserAccount && (
                              <span className="bg-slate-100 text-slate-700 text-[9px] font-semibold px-1.5 py-0.2 rounded">
                                当前在线
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Display Name */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">{acc.displayName}</span>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3 px-4">
                      {acc.role === 'superadmin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                          <span>总管理员</span>
                        </span>
                      ) : acc.role === 'fellowship_leader' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-900">
                          <Users className="w-3.5 h-3.5 text-emerald-700" />
                          <span>团契同工</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 border border-sky-200 text-sky-900">
                          <BookOpen className="w-3.5 h-3.5 text-sky-700" />
                          <span>主日学教师</span>
                        </span>
                      )}
                    </td>

                    {/* Permission Description */}
                    <td className="py-3 px-4 text-slate-600">
                      {acc.role === 'superadmin' ? (
                        <span className="text-[11px] text-amber-900 font-medium">
                          全权管理：增删班级、学员、账号及系统设置
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-slate-500">
                            考勤点名：仅限负责班级日常签到与考勤报告
                          </div>
                          <div className="text-[10px]">
                            {acc.assignedClassId ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/80 px-1.5 py-0.2 rounded font-medium">
                                指定班级: {classes.find(c => c.id === acc.assignedClassId)?.name || acc.assignedClassId}
                              </span>
                            ) : (
                              <span className="text-slate-400">指定班级: 全校所有班级 (通用)</span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                      {acc.createdAt || '2026-03-01'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAccount(acc)}
                          disabled={!isSuperAdmin}
                          className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isSuperAdmin 
                              ? 'border-slate-200 hover:bg-slate-100 text-slate-700' 
                              : 'opacity-40 border-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                          title={isSuperAdmin ? '修改账号姓名与角色' : '仅总管理员可修改资料'}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                          <span className="hidden sm:inline">编辑</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenChangePassword(acc)}
                          disabled={!isSuperAdmin}
                          className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isSuperAdmin 
                              ? 'border-amber-200 hover:bg-amber-50 text-amber-900' 
                              : 'opacity-40 border-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                          title={isSuperAdmin ? '重置此账号登录密码' : '仅总管理员可重置密码'}
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                          <span className="hidden sm:inline">改密</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRequestDeleteAccount(acc)}
                          disabled={!isSuperAdmin || isRootAdmin}
                          className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isRootAdmin
                              ? 'opacity-30 border-slate-200 text-slate-300 cursor-not-allowed'
                              : isSuperAdmin
                              ? 'border-red-200 hover:bg-red-50 text-red-600'
                              : 'opacity-40 border-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                          title={
                            isRootAdmin 
                              ? '系统根总管受系统保护，不可删除' 
                              : isSuperAdmin 
                              ? '删除此账号' 
                              : '仅总管理员可删除账号'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">删除</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Policy Card */}
      <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-950 space-y-2">
        <div className="font-bold flex items-center gap-1.5 text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>教会权限安全规则与多端实时同步说明</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-amber-900/90 leading-relaxed pt-1">
          <div className="bg-white/70 p-3 rounded-xl border border-amber-200/60">
            <div className="font-bold text-slate-900 flex items-center gap-1 mb-1">
              <span>👑 总管理员 (superadmin)</span>
            </div>
            <p>
              拥有最高全部权限：可新建/修改/删除班级与团契、批量录入学员、移出在册学员档案、增删其他教师账号、配置教会主日时段与系统密码。
            </p>
          </div>

          <div className="bg-white/70 p-3 rounded-xl border border-amber-200/60">
            <div className="font-bold text-slate-900 flex items-center gap-1 mb-1">
              <span>📖 主日学上课 (teacher)</span>
            </div>
            <p>
              专职负责主日学生点名考勤、金句背诵打卡与出勤统计。受安全保护，无权擅自删除班级或移除在册学员，确保教会资产档案安全无虞。
            </p>
          </div>

          <div className="bg-white/70 p-3 rounded-xl border border-amber-200/60">
            <div className="font-bold text-slate-900 flex items-center gap-1 mb-1">
              <span>🤝 团契负责人/同工 (fellowship_leader)</span>
            </div>
            <p>
              负责各团契日常出勤点名与考勤报表查看。数据修改通过服务器集中持久化存储，并在其他设备浏览器中实时同步更新。
            </p>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT ACCOUNT MODAL */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-linear-to-r from-amber-700 to-amber-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-200" />
                  <span>{editingAccount ? '编辑管理账号资料' : '新建管理人员账号'}</span>
                </h3>
                <p className="text-xs text-amber-200 mt-0.5">
                  {editingAccount ? '更新该账号姓名与所属角色' : '为新教师或同工配置系统登录凭据与对应权限'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccountSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  登录用户名 * (字母/数字/下划线)
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingAccount)}
                  value={accountUsername}
                  onChange={e => setAccountUsername(e.target.value)}
                  placeholder="例如: teacher_li 或 wang_tonggong"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {editingAccount && (
                  <p className="text-[10px] text-slate-400 mt-1">登录用户名创建后不可更改</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  姓名 / 显示名称 *
                </label>
                <input
                  type="text"
                  required
                  value={accountDisplayName}
                  onChange={e => setAccountDisplayName(e.target.value)}
                  placeholder="例如: 李老师 或 王执事"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  系统权限级别 *
                </label>
                <select
                  value={accountRole}
                  onChange={e => setAccountRole(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                >
                  <option value="teacher">主日学教师 (仅限日常签到点名，无增删班级/学员权限)</option>
                  <option value="fellowship_leader">团契负责人/同工 (仅限日常团契点名，无增删班级/学员权限)</option>
                  <option value="superadmin">总管理员 (拥有最高权限：增删班级、增删学员、管理所有账号)</option>
                </select>
              </div>

              {accountRole !== 'superadmin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    绑定管理班级/团契 (班级级别数据隔离)
                  </label>
                  <select
                    value={accountAssignedClassId}
                    onChange={e => setAccountAssignedClassId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium text-amber-950"
                  >
                    <option value="">全校所有班级 (不作数据隔离)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.ageRange || '所有年龄'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{editingAccount ? '新登录密码 (选填)' : '初始登录密码 * (不少于4位)'}</span>
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="text-[11px] text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                  >
                    {showPasswordText ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPasswordText ? '隐藏' : '显示密码'}</span>
                  </button>
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required={!editingAccount}
                  value={accountPassword}
                  onChange={e => setAccountPassword(e.target.value)}
                  placeholder={editingAccount ? '如不修改密码请留空' : '请输入初始登录密码 (如 123456)'}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccount}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  {isSavingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSavingAccount ? '正在保存...' : '确认保存账号'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {isPasswordModalOpen && passwordTargetAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-linear-to-r from-amber-700 to-amber-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-200" />
                  <span>重置账号密码</span>
                </h3>
                <p className="text-xs text-amber-200 mt-0.5">
                  为【{passwordTargetAccount.displayName}】设置新密码
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordTargetAccount(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePasswordSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  新登录密码 *
                </label>
                <input
                  type="text"
                  required
                  value={newAccountPassword}
                  onChange={e => setNewAccountPassword(e.target.value)}
                  placeholder="请输入新密码 (不少于4位)"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordTargetAccount(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  {isSavingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>确认重置密码</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
