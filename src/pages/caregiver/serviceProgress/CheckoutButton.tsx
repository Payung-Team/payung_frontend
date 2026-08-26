import { useState } from 'react';
import CheckOutModal from '../../../components/caregiver/CheckOutModal';
import { Icon } from '../../../components/ui/Icon';
import type { JobEvent, ProofOfWorkSummary } from '../../../lib/monitoring';

export interface CheckoutButtonProps {
  bookingId: string;
  /** "REF-XXXXXXXX" — โชว์ในหัวกล่องให้รู้ว่ากำลังปิดงานใบไหน (แสดงผลอย่างเดียว) */
  bookingRef: string;
  proof: ProofOfWorkSummary;
  jobLat: number | null;
  jobLng: number | null;
  onCheckedOut: (jobEvent: JobEvent) => void;
}

/** Shell-less checkout action — meant to be nested inside ServiceProgressWorkCard, matching the
 * Figma spec where checkout lives in the same card as the map/times. The button itself only opens
 * CheckOutModal; the modal owns everything else — GPS request, the optional note, evidence photo,
 * pre-submit warnings, and the CHECK_OUT_BOOKING mutation. */
export default function CheckoutButton({
  bookingId,
  bookingRef,
  proof,
  jobLat,
  jobLng,
  onCheckedOut,
}: Readonly<CheckoutButtonProps>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#52B69A] text-sm font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition hover:bg-[#489e86] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <Icon name="logout" color="#FFFFFF" size="small" />
        เช็คเอาท์ / จบงาน
      </button>
      <p className="mt-2 text-center text-[11px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        กดจบงานได้เลยเมื่อดูแลเสร็จ ไม่ต้องรอถึงเวลาที่คาด
      </p>

      <CheckOutModal
        isOpen={isOpen}
        bookingId={bookingId}
        bookingRef={bookingRef}
        proof={proof}
        jobLat={jobLat}
        jobLng={jobLng}
        onClose={() => setIsOpen(false)}
        onSuccess={(jobEvent) => {
          setIsOpen(false);
          onCheckedOut(jobEvent);
        }}
      />
    </>
  );
}
