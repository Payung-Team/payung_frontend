import { useLayoutEffect, useReducer, useRef, useState } from 'react';
import { Icon } from './Icon';
import {
  formatThaiPhone,
  isValidThaiMobile,
  nationalDigits,
  phoneInputIssue,
} from '../../lib/phone';
import { usePhoneAuthStrings } from '../../lib/phoneAuthStrings';

interface PhoneInputProps {
  id: string;
  label: string;
  /** ตัวเลขล้วน ขึ้นต้น 0 ไม่เกิน 10 หลัก — ช่องนี้เป็นคนจัดรูปแบบตอนแสดง */
  value: string;
  onChange: (digits: string) => void;
  hint?: string;
  /** ข้อความ error จากภายนอก (เช่นจาก API) — แสดงแทนผลตรวจของช่องเอง */
  error?: string;
  /** กดส่งแล้ว: เตือนเรื่องว่างและกรอกไม่ครบด้วย */
  strict?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  wrapperClassName?: string;
}

/**
 * ช่องกรอกเบอร์มือถือไทย (PYG-604) — หน้าตาเดียวกับ AuthInput
 *
 * ล็อกรูปแบบทุกครั้งที่ค่าเปลี่ยน: เหลือแต่ตัวเลข แปลง +66 เป็น 0 จัดเป็น 0xx xxx xxxx
 * และตรวจความถูกต้องไปพร้อมกัน (R7: เบอร์ผิดรูปแบบต้องถูกปฏิเสธก่อนเรียก API ไม่เสียค่า SMS)
 */
export default function PhoneInput({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  strict = false,
  readOnly,
  disabled,
  autoFocus,
  wrapperClassName = '',
}: PhoneInputProps) {
  const s = usePhoneAuthStrings();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [touched, setTouched] = useState(false);
  // จำนวนตัวเลขที่อยู่หน้าเคอร์เซอร์ก่อนจัดรูปแบบ — null = ให้ไปท้ายสุด
  const caretJob = useRef<{ digitsBefore: number | null } | null>(null);
  // พิมพ์ตัวอักษรแล้วค่าไม่เปลี่ยน React จะไม่ render ใหม่ จึงต้องบังคับเพื่อคืนตำแหน่งเคอร์เซอร์
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  const formatted = formatThaiPhone(value);
  const issue = phoneInputIssue(value, strict || touched);
  const issueMessage =
    issue === 'required'
      ? s.phoneRequired
      : issue === 'prefix'
        ? s.phonePrefix
        : issue === 'length'
          ? s.phoneLength(value.length)
          : '';
  const message = error || issueMessage;
  const valid = !message && isValidThaiMobile(value);
  const locked = readOnly || disabled;

  useLayoutEffect(() => {
    const job = caretJob.current;
    const el = inputRef.current;
    if (!job || !el) return;
    caretJob.current = null;
    let position = formatted.length;
    if (job.digitsBefore !== null) {
      position = 0;
      for (let seen = 0; seen < job.digitsBefore && position < formatted.length; position += 1) {
        if (/\d/.test(formatted[position])) seen += 1;
      }
    }
    el.setSelectionRange(position, position);
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    const digits = nationalDigits(raw);
    // เลขถูกแปลง (+66 → 0) หรือถูกตัด: ตำแหน่งเดิมใช้ไม่ได้ ให้ไปท้ายสุด
    const unchangedDigits = raw.replace(/\D/g, '') === digits;
    caretJob.current = {
      digitsBefore: unchangedDigits ? raw.slice(0, caret).replace(/\D/g, '').length : null,
    };
    onChange(digits);
    forceRender();
  };

  const inputTone = message
    ? 'border-[#DC3545] bg-[#FFF0F1] text-[#DC3545]'
    : locked
      ? 'border-[#E0E2E5] bg-[#F5F6F7] text-[#8A8C8E] cursor-not-allowed'
      : 'border-[#E0E2E5] bg-white focus:border-[#52B69A] text-[#1A1A1A]';
  const describedBy = [hint && `${id}-hint`, message && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={wrapperClassName}>
      <label
        htmlFor={id}
        className="text-sm font-bold leading-6 text-[#575859]"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {label}
      </label>
      <div className="relative mt-1">
        <span
          className={`pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 ${message ? 'text-[#DC3545]' : 'text-[#AAB2BA]'}`}
        >
          <Icon name="phone_iphone" size="small" color="currentColor" />
        </span>
        <input
          ref={inputRef}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={formatted}
          onChange={handleChange}
          onBlur={() => value && setTouched(true)}
          placeholder={s.phonePlaceholder}
          // ยาวกว่ารูปแบบที่จัดแล้ว เพื่อให้วาง "+66 81-234-5678" ได้ทั้งก้อน
          maxLength={18}
          readOnly={readOnly}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={Boolean(message)}
          aria-describedby={describedBy}
          className={`h-[50px] w-full rounded-lg border-[1.5px] pl-10 ${valid ? 'pr-11' : 'pr-4'} text-[15px] placeholder-[#C6C8CB] outline-none transition-colors ${inputTone}`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
        {valid && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#52B69A]" aria-hidden="true">
            <Icon name="check_circle" size="small" color="currentColor" />
          </span>
        )}
      </div>
      {hint && (
        <p
          id={`${id}-hint`}
          className="mt-1.5 text-[13px] leading-5 text-[#575859]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {hint}
        </p>
      )}
      {message && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-[13px] font-medium leading-5 text-[#DC3545]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
