import ServiceProgressMap from './ServiceProgressMap';
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
  /** True when jobLat/jobLng were geocoded from the saved address rather than a dropped pin. */
  approximateLocation?: boolean;
  onCheckedOut: (jobEvent: JobEvent) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

/** One merged card — map, check-in/out times, and the checkout action all live together, matching
 * the Figma spec (a single Container with two internal dividers rather than three stacked cards). */
export default function ServiceProgressWorkCard({
  bookingId,
  bookingRef,
  proof,
  jobLat,
  jobLng,
  checkInServerTs,
  checkOutServerTs,
  bookedDurationText,
  approximateLocation,
  onCheckedOut,
}: Readonly<ServiceProgressWorkCardProps>) {
  return (
    <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="p-3">
        <ServiceProgressMap
          jobLat={jobLat}
          jobLng={jobLng}
          checkInTimeText={checkInServerTs ? `เช็คอิน ${formatTime(checkInServerTs)} น.` : null}
          approximate={approximateLocation}
        />
      </div>

      <div className="border-t border-[#F0F1F3]">
        <TimeCards checkInServerTs={checkInServerTs} checkOutServerTs={checkOutServerTs} bookedDurationText={bookedDurationText} />
      </div>

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
