import { forwardRef, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { PROFESSION_CODES, PROFESSIONS, LICENSE_NOTICE } from '../../lib/professions';
import type { Profession } from '../../lib/professions';

/**
 * ตัวเลือกวิชาชีพแบบการ์ด 3 ใบ เลือกได้ 1 (PYG-556 · S01-AC1/AC2)
 * ใช้ทั้งฟอร์ม KYC และ flow ขอเปลี่ยนวิชาชีพ — ไม่มีค่าเริ่มต้นที่ถูกเลือกไว้ (S01-E1/E3)
 *
 * tone ตามแบบฟิลด์อื่นใน KycStep1 ตอน resubmit: muted = ยังไม่แก้ (เทา) · edited = แก้แล้ว (เขียว)
 */
interface Props {
  id: string;
  value: string;
  onChange: (value: Profession) => void;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  tone?: 'default' | 'muted' | 'edited';
  /** วิชาชีพปัจจุบันใน flow ขอเปลี่ยน — แสดงแต่เลือกไม่ได้ */
  disabledValue?: string;
  /** ข้อความใต้คำอธิบาย · ค่าเริ่มต้น = แจ้งว่าต้องแนบใบประกอบฯ ในขั้น "เอกสาร" */
  renderNote?: (profession: Profession) => ReactNode;
}

const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

const defaultNote = (p: Profession) =>
  PROFESSIONS[p].requiresLicense ? (
    <span className="flex gap-1.5 items-start text-[12px] leading-[1.45] text-[#475569] bg-[#F8FAFC] rounded-lg px-2 py-1.5 group-aria-checked:bg-white group-aria-checked:text-[#7A4F0C] group-aria-checked:border group-aria-checked:border-[#F3D9A8]">
      <span className="material-icons-outlined text-[#64748B] group-aria-checked:text-[#B7791F] mt-px" style={{ fontSize: 15 }} aria-hidden="true">badge</span>
      {LICENSE_NOTICE}
    </span>
  ) : null;

const ProfessionPicker = forwardRef<HTMLDivElement, Props>(function ProfessionPicker(
  { id, value, onChange, label = 'วิชาชีพ', hint, error, tone = 'default', disabledValue, renderNote = defaultNote },
  ref,
) {
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const selectable = PROFESSION_CODES.filter((p) => p !== disabledValue);
  // roving tabindex: ตัวที่เลือกอยู่ หรือตัวแรกที่เลือกได้
  const focusTarget = selectable.includes(value as Profession) ? value : selectable[0];

  function move(from: Profession, dir: 1 | -1) {
    const i = selectable.indexOf(from);
    const next = selectable[(i + dir + selectable.length) % selectable.length];
    onChange(next);
    optionRefs.current[PROFESSION_CODES.indexOf(next)]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>, p: Profession) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(p); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(p, 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(p, -1); }
  }

  return (
    <div className="flex flex-col gap-2" style={font}>
      <span id={`${id}-label`} className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        {label} <span className="text-red-600" aria-hidden="true">*</span>
        {tone === 'edited' && (
          <span className="text-[11px] font-semibold text-[#047857] bg-[#D1FAE5] rounded-full px-2 py-px">แก้ไขแล้ว</span>
        )}
      </span>
      {hint && <span className="text-[13px] text-[#717182] -mt-0.5">{hint}</span>}

      <div
        ref={ref}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-required="true"
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3"
      >
        {PROFESSION_CODES.map((p, i) => {
          const meta = PROFESSIONS[p];
          const selected = value === p;
          const disabled = p === disabledValue;
          const base = 'group relative text-left rounded-[14px] p-3.5 flex flex-col gap-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
          const look = disabled
            ? 'bg-[#F8FAFC] border-[1.5px] border-dashed border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
            : tone === 'muted'
              ? `bg-gray-200 border-[1.5px] border-transparent text-[#9CA3AF] cursor-pointer focus-visible:ring-[#2D6A58]`
              : tone === 'edited' && selected
                ? 'bg-white border-2 border-[#10B981] p-[13.5px] cursor-pointer focus-visible:ring-[#10B981]'
                : selected
                  ? 'bg-[#F2F8F5] border-2 border-[#2D6A58] p-[13.5px] cursor-pointer focus-visible:ring-[#2D6A58]'
                  : `bg-white border-[1.5px] ${error ? 'border-[#FCA5A5] hover:border-red-500' : 'border-[#E2E8F0] hover:border-[#2D6A58]'} cursor-pointer focus-visible:ring-[#2D6A58]`;
          const accent = tone === 'muted' ? '#9CA3AF' : tone === 'edited' ? '#10B981' : '#2D6A58';

          return (
            <div
              key={p}
              ref={(el) => { optionRefs.current[i] = el; }}
              role="radio"
              aria-checked={selected}
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? -1 : p === focusTarget ? 0 : -1}
              onClick={() => !disabled && onChange(p)}
              onKeyDown={(e) => !disabled && onKeyDown(e, p)}
              className={`${base} ${look}`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: selected && !disabled ? accent : tone === 'muted' || disabled ? '#E5E7EB' : '#F0F4F2' }}
                >
                  <span
                    className="material-icons-outlined"
                    style={{ fontSize: 20, color: selected && !disabled ? '#FFFFFF' : tone === 'muted' || disabled ? '#9CA3AF' : '#2D6A58' }}
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>
                </span>
                <span className={`flex-1 min-w-0 text-[15px] font-semibold leading-tight ${tone === 'muted' || disabled ? '' : 'text-[#0A0A0A]'}`}>
                  {meta.label}
                </span>
                {!disabled && (
                  <span
                    className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                    style={{ borderColor: selected ? accent : '#CBD5E1' }}
                    aria-hidden="true"
                  >
                    {selected && <span className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />}
                  </span>
                )}
              </div>
              <span className={`text-[12.5px] leading-normal ${tone === 'muted' || disabled ? '' : 'text-[#717182]'}`}>
                {disabled ? 'วิชาชีพปัจจุบันของคุณ' : meta.description}
              </span>
              {!disabled && tone !== 'muted' && renderNote(p)}
            </div>
          );
        })}
      </div>

      {error && (
        <span id={`${id}-error`} className="flex items-center gap-1 text-sm text-red-500">
          <span className="material-icons" style={{ fontSize: 16 }} aria-hidden="true">error_outline</span>
          {error}
        </span>
      )}
    </div>
  );
});

export default ProfessionPicker;
