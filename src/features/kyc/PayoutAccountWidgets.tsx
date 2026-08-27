import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { UPDATE_PAYOUT_ACCOUNT } from '../../graphql/queries';
import Icon from '../../components/ui/Icon';
import { PayoutAccountForm } from '../../pages/kyc/steps/KycStep3';
import { getBankLabel } from './omiseBanks';

/**
 * PYG-266: การ์ด/แบนเนอร์/โมดัลบัญชีรับเงิน — ใช้ร่วมกันระหว่าง KycStatusPage
 * (หลัง KYC verified) และ BillingSettingsTab (หน้าตั้งค่า caregiver)
 */

export interface PayoutAccountSummary {
  bankCode: string;
  accountName: string;
  accountNumberLast4: string;
  status: string;
  recipientStatus: string;
}

export const RECIPIENT_STATUS_META: Record<string, { label: string; className: string }> = {
  unverified: { label: 'รอตรวจสอบ', className: 'bg-[#FFF7ED] text-[#C2410C]' },
  verified: { label: 'ยืนยันแล้ว', className: 'bg-[#ECFDF5] text-[#047857]' },
  failed: { label: 'ตรวจสอบไม่ผ่าน', className: 'bg-[#FEF2F2] text-[#DC2626]' },
};

export function PayoutSummaryCard({ payoutAccount, onEdit }: { payoutAccount: PayoutAccountSummary; onEdit: () => void }) {
  const statusMeta = RECIPIENT_STATUS_META[payoutAccount.recipientStatus] ?? RECIPIENT_STATUS_META.unverified;
  return (
    <div className="w-full bg-[#F8FAFC] rounded-xl p-5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#64748B] mb-1" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          บัญชีรับเงิน
        </p>
        <p className="text-[14px] font-semibold text-[#1E293B] truncate" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          {getBankLabel(payoutAccount.bankCode)} •••• {payoutAccount.accountNumberLast4}
        </p>
        <p className="text-[13px] text-[#64748B] truncate" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          {payoutAccount.accountName}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-[13px] font-semibold text-[#0F766E] hover:underline cursor-pointer"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        แก้ไข
      </button>
    </div>
  );
}

export function PayoutBackfillBanner({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="w-full flex items-center gap-3.5 p-4 bg-[#FFF7ED] border border-[#FFEDD5] rounded-[16px]">
      <div className="w-[28px] h-[28px] bg-[#F97316] rounded-full flex items-center justify-center flex-shrink-0">
        <Icon name="account_balance" color="white" style={{ fontSize: '16px' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#111827]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          เพิ่มบัญชีรับเงินก่อนรับงาน
        </p>
        <p className="text-[12px] text-[#4B5563]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          เพื่อรับค่าตอบแทนอัตโนมัติหลังทำงานเสร็จ
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 px-4 py-2 bg-[#0D9488] text-white text-[13px] font-bold rounded-lg hover:bg-[#0B7A70] transition-colors cursor-pointer"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        เพิ่มบัญชี
      </button>
    </div>
  );
}

export function PayoutAccountModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [updatePayoutAccount, { loading }] = useMutation(UPDATE_PAYOUT_ACCOUNT);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (data: { bankCode: string; accountNumber: string; accountName: string }) => {
    setErrorMsg(null);
    try {
      await updatePayoutAccount({ variables: { input: data } });
      onSaved();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'บันทึกบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="fixed inset-0 -z-10" onClick={onClose} />
      <div className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl p-8" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        <h2 className="text-xl font-bold text-[#0F172A] mb-1">บัญชีรับเงิน</h2>
        <p className="text-sm text-[#64748B] mb-6">ใช้สำหรับโอนค่าตอบแทนหลังทำงานเสร็จ</p>
        {errorMsg && (
          <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-sm text-[#DC2626]">
            {errorMsg}
          </div>
        )}
        <PayoutAccountForm
          mode="resubmit"
          onSubmit={handleSubmit}
          onCancelEdit={onClose}
        />
        {loading && <p className="text-xs text-[#64748B] mt-3">กำลังบันทึก...</p>}
      </div>
    </div>
  );
}
