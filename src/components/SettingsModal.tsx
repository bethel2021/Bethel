import React, { useState } from 'react';
import { 
  Settings, 
  Church, 
  Users, 
  ShieldCheck, 
  Sliders, 
  UserCheck, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import type { SystemConfig, Student, ClassGroup, AdminUser, AdminAccount } from '../types';
import { ClassManagementTab } from './settings/ClassManagementTab';
import { StudentManagementTab } from './settings/StudentManagementTab';
import { TeacherManagementTab } from './settings/TeacherManagementTab';
import { AccountManagementTab } from './settings/AccountManagementTab';
import { RuleOptionsTab } from './settings/RuleOptionsTab';
import { ChurchInfoTab } from './settings/ChurchInfoTab';
import { DeleteConfirmModal, type DeleteTarget } from './settings/DeleteConfirmModal';
import { SaveSuccessModal } from './settings/SaveSuccessModal';

interface SettingsModalProps {
  config: SystemConfig;
  classes: ClassGroup[];
  students: Student[];
  accounts?: AdminAccount[];
  currentUser: AdminUser | null;
  onSaveConfig: (updated: Partial<SystemConfig>) => Promise<void>;
  onSaveClass: (classData: Partial<ClassGroup>) => Promise<void>;
  onToggleClassVisibility?: (classId: string, isHiddenFromHome: boolean) => Promise<void>;
  onDeleteClass: (classId: string) => Promise<void>;
  onAddStudent: (studentData: any) => Promise<void>;
  onBatchAddStudents: (classId: string, namesText: string, defaultAge?: number, defaultBirthDate?: string) => Promise<void>;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onResetData: () => Promise<void>;
  onOpenLogin: () => void;
  onSaveAccount?: (accountData: Partial<AdminAccount> & { username: string; password?: string }) => Promise<void>;
  onDeleteAccount?: (username: string) => Promise<void>;
  onChangeAccountPassword?: (username: string, newPassword: string) => Promise<void>;
  onManualSync?: () => Promise<void>;
  isSyncing?: boolean;
  lastSyncTime?: string;
  onExportData?: () => void;
  onImportData?: (fileOrJson: File | string) => Promise<void>;
  teachers?: any[];
  onSaveTeacher?: (teacherData: any) => Promise<void>;
  onDeleteTeacher?: (teacherId: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  classes,
  students,
  accounts = [],
  currentUser,
  onSaveConfig,
  onSaveClass,
  onToggleClassVisibility,
  onDeleteClass,
  onAddStudent,
  onBatchAddStudents,
  onDeleteStudent,
  onOpenLogin,
  onSaveAccount,
  onDeleteAccount,
  onChangeAccountPassword,
  onManualSync,
  isSyncing = false,
  lastSyncTime = '',
  onExportData,
  onImportData,
  teachers = [],
  onSaveTeacher,
  onDeleteTeacher,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'classes' | 'students' | 'teachers' | 'accounts' | 'options' | 'system'>('system');
  const isSuperAdmin = currentUser?.role === 'superadmin';

  // Feedback notifications
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isSaveSuccessModalOpen, setIsSaveSuccessModalOpen] = useState(false);

  const showNotice = (type: 'success' | 'error', msg: string) => {
    setFeedbackNotice({ type, msg });
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !isSuperAdmin) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'class') {
        await onDeleteClass(deleteTarget.id);
        showNotice('success', `班级【${deleteTarget.name}】已彻底删除！`);
      } else if (deleteTarget.type === 'student') {
        await onDeleteStudent(deleteTarget.id);
        showNotice('success', `学员【${deleteTarget.name}】已移出名册！`);
      } else if (deleteTarget.type === 'account' && onDeleteAccount) {
        await onDeleteAccount(deleteTarget.username);
        showNotice('success', `账号【${deleteTarget.username}】已成功注销删除！`);
      } else if (deleteTarget.type === 'teacher' && onDeleteTeacher) {
        await onDeleteTeacher(deleteTarget.id);
        showNotice('success', `教师【${deleteTarget.name}】档案已彻底删除！`);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      showNotice('error', err.message || '删除操作失败');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Warning Banner for non-superadmins */}
      {!isSuperAdmin && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-amber-900 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs flex items-center gap-2 text-amber-950">
                <span>权限限制通知：当前为【普通管理账号】</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                  仅限签到管理
                </span>
              </div>
              <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                按照系统权限配置：<strong>除了总管理员之外，其他账号只有管理签到权限，没有添加/删除班级与学生的权限。</strong>
                如需新增班级、编辑班级与上课信息、批量录入学员或移出学员，请切换使用总管理员账号登录。
              </p>
            </div>
          </div>
          <button
            onClick={onOpenLogin}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>切换总管理员登录</span>
          </button>
        </div>
      )}

      {/* Floating Notice */}
      {feedbackNotice && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 shadow-sm animate-in fade-in duration-200 ${
          feedbackNotice.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {feedbackNotice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-medium">{feedbackNotice.msg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('system')}
          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'system'
              ? 'bg-amber-700 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-3.5 h-3.5 shrink-0" />
          <span>教会信息设置</span>
          {!isSuperAdmin && (
            <Lock className="w-3 h-3 text-amber-500 shrink-0" title="锁定只读" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('classes')}
          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'classes'
              ? 'bg-amber-700 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Church className="w-3.5 h-3.5 shrink-0" />
          <span>班级信息设置</span>
        </button>

        <button
          onClick={() => setActiveSubTab('teachers')}
          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'teachers'
              ? 'bg-amber-700 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
          <span>教师资料管理</span>
        </button>

        <button
          onClick={() => setActiveSubTab('students')}
          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'students'
              ? 'bg-amber-700 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>学生资料管理</span>
        </button>

        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'accounts'
              ? 'bg-amber-700 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>后台账号管理</span>
        </button>

        <button
          onClick={() => setActiveSubTab('options')}
          className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'options'
              ? 'bg-amber-700 text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span>其他功能设置</span>
        </button>
      </div>

      {/* Sub-Tab 1: Church Info */}
      {activeSubTab === 'system' && (
        <ChurchInfoTab
          config={config}
          isSuperAdmin={isSuperAdmin}
          onSaveConfig={onSaveConfig}
          onExportData={onExportData}
          onImportData={onImportData}
          showNotice={showNotice}
          setIsSaveSuccessModalOpen={setIsSaveSuccessModalOpen}
        />
      )}

      {/* Sub-Tab 2: Class Management */}
      {activeSubTab === 'classes' && (
        <ClassManagementTab
          classes={classes}
          students={students}
          teachers={teachers}
          isSuperAdmin={isSuperAdmin}
          onSaveClass={onSaveClass}
          onToggleClassVisibility={onToggleClassVisibility}
          onRequestDeleteClass={(cls, enrolledCount) => {
            setDeleteTarget({ type: 'class', id: cls.id, name: cls.name, enrolledCount });
          }}
          showNotice={showNotice}
          setIsSaveSuccessModalOpen={setIsSaveSuccessModalOpen}
        />
      )}

      {/* Sub-Tab 3: Teacher Management */}
      {activeSubTab === 'teachers' && (
        <TeacherManagementTab
          teachers={teachers}
          classes={classes}
          isSuperAdmin={isSuperAdmin}
          onSaveTeacher={onSaveTeacher}
          onRequestDeleteTeacher={(teacherId, teacherName) => {
            setDeleteTarget({ type: 'teacher', id: teacherId, name: teacherName });
          }}
          showNotice={showNotice}
          setIsSaveSuccessModalOpen={setIsSaveSuccessModalOpen}
        />
      )}

      {/* Sub-Tab 4: Student Management */}
      {activeSubTab === 'students' && (
        <StudentManagementTab
          students={students}
          classes={classes}
          isSuperAdmin={isSuperAdmin}
          onAddStudent={onAddStudent}
          onBatchAddStudents={onBatchAddStudents}
          onRequestDeleteStudent={(stu) => {
            setDeleteTarget({ type: 'student', id: stu.id, name: stu.name });
          }}
          showNotice={showNotice}
          setIsSaveSuccessModalOpen={setIsSaveSuccessModalOpen}
        />
      )}

      {/* Sub-Tab 5: Account Management */}
      {activeSubTab === 'accounts' && (
        <AccountManagementTab
          accounts={accounts}
          classes={classes}
          currentUser={currentUser}
          isSuperAdmin={isSuperAdmin}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime}
          onManualSync={onManualSync}
          onSaveAccount={onSaveAccount}
          onChangeAccountPassword={onChangeAccountPassword}
          onRequestDeleteAccount={(acc) => {
            setDeleteTarget({ type: 'account', id: acc.id, name: acc.displayName, username: acc.username });
          }}
          onOpenLogin={onOpenLogin}
          showNotice={showNotice}
          setIsSaveSuccessModalOpen={setIsSaveSuccessModalOpen}
        />
      )}

      {/* Sub-Tab 6: Rule Options */}
      {activeSubTab === 'options' && (
        <RuleOptionsTab
          config={config}
          isSuperAdmin={isSuperAdmin}
          onSaveConfig={onSaveConfig}
          showNotice={showNotice}
        />
      )}

      {/* Global In-App Deletion Confirm Modal */}
      <DeleteConfirmModal
        target={deleteTarget}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Global Save Success Feedback Modal */}
      <SaveSuccessModal
        isOpen={isSaveSuccessModalOpen}
        onClose={() => setIsSaveSuccessModalOpen(false)}
      />
    </div>
  );
};
