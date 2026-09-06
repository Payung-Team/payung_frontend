import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useKyc } from '../../../context/KycContext';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/ui/Icon';
import KycStepper from '../KycStepper';
import { OMISE_BANK_OPTIONS, getBankLabel } from '../../../features/kyc/omiseBanks';

// ── Zod schema — ต้องตรงกับ backend PayoutAccountInput (@Matches /^\d{10}$/) ──
const payoutSchema = z.object({
  bankCode: z.string().min(1, 'กรุณาเลือกธนาคาร'),
  accountNumber: z.string().regex(/^\d{10}$/, 'เลขบัญชีต้องเป็นตัวเลข 10 หลัก'),
  accountName: z
    .string()
    .min(2, 'ชื่อบัญชีต้องมีอย่างน้อย 2 ตัวอักษร')
    .max(100, 'ชื่อบัญชีต้องไม่เกิน 100 ตัวอักษร'),
});

type PayoutForm = z.infer<typeof payoutSchema>;

interface PayoutAccountFormProps {
  mode: 'create' | 'resubmit';
  onSubmit: (data: PayoutForm) => void;
  onSkip?: () => void;
  onCancelEdit?: () => void;
}

/**
 * PayoutAccountForm — ฟอร์มกรอกบัญชีรับเงิน ใช้ทั้งใน wizard (KycStep3) และ
 * standalone add/edit flow (KycStatusPage backfill banner)
 */
export function PayoutAccountForm({ mode, onSubmit, onSkip, onCancelEdit }: PayoutAccountFormProps) {
  const [isConsented, setIsConsented] = useState(mode === 'resubmit');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PayoutForm>({
    resolver: zodResolver(payoutSchema),
    defaultValues: { bankCode: '', accountNumber: '', accountName: '' },
  });

  const accountNumberReg = register('accountNumber');
  const canSubmit = mode === 'resubmit' || isConsented;

  const submit = (data: PayoutForm) => {
    if (!canSubmit) return;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-5">
      {/* ธนาคาร */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          ธนาคาร
        </label>
        <div className="relative flex items-center">
          <select
            {...register('bankCode')}
            className={`w-full px-3 py-2 border rounded-lg outline-none transition-colors text-sm appearance-none pr-10 ${
              errors.bankCode ? 'border-red-500' : 'border-gray-300 focus:border-[#2D6A58] focus:ring-1 focus:ring-[#2D6A58]'
            }`}
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            <option value="" disabled>เลือกธนาคาร</option>
            {OMISE_BANK_OPTIONS.map((bank) => (
              <option key={bank.code} value={bank.code}>{bank.label}</option>
            ))}
          </select>
          <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
            <Icon name="expand_more" color="#717182" style={{ fontSize: '20px' }} />
          </div>
        </div>
        {errors.bankCode && (
          <span className="text-sm text-red-500" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>{errors.bankCode.message}</span>
        )}
      </div>

      {/* เลขบัญชี */}
      <Input
        label="เลขบัญชีธนาคาร (10 หลัก)"
        placeholder="1234567890"
        inputMode="numeric"
        maxLength={10}
        error={errors.accountNumber?.message}
        {...accountNumberReg}
        onChange={(e) => {
          e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
          accountNumberReg.onChange(e);
        }}
      />

      {/* ชื่อบัญชี */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          ชื่อบัญชี
        </label>
        <Input
          placeholder="สมชาย ใจดี"
          error={errors.accountName?.message}
          {...register('accountName')}
        />
      </div>

      {/* Consent — เฉพาะตอน create (resubmit ให้ความยินยอมไปแล้วตอน submit ครั้งแรก) */}
      {mode === 'create' && (
        <button
          type="button"
          onClick={() => setIsConsented(!isConsented)}
          className={`w-full rounded-xl p-4 flex gap-3 text-left transition-all cursor-pointer ${
            isConsented ? 'bg-[#E0F6F1]' : 'bg-[#F8FAFC] border border-[#E2E8F0]'
          }`}
        >
          <div
            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              isConsented ? 'bg-[#0F766E]' : 'bg-white border-2 border-[#CBD5E1]'
            }`}
          >
            {isConsented && <Icon name="check" color="white" style={{ fontSize: '14px' }} />}
          </div>
          <div className="flex flex-col gap-0.5">
            <p className={`text-[13px] font-semibold transition-colors ${isConsented ? 'text-[#115E59]' : 'text-[#485569]'}`} style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              ข้าพเจ้ายินยอมให้ Payung จัดเก็บข้อมูลบัญชีธนาคารโดยเข้ารหัส
            </p>
            <p className="text-[12px] text-[#485569]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              ข้อมูลจะถูกใช้เพื่อโอนเงินค่าตอบแทนให้คุณเท่านั้น
            </p>
          </div>
        </button>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-3">
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] text-[#717182] text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ยกเลิก
            </button>
          )}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-medium text-[#717182] hover:underline cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ข้ามไปก่อน (เพิ่มทีหลังได้)
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className={`px-8 py-2.5 rounded-lg text-white text-sm font-bold active:scale-[0.98] transition-all duration-150 ${
            canSubmit ? 'bg-[#2D6A58] hover:bg-[#255a4a] cursor-pointer' : 'bg-gray-400 cursor-not-allowed'
          }`}
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          บันทึก
        </button>
      </div>
    </form>
  );
}

// ── Main wizard step ──────────────────────────────────────────────────────
export default function KycStep3({ mode = 'create' }: { mode?: 'create' | 'resubmit' }) {
  const { goToStep, payoutData, savePayout, initialPayoutData } = useKyc();
  // resubmit + มีบัญชีเดิมอยู่แล้ว + ยังไม่กด "แก้ไขบัญชี" → โชว์สรุปแบบ mask ก่อน
  const [isEditing, setIsEditing] = useState(mode === 'create' || !initialPayoutData);

  const handleFormSubmit = (data: PayoutForm) => {
    savePayout(data);
    goToStep(4);
  };

  const handleSkip = () => {
    savePayout(null);
    goToStep(4);
  };

  const handleContinueUnchanged = () => {
    // ไม่แตะบัญชีเดิมเลย — payoutData ยังเป็น null อยู่ (setInitialData ล้างไว้แล้ว)
    // handleSubmit ฝั่ง KycStep4 จะไม่ส่ง payoutAccount ไปด้วย (ไม่มีการเปลี่ยนแปลง)
    goToStep(4);
  };

  return (
    <div className={mode === 'resubmit' ? '' : 'min-h-[calc(100vh-64px)] bg-[#F2F4F6] flex items-center justify-center px-4 py-10'}>
      <div
        className={mode === 'resubmit' ? 'w-full flex flex-col gap-5' : 'w-full max-w-[780px] bg-white rounded-3xl border border-[#F1F5F9] px-12 py-10'}
        style={mode === 'resubmit' ? {} : {
          boxShadow: '0 12px 28px -6px rgba(15,23,43,0.06), 0 1px 2px 0 rgba(15,23,43,0.04)',
        }}
      >
        <KycStepper current={3} />

        <h2 className="text-2xl font-bold text-[#0A0A0A] mb-1" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          บัญชีรับเงิน
        </h2>
        <p className="text-sm text-[#717182] mb-8" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          ใช้สำหรับโอนค่าตอบแทนหลังทำงานเสร็จ (ไม่บังคับ — เพิ่มทีหลังได้)
        </p>

        {!isEditing && initialPayoutData ? (
          <div className="flex flex-col gap-4">
            <div className="border border-[#E2E8F0] rounded-xl p-5 flex justify-between items-center">
              <div>
                <p className="text-[15px] font-semibold text-[#0F172A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  {getBankLabel(initialPayoutData.bankCode)} •••• {initialPayoutData.accountNumberLast4}
                </p>
                <p className="text-[13px] text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  {initialPayoutData.accountName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[13px] font-semibold text-[#0F766E] hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                แก้ไขบัญชี
              </button>
            </div>
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] text-[#717182] text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                ← ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleContinueUnchanged}
                className="px-8 py-2.5 rounded-lg text-white text-sm font-bold bg-[#2D6A58] hover:bg-[#255a4a] active:scale-[0.98] transition-all duration-150 cursor-pointer"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                ถัดไป →
              </button>
            </div>
          </div>
        ) : (
          <>
            <PayoutAccountForm
              mode={mode}
              onSubmit={handleFormSubmit}
              onSkip={mode === 'create' && !payoutData ? handleSkip : undefined}
              onCancelEdit={mode === 'resubmit' && initialPayoutData ? () => setIsEditing(false) : undefined}
            />
            {mode === 'create' && (
              <div className="flex justify-start pt-4">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] text-[#717182] text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                >
                  ← ย้อนกลับ
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
