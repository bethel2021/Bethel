import React from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';

export type DeleteTarget =
  | { type: 'class'; id: string; name: string; enrolledCount: number }
  | { type: 'student'; id: string; name: string }
  | { type: 'account'; id: string; name: string; username: string }
  | { type: 'teacher'; id: string; name: string }
  | null;

interface DeleteConfirmModalProps {
  target: DeleteTarget;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  target,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-red-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 text-red-600">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              {target.type === 'class' && '确认删除该班级 / 团契？'}
              {target.type === 'student' && '确认将该学员移出名册？'}
              {target.type === 'account' && '确认删除此同工管理账号？'}
              {target.type === 'teacher' && '确认删除此教师档案？'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              此操作将直接从主日学系统中永久清除该数据
            </p>
          </div>
        </div>

        <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 text-xs text-red-950 space-y-2">
          {target.type === 'class' && (
            <>
              <p className="font-semibold text-red-800">
                您即将删除班级：【{target.name}】
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                该班级当前在册学员 <strong className="text-red-600 font-bold">{target.enrolledCount}</strong> 人。删除班级将一并清理归属该班级的学员考勤记录，请谨慎操作！
              </p>
            </>
          )}

          {target.type === 'student' && (
            <>
              <p className="font-semibold text-red-800">
                您即将删除学员：【{target.name}】
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                删除后，该学员的所有历史签到与主日点名记录将被一并移除。
              </p>
            </>
          )}

          {target.type === 'account' && (
            <>
              <p className="font-semibold text-red-800">
                您即将删除账号：【{target.name}】(@{target.username})
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                删除后，该同工将无法再登录系统管理点名与班级。
              </p>
            </>
          )}

          {target.type === 'teacher' && (
            <>
              <p className="font-semibold text-red-800">
                您即将删除教师：【{target.name}】
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                删除后，教师库将不再包含该教师信息，班级任教排班中的同名老师将解除关联。
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? '正在删除...' : '确定彻底删除'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
