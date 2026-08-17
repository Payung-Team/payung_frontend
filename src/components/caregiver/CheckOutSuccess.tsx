/**
 * CheckOutSuccess — หน้าจอหลังปิดงานสำเร็จ (PYG-358 STEP 4.2 + STEP 5)
 *
 * ★ ห้ามมีคำว่า "รอลูกค้ายืนยัน" หรือ "รอผู้รับบริการยืนยัน" ในไฟล์นี้เด็ดขาด
 *   ตั้งแต่ 2026-07-27 การกดเช็คเอาท์ของผู้ดูแล = งานจบแล้วจริง ๆ
 *   ถ้ายังเขียนว่ารอยืนยัน ผู้ดูแลจะเข้าใจว่ายังมีอะไรค้างอยู่
 */
import { formatDurationTh, reviewReasonTh, type ProofOfWorkSummary } from '../../lib/monitoring';
import ProofOfWorkPanel from './ProofOfWorkPanel';

interface CheckOutSuccessProps {
  bookingRef: string;
  /** วันที่ให้บริการ แปลงเป็นไทยมาแล้ว เช่น "12 มิ.ย. 2569" */
  bookingDateText: string;
  price: number;
  proof: ProofOfWorkSummary;
  onBack: () => void;
}

export default function CheckOutSuccess({
  bookingRef,
  bookingDateText,
  price,
  proof,
  onBack,
}: Readonly<CheckOutSuccessProps>) {
  const needsReview = proof.verdict === 'needs_review';

  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B69A] focus-visible:ring-offset-2';

  return (
    <div className="min-h-screen bg-[#F6FAF9]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-12">
        {/* ── หัวเรื่อง ── */}
        <div className="rounded-2xl border border-[#E0E2E5] bg-white px-5 py-8 text-center shadow-[0_1px_4px_rgba(0,0,0,0.03)] sm:px-8">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              needsReview ? 'bg-[#FFFBEB]' : 'bg-[#E6F5ED]'
            }`}
          >
            <span
              className={`material-icons text-[34px] ${needsReview ? 'text-[#D97706]' : 'text-[#3AA981]'}`}
            >
              {needsReview ? 'fact_check' : 'check_circle'}
            </span>
          </div>

          <h1 className="mt-4 text-[22px] font-bold leading-8 text-[#1A1A1A]">
            {needsReview ? 'ปิดงานแล้ว' : 'ปิดงานเรียบร้อย'}
          </h1>
          <p className="mx-auto mt-2 max-w-[440px] text-[14px] leading-6 text-[#6B7280]">
            {needsReview
              ? 'แอดมินจะตรวจสอบก่อนโอนเงินให้คุณ'
              : 'ระบบจะโอนเงินให้คุณภายใน 24 ชั่วโมง โดยไม่ต้องรอใครกดยืนยันอีก'}
          </p>

          {/* เหตุผลที่ต้องให้แอดมินดู — ต้องแปลไทยครบทุกค่า */}
          {needsReview && proof.reviewReasons.length > 0 && (
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {proof.reviewReasons.map((reason) => (
                <li
                  key={reason}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFBEB] px-3 py-1.5 text-[12px] font-semibold text-[#B45309]"
                >
                  <span className="material-icons text-[14px]">info</span>
                  {reviewReasonTh(reason)}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 border-t border-[#F0F1F3] pt-5 text-left">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8C8E]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Job ID
            </p>
            <p
              className="mt-1 text-[18px] font-bold text-[#1A1A1A]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              #{bookingRef}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Fact icon="calendar_today" label="วันที่" value={bookingDateText} />
              <Fact
                icon="schedule"
                label="เวลาที่ทำงานจริง"
                // ★ ตัวเลขจากเซิร์ฟเวอร์ ไม่ได้คำนวณเองฝั่ง client
                value={proof.actualMinutes === null ? '—' : formatDurationTh(proof.actualMinutes)}
              />
            </div>
          </div>
        </div>

        {/* ── ยอดเงิน ── */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-[#E0E2E5] bg-white px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] sm:px-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF4E0]">
            <span className="material-icons text-[20px] text-[#E0952B]">account_balance_wallet</span>
          </span>
          <div>
            <p className="text-[13px] text-[#8A8C8E]">ยอดเงินที่คาดว่าจะได้รับ</p>
            <p
              className="text-[22px] font-bold leading-8 text-[#3AA981]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              ฿{price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* ── แถบสถานะ ── */}
        <div
          className={`mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center ${
            needsReview ? 'bg-[#FFFBEB] text-[#92400E]' : 'bg-[#EAF9F1] text-[#2E7D5B]'
          }`}
        >
          <span className="material-icons text-[18px]">{needsReview ? 'pending_actions' : 'send'}</span>
          <p className="text-[13px] font-semibold leading-5">
            {needsReview
              ? 'รอแอดมินตรวจสอบ · จะแจ้งผลให้ทราบทางการแจ้งเตือน'
              : 'รอระบบตรวจสอบ · โอนเงินอัตโนมัติภายใน 24 ชั่วโมง'}
          </p>
        </div>

        {/* ── STEP 5: หลักฐานจากเซิร์ฟเวอร์ ── */}
        <div className="mt-4">
          <ProofOfWorkPanel proof={proof} />
        </div>

        {/* ── ปุ่ม — เต็มความกว้างเฉพาะจอเล็ก ── */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#52B69A] px-8 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(82,182,154,0.3)] transition-colors hover:bg-[#3F9E85] sm:h-11 sm:w-auto ${focusRing}`}
          >
            <span className="material-icons text-[18px]">check</span>
            กลับไปหน้างานของฉัน
          </button>
          <a
            href="mailto:support@payung.co.th"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-[#8A8C8E] transition-colors hover:text-[#52B69A] ${focusRing}`}
          >
            <span className="material-icons text-[16px]">help_outline</span>
            ติดต่อฝ่ายสนับสนุน
          </a>
        </div>
      </div>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: string }>) {
  return (
    <div className="flex items-start gap-2">
      <span className="material-icons mt-0.5 text-[16px] text-[#8A8C8E]">{icon}</span>
      <div>
        <p className="text-[12px] text-[#8A8C8E]">{label}</p>
        <p className="mt-0.5 text-[15px] font-bold text-[#1A1A1A]">{value}</p>
      </div>
    </div>
  );
}
