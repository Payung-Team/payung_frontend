import { forwardRef, useRef, type KeyboardEvent } from 'react';
import { CARE_LEVELS, CARE_LEVEL_RANK, useCareLevelStrings, type CareLevel } from '../../lib/careLevels';

/**
 * ตัวเลือกระดับ 3 ค่า เลือกได้ 1 (PYG-557 · S02-AC1) — ไม่มีค่าเริ่มต้นที่ถูกเลือกไว้
 * ใช้ทั้งตอนอนุมัติ KYC และตอนแก้ระดับภายหลัง · คีย์บอร์ดแบบเดียวกับ ProfessionPicker (roving tabindex)
 */
interface Props {
  id: string;
  value: CareLevel | null;
  onChange: (value: CareLevel) => void;
  labelledBy: string;
  error?: string;
  /** ระดับปัจจุบันตอนแก้ระดับ — แสดงคำว่า "ปัจจุบัน" ใต้ชื่อ (ยังเลือกได้) */
  currentValue?: CareLevel | null;
  disabled?: boolean;
}

const CareLevelPicker = forwardRef<HTMLDivElement, Props>(function CareLevelPicker(
  { id, value, onChange, labelledBy, error, currentValue, disabled = false },
  ref,
) {
  const s = useCareLevelStrings();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusTarget = value ?? CARE_LEVELS[0];

  function move(from: CareLevel, dir: 1 | -1) {
    const i = CARE_LEVELS.indexOf(from);
    const next = CARE_LEVELS[(i + dir + CARE_LEVELS.length) % CARE_LEVELS.length];
    onChange(next);
    optionRefs.current[CARE_LEVELS.indexOf(next)]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, level: CareLevel) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(level, 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(level, -1); }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={ref}
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-required="true"
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
      >
        {CARE_LEVELS.map((level, i) => {
          const selected = value === level;
          const rank = CARE_LEVEL_RANK[level];
          return (
            <button
              key={level}
              ref={(el) => { optionRefs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={level === focusTarget ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(level)}
              onKeyDown={(e) => onKeyDown(e, level)}
              className={`flex flex-col items-start gap-1.5 rounded-[10px] text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                selected
                  ? 'border-2 border-[#059669] bg-[#ECFDF5] px-[13px] py-[11px]'
                  : `border-[1.5px] bg-white px-[14px] py-3 ${error ? 'border-[#FCA5A5] hover:border-red-500' : 'border-[#E5E7EB] hover:border-[#059669]'}`
              }`}
            >
              <span className="inline-flex h-3.5 items-end gap-[2px]" aria-hidden="true">
                {[6, 10, 14].map((h, n) => (
                  <span key={h} className={`w-1 rounded-[1px] ${n < rank ? 'bg-[#047857]' : 'bg-[#D1D5DB]'}`} style={{ height: h }} />
                ))}
              </span>
              <span className="text-[15px] font-bold leading-5 text-[#111827]">{s.levelLabel[level]}</span>
              {currentValue === level && (
                <span className="rounded bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-[#4B5563]">
                  {s.current}
                </span>
              )}
              <span className="text-[12px] leading-4 text-[#6B7280]">{s.criteria.short[level]}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <span id={`${id}-error`} role="alert" className="flex items-center gap-1 text-sm text-red-500">
          <span className="material-icons" style={{ fontSize: 16 }} aria-hidden="true">error_outline</span>
          {error}
        </span>
      )}
    </div>
  );
});

export default CareLevelPicker;
