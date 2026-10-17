import { useContext, useState } from 'react';
import { DEMENTIA_FLAG, FLAG_CODES, flagLabel, useAssessmentStrings } from '../../lib/assessmentStrings';
import { AssessmentDisclaimer, PRIMARY_BUTTON_CLASS, StepActions, StepHeading } from './AssessmentLayout';
import { AlertIcon, ArrowRightIcon, InfoIcon } from './assessmentIcons';
import { AssessmentSelfContext, flagsComplete, type FlagsValue } from './assessmentForm';

/**
 * ขั้น 3 เงื่อนไขพิเศษ — เลือกหลายข้อ (AC3) หรือ "ไม่มีเงื่อนไขพิเศษ" ที่เลือกพร้อมข้ออื่นไม่ได้ (AC4)
 * สมองเสื่อมมีตัวเลือกย่อยความรุนแรง (AC6)
 *
 * พฤติกรรมตาม Design D2:
 *   เลือก "ไม่มี" ตอนมี Flag อยู่ → ล้าง Flag ทั้งหมด พร้อมปุ่ม "เลือกคืน"
 *   เลือก Flag ตอน "ไม่มี" ติ๊กอยู่ → เอา "ไม่มี" ออกเอง
 *   ผลลัพธ์จึงไม่มีทางมีทั้งสองอย่างพร้อมกัน
 * ★ E5: เอาสมองเสื่อมออก → ล้างความรุนแรงทันที
 */
export default function FlagsStep({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: FlagsValue;
  onChange: (next: FlagsValue) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const s = useAssessmentStrings();
  const isSelf = useContext(AssessmentSelfContext);
  const [notice, setNotice] = useState('');
  const [undo, setUndo] = useState<FlagsValue | null>(null);
  const [tried, setTried] = useState(false);

  // Flag ที่ BE ส่งมาแต่ FE ไม่รู้จัก (เพิ่มทีหลัง) — ยังแสดงให้เอาออกได้ ไม่ทิ้งเงียบ ๆ
  const codes = [...FLAG_CODES, ...value.flags.filter((f) => !(FLAG_CODES as readonly string[]).includes(f))];
  const hasDementia = value.flags.includes(DEMENTIA_FLAG);
  const complete = flagsComplete(value);
  const emptyError = tried && !value.noSpecialConditions && value.flags.length === 0;
  const severityError = tried && hasDementia && value.dementiaSevere === null;

  const toggleNone = () => {
    setUndo(null);
    if (value.noSpecialConditions) {
      setNotice('');
      onChange({ ...value, noSpecialConditions: false });
      return;
    }
    const n = value.flags.length;
    if (n > 0) {
      setUndo(value);
      setNotice(s.flagsNoticeCleared(n));
    } else {
      setNotice('');
    }
    onChange({ flags: [], noSpecialConditions: true, dementiaSevere: null });
  };

  const toggleFlag = (code: string) => {
    setUndo(null);
    setNotice('');
    if (value.flags.includes(code)) {
      onChange({
        ...value,
        flags: value.flags.filter((f) => f !== code),
        dementiaSevere: code === DEMENTIA_FLAG ? null : value.dementiaSevere,
      });
      return;
    }
    if (value.noSpecialConditions) setNotice(s.flagsNoticeNoneRemoved);
    onChange({ ...value, flags: [...value.flags, code], noSpecialConditions: false });
  };

  const handleNext = () => {
    if (!complete) {
      setTried(true);
      return;
    }
    onNext();
  };

  const severityOption = (severe: boolean, label: string, hint: string) => {
    const selected = value.dementiaSevere === severe;
    return (
      <label
        className={`flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border-2 px-3.5 py-2.5 ${
          selected ? 'border-[#52B69A] bg-[#EEF9F5]' : 'border-[#E0E2E5] bg-white'
        }`}
      >
        <input
          type="radio"
          name="dementia-severity"
          checked={selected}
          onChange={() => onChange({ ...value, dementiaSevere: severe })}
          className="mt-0.5 size-[22px] shrink-0 accent-[#2F8466]"
        />
        <span className="flex flex-col">
          <span className="text-[17px] font-semibold">{label}</span>
          <span className="text-sm leading-[21px] text-[#575859]">{hint}</span>
        </span>
      </label>
    );
  };

  return (
    <>
      <StepHeading title={s.flagsTitle} subtitle={s.flagsSubtitle} />
      <AssessmentDisclaimer />

      <label
        className={`flex min-h-16 cursor-pointer items-start gap-3.5 rounded-2xl border-2 px-[18px] py-4 ${
          value.noSpecialConditions ? 'border-[#52B69A] bg-[#EEF9F5]' : 'border-[#E0E2E5] bg-white'
        }`}
      >
        <input
          type="checkbox"
          checked={value.noSpecialConditions}
          onChange={toggleNone}
          className="mt-0.5 size-6 shrink-0 accent-[#2F8466]"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-lg leading-7 font-bold lg:text-[19px]">{s.flagsNoneLabel}</span>
          <span className="text-[15px] leading-[23px] text-[#575859]">{isSelf ? s.flagsNoneHintSelf : s.flagsNoneHint}</span>
        </span>
      </label>

      <div role="status" aria-live="polite">
        {notice && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-[#F0F1F3] px-4 py-3 text-base leading-6">
            <span className="flex items-center gap-2.5">
              <InfoIcon size={20} className="shrink-0" />
              {notice}
            </span>
            {undo && (
              <button
                type="button"
                onClick={() => {
                  onChange(undo);
                  setUndo(null);
                  setNotice('');
                }}
                className="min-h-11 cursor-pointer rounded-[10px] border-2 border-[#2F8466] bg-white px-4 text-base font-bold text-[#1F5E43]"
              >
                {s.flagsUndo}
              </button>
            )}
          </div>
        )}
      </div>

      <div aria-hidden="true" className="flex items-center gap-3 text-[15px] text-[#575859]">
        <span className="h-px flex-1 bg-[#E0E2E5]" />
        {s.flagsDivider}
        <span className="h-px flex-1 bg-[#E0E2E5]" />
      </div>

      <div className="text-[17px] font-bold">{s.flagsCount(value.flags.length)}</div>

      <fieldset className="m-0 grid min-w-0 grid-cols-1 gap-3 border-0 p-0 md:grid-cols-2">
        <legend className="sr-only">{s.flagsGroupLabel}</legend>
        {codes.map((code) => {
          const checked = value.flags.includes(code);
          const known = (s.flags as Record<string, { label: string; desc: string } | undefined>)[code];
          const showSeverity = code === DEMENTIA_FLAG && checked;
          return (
            <div
              key={code}
              className={`flex flex-col gap-3.5 rounded-2xl border-2 p-4 ${
                checked ? 'border-[#52B69A] bg-[#EEF9F5]' : 'border-[#E0E2E5] bg-white'
              } ${showSeverity ? 'md:col-span-2' : ''}`}
            >
              <label className="flex min-h-[52px] cursor-pointer items-start gap-3.5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFlag(code)}
                  className="mt-0.5 size-6 shrink-0 accent-[#2F8466]"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[17px] leading-[26px] font-bold lg:text-lg lg:leading-[27px]">{flagLabel(s, code)}</span>
                  {known?.desc && <span className="text-[15px] leading-[23px] text-[#575859]">{known.desc}</span>}
                </span>
              </label>

              {showSeverity && (
                <fieldset
                  aria-invalid={severityError || undefined}
                  aria-describedby={severityError ? 'dementia-severity-error' : undefined}
                  className={`m-0 flex min-w-0 flex-col gap-2.5 rounded-xl border-2 bg-white px-3.5 pt-3 pb-3.5 sm:ml-[38px] ${
                    severityError ? 'border-[#DC2626]' : 'border-[#C9E7DA]'
                  }`}
                >
                  <legend className="px-1.5 text-base font-bold">{s.severityLegend}</legend>
                  {severityOption(false, s.severityMild, s.severityMildHint)}
                  {severityOption(true, s.severitySevere, s.severitySevereHint)}
                  {severityError && (
                    <span id="dementia-severity-error" className="flex items-center gap-1.5 text-[15px] font-semibold text-[#B91C1C]">
                      <AlertIcon size={16} strokeWidth={2.5} />
                      {s.flagsErrorSeverity}
                    </span>
                  )}
                </fieldset>
              )}
            </div>
          );
        })}
      </fieldset>

      {emptyError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[14px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3.5 text-[17px] leading-[26px] text-[#991B1B]"
        >
          <AlertIcon size={22} className="mt-0.5 shrink-0" />
          <span>{s.flagsErrorEmpty}</span>
        </div>
      )}

      <StepActions
        backLabel={s.back}
        onBack={onBack}
        primary={
          <button type="button" onClick={handleNext} className={PRIMARY_BUTTON_CLASS}>
            {s.flagsNext}
            <ArrowRightIcon size={20} />
          </button>
        }
      />
      <p className="m-0 text-center text-[15px] leading-[23px] text-[#575859]">{s.leaveWarning}</p>
    </>
  );
}
