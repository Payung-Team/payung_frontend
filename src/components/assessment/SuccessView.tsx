import { useContext } from 'react';
import type { CareRecipientAssessment } from '../../graphql/assessment';
import { AssessmentSelfContext } from './assessmentForm';
import { chosenFlagLabels, formatAssessedAt, useAssessmentStrings } from '../../lib/assessmentStrings';
import type { AssessmentEntry } from '../../lib/assessmentNav';
import { ArrowRightIcon, CheckIcon, InfoIcon, QuestionMarkIcon } from './assessmentIcons';

/**
 * บันทึกเรียบร้อย (Design D4 / M6) — end flow ปุ่มหลักเปลี่ยนตามทางเข้า
 * ★ ทุกค่าในหน้านี้มาจากผลที่ BE ตอบกลับ (คะแนน, Flag ที่ระบบตั้ง, วันที่ประเมิน) — AC2, AC8
 */
export default function SuccessView({
  entry,
  name,
  result,
  onContinue,
}: {
  entry: AssessmentEntry;
  name: string;
  result: CareRecipientAssessment;
  onContinue: () => void;
}) {
  const s = useAssessmentStrings();
  const isSelf = useContext(AssessmentSelfContext);
  const chosen = result.noSpecialConditions
    ? [s.flagsNoneLabel]
    : chosenFlagLabels(s, result.flags, result.dementiaSevere);
  const cta =
    entry === 'onboarding' ? s.successCtaOnboarding : entry === 'booking' ? s.successCtaBooking : s.successCtaProfile;

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-6 text-center">
      <div
        aria-hidden="true"
        className="flex size-[88px] items-center justify-center rounded-full bg-[#E3F2EA] text-[#2F8466] lg:size-[104px]"
      >
        <CheckIcon size={52} strokeWidth={2.5} />
      </div>
      <div role="status" className="flex flex-col gap-2">
        <h1 className="m-0 text-[28px] leading-9 font-bold lg:text-[34px] lg:leading-[44px]">{s.successTitle}</h1>
        <p className="m-0 text-base leading-7 text-[#575859] lg:text-lg">
          {s.successMeta(name, formatAssessedAt(result.assessedAt))}
        </p>
      </div>

      <section
        aria-labelledby="ok-result"
        className="flex w-full flex-col gap-4 rounded-[20px] border border-[#E0E2E5] bg-[#F6FAF9] p-5 text-left lg:p-6"
      >
        <h2 id="ok-result" className="m-0 text-lg font-bold">
          {s.successResult}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-[1_1_180px] items-baseline gap-2">
            <span className="text-[52px] leading-[56px] font-bold text-[#1B5C48]">{result.adlTotalScore}</span>
            <span className="text-xl font-semibold text-[#575859]">{s.successScoreUnit}</span>
          </div>
          <div className="flex flex-[2_1_260px] flex-wrap gap-2">
            {chosen.map((label) => (
              <span key={label} className="rounded-full bg-[#E3F2EA] px-3 py-1.5 text-[15px] font-semibold text-[#1F5E43]">
                {label}
              </span>
            ))}
            {result.hasUnsureFlag && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-[15px] font-semibold text-[#78350F]">
                <QuestionMarkIcon size={14} />
                {s.unsureFlagLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2.5 border-t border-[#E0E2E5] pt-3.5 text-[15px] leading-[23px] text-[#3F4142]">
          <InfoIcon size={20} className="mt-0.5 shrink-0" />
          <span>{isSelf ? s.disclaimerTitleSelf : s.disclaimerTitle}</span>
        </div>
      </section>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onContinue}
          className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2F8466] text-lg font-bold text-white hover:bg-[#28735A]"
        >
          {cta}
          <ArrowRightIcon size={20} />
        </button>
        {entry === 'booking' && <span className="text-[15px] text-[#575859]">{s.successCtaBookingNote}</span>}
      </div>
    </div>
  );
}
