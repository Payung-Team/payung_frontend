import { useState, useEffect } from 'react';
import Icon from './Icon';

export type DisputeResolveMode = 'refund_full' | 'refund_partial' | 'no_refund';

interface DisputeResolveModalProps {
  isOpen: boolean;
  mode: DisputeResolveMode | null;
  originalAmount: number;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (data: { amount?: number; notes?: string }) => void;
}

const MODE_CONFIG: Record<DisputeResolveMode, {
  title: string;
  description: string;
  confirmText: string;
  iconName: string;
  iconBgColor: string;
  confirmBtnBgColor: string;
  confirmBtnHoverBgColor: string;
}> = {
  refund_full: {
    title: 'ยืนยันคืนเงินเต็มจำนวน',
    description: 'ระบบจะคืนเงินให้ผู้ป่วยเต็มจำนวนและปิดข้อพิพาทนี้',
    confirmText: 'คืนเงินเต็มจำนวน',
    iconName: 'payments',
    iconBgColor: 'bg-[#10B981]',
    confirmBtnBgColor: 'bg-[#009265]',
    confirmBtnHoverBgColor: 'hover:bg-[#007C55]',
  },
  refund_partial: {
    title: 'ยืนยันคืนเงินบางส่วน',
    description: 'กรอกจำนวนเงินที่ต้องการคืนให้ผู้ป่วย',
    confirmText: 'คืนเงินบางส่วน',
    iconName: 'price_change',
    iconBgColor: 'bg-[#F59E0B]',
    confirmBtnBgColor: 'bg-[#D97706]',
    confirmBtnHoverBgColor: 'hover:bg-[#B45309]',
  },
  no_refund: {
    title: 'ยืนยันไม่คืนเงิน',
    description: 'กรุณาระบุเหตุผลในการตัดสินไม่คืนเงิน',
    confirmText: 'ไม่คืนเงิน',
    iconName: 'block',
    iconBgColor: 'bg-[#EF4444]',
    confirmBtnBgColor: 'bg-[#DC2626]',
    confirmBtnHoverBgColor: 'hover:bg-[#B91C1C]',
  },
};

export default function DisputeResolveModal({
  isOpen,
  mode,
  originalAmount,
  isLoading,
  onClose,
  onConfirm,
}: DisputeResolveModalProps) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNotes('');
      setFieldError('');
    }
  }, [isOpen, mode]);

  if (!isOpen || !mode) return null;

  const config = MODE_CONFIG[mode];

  function handleConfirm() {
    if (mode === 'refund_partial') {
      const parsed = Number.parseFloat(amount);
      if (!amount.trim() || Number.isNaN(parsed)) {
        setFieldError('กรุณากรอกจำนวนเงิน');
        return;
      }
      if (parsed < 1 || parsed > originalAmount) {
        setFieldError(`จำนวนเงินต้องอยู่ระหว่าง ฿1 – ฿${originalAmount.toLocaleString()}`);
        return;
      }
      onConfirm({ amount: parsed });
      return;
    }

    if (mode === 'no_refund') {
      if (!notes.trim()) {
        setFieldError('กรุณาระบุเหตุผล');
        return;
      }
      onConfirm({ notes: notes.trim() });
      return;
    }

    onConfirm({ amount: originalAmount });
  }

  const canConfirm = mode === 'refund_full'
    || (mode === 'refund_partial' && amount.trim() !== '')
    || (mode === 'no_refund' && notes.trim() !== '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-[500px] rounded-2xl bg-white p-6 text-center shadow-2xl border border-gray-100">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white ${config.iconBgColor}`}>
          <Icon name={config.iconName} size="large" className="text-3xl font-extrabold" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-[#064E3B]">{config.title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{config.description}</p>

        {mode === 'refund_full' && (
          <div className="mt-4 rounded-lg bg-[#ECFDF5] px-4 py-3">
            <p className="text-xs text-gray-500">จำนวนเงินที่จะคืน</p>
            <p className="text-2xl font-bold text-[#059669]">฿{originalAmount.toLocaleString()}</p>
          </div>
        )}

        {mode === 'refund_partial' && (
          <div className="mt-4 text-left">
            <label htmlFor="partial-amount" className="mb-1.5 block text-left text-xs font-semibold text-gray-600">
              จำนวนเงินที่คืน (สูงสุด ฿{originalAmount.toLocaleString()})
            </label>
            <input
              id="partial-amount"
              type="number"
              min={1}
              max={originalAmount}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setFieldError(''); }}
              placeholder="0"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
            />
          </div>
        )}

        {mode === 'no_refund' && (
          <div className="mt-4 text-left">
            <label htmlFor="no-refund-notes" className="mb-1.5 block text-left text-xs font-semibold text-gray-600">
              เหตุผล <span className="text-red-500">*</span>
            </label>
            <textarea
              id="no-refund-notes"
              rows={3}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setFieldError(''); }}
              placeholder="ระบุเหตุผลในการตัดสินไม่คืนเงิน..."
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
            />
          </div>
        )}

        {fieldError && (
          <p className="mt-2 text-left text-xs text-red-500">{fieldError}</p>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 w-[120px] rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !canConfirm}
            className={`h-10 w-[140px] rounded-lg ${config.confirmBtnBgColor} text-sm font-semibold text-white ${config.confirmBtnHoverBgColor} shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-all disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer`}
          >
            {isLoading ? 'กำลังประมวลผล...' : config.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
