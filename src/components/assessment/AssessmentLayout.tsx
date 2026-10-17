import { useContext, type ReactNode } from 'react';
import { AssessmentSelfContext } from './assessmentForm';
import { useAssessmentStrings } from '../../lib/assessmentStrings';
import type { AssessmentEntry } from '../../lib/assessmentNav';
import { ArrowLeftIcon, CheckIcon, InfoIcon } from './assessmentIcons';
import logoImg from '../../assets/logo_5.png';

export type AssessmentStepKey = 'adl' | 'flags' | 'summary' | 'done';

export interface AssessmentSubject {
  name: string;
  age?: number | null;
  /** โปรไฟล์ของตัวเอง — ผู้ตอบคือเจ้าตัว ไม่ใช่ญาติ */
  isSelf?: boolean;
}

/** ตัวย่อชื่อในวงกลม — คำนำหน้า "คุณ" ไม่นับ */
function initials(name: string): string {
  const parts = name.replace(/^คุณ\s*/, '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join('') || '?';
}

/**
 * โครงหน้าแบบประเมิน (Design PYG-606 D1–D4, M1–M6)
 *   desktop — แถบเขียวด้านซ้ายบอกขั้นตอน + เนื้อหากว้างไม่เกิน 720px
 *   มือถือ  — หัวหน้าจอมีปุ่มย้อนกลับ ชื่อขั้น และแถบความคืบหน้า 4 ช่อง
 *
 * Onboarding มี 4 ขั้น (ขั้น 1 ข้อมูลส่วนตัว ทำเสร็จแล้วจากหน้า Onboarding)
 * ทางเข้าอื่นมีแค่ 3 ขั้นของแบบประเมิน
 *
 * ★ E9: ชื่อคนที่กำลังประเมินต้องเห็นตลอด flow — แสดงทุกขั้นยกเว้นหน้าบันทึกเรียบร้อย
 *   (หน้านั้นมีชื่ออยู่ในหัวข้อแล้ว)
 */
export default function AssessmentLayout({
  entry,
  step,
  subject,
  onBack,
  children,
}: {
  entry: AssessmentEntry;
  step: AssessmentStepKey;
  subject: AssessmentSubject;
  onBack?: () => void;
  children: ReactNode;
}) {
  const s = useAssessmentStrings();
  const withPersonal = entry === 'onboarding';
  const steps: { key: AssessmentStepKey | 'personal'; label: string }[] = [
    ...(withPersonal ? [{ key: 'personal' as const, label: s.stepPersonal }] : []),
    { key: 'adl', label: s.stepAdl },
    { key: 'flags', label: s.stepFlags },
    { key: 'summary', label: s.stepSummary },
  ];
  const isDone = step === 'done';
  const currentIndex = isDone ? steps.length : steps.findIndex((x) => x.key === step);
  const stepText = s.stepOf(currentIndex + 1, steps.length);
  const asideTitle = isDone
    ? s.asideDoneTitle
    : entry === 'onboarding'
      ? s.asideTitleOnboarding
      : entry === 'booking'
        ? s.asideTitleBooking
        : s.asideTitleProfile;
  const ageText = subject.age != null ? ` · ${s.ageSuffix(subject.age)}` : '';

  return (
    <div className="flex min-h-screen w-full bg-white text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      {/* desktop: แถบขั้นตอน */}
      <aside className="sticky top-0 hidden h-screen w-[360px] shrink-0 flex-col gap-7 bg-[#1B5C48] px-7 py-8 text-white lg:flex xl:w-[400px]">
        {/* โลโก้ชุดเดียวกับแถบซ้ายของหน้า Onboarding (AuthLayout) */}
        <img src={logoImg} alt="Payung" className="h-[72px] w-auto self-start object-contain" />

        <div className="flex flex-col gap-1.5">
          <div className="text-base font-semibold text-[#CDEBDF]">{isDone ? s.asideDoneLabel : stepText}</div>
          <div className="text-[32px] font-bold leading-[42px]">{asideTitle}</div>
        </div>
        <ol aria-label={s.stepsLabel} className="m-0 flex list-none flex-col gap-2 p-0">
          {steps.map((item, index) => {
            const done = index < currentIndex;
            const current = index === currentIndex;
            return (
              <li
                key={item.key}
                aria-current={current ? 'step' : undefined}
                className={`flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-2.5 text-base ${
                  current ? 'bg-white font-bold text-[#1B5C48]' : `bg-white/10 ${done ? '' : 'text-[#E3F2EA]'}`
                }`}
              >
                <span
                  className={`inline-flex size-[26px] shrink-0 items-center justify-center rounded-full text-sm ${
                    done
                      ? 'bg-[#A7E3CC] text-[#1B5C48]'
                      : current
                        ? 'bg-[#1B5C48] text-white'
                        : 'border-2 border-[#A7E3CC]'
                  }`}
                >
                  {done ? <CheckIcon size={16} /> : index + 1}
                </span>
                {item.label}
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* มือถือ: หัวหน้าจอ */}
        {!isDone && (
          <header className="sticky top-0 z-20 flex flex-col gap-1.5 border-b border-[#E0E2E5] bg-white px-2 pt-2 pb-2.5 lg:hidden">
            <div className="flex h-12 items-center">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={s.back}
                  className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#1A1A1A] hover:bg-gray-50"
                >
                  <ArrowLeftIcon size={24} />
                </button>
              ) : (
                <span className="w-11 shrink-0" aria-hidden="true" />
              )}
              <div className="flex min-w-0 flex-1 flex-col items-center">
                <span className="text-[17px] font-bold">{steps[currentIndex]?.label}</span>
                <span className="text-[13px] text-[#575859]">{stepText}</span>
              </div>
              <span className="w-11 shrink-0" aria-hidden="true" />
            </div>
            <div aria-hidden="true" className="flex gap-1 px-2">
              {steps.map((item, index) => (
                <span
                  key={item.key}
                  className={`h-1 flex-1 rounded ${index <= currentIndex ? 'bg-[#52B69A]' : 'bg-[#E0E2E5]'}`}
                />
              ))}
            </div>
          </header>
        )}
        {!isDone && (
          <div className="flex items-center gap-2.5 border-b border-[#E0E2E5] bg-[#F6FAF9] px-4 py-2 lg:hidden">
            <div
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1B5C48] text-[13px] font-bold text-white"
            >
              {initials(subject.name)}
            </div>
            <span className="min-w-0 truncate text-[15px] text-[#3F4142]">
              {s.subjectLabelShort} <b className="text-[#1A1A1A]">{subject.name}</b>
              {ageText}
            </span>
          </div>
        )}

        <main className={`flex flex-1 justify-center px-4 pb-16 sm:px-5 ${isDone ? 'pt-12 lg:pt-16' : 'pt-4 lg:pt-10'}`}>
          <div className="flex w-full max-w-[720px] flex-col gap-4 lg:gap-5">
            {!isDone && (
              <div className="hidden items-center gap-3 rounded-[14px] border border-[#E0E2E5] bg-[#F6FAF9] px-4 py-3 lg:flex">
                <div
                  aria-hidden="true"
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#1B5C48] text-lg font-bold text-white"
                >
                  {initials(subject.name)}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="text-sm text-[#575859]">{s.subjectLabel}</div>
                  <div className="truncate text-[19px] font-bold">
                    {subject.name}
                    {ageText}
                  </div>
                </div>
              </div>
            )}
            <AssessmentSelfContext.Provider value={!!subject.isSelf}>{children}</AssessmentSelfContext.Provider>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * ข้อความแจ้ง AC7 / R9 — ทุกหน้าของแบบประเมิน
 * ประเมินโปรไฟล์ของตัวเอง → ใช้ข้อความ "ประเมินด้วยตัวเอง" แทน "ญาติเป็นผู้ประเมิน" ที่จะผิดความจริง
 */
export function AssessmentDisclaimer({ body }: { body?: string }) {
  const s = useAssessmentStrings();
  const isSelf = useContext(AssessmentSelfContext);
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-xl border border-[#A7D8C2] bg-[#EEF9F5] px-3 py-2.5 text-sm leading-[21px] text-[#1F5E43] lg:gap-3 lg:rounded-[14px] lg:px-4 lg:py-3.5 lg:text-base lg:leading-[25px]"
    >
      <InfoIcon size={20} className="mt-0.5 shrink-0" />
      <span>
        <b>{isSelf ? s.disclaimerTitleSelf : s.disclaimerTitle}</b>
        <br />
        {body ?? (isSelf ? s.disclaimerBodySelf : s.disclaimerBody)}
      </span>
    </div>
  );
}

/** หัวข้อของแต่ละขั้น */
export function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-1 lg:gap-2">
      <h1 className="m-0 text-2xl leading-8 font-bold lg:text-[32px] lg:leading-[42px]">{title}</h1>
      <p className="m-0 text-base leading-6 text-[#575859] lg:text-lg lg:leading-7">{subtitle}</p>
    </div>
  );
}

/** ปุ่มย้อนกลับ / ถัดไป ท้ายแต่ละขั้น */
export function StepActions({
  backLabel,
  onBack,
  primary,
}: {
  backLabel: string;
  onBack: () => void;
  primary: ReactNode;
}) {
  return (
    <div className="flex flex-wrap-reverse justify-between gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-14 flex-[1_1_160px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-[#C9CBCE] bg-white px-6 text-lg font-semibold text-[#1A1A1A] hover:bg-gray-50"
      >
        <ArrowLeftIcon size={20} />
        {backLabel}
      </button>
      {primary}
    </div>
  );
}

export const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-14 flex-[2_1_240px] cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[#2F8466] px-7 text-lg font-bold text-white hover:bg-[#28735A] disabled:cursor-not-allowed disabled:opacity-60';
