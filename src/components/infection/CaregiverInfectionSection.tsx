import { useInfectionStrings } from '../../lib/infectionStrings';
import { formatAckTime, infectionKey, type InfectionDisclosure } from '../../lib/infectionDisclosure';

/**
 * ส่วนโรคติดเชื้อในคำขอรับงานฝั่งผู้ดูแล (S10 · PYG-620 · Design PYG-616)
 * วางเหนือปุ่มตอบรับ — เห็นก่อนกดรับงานโดยไม่ต้องเปิดหน้าอื่น (R4)
 *
 * ★ "ยังไม่ได้ระบุ" (null) ต้องไม่ดูเหมือน "ไม่มี" (false) — กรอบเส้นประ + ไอคอน + ข้อความต่างกัน (E1)
 * ★ สถานะทุกแบบมีไอคอนและข้อความกำกับ ไม่สื่อด้วยสีอย่างเดียว
 */
export default function CaregiverInfectionSection({
  disclosure,
  loading,
  error,
  onRetry,
  showAck,
  ack,
  onAckChange,
  changed,
  ackedAt,
}: {
  disclosure: InfectionDisclosure | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** แสดงช่องรับทราบ (คำขอที่ยังรอตอบรับ) */
  showAck: boolean;
  ack: boolean;
  onAckChange: (checked: boolean) => void;
  /** BE ตอบ INFECTION_ACK_REQUIRED — ญาติเพิ่งแก้ค่า (E2) */
  changed: boolean;
  /** เวลาที่รับทราบค่าล่าสุด (ISO) */
  ackedAt: string | null;
}) {
  const s = useInfectionStrings();

  if (!disclosure) {
    if (!loading && !error) return null;
    return (
      <section
        aria-labelledby="infection-title"
        className="rounded-[20px] border-2 border-[#1B5C48] bg-white p-5"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <h2 id="infection-title" className="text-lg font-bold text-[#1A1A1A]">
          {s.cgTitle}
        </h2>
        {loading ? (
          <div className="mt-3 h-16 animate-pulse rounded-xl bg-gray-100" />
        ) : (
          <div role="alert" className="mt-3 flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-[#FEF2F2] p-4">
            <p className="text-sm font-semibold text-red-700">{s.cgLoadFailed}</p>
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[44px] cursor-pointer rounded-xl bg-[#1B5C48] px-4 text-sm font-bold text-white hover:bg-[#164B3B]"
            >
              {s.cgRetry}
            </button>
          </div>
        )}
      </section>
    );
  }

  const key = infectionKey(disclosure.hasInfectiousDisease);
  const view = {
    yes: {
      title: s.cgYes,
      sub: s.cgYesSub,
      icon: 'warning_amber',
      box: 'border-[1.5px] border-[#E8C77A] bg-[#FFF6E5] text-[#5A3F0C]',
      iconBox: 'bg-[#FDE9BF] text-[#6B4E12]',
    },
    no: {
      title: s.cgNo,
      sub: '',
      icon: 'remove_circle_outline',
      box: 'border-[1.5px] border-[#C9D0CD] bg-[#F2F4F3] text-[#1A1A1A]',
      iconBox: 'bg-[#E3E8E6] text-[#33453D]',
    },
    unset: {
      title: s.cgUnset,
      sub: s.cgUnsetSub,
      icon: 'help_outline',
      box: 'border-[1.5px] border-dashed border-[#8C9692] bg-white text-[#1A1A1A]',
      iconBox: 'bg-[#EEF1F0] text-[#33453D]',
    },
  }[key];

  return (
    <section
      aria-labelledby="infection-title"
      className={`rounded-[20px] border-2 bg-white p-5 ${showAck && !ack ? 'border-[#1B5C48]' : 'border-[#E0E2E5]'}`}
      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
    >
      <h2 id="infection-title" className="text-lg font-bold text-[#1A1A1A]">
        {s.cgTitle}
      </h2>

      {changed && (
        <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#E8C77A] bg-[#FFF6E5] px-3.5 py-3 text-sm leading-relaxed text-[#5A3F0C]">
          <span className="material-icons mt-0.5" style={{ fontSize: 18 }} aria-hidden="true">
            refresh
          </span>
          <span>
            <b>{s.cgChangedTitle}</b> {s.cgChangedBody}
          </span>
        </div>
      )}

      <div className={`mt-3 flex items-start gap-3 rounded-2xl px-4 py-3.5 ${view.box}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${view.iconBox}`} aria-hidden="true">
          <span className="material-icons" style={{ fontSize: 22 }}>
            {view.icon}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-snug">{view.title}</p>
          {view.sub && <p className="mt-0.5 text-sm leading-relaxed">{view.sub}</p>}
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[#4A4F4C]">{s.cgDisclaimer}</p>

      {showAck && (
        <label
          className={`mt-3.5 flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl px-3.5 py-3 ${
            ack ? 'border-[1.5px] border-[#1B5C48] bg-[#EAF6F0]' : 'border-[1.5px] border-[#C9D0CD] bg-[#F6FAF9]'
          }`}
        >
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => onAckChange(e.target.checked)}
            className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-[#1B5C48]"
          />
          <span className="text-base font-bold leading-relaxed text-[#1A1A1A]">{s.cgAck}</span>
        </label>
      )}

      {!showAck && ackedAt && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#1B5C48]">
          <span className="material-icons" style={{ fontSize: 18 }} aria-hidden="true">
            check_circle
          </span>
          {s.cgAckedAt(formatAckTime(ackedAt))}
        </p>
      )}
    </section>
  );
}
