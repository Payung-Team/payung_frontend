import {
  ADL_ITEMS,
  ADL_MAX_TOTAL,
  UNSURE_FLAG_THRESHOLD,
  chosenFlagLabels,
  useAssessmentStrings,
} from '../../lib/assessmentStrings';
import type { AssessmentEntry } from '../../lib/assessmentNav';
import Spinner from '../ui/Spinner';
import { AssessmentDisclaimer, PRIMARY_BUTTON_CLASS, StepActions, StepHeading } from './AssessmentLayout';
import { AlertIcon, CheckIcon, PencilIcon, QuestionIcon, QuestionMarkIcon } from './assessmentIcons';
import { adlNumber, previewAdlScore, unsureAdlCodes, type AdlAnswers, type FlagsValue } from './assessmentForm';

/**
 * ขั้น 4 สรุปผลก่อนบันทึก (Design D3 / M4)
 *
 * ★ คะแนนในหน้านี้คำนวณฝั่ง client เพื่อแสดงผลเท่านั้น — ค่าที่บันทึกคือค่าที่ BE คำนวณ
 *   (หน้าบันทึกเรียบร้อยแสดงค่าจาก API)
 * ★ E2: เลือก "ไม่มีเงื่อนไขพิเศษ" แต่ตอบไม่แน่ใจ ≥ 3 ข้อ → แสดงทั้งสองอย่างได้
 */
export default function SummaryStep({
  entry,
  answers,
  flags,
  saving,
  errorMessage,
  onEditAdl,
  onEditFlags,
  onBack,
  onSave,
}: {
  entry: AssessmentEntry;
  answers: AdlAnswers;
  flags: FlagsValue;
  saving: boolean;
  errorMessage: string;
  onEditAdl: () => void;
  onEditFlags: () => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const s = useAssessmentStrings();
  const total = previewAdlScore(answers);
  const unsure = unsureAdlCodes(answers);
  const hasSystemFlag = unsure.length >= UNSURE_FLAG_THRESHOLD;
  const unsureList = unsure.map((c) => s.questionNumber(adlNumber(c))).join(', ');
  const chosen = flags.noSpecialConditions
    ? [s.flagsNoneLabel]
    : chosenFlagLabels(s, flags.flags, flags.dementiaSevere);

  const editLink = (onClick: () => void, label: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-base font-bold text-[#1F5E43] underline-offset-2 hover:underline"
    >
      <PencilIcon size={18} />
      {s.edit}
    </button>
  );

  return (
    <>
      <StepHeading title={s.summaryTitle} subtitle={s.summarySubtitle} />
      <AssessmentDisclaimer body={s.disclaimerSummaryBody} />

      <section
        aria-labelledby="score-title"
        className="flex flex-col gap-3.5 rounded-[20px] border-2 border-[#52B69A] bg-[#F6FAF9] p-5 lg:p-6"
      >
        <h2 id="score-title" className="m-0 text-lg font-bold text-[#1F5E43] lg:text-[19px]">
          {s.scoreTitle}
        </h2>
        <div className="flex items-baseline gap-2.5">
          <span className="text-[56px] leading-[60px] font-bold text-[#1B5C48] lg:text-[72px] lg:leading-[76px]">{total}</span>
          <span className="text-xl font-semibold text-[#575859] lg:text-[26px]">{s.scoreOutOf}</span>
        </div>
        <div aria-hidden="true" className="flex flex-col gap-1.5">
          <div className="h-3 overflow-hidden rounded-full bg-[#DCEFE6]">
            <div className="h-full rounded-full bg-[#2F8466]" style={{ width: `${Math.round((total / ADL_MAX_TOTAL) * 100)}%` }} />
          </div>
          <div className="flex justify-between gap-2 text-sm text-[#575859]">
            <span>{s.scoreScaleLow}</span>
            <span className="text-right">{s.scoreScaleHigh}</span>
          </div>
        </div>
        <div className="text-base leading-[25px] text-[#3F4142]">{s.scoreFrom(ADL_ITEMS.length - unsure.length, unsure.length)}</div>
        <div className="text-[13px] text-[#575859]">{s.scorePreviewNote}</div>
      </section>

      {hasSystemFlag && (
        <div
          role="note"
          className="flex items-start gap-3.5 rounded-2xl border-2 border-[#FCD34D] bg-[#FFFBEB] px-[18px] py-4 text-base leading-[25px] text-[#78350F]"
        >
          <QuestionIcon size={24} className="mt-px shrink-0" />
          <span>
            <b className="text-[17px]">{s.systemFlagTitle}</b>
            <br />
            {s.systemFlagBody(unsure.length, unsureList)}
          </span>
        </div>
      )}

      <section aria-labelledby="flags-title" className="flex flex-col gap-3.5 rounded-[18px] border border-[#E0E2E5] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="flags-title" className="m-0 text-xl font-bold">
            {s.summaryFlagsTitle}
          </h2>
          {editLink(onEditFlags, `${s.edit} ${s.summaryFlagsTitle}`)}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-[15px] font-semibold text-[#575859]">{s.summaryChosen}</div>
          <div className="flex flex-wrap gap-2">
            {chosen.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#E3F2EA] px-3.5 py-2 text-base font-semibold text-[#1F5E43]"
              >
                <CheckIcon size={16} />
                {label}
              </span>
            ))}
          </div>
        </div>
        {hasSystemFlag && (
          <div className="flex flex-col gap-1.5 border-t border-[#E0E2E5] pt-3">
            <div className="text-[15px] font-semibold text-[#575859]">{s.summarySystem}</div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3.5 py-2 text-base font-semibold text-[#78350F]">
                <QuestionMarkIcon size={16} />
                {s.unsureFlagLabel}
              </span>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="answers-title" className="flex flex-col gap-1.5 rounded-[18px] border border-[#E0E2E5] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="answers-title" className="m-0 text-xl font-bold">
            {s.answersTitle}
          </h2>
          {editLink(onEditAdl, `${s.edit} ${s.answersTitle}`)}
        </div>
        <dl className="m-0 flex flex-col">
          {ADL_ITEMS.map((item, index) => {
            const value = answers[item.code];
            return (
              <div
                key={item.code}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F1F3] py-3 last:border-b-0"
              >
                <dt className="text-base text-[#3F4142]">
                  {s.questionNumber(index + 1)} · {s.adl[item.code].title}
                </dt>
                <dd className="m-0 text-base font-semibold">
                  {value === null || value === undefined ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-0.5 text-[#78350F]">
                      <QuestionMarkIcon size={14} />
                      {s.statusUnsure}
                    </span>
                  ) : (
                    s.adl[item.code].options[value]?.label
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[14px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3.5 text-base leading-6 text-[#991B1B]"
        >
          <AlertIcon size={22} className="mt-px shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <StepActions
        backLabel={s.back}
        onBack={onBack}
        primary={
          // R: กดซ้ำเร็ว ๆ — ปิดปุ่มระหว่างรอ API (ผู้เรียกกันซ้ำอีกชั้นด้วย ref)
          <button type="button" onClick={onSave} disabled={saving} aria-busy={saving} className={PRIMARY_BUTTON_CLASS}>
            {saving ? <Spinner size="sm" /> : <CheckIcon size={20} />}
            {saving ? s.saving : entry === 'booking' ? s.saveFromBooking : s.save}
          </button>
        }
      />
      <p className="m-0 text-center text-[15px] leading-[23px] text-[#575859]">{s.leaveWarning}</p>
    </>
  );
}
