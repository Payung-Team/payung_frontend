import React from 'react';
import Icon from './Icon';

interface ConfirmModalProps {
  isOpen: boolean;
  isLoading: boolean;
  title: string;
  description: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  onClose: () => void;
  onConfirm: () => void;
  iconName?: string;
  iconBgColor?: string;
  confirmBtnBgColor?: string;
  confirmBtnHoverBgColor?: string;
}

export default function ConfirmModal({
  isOpen,
  isLoading,
  title,
  description,
  cancelText = 'ยกเลิก',
  confirmText = 'ยืนยัน',
  onClose,
  onConfirm,
  iconName = 'check',
  iconBgColor = 'bg-[#10B981]',
  confirmBtnBgColor = 'bg-[#009265]',
  confirmBtnHoverBgColor = 'hover:bg-[#007C55]',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-[500px] rounded-2xl bg-white p-6 text-center shadow-2xl border border-gray-100">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white ${iconBgColor}`}>
          <Icon name={iconName} size="large" className="text-3xl font-extrabold" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-[#064E3B]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {description}
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 w-[120px] rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`h-10 w-[120px] rounded-lg ${confirmBtnBgColor} text-sm font-semibold text-white ${confirmBtnHoverBgColor} shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-all disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer`}
          >
            {isLoading ? 'กำลังประมวลผล...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
