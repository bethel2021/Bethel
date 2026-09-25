import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Edit2, 
  Trash2, 
  Lock, 
  FileSpreadsheet, 
  UserPlus, 
  UserCheck, 
  Check 
} from 'lucide-react';
import type { Student, ClassGroup } from '../../types';
import { calculateAge, formatBirthDate, getDefaultBirthDateForAge } from '../../utils/studentUtils';

interface StudentManagementTabProps {
  students: Student[];
  classes: ClassGroup[];
  isSuperAdmin: boolean;
  onAddStudent: (studentData: any) => Promise<void>;
  onBatchAddStudents: (classId: string, namesText: string, defaultAge?: number, defaultBirthDate?: string) => Promise<void>;
  onRequestDeleteStudent: (student: Student) => void;
  showNotice: (type: 'success' | 'error', msg: string) => void;
  setIsSaveSuccessModalOpen: (open: boolean) => void;
}

export const StudentManagementTab: React.FC<StudentManagementTabProps> = ({
  students,
  classes,
  isSuperAdmin,
  onAddStudent,
  onBatchAddStudents,
  onRequestDeleteStudent,
  showNotice,
  setIsSaveSuccessModalOpen,
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);

  // Batch add form state
  const [batchClassId, setBatchClassId] = useState<string>(classes[0]?.id || 'class-1');
  const [batchNamesText, setBatchNamesText] = useState('');
  const [batchBirthDate, setBatchBirthDate] = useState(getDefaultBirthDateForAge(7));
  const [isBatchAdding, setIsBatchAdding] = useState(false);

  // Single add form state
  const [singleName, setSingleName] = useState('');
  const [singleClassId, setSingleClassId] = useState<string>(classes[0]?.id || 'class-1');
  const [singleGender, setSingleGender] = useState<'boy' | 'girl'>('boy');
  const [singleBirthDate, setSingleBirthDate] = useState(getDefaultBirthDateForAge(7));
  const [singleParent, setSingleParent] = useState('');
  const [singlePhone, setSinglePhone] = useState('');

  const displayedStudents = selectedClassFilter === 'all'
    ? students
    : students.filter(s => s.classId === selectedClassFilter);

  const handleOpenEditStudent = (stu: Student) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有修改学员档案的权限！');
      return;
    }
    setEditingStudent({ ...stu });
    setIsEditStudentModalOpen(true);
  };

  const handleSaveEditedStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有修改学员档案的权限！');
      return;
    }
    if (!editingStudent) return;
    try {
      await onAddStudent(editingStudent);
      setIsEditStudentModalOpen(false);
      setEditingStudent(null);
      showNotice('success', `学员【${editingStudent.name}】档案已成功更新！`);
      setIsSaveSuccessModalOpen(true);
    } catch (err: any) {
      showNotice('error', err.message || '更新学员档案失败');
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有录入学人员的权限！');
      return;
    }
    if (!batchNamesText.trim()) return;
    setIsBatchAdding(true);
    try {
      const computedBatchAge = calculateAge(batchBirthDate, 7);
      await onBatchAddStudents(batchClassId, batchNamesText, computedBatchAge, batchBirthDate);
      setBatchNamesText('');
      showNotice('success', '批量录入学员成功！');
      setIsSaveSuccessModalOpen(true);
    } catch (err: any) {
      showNotice('error', err.message || '批量录入失败');
    } finally {
      setIsBatchAdding(false);
    }
  };

  const handleSingleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有录入学人员的权限！');
      return;
    }
    if (!singleName.trim()) return;
    try {
      const computedAge = calculateAge(singleBirthDate, 7);
      await onAddStudent({
        name: singleName.trim(),
        classId: singleClassId,
        gender: singleGender,
        birthDate: singleBirthDate,
        age: computedAge,
        parentName: singleParent.trim(),
        parentPhone: singlePhone.trim(),
        joinDate: new Date().toISOString().split('T')[0]
      });
      setSingleName('');
      setSingleParent('');
      setSinglePhone('');
      showNotice('success', `学员【${singleName}】录入成功！`);
      setIsSaveSuccessModalOpen(true);
    } catch (err: any) {
      showNotice('error', err.message || '录入失败');
    }
  };

  return (
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
                                onClick={() => onRequestDeleteStudent(stu)}
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
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
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
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <option value="boy">男</option>
                    <option value="girl">女</option>
                  </select>
                </div>
              </div>

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
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>录入新学员档案</span>
              </button>
            </form>
          </>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Lock className="w-4 h-4 text-amber-700" />
              <span>录入功能已锁定</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              您当前登录的是主日学同工/教师账号，仅有权查阅名册与执行打卡签到。添加新学员档案与批量录入功能仅总管理员可用。
            </p>
          </div>
        )}
      </div>

      {/* EDIT STUDENT MODAL */}
      {isEditStudentModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-linear-to-r from-amber-700 to-amber-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif">编辑学员档案资料</h3>
                <p className="text-xs text-amber-200 mt-0.5">
                  修改学员姓名、所属班级、性别与家长联系方式
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditStudentModalOpen(false);
                  setEditingStudent(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  学员姓名 *
                </label>
                <input
                  type="text"
                  required
                  value={editingStudent.name || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    所属班级 / 团契 *
                  </label>
                  <select
                    value={editingStudent.classId}
                    onChange={e => setEditingStudent({ ...editingStudent, classId: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    性别 *
                  </label>
                  <select
                    value={editingStudent.gender || 'boy'}
                    onChange={e => setEditingStudent({ ...editingStudent, gender: e.target.value as 'boy' | 'girl' })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="boy">男生</option>
                    <option value="girl">女生</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>出生年月日 *</span>
                  </label>
                  <span className="text-xs font-bold text-amber-900 bg-white border border-amber-200 px-2 py-0.5 rounded-md shadow-2xs">
                    系统推算：{calculateAge(editingStudent.birthDate, editingStudent.age || 7)} 岁
                  </span>
                </div>
                <input
                  type="date"
                  required
                  value={editingStudent.birthDate || '2019-01-01'}
                  onChange={e => {
                    const newBirthDate = e.target.value;
                    const calculatedAge = calculateAge(newBirthDate, 7);
                    setEditingStudent({ 
                      ...editingStudent, 
                      birthDate: newBirthDate,
                      age: calculatedAge
                    });
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    家长姓名
                  </label>
                  <input
                    type="text"
                    value={editingStudent.parentName || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    家长联系电话
                  </label>
                  <input
                    type="text"
                    value={editingStudent.parentPhone || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditStudentModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存学员档案</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
