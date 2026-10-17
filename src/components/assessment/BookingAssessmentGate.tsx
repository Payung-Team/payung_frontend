import { useAssessmentStrings } from '../../lib/assessmentStrings';
import Spinner from '../ui/Spinner';
import { AlertIcon, ArrowRightIcon, ClipboardCheckIcon } from './assessmentIcons';

/**
 * กล่อง "ต้องทำแบบประเมินก่อนจอง" ในขั้นผู้รับบริการของการจอง (Design D5 / M5 · AC9, AC10)
 *
 *   existing — เลือกโปรไฟล์ที่ยังไม่มีแบบประเมิน (ผู้ใช้เดิมก่อนฟีเจอร์นี้, E8)
 *   new      — กรอกผู้รับบริการรายใหม่เอง: BE ไม่ให้จองโดยไม่มีโปรไฟล์ที่ประเมินแล้ว
 *              จึงต้องบันทึกโปรไฟล์ก่อนแล้วค่อยพาไปประเมิน (ไม่อยู่ใน Design — เพิ่มเพื่อไม่ให้เป็นทางตัน)
 */
export default function BookingAssessmentGate({
  variant,
  name,
  busy = false,
  error,
  onStart,
  onChooseOther,
}: {
  variant: 'existing' | 'new';
  name: string;
  busy?: boolean;
  error?: string | null;
  onStart: () => void;
  onChooseOther?: () => void;
}) {
  const s = useAssessmentStrings();
  const title = variant === 'existing' ? s.gateTitle(name) : s.gateNewTitle;
  const body = variant === 'existing' ? s.gateBody(name) : s.gateNewBody;

  return (
    <div
      role="alert"
      className="flex flex-col gap-3.5 rounded-2xl border-2 border-[#F59E0B] bg-white p-4 sm:p-5"
      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
    >
      <div className="flex items-start gap-3.5">
        <div
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF3C7] text-[#92400E]"
        >
          <ClipboardCheckIcon size={26} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="m-0 text-lg leading-7 font-bold text-[#1A1A1A] sm:text-[21px] sm:leading-[30px]">{title}</h3>
          <p className="m-0 text-base leading-[26px] text-[#3F4142] sm:text-[17px] sm:leading-[27px]">{body}</p>
        </div>
      </div>
      {variant === 'existing' && (
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-base leading-[25px] text-[#3F4142] sm:pl-[62px]">
          <li>{s.gatePointTime}</li>
          <li>{s.gatePointKept}</li>
          <li>{s.gatePointReturn(name)}</li>
        </ul>
      )}
      {error && (
        <p className="m-0 flex items-center gap-2 text-sm font-semibold text-[#B91C1C] sm:pl-[62px]">
          <AlertIcon size={18} className="shrink-0" />
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3 sm:pl-[62px]">
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="inline-flex min-h-[52px] flex-[1_1_220px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#2F8466] px-5 text-[17px] font-bold text-white hover:bg-[#28735A] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && <Spinner size="sm" />}
          {busy ? s.gateNewSaving : variant === 'existing' ? s.gateCta : s.gateNewCta}
          {!busy && <ArrowRightIcon size={20} />}
        </button>
        {onChooseOther && (
          <button
            type="button"
            onClick={onChooseOther}
            disabled={busy}
            className="inline-flex min-h-[52px] flex-[1_1_160px] cursor-pointer items-center justify-center rounded-xl border-2 border-[#C9CBCE] bg-white px-5 text-[17px] font-semibold text-[#1A1A1A] hover:bg-gray-50"
          >
            {s.gateAlt}
          </button>
        )}
      </div>
    </div>
  );
}
