import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Lock, 
  Eye, 
  EyeOff, 
  Church, 
  Check, 
  Users 
} from 'lucide-react';
import type { ClassGroup, Student } from '../../types';

interface ClassManagementTabProps {
  classes: ClassGroup[];
  students: Student[];
  teachers: any[];
  isSuperAdmin: boolean;
  onSaveClass: (classData: Partial<ClassGroup>) => Promise<void>;
  onToggleClassVisibility?: (classId: string, isHiddenFromHome: boolean) => Promise<void>;
  onRequestDeleteClass: (cls: ClassGroup, enrolledCount: number) => void;
  showNotice: (type: 'success' | 'error', msg: string) => void;
  setIsSaveSuccessModalOpen: (open: boolean) => void;
}

export const ClassManagementTab: React.FC<ClassManagementTabProps> = ({
  classes,
  students,
  teachers,
  isSuperAdmin,
  onSaveClass,
  onToggleClassVisibility,
  onRequestDeleteClass,
  showNotice,
  setIsSaveSuccessModalOpen,
}) => {
  const [editingClass, setEditingClass] = useState<Partial<ClassGroup> | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [showCustomTeacherInput, setShowCustomTeacherInput] = useState(false);
  const [showCustomSubjectTeacherInput, setShowCustomSubjectTeacherInput] = useState(false);
  const [togglingClassId, setTogglingClassId] = useState<string | null>(null);

  const dbTeacherNames = Array.from(
    new Set(teachers.map(t => (t.name || '').trim()).filter(Boolean))
  );

  const normalizeRoleTitle = (role?: string) => {
    if (!role) return '班级负责';
    const r = role.trim();
    if (['班级负责', '班主任', '主日学老师', '团契带领人', '负责老师'].includes(r)) return '班级负责';
    if (['上课老师', '副班主任', '授课教师'].includes(r)) return '上课老师';
    if (['辅助老师', '助教', '辅助同工'].includes(r)) return '辅助老师';
    return r;
  };

  const handleOpenNewClass = () => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有添加新班级的权限！');
      return;
    }
    setEditingClass({
      name: '',
      ageRange: '3-6岁',
      teacher: '',
      subjectTeacher: '',
      classroom: '',
      color: 'bg-amber-500',
      groupType: 'sunday_school',
      description: '',
      isHiddenFromHome: false
    });
    setShowCustomTeacherInput(false);
    setShowCustomSubjectTeacherInput(false);
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (cls: ClassGroup) => {
    if (!isSuperAdmin) {
      showNotice('error', '权限受限：除了总管理员之外，其他账号没有修改班级信息的权限！');
      return;
    }
    const hasCustomTeacher = !!cls.teacher && !dbTeacherNames.includes(cls.teacher);
    setEditingClass({ ...cls, isHiddenFromHome: cls.isHiddenFromHome || false });
    setShowCustomTeacherInput(hasCustomTeacher);
    setShowCustomSubjectTeacherInput(false);
    setIsClassModalOpen(true);
  };

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
      setIsSaveSuccessModalOpen(true);
    } catch (err: any) {
      showNotice('error', err.message || '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Fast Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          共配置 <span className="font-bold text-slate-900">{classes.length}</span> 个班级/团契。可随时查看班名、班级负责、上课与活动课室。
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

      {/* Grid of Class Cards */}
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
                        {isSundaySchool ? '主日学班级' : '青年团契'}
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
                        onClick={() => onRequestDeleteClass(cls, enrolledCount)}
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

      {/* EDIT / NEW CLASS MODAL */}
      {isClassModalOpen && editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-linear-to-r from-amber-700 to-amber-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-serif">
                  {editingClass.id ? '编辑班级/团契信息' : '创建新班级 / 团契'}
                </h3>
                <p className="text-xs text-amber-200 mt-0.5">
                  自定义班级名称、班级性质、班级负责、上课与活动课室
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>班级负责 *</span>
                    <button type="button" onClick={() => setEditingClass({ ...editingClass, teacher: '' })} className="text-[10px] text-red-500 hover:text-red-700 underline">清除</button>
                  </label>
                  <select
                    value={editingClass.teacher || ''}
                    onChange={e => setEditingClass({ ...editingClass, teacher: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">— 选择核心负责 —</option>
                    {teachers
                      .filter(t => normalizeRoleTitle(t.roleTitle) === '班级负责')
                      .map(t => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>上课老师 (可多选)</span>
                    <button type="button" onClick={() => setEditingClass({ ...editingClass, subjectTeacher: '' })} className="text-[10px] text-red-500 hover:text-red-700 underline">全部清除</button>
                  </label>
                  
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-150 bg-slate-50 mb-2 min-h-[38px] items-center">
                    {(() => {
                      const selectedSubjectTeachers = editingClass.subjectTeacher
                        ? editingClass.subjectTeacher.split(/[,\s，、]+/).map(s => s.trim()).filter(Boolean)
                        : [];
                      
                      if (selectedSubjectTeachers.length === 0) {
                        return <span className="text-[11px] text-slate-400 italic px-1">暂无设定上课 (点击下方添加)</span>;
                      }

                      return selectedSubjectTeachers.map((name, idx) => (
                        <span 
                          key={idx} 
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-800 text-[11px] font-medium"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = selectedSubjectTeachers.filter((_, i) => i !== idx);
                              setEditingClass({ ...editingClass, subjectTeacher: updated.join('、') });
                            }}
                            className="text-amber-500 hover:text-amber-700 font-bold ml-1 text-xs cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ));
                    })()}
                  </div>

                  <select
                    value=""
                    onChange={e => {
                      const val = e.target.value;
                      const currentTeachers = editingClass.subjectTeacher
                        ? editingClass.subjectTeacher.split(/[,\s，、]+/).map(s => s.trim()).filter(Boolean)
                        : [];
                      
                      if (val && !currentTeachers.includes(val)) {
                        const updated = [...currentTeachers, val];
                        setEditingClass({ ...editingClass, subjectTeacher: updated.join('、') });
                      }
                    }}
                    className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">— 从教师库下拉选取添加 —</option>
                    {teachers
                      .filter(t => ['上课老师', '辅助老师'].includes(normalizeRoleTitle(t.roleTitle)))
                      .filter(t => !(editingClass.subjectTeacher || '').split(/[,\s，、]+/).map(s => s.trim()).filter(Boolean).includes(t.name))
                      .map(t => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                  </select>
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
                    <span>在首页显示 (正常签到)</span>
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
                    <span>不在首页展示 (已隐藏)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsClassModalOpen(false);
                    setEditingClass(null);
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
                  <span>保存班级配置</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
