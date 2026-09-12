import TimeCards from './TimeCards';
import CheckoutButton from './CheckoutButton';
import { Icon } from '../../../components/ui/Icon';
import type { JobEvent, ProofOfWorkSummary } from '../../../lib/monitoring';

export interface ServiceProgressWorkCardProps {
  bookingId: string;
  bookingRef: string;
  proof: ProofOfWorkSummary;
  jobLat: number | null;
  jobLng: number | null;
  checkInServerTs: string | null;
  checkOutServerTs: string | null;
  bookedDurationText?: string;
  onCheckedOut: (jobEvent: JobEvent) => void;
}

/** Shell-less check-in/out times + checkout action — meant to be nested inside a parent card
 * (the QR scan card on CaregiverServiceProgressPage), so it has no background/border of its own. */
export default function ServiceProgressWorkCard({
  bookingId,
  bookingRef,
  proof,
  jobLat,
  jobLng,
  checkInServerTs,
  checkOutServerTs,
  bookedDurationText,
  onCheckedOut,
}: Readonly<ServiceProgressWorkCardProps>) {
  return (
    <div>
      <TimeCards checkInServerTs={checkInServerTs} checkOutServerTs={checkOutServerTs} bookedDurationText={bookedDurationText} />

      <div className="border-t border-[#F0F1F3] p-4">
        {checkOutServerTs ? (
          <div className="flex items-center justify-center gap-2 py-1.5">
            <Icon name="task_alt" color="#047857" size="small" />
            <p className="text-sm font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              จบงานเรียบร้อยแล้ว
            </p>
          </div>
        ) : !checkInServerTs ? (
          /* CheckOutModal ต้องมีข้อมูลเช็คอินถึงจะเปิดได้ ถ้าปล่อยปุ่มไว้จะกลายเป็นปุ่มกดแล้วไม่มีอะไรขึ้น */
          <p className="py-1.5 text-center text-sm text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            เช็คอินก่อนจึงจะจบงานได้
          </p>
        ) : (
          <CheckoutButton
            bookingId={bookingId}
            bookingRef={bookingRef}
            proof={proof}
            jobLat={jobLat}
            jobLng={jobLng}
            onCheckedOut={onCheckedOut}
          />
        )}
      </div>
    </div>
  );
}
