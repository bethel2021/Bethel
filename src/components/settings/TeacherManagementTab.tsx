import React, { useState, useMemo } from 'react';
import { UserCheck, UserPlus, Save, Lock } from 'lucide-react';
import type { ClassGroup } from '../../types';

interface TeacherManagementTabProps {
  teachers: any[];
  classes: ClassGroup[];
  isSuperAdmin: boolean;
  onSaveTeacher?: (teacherData: any) => Promise<void>;
  onRequestDeleteTeacher: (teacherId: string, teacherName: string) => void;
  showNotice: (type: 'success' | 'error', msg: string) => void;
  setIsSaveSuccessModalOpen: (open: boolean) => void;
}

export const TeacherManagementTab: React.FC<TeacherManagementTabProps> = ({
  teachers,
  classes,
  isSuperAdmin,
  onSaveTeacher,
  onRequestDeleteTeacher,
  showNotice,
  setIsSaveSuccessModalOpen,
}) => {
  const [selectedTeacherClassFilter, setSelectedTeacherClassFilter] = useState<string>('all');
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [teacherRoleTitle, setTeacherRoleTitle] = useState('班级负责');
  const [teacherGender, setTeacherGender] = useState<'boy' | 'girl'>('girl');
  const [teacherClassId, setTeacherClassId] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');

  const normalizeRoleTitle = (role?: string) => {
    if (!role) return '班级负责';
    const r = role.trim();
    if (['班级负责', '班主任', '主日学老师', '团契带领人', '负责老师'].includes(r)) return '班级负责';
    if (['上课老师', '副班主任', '授课教师', '上课'].includes(r)) return '上课';
    if (['辅助老师', '助教', '辅助同工', '辅助'].includes(r)) return '辅助';
    return r;
  };

  const sortedTeachers = useMemo(() => {
    const list = selectedTeacherClassFilter === 'all'
      ? [...teachers]
      : teachers.filter(t => t.classId === selectedTeacherClassFilter);

    const classOrderMap = new Map<string, number>();
    classes.forEach((c, idx) => classOrderMap.set(c.id, idx));

    const roleOrder = (role: string) => {
      const norm = normalizeRoleTitle(role);
      if (norm === '班级负责') return 1;
      if (norm === '上课') return 2;
      if (norm === '辅助') return 3;
      return 4;
    };

    return list.sort((a, b) => {
      const classA = classOrderMap.get(a.classId || '') ?? 999;
      const classB = classOrderMap.get(b.classId || '') ?? 999;
      if (classA !== classB) return classA - classB;

      const roleA = roleOrder(a.roleTitle || '');
      const roleB = roleOrder(b.roleTitle || '');
      if (roleA !== roleB) return roleA - roleB;

      return (a.name || '').localeCompare(b.name || '', 'zh-CN');
    });
  }, [teachers, selectedTeacherClassFilter, classes]);

  const handleEditTeacher = (t: any) => {
    setEditingTeacher(t);
    setTeacherName(t.name || '');
    setTeacherRoleTitle(normalizeRoleTitle(t.roleTitle));
    setTeacherGender(t.gender || 'girl');
    setTeacherClassId(t.classId || '');
    setTeacherPhone(t.phone || '');
    setTeacherNotes(t.notes || '');
  };

  const handleClearTeacherForm = () => {
    setEditingTeacher(null);
    setTeacherName('');
    setTeacherRoleTitle('班级负责');
    setTeacherGender('girl');
    setTeacherClassId('');
    setTeacherPhone('');
    setTeacherNotes('');
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：仅总管理员可添加或修改教师资料！');
      return;
    }
    if (!teacherName.trim()) return;

    try {
      if (onSaveTeacher) {
        await onSaveTeacher({
          id: editingTeacher?.id,
          name: teacherName.trim(),
          gender: teacherGender,
          roleTitle: teacherRoleTitle,
          classId: teacherClassId,
          phone: teacherPhone.trim(),
          notes: teacherNotes.trim(),
          joinDate: editingTeacher?.joinDate || new Date().toISOString().split('T')[0]
        });
        showNotice('success', `教师【${teacherName.trim()}】档案已成功${editingTeacher ? '更新' : '录入'}！`);
        setIsSaveSuccessModalOpen(true);
        handleClearTeacherForm();
      }
    } catch (err: any) {
      showNotice('error', err.message || '保存教师档案失败');
    }
  };

  return (
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
            当前排序：按班级 (从小小班到团契) 及角色 | 共 <span className="font-bold text-amber-900">{sortedTeachers.length}</span> 位教师
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
                  <th className="px-3.5 py-3">角色分工</th>
                  <th className="px-3.5 py-3">负责班级</th>
                  <th className="px-3.5 py-3">联系电话</th>
                  <th className="px-3.5 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      暂无负责该班级的教师，请在右侧新增教师资料
                    </td>
                  </tr>
                ) : (
                  sortedTeachers.map(t => {
                    const cls = classes.find(c => c.id === t.classId);
                    const cleanTeacherName = (t.name || '').replace(/\s*$/, '');
                    const isSister = t.gender === 'girl';
                    const normalizedRole = normalizeRoleTitle(t.roleTitle);
                    let roleBadgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (normalizedRole === '班级负责') {
                      roleBadgeStyle = 'bg-amber-700 text-white border-amber-800 font-bold shadow-xs';
                    } else if (normalizedRole === '上课') {
                      roleBadgeStyle = 'bg-sky-50 text-sky-800 border-sky-200/90 font-bold';
                    } else if (normalizedRole === '辅助') {
                      roleBadgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200/90 font-medium';
                    }

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
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] border shadow-2xs ${roleBadgeStyle}`}>
                            {normalizedRole}
                          </span>
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
                          {isSuperAdmin ? (
                            <>
                              <button
                                onClick={() => handleEditTeacher({ ...t, name: cleanTeacherName })}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-900 font-bold transition-all shrink-0 cursor-pointer"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => onRequestDeleteTeacher(t.id, cleanTeacherName)}
                                className="px-2 py-1 text-[11px] rounded bg-red-50 text-red-700 hover:bg-red-100 font-bold transition-all shrink-0 cursor-pointer"
                              >
                                删除
                              </button>
                            </>
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
                  <option value="班级负责">班级负责</option>
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
  );
};
