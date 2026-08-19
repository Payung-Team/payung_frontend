import ServiceProgressMap from './ServiceProgressMap';
import TimeCards from './TimeCards';
import CheckoutButton, { type CheckoutJobEvent } from './CheckoutButton';
import { Icon } from '../../../components/ui/Icon';

export interface ServiceProgressWorkCardProps {
  bookingId: string;
  jobLat: number | null;
  jobLng: number | null;
  checkInServerTs: string | null;
  checkOutServerTs: string | null;
  bookedDurationText?: string;
  /** True when jobLat/jobLng were geocoded from the saved address rather than a dropped pin. */
  approximateLocation?: boolean;
  onCheckedOut: (jobEvent: CheckoutJobEvent) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

/** One merged card — map, check-in/out times, and the checkout action all live together, matching
 * the Figma spec (a single Container with two internal dividers rather than three stacked cards). */
export default function ServiceProgressWorkCard({
  bookingId,
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
        ) : (
          <CheckoutButton bookingId={bookingId} onCheckedOut={onCheckedOut} />
        )}
      </div>
    </div>
  );
}
