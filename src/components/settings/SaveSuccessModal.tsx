import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({
  isOpen,
  onClose,
  title = '保存成功',
  description = '数据已被成功同步保存，所有关联的名册和状态已即时更新。',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-center animate-in zoom-in-95 duration-200">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80 shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900 font-serif">
            {title}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
