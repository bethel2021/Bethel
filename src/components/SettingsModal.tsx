import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Clock, 
  Sparkles, 
  Church, 
  BookOpen, 
  UserPlus, 
  Trash2, 
  Save, 
  RefreshCw, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Plus,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Sliders,
  Check,
  KeyRound,
  UserCheck,
  FileSpreadsheet,
  Calendar,
  Loader2,
  Lock,
  ShieldAlert,
  Eye,
  EyeOff,
  Download,
  Upload,
  Cloud,
  Server,
  Globe,
  Copy,
  FileText,
  ClipboardCheck
} from 'lucide-react';
import type { SystemConfig, Student, ClassGroup, AdminUser, AdminAccount } from '../types';
import { calculateAge, formatBirthDate, getDefaultBirthDateForAge } from '../utils/studentUtils';
import { exportLocalBackup } from '../utils/localStore';

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
  onResetData,
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
  const [activeSubTab, setActiveSubTab] = useState<'classes' | 'students' | 'teachers' | 'accounts' | 'options' | 'system'>('classes');
  
  const isSuperAdmin = currentUser?.role === 'superadmin';

  // Feedback notices
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showNotice = (type: 'success' | 'error', msg: string) => {
    setFeedbackNotice({ type, msg });
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // Class Editing Modal / State
  const [editingClass, setEditingClass] = useState<Partial<ClassGroup> | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [togglingClassId, setTogglingClassId] = useState<string | null>(null);

  // In-App Deletion Confirmation State (Replaces window.confirm to avoid iframe blocking)
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'class'; id: string; name: string; enrolledCount: number }
    | { type: 'student'; id: string; name: string }
    | { type: 'account'; id: string; name: string; username: string }
    | { type: 'teacher'; id: string; name: string }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Accounts Management Modal / State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountDisplayName, setAccountDisplayName] = useState('');
  const [accountRole, setAccountRole] = useState<'superadmin' | 'teacher' | 'fellowship_leader'>('teacher');
  const [accountAssignedClassId, setAccountAssignedClassId] = useState<string>('');
  const [accountPassword, setAccountPassword] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Password Reset Modal / State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetAccount, setPasswordTargetAccount] = useState<AdminAccount | null>(null);
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Vercel JSON Backup Copy & Paste Import State
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');
  const [isCopySuccess, setIsCopySuccess] = useState(false);

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
    if (!confirm('确定要通过粘贴的 JSON 文本恢复数据吗？此操作将合并更新当前所有班级名册与考勤，并同步至 Vercel 云端。')) {
      return;
    }
    try {
      if (onImportData) {
        await onImportData(pastedJsonText.trim());
        showNotice('success', '备份数据已成功解析，并更新至 Vercel 云端与本设备！');
        setPastedJsonText('');
        setIsPasteModalOpen(false);
      }
    } catch (err: any) {
      showNotice('error', err.message || 'JSON 备份文本格式解析失败，请检查数据完整性');
    }
  };

  // Student Filter & Batch Import State
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(classes[0]?.id || 'all');
  const [batchClassId, setBatchClassId] = useState<string>(classes[0]?.id || '');
  const [batchNamesText, setBatchNamesText] = useState<string>('');
  const [batchBirthDate, setBatchBirthDate] = useState<string>('2019-06-01');
  const [isBatchAdding, setIsBatchAdding] = useState<boolean>(false);

  // Single Student State
  const [singleName, setSingleName] = useState('');
  const [singleGender, setSingleGender] = useState<'boy' | 'girl'>('boy');
  const [singleBirthDate, setSingleBirthDate] = useState('2019-06-01');
  const [singleClassId, setSingleClassId] = useState(classes[0]?.id || '');
  const [singleParent, setSingleParent] = useState('');
  const [singlePhone, setSinglePhone] = useState('');
  const [isAddingSingle, setIsAddingSingle] = useState(false);

  // Teacher States & Helpers
  const [selectedTeacherClassFilter, setSelectedTeacherClassFilter] = useState<string>('all');
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [teacherGender, setTeacherGender] = useState<'boy' | 'girl'>('boy');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherWechat, setTeacherWechat] = useState('');
  const [teacherClassId, setTeacherClassId] = useState('');
  const [teacherRoleTitle, setTeacherRoleTitle] = useState('班主任');
  const [teacherJoinDate, setTeacherJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [teacherNotes, setTeacherNotes] = useState('');

  const normalizeRoleTitle = (rt?: string) => {
    if (!rt) return '班主任';
    if (rt === '主日学班主任') return '班主任';
    if (rt === '主日学同工') return '上课老师';
    if (rt === '助教老师' || rt === '助教' || rt === '辅助老师') return '辅助老师';
    if (rt === '主日学校长' || rt === '主日学讲员') return '班主任';
    return rt;
  };

  const handleEditTeacher = (t: any) => {
    setEditingTeacher(t);
    const cleanName = (t.name || '').replace(/\s*老师$/, '');
    setTeacherName(cleanName);
    const isSister = t.gender === 'girl' || ['春来', '上好', '雪成', '秋娟', '若雪', '东丽'].some(n => cleanName.includes(n));
    setTeacherGender(isSister ? 'girl' : (t.gender || 'boy'));
    setTeacherPhone(t.phone || '');
    setTeacherWechat(t.wechat || '');
    setTeacherClassId(t.classId || '');
    setTeacherRoleTitle(normalizeRoleTitle(t.roleTitle));
    setTeacherJoinDate(t.joinDate || new Date().toISOString().split('T')[0]);
    setTeacherNotes(t.notes || '');
  };

  const handleClearTeacherForm = () => {
    setEditingTeacher(null);
    setTeacherName('');
    setTeacherGender('boy');
    setTeacherPhone('');
    setTeacherWechat('');
    setTeacherClassId(classes[0]?.id || '');
    setTeacherRoleTitle('班主任');
    setTeacherJoinDate(new Date().toISOString().split('T')[0]);
    setTeacherNotes('');
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限不足：只有总管理员才能管理教师资料！');
      return;
    }
    const cleanedName = teacherName.trim().replace(/\s*老师$/, '');
    if (!cleanedName) {
      showNotice('error', '教师姓名不能为空！');
      return;
    }

    try {
      if (onSaveTeacher) {
        await onSaveTeacher({
          id: editingTeacher?.id,
          name: cleanedName,
          gender: teacherGender,
          phone: teacherPhone,
          wechat: teacherWechat,
          classId: teacherClassId,
          roleTitle: teacherRoleTitle,
          joinDate: teacherJoinDate,
          notes: teacherNotes
        });
        showNotice('success', editingTeacher ? '教师资料修改成功！' : '成功添加教师资料！');
        handleClearTeacherForm();
      }
    } catch (err: any) {
      showNotice('error', err.message || '保存教师资料失败');
    }
  };

  const handleDeleteTeacherClick = (id: string, name: string) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限不足：只有总管理员才能删除教师资料！');
      return;
    }
    setDeleteTarget({
      type: 'teacher',
      id,
      name
    });
  };

  // Student Editing Modal / State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentGender, setEditStudentGender] = useState<'boy' | 'girl'>('boy');
  const [editStudentBirthDate, setEditStudentBirthDate] = useState('2020-01-01');
  const [editStudentClassId, setEditStudentClassId] = useState('');
  const [editStudentMemberCode, setEditStudentMemberCode] = useState('');
  const [editStudentParentName, setEditStudentParentName] = useState('');
  const [editStudentParentPhone, setEditStudentParentPhone] = useState('');
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  // Default Options State (Syncs with config)
  const [optionsState, setOptionsState] = useState({
    testMode: config.testMode ?? false,
    enableMemoryVerseOption: config.enableMemoryVerseOption ?? true,
    defaultMemoryVerseChecked: config.defaultMemoryVerseChecked ?? true,
    enableOfferingOption: config.enableOfferingOption ?? true,
    defaultOfferingChecked: config.defaultOfferingChecked ?? true,
    enableLateRule: config.enableLateRule ?? true,
    lateThresholdTime: config.lateThresholdTime || '15:00',
    enableExcusedNote: config.enableExcusedNote ?? true,
  });

  // System & Church info state
  const [churchName, setChurchName] = useState(config.churchName);
  const [schoolTitle, setSchoolTitle] = useState(config.schoolTitle);
  const [startTime, setStartTime] = useState(config.checkinStartTime);
  const [endTime, setEndTime] = useState(config.checkinEndTime);
  const [memoryVerse, setMemoryVerse] = useState(config.weeklyMemoryVerse);
  const [verseRef, setVerseRef] = useState(config.memoryVerseReference);
  const [adminPassword, setAdminPassword] = useState(config.adminPassword || 'bethel2026');
  const [isSavingSystem, setIsSavingSystem] = useState(false);

  // Sync state whenever global config updates
  useEffect(() => {
    setOptionsState({
      testMode: config.testMode ?? false,
      enableMemoryVerseOption: config.enableMemoryVerseOption ?? true,
      defaultMemoryVerseChecked: config.defaultMemoryVerseChecked ?? true,
      enableOfferingOption: config.enableOfferingOption ?? true,
      defaultOfferingChecked: config.defaultOfferingChecked ?? true,
      enableLateRule: config.enableLateRule ?? true,
      lateThresholdTime: config.lateThresholdTime || '15:00',
      enableExcusedNote: config.enableExcusedNote ?? true,
    });
    setChurchName(config.churchName);
    setSchoolTitle(config.schoolTitle);
    setStartTime(config.checkinStartTime);
    setEndTime(config.checkinEndTime);
    setMemoryVerse(config.weeklyMemoryVerse);
    setVerseRef(config.memoryVerseReference);
    if (config.adminPassword) setAdminPassword(config.adminPassword);
  }, [config]);

  // Filter students for display
  const displayedStudents = selectedClassFilter === 'all'
    ? students
    : students.filter(s => s.classId === selectedClassFilter);

  // Class Edit Handlers
  const handleOpenNewClass = () => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号只有管理签到权限，没有添加班级的权限！');
      return;
    }
    setEditingClass({
      name: '',
      ageRange: '6-12岁',
      teacher: '',
      subjectTeacher: '',
      classroom: '伯特利副堂',
      color: 'bg-amber-500',
      groupType: 'sunday_school',
      description: '',
      isHiddenFromHome: false
    });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (cls: ClassGroup) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号只有管理签到权限，没有编辑班级的权限！');
      return;
    }
    setEditingClass({ ...cls, isHiddenFromHome: cls.isHiddenFromHome || false });
    setIsClassModalOpen(true);
  };

  // Quick toggle class visibility on home page
  const handleToggleClassHomeVisibility = async (cls: ClassGroup) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有修改班级首页展示状态的权限！');
      return;
    }
    if (togglingClassId) return;

    const targetStatus = !cls.isHiddenFromHome;
    setTogglingClassId(cls.id);
    try {
      if (onToggleClassVisibility) {
        await onToggleClassVisibility(cls.id, targetStatus);
      } else {
        await onSaveClass({ ...cls, isHiddenFromHome: targetStatus });
      }
      showNotice(
        'success',
        `班级【${cls.name}】已成功设置为：首页${targetStatus ? '隐藏' : '显示'}！`
      );
    } catch (err: any) {
      showNotice('error', err.message || '设置首页展示状态失败');
    } finally {
      setTogglingClassId(null);
    }
  };

  const handleSaveClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有添加或修改班级的权限！');
      return;
    }
    if (!editingClass?.name) return;
    try {
      await onSaveClass(editingClass);
      setIsClassModalOpen(false);
      setEditingClass(null);
      showNotice('success', '班级/团契信息已成功更新！');
    } catch (err: any) {
      showNotice('error', err.message || '操作失败');
    }
  };

  // Open in-app deletion confirm for Class
  const handleRequestDeleteClass = (cls: ClassGroup) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有删除班级的权限！');
      return;
    }
    const enrolled = students.filter(s => s.classId === cls.id).length;
    setDeleteTarget({
      type: 'class',
      id: cls.id,
      name: cls.name,
      enrolledCount: enrolled,
    });
  };

  // Open in-app deletion confirm for Student
  const handleRequestDeleteStudent = (stu: Student) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有删除学员的权限！');
      return;
    }
    setDeleteTarget({
      type: 'student',
      id: stu.id,
      name: stu.name,
    });
  };

  // Open in-app deletion confirm for Account
  const handleRequestDeleteAccount = (acc: AdminAccount) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员有权限删除账号！');
      return;
    }
    if (acc.username.toLowerCase() === 'admin') {
      showNotice('error', '系统安全限制：根总管理员账号（admin）受系统核心保护，禁止删除！');
      return;
    }
    setDeleteTarget({
      type: 'account',
      id: acc.id || acc.username,
      name: `${acc.displayName} (@${acc.username})`,
      username: acc.username,
    });
  };

  // Execute in-app confirmed deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有删除班级、学生与账号的权限！');
      return;
    }
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'class') {
        await onDeleteClass(deleteTarget.id);
        showNotice('success', `班级【${deleteTarget.name}】已成功删除！`);
      } else if (deleteTarget.type === 'student') {
        await onDeleteStudent(deleteTarget.id);
        showNotice('success', `学员【${deleteTarget.name}】已成功从名册中移除！`);
      } else if (deleteTarget.type === 'account') {
        if (onDeleteAccount) {
          await onDeleteAccount(deleteTarget.username);
          showNotice('success', `管理账号【${deleteTarget.name}】已成功删除！`);
        }
      } else if (deleteTarget.type === 'teacher') {
        if (onDeleteTeacher) {
          await onDeleteTeacher(deleteTarget.id);
          showNotice('success', `教师【${deleteTarget.name}】的档案已成功彻底删除！`);
        }
      }
      setDeleteTarget(null);
    } catch (err: any) {
      showNotice('error', err.message || '删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open create account modal
  const handleOpenNewAccount = () => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员可新建管理账号！');
      return;
    }
    setEditingAccount(null);
    setAccountUsername('');
    setAccountDisplayName('');
    setAccountRole('teacher');
    setAccountAssignedClassId(classes[0]?.id || '');
    setAccountPassword('');
    setShowPasswordText(false);
    setIsAccountModalOpen(true);
  };

  // Open edit account modal
  const handleOpenEditAccount = (acc: AdminAccount) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员可修改管理账号资料！');
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

  // Open change password modal
  const handleOpenChangePassword = (acc: AdminAccount) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员可重置账号密码！');
      return;
    }
    setPasswordTargetAccount(acc);
    setNewAccountPassword('');
    setIsPasswordModalOpen(true);
  };

  // Submit create or edit account
  const handleSaveAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员可操作账号！');
      return;
    }
    const cleanUsername = accountUsername.trim().toLowerCase();
    const cleanDisplayName = accountDisplayName.trim();
    if (!cleanUsername) {
      showNotice('error', '请输入登录用户名（仅限英文、数字或下划线）');
      return;
    }
    if (!cleanDisplayName) {
      showNotice('error', '请输入账号显示名称（例如：张老师、初中班主日学教师）');
      return;
    }
    if (!editingAccount && (!accountPassword || accountPassword.trim().length < 4)) {
      showNotice('error', '新建账号的初始密码不能少于4位字符');
      return;
    }

    setIsSavingAccount(true);
    try {
      if (onSaveAccount) {
        await onSaveAccount({
          username: cleanUsername,
          displayName: cleanDisplayName,
          role: accountRole,
          assignedClassId: accountRole === 'superadmin' ? undefined : (accountAssignedClassId || undefined),
          password: accountPassword.trim() || undefined,
        });
        showNotice('success', editingAccount ? `账号【${cleanDisplayName}】资料已成功更新！` : `新管理账号【${cleanDisplayName}】已成功创建！`);
        setIsAccountModalOpen(false);
        setEditingAccount(null);
      }
    } catch (err: any) {
      showNotice('error', err.message || '保存账号失败');
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Submit change password
  const handleSavePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetAccount) return;
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员可重置账号密码！');
      return;
    }
    const cleanPassword = newAccountPassword.trim();
    if (!cleanPassword || cleanPassword.length < 4) {
      showNotice('error', '新密码长度至少需要4位字符');
      return;
    }

    setIsSavingPassword(true);
    try {
      if (onChangeAccountPassword) {
        await onChangeAccountPassword(passwordTargetAccount.username, cleanPassword);
        showNotice('success', `账号【${passwordTargetAccount.displayName}】的登录密码已成功更新！`);
        setIsPasswordModalOpen(false);
        setPasswordTargetAccount(null);
      }
    } catch (err: any) {
      showNotice('error', err.message || '修改密码失败');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Open edit modal for Student
  const handleOpenEditStudent = (stu: Student) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号只有管理签到权限，没有编辑学员资料的权限！');
      return;
    }
    setEditingStudent(stu);
    setEditStudentName(stu.name);
    setEditStudentGender(stu.gender);
    setEditStudentBirthDate(stu.birthDate || '2020-01-01');
    setEditStudentClassId(stu.classId);
    setEditStudentMemberCode(stu.memberCode || '');
    setEditStudentParentName(stu.parentName || '');
    setEditStudentParentPhone(stu.parentPhone || '');
    setIsStudentModalOpen(true);
  };

  // Submit edited student
  const handleSaveStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有编辑学员资料的权限！');
      return;
    }
    if (!editStudentName.trim()) {
      showNotice('error', '请输入学员姓名');
      return;
    }
    if (!editStudentClassId) {
      showNotice('error', '请选择学员所属班级/团契');
      return;
    }
    setIsSavingStudent(true);
    try {
      const updatedData: Student = {
        ...editingStudent,
        name: editStudentName.trim(),
        gender: editStudentGender,
        birthDate: editStudentBirthDate,
        age: calculateAge(editStudentBirthDate),
        classId: editStudentClassId,
        memberCode: editStudentMemberCode.trim(),
        parentName: editStudentParentName.trim(),
        parentPhone: editStudentParentPhone.trim(),
      };
      await onAddStudent(updatedData);
      showNotice('success', `学员「${updatedData.name}」资料已成功更新！`);
      setIsStudentModalOpen(false);
      setEditingStudent(null);
    } catch (err: any) {
      showNotice('error', err.message || '更新学员资料失败');
    } finally {
      setIsSavingStudent(false);
    }
  };

  // Batch Add Students Handler
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有添加学生的权限！');
      return;
    }
    if (!batchNamesText.trim()) return;
    setIsBatchAdding(true);
    try {
      const computedAge = calculateAge(batchBirthDate, 7);
      await onBatchAddStudents(batchClassId || classes[0]?.id, batchNamesText, computedAge, batchBirthDate);
      setBatchNamesText('');
      showNotice('success', '批量录入学员成功，学生人数与自动推算年龄已更新！');
    } catch (err: any) {
      showNotice('error', err.message || '批量录入失败');
    } finally {
      setIsBatchAdding(false);
    }
  };

  // Single Add Student Handler
  const handleSingleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有添加学生的权限！');
      return;
    }
    if (!singleName.trim()) return;
    setIsAddingSingle(true);
    try {
      const computedAge = calculateAge(singleBirthDate, 7);
      await onAddStudent({
        name: singleName.trim(),
        gender: singleGender,
        birthDate: singleBirthDate,
        age: computedAge,
        classId: singleClassId || classes[0]?.id,
        parentName: singleParent.trim(),
        parentPhone: singlePhone.trim(),
      });
      setSingleName('');
      setSingleParent('');
      setSinglePhone('');
      showNotice('success', `新学员已成功加入班级名册（自动计算年龄：${computedAge}岁）！`);
    } catch (err: any) {
      showNotice('error', err.message || '录入失败');
    } finally {
      setIsAddingSingle(false);
    }
  };

  // Save Toggle Option
  const handleToggleOption = async (key: keyof typeof optionsState, val: any) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号只有管理签到权限，不能修改全局系统配置！');
      return;
    }
    const updated = { ...optionsState, [key]: val };
    setOptionsState(updated);
    try {
      await onSaveConfig({ [key]: val });
      if (key === 'testMode') {
        showNotice('success', val ? '已开启全天候测试模式！当前允许在任意时间进行打卡与点名测试。' : '已关闭测试模式！系统恢复为仅星期天指定时间段开放签到。');
      } else {
        showNotice('success', '默认选项与功能设置已即时更新生效！');
      }
    } catch (err: any) {
      showNotice('error', err.message || '更新失败');
    }
  };

  // Save Church & System
  const handleSaveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号不能修改教会信息与系统密码！');
      return;
    }
    setIsSavingSystem(true);
    try {
      await onSaveConfig({
        churchName,
        schoolTitle,
        checkinStartTime: startTime,
        checkinEndTime: endTime,
        weeklyMemoryVerse: memoryVerse,
        memoryVerseReference: verseRef,
        adminPassword,
      });
      showNotice('success', '教会基础信息与系统时段已保存！');
    } catch (err: any) {
      showNotice('error', err.message || '保存失败');
    } finally {
      setIsSavingSystem(false);
    }
  };

  // Reset demo data handler
  const handleResetDataClick = async () => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：只有总管理员有权重置示范数据！');
      return;
    }
    await onResetData();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Title */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 font-serif">
              伯特利教会 • 后台综合管理系统
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            班级信息设置、教师资料管理、学生资料管理、后台账号管理、教会信息设置与其他功能设置
          </p>
        </div>

        {/* Current Operator State */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                isSuperAdmin 
                  ? 'bg-amber-50 text-amber-900 border-amber-200' 
                  : 'bg-sky-50 text-sky-900 border-sky-200'
              }`}>
                {isSuperAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0" />
                )}
                <span className="font-semibold">{currentUser.displayName}</span>
                {!isSuperAdmin && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-sky-200/80 text-sky-950 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    <span>仅签到权限</span>
                  </span>
                )}
              </div>
              {!isSuperAdmin && (
                <button
                  onClick={onOpenLogin}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="切换为总管理员账号以获取班级/学生增删权限"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>切换为总管理员</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>登录管理员账号</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Permission Notification Banner for Non-Superadmins */}
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
                如需新增班级、编辑班级与上课老师信息、批量录入学员或移出学员，请切换使用总管理员账号登录。
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

      {/* ========================================================================= */}
      {/* SUB-TAB 0.5: TEACHER PROFILE MANAGEMENT (教师资料管理) */}
      {/* ========================================================================= */}
      {activeSubTab === 'teachers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Teacher List & Filter */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">筛选负责班级:</span>
                <select
                  value={selectedTeacherClassFilter}
                  onChange={e => setSelectedTeacherClassFilter(e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:bg-white cursor-pointer"
                >
                  <option value="all">全部班级 ({teachers.length}人)</option>
                  {classes.map(c => {
                    const count = teachers.filter(t => t.classId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>{c.name} ({count}人)</option>
                    );
                  })}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                当前筛选下：<span className="font-bold text-amber-900">
                  {selectedTeacherClassFilter === 'all' ? teachers.length : teachers.filter(t => t.classId === selectedTeacherClassFilter).length}
                </span> 位教师
              </div>
            </div>

            {/* Teachers Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-3.5 py-3">姓名</th>
                      <th className="px-3.5 py-3">性别</th>
                      <th className="px-3.5 py-3">角色</th>
                      <th className="px-3.5 py-3">负责班级</th>
                      <th className="px-3.5 py-3">联系电话</th>
                      <th className="px-3.5 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedTeacherClassFilter === 'all' 
                      ? teachers 
                      : teachers.filter(t => t.classId === selectedTeacherClassFilter)
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          暂无负责该班级的教师，请在右侧新增教师资料
                        </td>
                      </tr>
                    ) : (
                      (selectedTeacherClassFilter === 'all' 
                        ? teachers 
                        : teachers.filter(t => t.classId === selectedTeacherClassFilter)
                      ).map(t => {
                        const cls = classes.find(c => c.id === t.classId);
                        const cleanTeacherName = (t.name || '').replace(/\s*老师$/, '');
                        const isSister = t.gender === 'girl' || ['春来', '上好', '雪成', '秋娟', '若雪', '东丽'].some(n => cleanTeacherName.includes(n));
                        return (
                          <tr key={t.id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                <span className={`w-1.5 h-1.5 rounded-full ${isSister ? 'bg-pink-400' : 'bg-blue-400'}`} />
                                <span>{cleanTeacherName}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                isSister
                                  ? 'bg-pink-50 text-pink-700 border border-pink-200/80'
                                  : 'bg-sky-50 text-sky-700 border border-sky-200/80'
                              }`}>
                                {isSister ? '姊妹' : '弟兄'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 font-medium text-slate-600">
                              {normalizeRoleTitle(t.roleTitle)}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-medium">
                                {cls ? cls.name : '未关联'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-700 font-mono">
                              {t.phone || '无'}
                            </td>
                            <td className="px-3.5 py-2.5 text-right space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => handleEditTeacher({ ...t, name: cleanTeacherName })}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-900 font-bold transition-all shrink-0 cursor-pointer"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeleteTeacherClick(t.id, cleanTeacherName)}
                                className="px-2 py-1 text-[11px] rounded bg-red-50 text-red-700 hover:bg-red-100 font-bold transition-all shrink-0 cursor-pointer"
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: Add / Edit Teacher Form */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-amber-700" />
                  <span>{editingTeacher ? '编辑教师档案' : '录入新教师资料'}</span>
                </h4>
                {editingTeacher && (
                  <button
                    onClick={handleClearTeacherForm}
                    className="text-[10px] text-slate-500 hover:text-amber-800 font-bold cursor-pointer"
                  >
                    取消编辑
                  </button>
                )}
              </div>

              <form onSubmit={handleTeacherSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    教师姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={e => setTeacherName(e.target.value)}
                    placeholder="请输入姓名"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      角色
                    </label>
                    <select
                      value={teacherRoleTitle}
                      onChange={e => setTeacherRoleTitle(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="班主任">班主任</option>
                      <option value="上课老师">上课老师</option>
                      <option value="辅助老师">辅助老师</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      教师性别
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTeacherGender('boy')}
                        className={`text-xs py-2 rounded-xl border font-bold transition-all cursor-pointer ${
                          teacherGender === 'boy'
                            ? 'bg-blue-50 text-blue-800 border-blue-400 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        弟兄
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeacherGender('girl')}
                        className={`text-xs py-2 rounded-xl border font-bold transition-all cursor-pointer ${
                          teacherGender === 'girl'
                            ? 'bg-pink-50 text-pink-800 border-pink-400 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        姊妹
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    负责班级 / 团契
                  </label>
                  <select
                    value={teacherClassId}
                    onChange={e => setTeacherClassId(e.target.value)}
                    className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">请选择负责班级</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    联系电话
                  </label>
                  <input
                    type="text"
                    value={teacherPhone}
                    onChange={e => setTeacherPhone(e.target.value)}
                    placeholder="手机号"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    备注信息 (如任教特长)
                  </label>
                  <textarea
                    rows={2}
                    value={teacherNotes}
                    onChange={e => setTeacherNotes(e.target.value)}
                    placeholder="选填，如：擅长吉他、音乐赞美、少儿绘画"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isSuperAdmin}
                  className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingTeacher ? '更新档案' : '录入系统'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CLASSES MANAGEMENT (自定义班级名称与班级负责、上课老师) */}
      {/* ========================================================================= */}
      {activeSubTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              共配置 <span className="font-bold text-slate-900">{classes.length}</span> 个班级/团契。可随时查看班名、班级负责、上课老师与活动课室。
            </div>
            {isSuperAdmin ? (
              <button
                onClick={handleOpenNewClass}
                className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建班级 / 团契</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-medium">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>仅总管理员可新建班级</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => {
              const enrolledCount = students.filter(s => s.classId === cls.id).length;
              const isSundaySchool = cls.groupType !== 'fellowship';

              return (
                <div 
                  key={cls.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-2xs flex flex-col justify-between hover:border-amber-300 transition-all group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isSundaySchool 
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-purple-50 text-purple-900 border-purple-200'
                          }`}>
                            {isSundaySchool ? '主日学班级' : '团契契组'}
                          </span>
                          {cls.isHiddenFromHome ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                              <span>首页隐藏</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Eye className="w-2.5 h-2.5 text-emerald-600" />
                              <span>首页显示</span>
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 font-serif leading-tight">
                          {cls.name}
                        </h4>
                      </div>

                      {isSuperAdmin ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={togglingClassId === cls.id}
                            onClick={() => handleToggleClassHomeVisibility(cls)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              cls.isHiddenFromHome 
                                ? 'text-amber-800 bg-amber-50 hover:bg-amber-100' 
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            } ${togglingClassId === cls.id ? 'opacity-40 cursor-wait' : ''}`}
                            title={cls.isHiddenFromHome ? '该班级在首页已隐藏，点击设为显示' : '该班级在首页正常显示，点击设为隐藏'}
                          >
                            {cls.isHiddenFromHome ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleOpenEditClass(cls)}
                            className="p-1.5 text-slate-400 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="编辑班级名称与信息"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRequestDeleteClass(cls)}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="删除班级"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200" title="无修改/删除权限（仅总管理员可操作）">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>只读</span>
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1.5 text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">班级负责:</span>
                        <span className="font-semibold text-slate-800">{cls.teacher}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">上课老师:</span>
                        <span className="font-semibold text-slate-800">{cls.subjectTeacher || '未设定'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">活动课室:</span>
                        <span className="text-slate-800">{cls.classroom}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">适配年龄段:</span>
                        <span className="text-slate-800">{cls.ageRange}</span>
                      </div>
                    </div>

                    {/* Enrolled students */}
                    <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100/80 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">在册学生人数:</span>
                      <span className="font-bold text-amber-900 font-mono text-sm">
                        {enrolledCount} <span className="text-xs font-normal text-slate-500">人</span>
                      </span>
                    </div>

                    {/* Home Visibility Control Bar */}
                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 text-[11px]">首页展示:</span>
                        <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                          cls.isHiddenFromHome ? 'text-amber-800' : 'text-emerald-700'
                        }`}>
                          {cls.isHiddenFromHome ? (
                            <>
                              <EyeOff className="w-3 h-3 text-amber-700" />
                              <span>已在首页隐藏</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>在首页显示中</span>
                            </>
                          )}
                        </span>
                      </div>

                      {isSuperAdmin ? (
                        <button
                          type="button"
                          disabled={togglingClassId === cls.id}
                          onClick={() => handleToggleClassHomeVisibility(cls)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                            cls.isHiddenFromHome
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200'
                          } ${togglingClassId === cls.id ? 'opacity-40 cursor-wait' : ''}`}
                          title={cls.isHiddenFromHome ? '点击恢复在首页展示' : '点击在首页隐藏该班级'}
                        >
                          {cls.isHiddenFromHome ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-amber-800" />
                              <span>设为显示</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                              <span>设为隐藏</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>仅管理员可切换</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {cls.description && (
                    <div className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 truncate" title={cls.description}>
                      {cls.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: STUDENTS ROSTER & CAPACITY EXPANSION (学生人数与花名册) */}
      {/* ========================================================================= */}
      {activeSubTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Student List & Filter */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">筛选班级/团契:</span>
                <select
                  value={selectedClassFilter}
                  onChange={e => setSelectedClassFilter(e.target.value)}
                  className="text-sm px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:bg-white cursor-pointer"
                >
                  <option value="all" className="text-sm font-semibold">全部班级与团契 ({students.length}人)</option>
                  {classes.map(c => {
                    const count = students.filter(s => s.classId === c.id).length;
                    return (
                      <option key={c.id} value={c.id} className="text-sm">{c.name} ({count}人)</option>
                    );
                  })}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                当前筛选下：<span className="font-bold text-amber-900">{displayedStudents.length}</span> 位学员
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-3.5 py-3">学号代号</th>
                      <th className="px-3.5 py-3">学员姓名</th>
                      <th className="px-3.5 py-3">所属班级</th>
                      <th className="px-3.5 py-3">出生年月日</th>
                      <th className="px-3.5 py-3">年龄(自动计算)</th>
                      <th className="px-3.5 py-3">性别</th>
                      <th className="px-3.5 py-3">家长/联系电话</th>
                      <th className="px-3.5 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          暂无符合条件的学员，可通过右侧工具批量或单独录入
                        </td>
                      </tr>
                    ) : (
                      displayedStudents.map(stu => {
                        const cls = classes.find(c => c.id === stu.classId);
                        const computedAge = calculateAge(stu.birthDate, stu.age);
                        return (
                          <tr key={stu.id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="px-3.5 py-2.5 font-mono text-slate-400 text-[11px]">
                              {stu.memberCode || stu.id.slice(-6)}
                            </td>
                            <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                              {stu.name}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className="px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 text-[11px] font-medium">
                                {cls ? cls.name.split(' ')[0] : '未分班'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-700 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-amber-700" />
                                <span>{formatBirthDate(stu.birthDate)}</span>
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className="px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-950 font-bold text-[11px]">
                                {computedAge} 岁
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600">
                              {stu.gender === 'boy' ? '男' : '女'}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">
                              {stu.parentName ? `${stu.parentName} (${stu.parentPhone})` : stu.parentPhone || '—'}
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              {isSuperAdmin ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditStudent(stu)}
                                    className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-amber-200/80 shadow-2xs"
                                    title="编辑学员档案资料"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>编辑</span>
                                  </button>
                                  <button
                                    onClick={() => handleRequestDeleteStudent(stu)}
                                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                    title="移出名册"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 flex items-center justify-end gap-1 px-1 py-0.5" title="无修改权限（仅总管理员可操作）">
                                  <Lock className="w-3 h-3 text-slate-300" />
                                  <span>只读</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Col: Quick Batch Import & Single Add */}
          <div className="space-y-4">
            {isSuperAdmin ? (
              <>
                {/* Quick Batch Import Card */}
                <form onSubmit={handleBatchSubmit} className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                    <h4 className="text-xs font-bold text-slate-900">
                      一键批量录入 (快速扩充班级学生人数)
                    </h4>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      选择目标班级 / 团契 *
                    </label>
                    <select
                      value={batchClassId}
                      onChange={e => setBatchClassId(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      批量粘贴学员姓名 (以空格、逗号或换行分隔)
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={batchNamesText}
                      onChange={e => setBatchNamesText(e.target.value)}
                      placeholder="例如：王雅各 李马太 张保罗 刘约翰 陈以斯帖"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 font-sans"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      支持从Excel名单、家教会通知或文档中直接复制整串学员姓名快速导入。
                    </p>
                  </div>

                  <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" />
                        <span>预设出生年月日</span>
                      </label>
                      <span className="text-[11px] font-bold text-amber-900 bg-white border border-amber-200 px-2 py-0.5 rounded-md shadow-2xs">
                        推算年龄：{calculateAge(batchBirthDate, 7)} 岁
                      </span>
                    </div>
                    <input
                      type="date"
                      value={batchBirthDate}
                      onChange={e => setBatchBirthDate(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                    <p className="text-[10px] text-slate-500">
                      批量加入的学员统一预设此出生年月日，年龄由系统自动计算生成。
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isBatchAdding || !batchNamesText.trim()}
                    className="w-full py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isBatchAdding ? '批量录入中...' : '一键快速批量加入班级'}</span>
                  </button>
                </form>

                {/* Single Add Form */}
                <form onSubmit={handleSingleStudentSubmit} className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <UserCheck className="w-4 h-4 text-slate-700" />
                    <h4 className="text-xs font-bold text-slate-900">
                      单个详细录入新学员
                    </h4>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      学员姓名 *
                    </label>
                    <input
                      type="text"
                      required
                      value={singleName}
                      onChange={e => setSingleName(e.target.value)}
                      placeholder="姓名"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        分配班级
                      </label>
                      <select
                        value={singleClassId}
                        onChange={e => setSingleClassId(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name.split(' ')[0]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        性别
                      </label>
                      <select
                        value={singleGender}
                        onChange={e => setSingleGender(e.target.value as 'boy' | 'girl')}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                      >
                        <option value="boy">男</option>
                        <option value="girl">女</option>
                      </select>
                    </div>
                  </div>

                  {/* 出生年月日与系统自动计算年龄 */}
                  <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" />
                        <span>出生年月日 *</span>
                      </label>
                      <span className="text-[11px] font-bold text-amber-900 bg-white border border-amber-200 px-2 py-0.5 rounded-md shadow-2xs">
                        系统自动计算：{calculateAge(singleBirthDate, 7)} 岁
                      </span>
                    </div>
                    <input
                      type="date"
                      required
                      value={singleBirthDate}
                      onChange={e => setSingleBirthDate(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                    <p className="text-[10px] text-slate-500">
                      系统依据所选出生年月日即时推算精确周岁，无需手动计算。
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        家长姓名
                      </label>
                      <input
                        type="text"
                        value={singleParent}
                        onChange={e => setSingleParent(e.target.value)}
                        placeholder="家长姓名"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        联系电话
                      </label>
                      <input
                        type="text"
                        value={singlePhone}
                        onChange={e => setSinglePhone(e.target.value)}
                        placeholder="联系电话"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingSingle || !singleName.trim()}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>登记新学员档案</span>
                  </button>
                </form>
              </>
            ) : (
              /* Non-Superadmin Permission Lock Panel */
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-bold text-slate-900 font-serif">
                    学员添加与删除权限已锁定
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    除了<strong>总管理员（admin）</strong>之外，其他账号<strong>只有管理签到权限</strong>，没有添加/删除班级与学生的权限。
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>您当前账号可执行的操作：</span>
                  </div>
                  <ul className="text-[11px] text-slate-500 pl-5 space-y-1 list-disc leading-relaxed">
                    <li>在「今日主日签到」页面进行实时打卡与请假登记</li>
                    <li>随时查阅左侧学生资料登记与班级考勤情况</li>
                    <li>查阅月度全勤表与年度结业荣誉档案</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="w-full py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>使用总管理员账号登录以添加/删除学员</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: ACCOUNTS MANAGEMENT (管理员账号新建、修改、重置密码与删除) */}
      {/* ========================================================================= */}
      {activeSubTab === 'accounts' && (
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
                支持总管理员、主日学上课老师、团契负责人账号的新建、修改资料、重置密码与删除。修改即刻多端同步生效。
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
                  className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 transition-colors"
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
                <ShieldCheck className="w-3 h-3 text-amber-700" />
                <span>总管理员 (全部权限)</span>
              </div>
              <div className="text-xl font-bold text-amber-950 mt-1 font-serif">
                {accounts.filter(a => a.role === 'superadmin').length}
              </div>
            </div>

            <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-200/80 shadow-2xs">
              <div className="text-[11px] text-sky-900 font-medium flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-sky-700" />
                <span>主日学老师 (考勤权限)</span>
              </div>
              <div className="text-xl font-bold text-sky-950 mt-1 font-serif">
                {accounts.filter(a => a.role === 'teacher').length}
              </div>
            </div>

            <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs">
              <div className="text-[11px] text-emerald-900 font-medium flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-700" />
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
                  {accounts.map(acc => {
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
                              onClick={() => handleRequestDeleteAccount(acc)}
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
                  <span>📖 主日学上课老师 (teacher)</span>
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

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: DEFAULT OPTIONS TOGGLES (默认选项的开启或关闭) */}
      {/* ========================================================================= */}
      {activeSubTab === 'options' && (
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
            
            {/* 0. 全天候测试模式 (专供总管理员) */}
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
                    <strong>关闭测试模式：</strong>恢复正常模式，仅在<strong>星期天指定时段（{config.checkinStartTime || '11:00'} ~ {config.checkinEndTime || '16:00'}）</strong>开放签到。非主日时间段首页显示“请等待下一个主日”并拦截点名操作。
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
                    value={optionsState.lateThresholdTime}
                    onChange={e => {
                      const val = e.target.value;
                      handleToggleOption('lateThresholdTime', val);
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
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: CHURCH INFO SETTINGS (教会信息设置) */}
      {/* ========================================================================= */}
      {activeSubTab === 'system' && (
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>后台管理员登录密码</span>
                <span className="text-[10px] text-amber-800">{isSuperAdmin ? '可自定义修改' : '仅总管理员可见'}</span>
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={isSuperAdmin ? adminPassword : '•••••••• (已锁定保护)'}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="密码 (默认 bethel2026)"
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

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={onResetData}
                className="text-xs text-slate-500 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>恢复伯特利教会默认示范数据</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>示范数据重置仅总管理员可用</span>
              </span>
            )}

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

        {/* DATA BACKUP & RESTORE SECTION (Vercel Serverless & Multi-Device Sync Optimized) */}
        <div className="bg-white p-6 rounded-2xl border border-amber-200/80 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-serif font-bold text-sm">
                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </span>
                <span>数据完整备份与跨设备导入恢复 (JSON / Vercel 云端)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300/60">
                  Vercel 云端多端同步
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                针对 Vercel 无服务器 (Serverless) 部署环境、移动端（微信浏览器/手机）与桌面设备协同设计。支持 JSON 文件下载/上传，以及数据文本快捷复制与粘贴导入，导入后同步强推写回 Supabase PostgreSQL 官方云端数据库。
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
                  一键恢复全部资料。导入后将立即更新本设备名册并实时同步至 Vercel 后端接口与所有已登录终端。
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
                        if (!confirm(`确定要从备份文件【${file.name}】中恢复数据吗？此操作将合并覆盖当前名册与考勤，并上传至 Vercel 云端。`)) {
                          e.target.value = '';
                          return;
                        }
                        try {
                          if (onImportData) {
                            await onImportData(file);
                            showNotice('success', '备份数据已成功导入并强同步至 Vercel 云端！');
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

          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-500 leading-relaxed">
            💡 <strong>Vercel 云端部署与多端同步说明：</strong>本系统已全面接入 Supabase PostgreSQL 官方持久化数据库，完美兼容 Vercel 无服务器 (Serverless) 架构。执行数据导入恢复后，最新名册将即刻写入 Supabase PostgreSQL 并推送到云端服务，所有在线访问的手机端与电脑端均可秒级无缝同步。建议在进行大规模学员调整前先导出 JSON 备份。
          </div>
        </div>
      </div>
      )}

      {/* PASTE JSON IMPORT MODAL (Vercel 云端 JSON 文本快速恢复弹窗) */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-sky-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-linear-to-r from-sky-700 to-sky-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-200" />
                  <span>粘贴 JSON 备份文本恢复 (Vercel 云端)</span>
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

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                ⚠️ <strong>注意：</strong>解析成功后，系统将自动合并更新班级名册、考勤历史与系统设置，并推送强同步写回 Vercel 云端数据库。
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

      {/* ========================================================================= */}
      {/* EDIT / NEW CLASS MODAL (自定义班级名称、班级负责与上课老师弹窗) */}
      {/* ========================================================================= */}
      {isClassModalOpen && editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-linear-to-r from-amber-700 to-amber-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif">
                  {editingClass.id ? '编辑班级/团契信息' : '创建新班级 / 团契'}
                </h3>
                <p className="text-xs text-amber-200 mt-0.5">
                  自定义班级名称、班级性质、班级负责、上课老师与活动课室
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsClassModalOpen(false);
                  setEditingClass(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClassSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  班级 / 团契全称 *
                </label>
                <input
                  type="text"
                  required
                  value={editingClass.name || ''}
                  onChange={e => setEditingClass({ ...editingClass, name: e.target.value })}
                  placeholder="例如: 小小班、初中班、以斯拉团契"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    班级性质 *
                  </label>
                  <select
                    value={editingClass.groupType || 'sunday_school'}
                    onChange={e => setEditingClass({ ...editingClass, groupType: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="sunday_school">主日学班级 (儿童与青少)</option>
                    <option value="fellowship">教会团契 (青年/职场/长者)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    适配年龄段
                  </label>
                  <input
                    type="text"
                    value={editingClass.ageRange || ''}
                    onChange={e => setEditingClass({ ...editingClass, ageRange: e.target.value })}
                    placeholder="例如: 3-4岁、12-14岁"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    班级负责 *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingClass.teacher || ''}
                    onChange={e => setEditingClass({ ...editingClass, teacher: e.target.value })}
                    placeholder="例如: 李路得 老师"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    上课老师
                  </label>
                  <input
                    type="text"
                    value={editingClass.subjectTeacher || ''}
                    onChange={e => setEditingClass({ ...editingClass, subjectTeacher: e.target.value })}
                    placeholder="例如: 陈约瑟 老师"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  活动课室
                </label>
                <input
                  type="text"
                  value={editingClass.classroom || ''}
                  onChange={e => setEditingClass({ ...editingClass, classroom: e.target.value })}
                  placeholder="例如: 副堂101课室、宣教楼301室"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  班级简介或使命 (选填)
                </label>
                <input
                  type="text"
                  value={editingClass.description || ''}
                  onChange={e => setEditingClass({ ...editingClass, description: e.target.value })}
                  placeholder="一句话介绍班级特色与教学内容"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              {/* 首页展示状态设置 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  首页展示状态 *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingClass({ ...editingClass, isHiddenFromHome: false })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !editingClass.isHiddenFromHome
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>首页显示 (正常)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingClass({ ...editingClass, isHiddenFromHome: true })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editingClass.isHiddenFromHome
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                    <span>首页隐藏</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  设为“首页隐藏”后，该班级将不会出现在访客总览及首页签到快捷栏中。
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsClassModalOpen(false);
                    setEditingClass(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white cursor-pointer shadow-2xs"
                >
                  确认保存班级
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT STUDENT MODAL (编辑学员档案与资料) */}
      {/* ========================================================================= */}
      {isStudentModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-linear-to-r from-amber-700 to-amber-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-200" />
                  <span>编辑学员档案资料</span>
                </h3>
                <p className="text-xs text-amber-200 mt-0.5">
                  修改学员【{editingStudent.name}】的姓名、生日年龄、班级归属及家长联络信息
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStudentModalOpen(false);
                  setEditingStudent(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    学员姓名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={editStudentName}
                    onChange={e => setEditStudentName(e.target.value)}
                    placeholder="例如: 张以诺 (Samuel)"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    性别 *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditStudentGender('boy')}
                      className={`py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer text-center ${
                        editStudentGender === 'boy'
                          ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      男 (弟兄)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStudentGender('girl')}
                      className={`py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer text-center ${
                        editStudentGender === 'girl'
                          ? 'bg-rose-50 border-rose-400 text-rose-800 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      女 (姊妹)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    出生年月日 *
                  </label>
                  <input
                    type="date"
                    required
                    value={editStudentBirthDate}
                    onChange={e => setEditStudentBirthDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                  <span className="text-[10px] text-amber-800 font-medium mt-1 block">
                    系统自动换算：{calculateAge(editStudentBirthDate)} 周岁
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    所属班级 / 团契 *
                  </label>
                  <select
                    value={editStudentClassId}
                    onChange={e => setEditStudentClassId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.ageRange})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    学号 / 会友编号
                  </label>
                  <input
                    type="text"
                    value={editStudentMemberCode}
                    onChange={e => setEditStudentMemberCode(e.target.value)}
                    placeholder="例如: BTL-08"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    家长 / 监护人姓名
                  </label>
                  <input
                    type="text"
                    value={editStudentParentName}
                    onChange={e => setEditStudentParentName(e.target.value)}
                    placeholder="例如: 张建军 / 本人"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  家长紧急联络电话
                </label>
                <input
                  type="text"
                  value={editStudentParentPhone}
                  onChange={e => setEditStudentParentPhone(e.target.value)}
                  placeholder="例如: 13800559922"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsStudentModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudent}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  {isSavingStudent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSavingStudent ? '正在保存...' : '保存学员资料'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* In-App Deletion Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  {deleteTarget.type === 'class' 
                    ? '确认删除班级/团契？' 
                    : deleteTarget.type === 'student' 
                    ? '确认移除在册学员？'
                    : deleteTarget.type === 'account'
                    ? '确认删除管理员账号？'
                    : '确认删除教师档案？'}
                </h3>
                <div className="text-xs text-slate-600 mt-1.5 space-y-2 leading-relaxed">
                  {deleteTarget.type === 'class' ? (
                    <>
                      <p>
                        您即将删除班级 <strong className="text-slate-900 font-bold">【{deleteTarget.name}】</strong>。
                      </p>
                      {deleteTarget.enrolledCount > 0 ? (
                        <div className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 text-xs leading-relaxed">
                          ⚠️ <strong>注意：</strong>该班级目前共有 <strong>{deleteTarget.enrolledCount}</strong> 名在册学员。
                          确认删除后，该班级及其学员档案与出勤记录将一并清除。
                        </div>
                      ) : (
                        <p className="text-slate-400">该班级目前无在册学员，删除后不可撤销。</p>
                      )}
                    </>
                  ) : deleteTarget.type === 'student' ? (
                    <p>
                      您确定要将学员 <strong className="text-slate-900 font-bold">【{deleteTarget.name}】</strong> 从主日学名册中彻底移除吗？此操作将一并清除该学员的历史考勤记录。
                    </p>
                  ) : deleteTarget.type === 'account' ? (
                    <>
                      <p>
                        您确定要永久注销并删除管理账号 <strong className="text-slate-900 font-bold">【{deleteTarget.name}】</strong> 吗？
                      </p>
                      <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200/80 text-xs leading-relaxed">
                        ⚠️ <strong>安全提示：</strong>账号删除后，该同工将无法再登录系统进行签到或管理。如仅需暂停使用，可修改其密码。
                      </div>
                    </>
                  ) : (
                    <p>
                      您确定要将教师 <strong className="text-slate-900 font-bold">【{deleteTarget.name}】</strong> 的档案从系统彻底删除吗？此操作不可恢复。
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>正在删除...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>确认删除</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT ACCOUNT MODAL (新建/编辑管理员与教师同工账号弹窗) */}
      {/* ========================================================================= */}
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
                  placeholder="例如: 李老师 (高小班上课) 或 王执事"
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
                  <option value="teacher">主日学上课老师 (仅限日常签到点名，无增删班级/学员权限)</option>
                  <option value="fellowship_leader">团契负责人/同工 (仅限日常团契点名，无增删班级/学员权限)</option>
                  <option value="superadmin">总管理员 (拥有最高权限：增删班级、增删学员、管理所有账号)</option>
                </select>
                <p className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg mt-1.5 border border-amber-200/60 leading-relaxed">
                  💡 <strong>安全设计：</strong>除总管理员外，其他账号仅具备签到权限，无法删除班级或移除在册学生档案，防止多端误触丢失资料。
                </p>
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
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                    📌 绑定特定班级后，该账号登录系统时<strong>只能看到并管理所绑定的班级与该班学生</strong>，其他班级数据自动隔离隐藏。
                  </p>
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

      {/* ========================================================================= */}
      {/* PASSWORD RESET MODAL (重置账号登录密码弹窗) */}
      {/* ========================================================================= */}
      {isPasswordModalOpen && passwordTargetAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-linear-to-r from-amber-700 to-amber-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-200" />
                  <span>重置登录密码</span>
                </h3>
                <p className="text-xs text-amber-200 mt-0.5">
                  正在为【{passwordTargetAccount.displayName}】设置新密码
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
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                <div className="text-slate-500">目标管理账号:</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {passwordTargetAccount.displayName} <span className="text-amber-800 font-mono">(@{passwordTargetAccount.username})</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>新登录密码 * (不少于4位字符)</span>
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
                  required
                  autoFocus
                  value={newAccountPassword}
                  onChange={e => setNewAccountPassword(e.target.value)}
                  placeholder="请输入该账号的新登录密码"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                  {isSavingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  <span>{isSavingPassword ? '正在重置...' : '确认修改密码'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
