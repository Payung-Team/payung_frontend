import { useEffect, useState } from 'react';
import OtpInput from '../ui/OtpInput';
import { PHONE_AUTH_ERROR, type PhoneOtpPurpose } from '../../graphql/phoneAuth';
import { usePhoneAuth } from '../../hooks/usePhoneAuth';
import { maskThaiPhone } from '../../lib/phone';
import type { PhoneAuthResult } from '../../lib/phoneAuthErrors';
import { formatCountdown, usePhoneAuthStrings } from '../../lib/phoneAuthStrings';

const CODE_LENGTH = 6;
const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" };

interface PhoneOtpStepProps {
  /** เบอร์ที่ส่งรหัสไป (ตัวเลข 10 หลัก) */
  digits: string;
  purpose: PhoneOtpPurpose;
  /** จาก response ของการขอรหัส — FE ไม่ฝังตัวเลขเวลารอเอง (R8) */
  resendAfterSeconds: number;
  /** ตรวจรหัสกับ API ตามจุดประสงค์ของหน้าที่เรียก */
  onVerify: (code: string) => Promise<PhoneAuthResult<unknown>>;
  /** เรียกหลังแสดงข้อความสำเร็จแล้วครู่หนึ่ง */
  onVerified?: () => void;
  onEditPhone: () => void;
  successMessage: string;
  /** อยู่ในการ์ดของหน้าตั้งค่า: หัวข้อเล็กลงให้เข้ากับการ์ด */
  compact?: boolean;
}

type Status = 'idle' | 'verifying' | 'error' | 'locked' | 'success';

/** วินาทีที่เหลือจนถึงเวลาที่กำหนด — นับจากนาฬิกาเครื่อง เพราะ BE ส่งมาเป็นระยะเวลา ไม่ใช่ timestamp */
function useSecondsUntil(target: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // เดินตลอดที่หน้านี้เปิดอยู่: เวลาเป้าหมายเปลี่ยนได้ทุกเมื่อ (ขอรหัสใหม่ / BE บอกให้รอนานขึ้น)
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  return Math.max(0, Math.ceil((target - now) / 1000));
}

/**
 * หน้ากรอกรหัสยืนยัน (PYG-604) — ใช้ร่วมกันทั้งล็อกอิน สมัคร และผูกเบอร์
 *
 * ★ เป็น state ในหน้า ไม่ใช่ route ของตัวเอง: รีเฟรชแล้วกลับไปขั้นกรอกเบอร์
 *   รหัสและเบอร์จึงไม่ต้องอยู่ใน URL หรือ localStorage เลย
 */
export default function PhoneOtpStep({
  digits,
  purpose,
  resendAfterSeconds,
  onVerify,
  onVerified,
  onEditPhone,
  successMessage,
  compact = false,
}: PhoneOtpStepProps) {
  const s = usePhoneAuthStrings();
  const { requestOtp } = usePhoneAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [resending, setResending] = useState(false);
  const [resendAt, setResendAt] = useState(() => Date.now() + resendAfterSeconds * 1000);
  const [focusSignal, setFocusSignal] = useState(0);
  const secondsLeft = useSecondsUntil(resendAt);

  const busy = status === 'verifying' || status === 'success';
  const inputsDisabled = busy || status === 'locked';

  const handleCodeChange = (next: string) => {
    setCode(next);
    setNotice('');
    if (status === 'error') {
      setStatus('idle');
      setMessage('');
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || status === 'locked') return;
    setNotice('');
    if (code.length < CODE_LENGTH) {
      setStatus('error');
      setMessage(s.otpIncomplete);
      return;
    }

    setStatus('verifying');
    setMessage('');
    const result = await onVerify(code);
    if (result.ok) {
      setStatus('success');
      if (onVerified) window.setTimeout(onVerified, 600);
      return;
    }

    const { failure } = result;
    setCode('');
    setMessage(failure.message);
    setFocusSignal((n) => n + 1);
    if (failure.code === PHONE_AUTH_ERROR.OTP_ATTEMPTS_EXCEEDED) {
      // รหัสนี้ใช้ไม่ได้อีก: ปิดช่องกรอก แล้วเปิดให้ขอรหัสใหม่ได้เลย (BE เป็นคนตัดสินว่าถี่เกินไหม)
      setStatus('locked');
      setResendAt(0);
    } else {
      setStatus('error');
    }
  };

  const handleResend = async () => {
    if (resending || secondsLeft > 0) return;
    setResending(true);
    setNotice('');
    const result = await requestOtp(digits, purpose);
    if (!result) return;
    setResending(false);
    setCode('');
    setFocusSignal((n) => n + 1);

    if (result.ok) {
      setStatus('idle');
      setMessage('');
      setNotice(s.resent);
      setResendAt(Date.now() + result.data.resendAfterSeconds * 1000);
      return;
    }

    const { failure } = result;
    // ขอรหัสไม่สำเร็จไม่นับเป็นการกรอกผิด (E11) — คงสถานะช่องกรอกไว้ตามเดิม
    if (status !== 'locked') setStatus('error');
    if (failure.code === PHONE_AUTH_ERROR.OTP_RATE_LIMITED) {
      setMessage(s.errOtpRateLimited);
      if (failure.resendAfterSeconds) setResendAt(Date.now() + failure.resendAfterSeconds * 1000);
    } else {
      setMessage(failure.message);
    }
  };

  const statusText = status === 'success' ? successMessage : message || notice;
  const statusTone =
    status === 'success' || (!message && notice)
      ? 'font-semibold text-[#2F8F74]'
      : 'font-medium text-[#DC3545]';
  const canResend = secondsLeft === 0 && !resending && !busy;

  return (
    <div className={compact ? '' : 'w-full max-w-[420px]'} style={FONT}>
      <h1 className={compact ? 'text-[20px] font-semibold leading-7 text-[#0A0A0A]' : 'text-[32px] font-bold leading-10 text-[#1A1A1A]'}>
        {s.otpTitle}
      </h1>
      <p className={compact ? 'mt-1 text-sm leading-[22px] text-[#717182]' : 'mt-2 text-lg leading-[27px] text-[#8A8C8E]'}>
        {s.otpLead}{' '}
        <strong className="whitespace-nowrap font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
          {maskThaiPhone(digits)}
        </strong>
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6">
        <span id="otp-label" className="block text-sm font-bold leading-6 text-[#575859]">
          {s.otpLabel}
        </span>
        <OtpInput
          value={code}
          onChange={handleCodeChange}
          length={CODE_LENGTH}
          status={status === 'error' ? 'error' : status === 'success' ? 'success' : 'idle'}
          disabled={inputsDisabled}
          autoFocus
          focusSignal={focusSignal}
          digitLabel={s.otpDigitLabel}
          labelledBy="otp-label"
          describedBy="otp-status"
        />
        <p id="otp-status" role="status" aria-live="polite" className={`mt-2 min-h-[22px] text-sm leading-[22px] ${statusTone}`}>
          {statusText}
        </p>

        <button
          type="submit"
          disabled={inputsDisabled}
          className={`mt-3 h-[52px] w-full rounded-lg bg-[#52B69A] text-xl font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition-all duration-200 ${
            inputsDisabled
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:bg-[#45a085] hover:shadow-[0_6px_20px_rgba(82,182,154,0.35)] active:scale-[0.98]'
          }`}
        >
          {status === 'verifying' ? s.verifying : s.verify}
        </button>
      </form>

      <p className="mt-5 text-center text-base font-bold leading-6 text-[#8A8C8E]">
        {s.resendPrompt}{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend}
          className={`min-h-11 px-1 text-base font-semibold ${
            canResend ? 'cursor-pointer text-[#52B69A] hover:underline' : 'cursor-default text-[#8A8C8E]'
          }`}
        >
          {resending ? s.resending : secondsLeft > 0 ? s.resendIn(formatCountdown(secondsLeft)) : s.resend}
        </button>
      </p>
      <p className="mt-1 text-center">
        <button
          type="button"
          onClick={onEditPhone}
          disabled={busy}
          className="min-h-11 cursor-pointer px-2 text-base font-semibold text-[#52B69A] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {s.editPhone}
        </button>
      </p>
      <p className="mt-3 text-center text-[13px] leading-5 text-[#8A8C8E]">{s.otpTrust}</p>
    </div>
  );
}
