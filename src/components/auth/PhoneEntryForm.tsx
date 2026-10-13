import { useState } from 'react';
import PhoneInput from '../ui/PhoneInput';
import { PHONE_AUTH_ERROR, type PhoneOtpPurpose } from '../../graphql/phoneAuth';
import { usePhoneAuth } from '../../hooks/usePhoneAuth';
import { isValidThaiMobile } from '../../lib/phone';
import type { PhoneAuthFailure } from '../../lib/phoneAuthErrors';
import { usePhoneAuthStrings } from '../../lib/phoneAuthStrings';

interface PhoneEntryFormProps {
  purpose: PhoneOtpPurpose;
  /** id ของช่องกรอก เช่น "login-phone" */
  inputId: string;
  hint: string;
  submitLabel: string;
  /** เบอร์ที่เติมไว้ให้ — เบอร์ที่กรอกค้างตอนกลับมาแก้ หรือเบอร์เดิมในบัญชี (E1) */
  initialDigits?: string;
  /** BE รับคำขอและส่ง SMS แล้ว */
  onRequested: (digits: string, resendAfterSeconds: number) => void;
  /** ทางไปต่อเมื่อเบอร์ใช้กับจุดประสงค์นี้ไม่ได้: LOGIN ไม่พบบัญชี → สมัคร · SIGNUP เบอร์ซ้ำ → ล็อกอิน */
  onAlternative?: () => void;
  alternativeLabel?: string;
}

const ALTERNATIVE_CODES: Partial<Record<PhoneOtpPurpose, string>> = {
  LOGIN: PHONE_AUTH_ERROR.PHONE_NOT_REGISTERED,
  SIGNUP: PHONE_AUTH_ERROR.PHONE_ALREADY_IN_USE,
};

/**
 * ขั้นกรอกเบอร์และขอรหัสยืนยัน — ใช้ร่วมกันทั้งล็อกอิน สมัคร และผูกเบอร์ (PYG-604)
 *
 * ★ เบอร์ที่กรอกไม่หายเมื่อขอรหัสไม่สำเร็จ (เช่นส่ง SMS ไม่สำเร็จ) ผู้ใช้กดลองใหม่ได้ทันที
 */
export default function PhoneEntryForm({
  purpose,
  inputId,
  hint,
  submitLabel,
  initialDigits = '',
  onRequested,
  onAlternative,
  alternativeLabel,
}: PhoneEntryFormProps) {
  const s = usePhoneAuthStrings();
  const { requestOtp } = usePhoneAuth();
  const [digits, setDigits] = useState(initialDigits);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<PhoneAuthFailure | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setFailure(null);
    if (!isValidThaiMobile(digits)) {
      document.getElementById(inputId)?.focus();
      return;
    }

    setSubmitting(true);
    const result = await requestOtp(digits, purpose);
    if (!result) return; // มีคำขอค้างอยู่ — ตัวที่ค้างเป็นคนปิด submitting
    setSubmitting(false);
    if (result.ok) onRequested(digits, result.data.resendAfterSeconds);
    else setFailure(result.failure);
  };

  // เบอร์ผิดรูปแบบจาก BE แสดงที่ช่องกรอก ส่วน error อื่นแสดงเป็นกล่องแจ้งเตือน
  const fieldError = failure?.code === PHONE_AUTH_ERROR.PHONE_INVALID_FORMAT ? failure.message : undefined;
  const banner = failure && !fieldError ? failure : null;
  const showAlternative = Boolean(onAlternative && banner?.code && banner.code === ALTERNATIVE_CODES[purpose]);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <PhoneInput
        id={inputId}
        label={s.phoneLabel}
        value={digits}
        onChange={(next) => {
          setDigits(next);
          setFailure(null);
        }}
        hint={hint}
        error={fieldError}
        strict={submitted}
        disabled={submitting}
      />

      {banner && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-3 rounded-lg border border-[#F5C6CB] bg-[#FFF0F1] px-4 py-3 animate-shake"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <p className="flex-1 text-sm font-medium leading-[22px] text-[#DC3545]">{banner.message}</p>
          {showAlternative && (
            <button
              type="button"
              onClick={onAlternative}
              className="min-h-10 shrink-0 cursor-pointer px-1 text-sm font-bold text-[#DC3545] underline"
            >
              {alternativeLabel}
            </button>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={`mt-6 h-[52px] w-full rounded-lg bg-[#52B69A] text-xl font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition-all duration-200 hover:bg-[#45a085] hover:shadow-[0_6px_20px_rgba(82,182,154,0.35)] active:scale-[0.98] ${submitting ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {submitting ? s.requestingCode : submitLabel}
      </button>
    </form>
  );
}
