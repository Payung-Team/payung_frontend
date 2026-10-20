import { ADL_ITEMS, UNSURE_FLAG_THRESHOLD, useAssessmentStrings, type AdlCode } from '../../lib/assessmentStrings';
import { AssessmentDisclaimer, PRIMARY_BUTTON_CLASS, StepActions, StepHeading } from './AssessmentLayout';
import { AlertIcon, ArrowRightIcon, CheckIcon, QuestionIcon, QuestionMarkIcon } from './assessmentIcons';
import { adlNumber, adlQuestionId, missingAdlCodes, unsureAdlCodes, type AdlAnswers } from './assessmentForm';

/**
 * ขั้น 2 แบบประเมิน ADL — ทุกข้อในหน้าเดียว บังคับตอบทุกข้อ (AC1) มีตัวเลือก "ไม่แน่ใจ" ทุกข้อ (AC5)
 *
 * กดถัดไปตอนยังตอบไม่ครบ → แถบ error ด้านบนบอกจำนวน + error ใต้ข้อที่ยังไม่ตอบ แล้วเลื่อนไปข้อแรก
 * (Design M2) ผู้เรียกเป็นคนเลื่อนและย้ายโฟกัส เพราะต้องรอ render error ก่อน
 */
export default function AdlStep({
  answers,
  showErrors,
  onAnswer,
  onBack,
  onNext,
  backLabel,
}: {
  answers: AdlAnswers;
  showErrors: boolean;
  onAnswer: (code: AdlCode, value: number | null) => void;
  onBack: () => void;
  onNext: () => void;
  /** Onboarding: ปุ่มซ้ายเป็น "ออกจากระบบ" เพราะไม่มีหน้าก่อนหน้าให้ย้อนกลับไป */
  backLabel?: string;
}) {
  const s = useAssessmentStrings();
  const total = ADL_ITEMS.length;
  const missing = missingAdlCodes(answers);
  const unsureCount = unsureAdlCodes(answers).length;
  const answered = total - missing.length;
  const firstMissing = missing[0];

  return (
    <>
      <StepHeading title={s.adlTitle} subtitle={s.adlSubtitle} />
      <AssessmentDisclaimer />

      {/* ความคืบหน้า — ติดขอบบนตอนเลื่อน (ใต้หัวมือถือ) */}
      <div className="sticky top-[76px] z-10 flex flex-col gap-2 border-b border-[#E0E2E5] bg-white pt-3.5 pb-3 lg:top-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3 text-[17px]">
          <span className="font-bold" aria-live="polite">
            {s.adlProgress(answered, total)}
          </span>
          {unsureCount > 0 && <span className="text-[15px] text-[#575859]">{s.adlUnsureCount(unsureCount)}</span>}
        </div>
        <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-[#E3F2EA]">
          <div
            className="h-full rounded-full bg-[#52B69A] transition-[width]"
            style={{ width: `${Math.round((answered / total) * 100)}%` }}
          />
        </div>
      </div>

      {showErrors && firstMissing && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[14px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3.5 text-[15px] leading-[23px] text-[#991B1B] lg:text-[17px] lg:leading-[26px]"
        >
          <AlertIcon size={22} className="mt-0.5 shrink-0" />
          <span>
            <b>{s.adlErrorBanner(missing.length)}</b> ({missing.map((c) => s.questionNumber(adlNumber(c))).join(', ')})
            <br />
            <a href={`#${adlQuestionId(firstMissing)}`} className="inline-block py-1 font-bold text-[#991B1B] underline">
              {s.adlGoTo(adlNumber(firstMissing))}
            </a>
          </span>
        </div>
      )}

      {unsureCount >= UNSURE_FLAG_THRESHOLD && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[14px] border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-sm leading-[21px] text-[#78350F] lg:text-base lg:leading-[25px]"
        >
          <QuestionIcon size={22} className="mt-0.5 shrink-0" />
          <span>
            {s.unsureThreshold} <b>{s.unsureThresholdFlag}</b> {s.unsureThresholdTail}
          </span>
        </div>
      )}

      {ADL_ITEMS.map((item, index) => {
        const text = s.adl[item.code];
        const value = answers[item.code];
        const isUnsure = value === null;
        const isAnswered = typeof value === 'number';
        const isError = showErrors && value === undefined;
        const n = index + 1;
        const id = adlQuestionId(item.code);
        const errorId = `${id}-error`;
        const scores = Array.from({ length: item.maxScore + 1 }, (_, i) => item.maxScore - i);
        const cardTone = isError
          ? 'border-[#DC2626] bg-[#FFF7F7]'
          : isUnsure
            ? 'border-[#D97706] bg-white'
            : isAnswered
              ? 'border-[#52B69A] bg-white'
              : 'border-[#E0E2E5] bg-white';

        return (
          <section
            key={item.code}
            id={id}
            tabIndex={-1}
            aria-labelledby={`${id}-title`}
            className={`flex scroll-mt-[150px] flex-col gap-3.5 rounded-[18px] border-2 p-4 outline-none lg:scroll-mt-[110px] lg:gap-4 lg:p-5 ${cardTone}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
                <div className="text-sm font-semibold text-[#575859] lg:text-[15px]">{s.adlQuestionOf(n, ADL_ITEMS.length)}</div>
                <h2 id={`${id}-title`} className="m-0 text-xl leading-7 font-bold lg:text-[23px] lg:leading-8">
                  {text.title}
                </h2>
                {text.hint && <p className="m-0 text-sm leading-[21px] text-[#575859] lg:text-base lg:leading-6">{text.hint}</p>}
              </div>
              {isAnswered && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3F2EA] px-3 py-1 text-sm font-semibold text-[#1F5E43] lg:text-[15px]">
                  <CheckIcon size={16} />
                  {s.statusAnswered}
                </span>
              )}
              {isUnsure && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-sm font-semibold text-[#78350F] lg:text-[15px]">
                  <QuestionMarkIcon size={16} />
                  {s.statusUnsure}
                </span>
              )}
              {isError && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEE2E2] px-3 py-1 text-sm font-semibold text-[#991B1B] lg:text-[15px]">
                  <AlertIcon size={16} strokeWidth={2.5} />
                  {s.statusMissing}
                </span>
              )}
            </div>

            <fieldset
              className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0 lg:gap-2.5"
              aria-invalid={isError || undefined}
              aria-describedby={isError ? errorId : undefined}
            >
              <legend className="sr-only">{text.title}</legend>
              {scores.map((score) => {
                const option = text.options[score];
                const selected = value === score;
                return (
                  <label
                    key={score}
                    className={`flex min-h-[60px] cursor-pointer items-start gap-3.5 rounded-[14px] border-2 px-4 py-3 lg:py-3.5 ${
                      selected ? 'border-[#52B69A] bg-[#EEF9F5]' : 'border-[#E0E2E5] bg-white hover:border-[#C9CBCE]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`adl-${item.code}`}
                      checked={selected}
                      onChange={() => onAnswer(item.code, score)}
                      className="mt-[3px] size-[22px] shrink-0 accent-[#2F8466]"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[17px] leading-[25px] font-semibold lg:text-lg lg:leading-[27px]">{option?.label}</span>
                      {option?.desc && <span className="text-sm leading-5 text-[#575859] lg:text-[15px] lg:leading-[23px]">{option.desc}</span>}
                    </span>
                  </label>
                );
              })}
              <div aria-hidden="true" className="my-1 flex items-center gap-3 text-sm text-[#6B6D70]">
                <span className="h-px flex-1 bg-[#E0E2E5]" />
                {s.or}
                <span className="h-px flex-1 bg-[#E0E2E5]" />
              </div>
              <label
                className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-full border-2 border-dashed px-5 py-2.5 ${
                  isUnsure ? 'border-[#D97706] bg-[#FFFBEB] text-[#78350F]' : 'border-[#9A9DA1] bg-[#FAFAF9] text-[#3F4142]'
                }`}
              >
                <input
                  type="radio"
                  name={`adl-${item.code}`}
                  checked={isUnsure}
                  onChange={() => onAnswer(item.code, null)}
                  className="size-[22px] shrink-0 accent-[#B45309]"
                />
                <QuestionIcon size={22} className="shrink-0" />
                <span className="flex flex-col">
                  <span className="text-[17px] font-semibold">{s.unsureLabel}</span>
                  <span className="text-sm leading-5">{s.unsureHint}</span>
                </span>
              </label>
            </fieldset>

            {isError && (
              <p id={errorId} className="m-0 flex items-center gap-2 text-base font-semibold text-[#B91C1C]">
                <AlertIcon size={18} strokeWidth={2.5} />
                {s.adlErrorItem}
              </p>
            )}
          </section>
        );
      })}

      <StepActions
        backLabel={backLabel ?? s.back}
        onBack={onBack}
        primary={
          <button type="button" onClick={onNext} className={PRIMARY_BUTTON_CLASS}>
            {s.adlNext}
            <ArrowRightIcon size={20} />
          </button>
        }
      />
      <p className="m-0 text-center text-[15px] leading-[23px] text-[#575859]">{s.leaveWarning}</p>
    </>
  );
}
