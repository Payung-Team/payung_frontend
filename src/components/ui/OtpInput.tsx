import { useEffect, useRef } from 'react';

interface OtpInputProps {
  /** ตัวเลขที่กรอกแล้ว เรียงจากซ้าย ไม่เกิน length หลัก */
  value: string;
  onChange: (code: string) => void;
  length?: number;
  status?: 'idle' | 'error' | 'success';
  disabled?: boolean;
  autoFocus?: boolean;
  /** เปลี่ยนค่าเพื่อย้ายโฟกัสกลับไปช่องแรก (เช่นหลังรหัสผิด ซึ่งช่องถูกปิดระหว่างตรวจ) */
  focusSignal?: number;
  /** aria-label ของแต่ละช่อง เช่น "หลักที่ 1" */
  digitLabel: (position: number) => string;
  labelledBy?: string;
  describedBy?: string;
}

/**
 * ช่องกรอกรหัสยืนยันแบบแยกหลัก (PYG-604)
 *
 * ★ ไม่ตั้ง maxLength: มือถือเติมรหัสจาก SMS (autocomplete="one-time-code") และการวาง
 *   ใส่รหัสทั้ง 6 หลักลงช่องเดียว ถ้าจำกัดช่องละ 1 ตัวจะเหลือแค่หลักแรก
 *   จึงรับค่าหลายหลักแล้วกระจายลงช่องเอง
 * ★ รหัสอยู่ใน state ของหน้าที่เรียกเท่านั้น ห้ามเก็บลง localStorage หรือ URL
 */
export default function OtpInput({
  value,
  onChange,
  length = 6,
  status = 'idle',
  disabled,
  autoFocus,
  focusSignal = 0,
  digitLabel,
  labelledBy,
  describedBy,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus, focusSignal]);

  const focusCell = (index: number) => {
    const el = refs.current[Math.max(0, Math.min(index, length - 1))];
    el?.focus();
    el?.select();
  };

  const commit = (next: string, focusIndex: number) => {
    onChange(next.slice(0, length));
    focusCell(focusIndex);
  };

  const handleChange = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, '');
    const current = value[index] ?? '';

    if (!incoming) {
      commit(value.slice(0, index) + value.slice(index + 1), index);
      return;
    }

    // พิมพ์ทับช่องที่มีเลขอยู่ = ค่าที่ได้คือเลขเดิม + เลขใหม่ ให้เก็บตัวใหม่
    if (current && incoming.length === 2) {
      const typed = incoming.replace(current, '') || current;
      commit(value.slice(0, index) + typed + value.slice(index + 1), index + 1);
      return;
    }

    // 1 ตัว = พิมพ์ปกติ · หลายตัว = วางหรือเติมจาก SMS ให้กระจายต่อจากช่องนี้
    const head = value.slice(0, Math.min(index, value.length));
    const next = (head + incoming).slice(0, length);
    commit(incoming.length > 1 ? next : next + value.slice(head.length + 1), next.length);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      e.preventDefault();
      commit(value.slice(0, index - 1) + value.slice(index), index - 1);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusCell(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusCell(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) commit(pasted, pasted.length);
  };

  const tone = disabled
    ? 'border-[#E0E2E5] bg-[#F5F6F7] text-[#8A8C8E]'
    : status === 'error'
      ? 'border-[#DC3545] bg-[#FFF0F1] text-[#DC3545]'
      : status === 'success'
        ? 'border-[#52B69A] bg-[#E6F5ED] text-[#1B5C48]'
        : 'border-[#E0E2E5] bg-white text-[#1A1A1A] focus:border-[#52B69A]';

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="mt-1 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={digitLabel(index + 1)}
          aria-invalid={status === 'error'}
          value={value[index] ?? ''}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`h-[60px] w-full min-w-0 rounded-lg border-[1.5px] p-0 text-center text-[26px] font-semibold caret-[#52B69A] outline-none transition-colors ${tone}`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
      ))}
    </div>
  );
}
