import CheckInMap from '../CheckInMap';

export interface ServiceProgressMapProps {
  jobLat: number | null;
  jobLng: number | null;
  /** "เช็คอิน HH:MM น." chip, bottom-left — omitted while checkInServerTs isn't loaded yet. */
  checkInTimeText?: string | null;
  /** True when jobLat/jobLng were geocoded from the saved address rather than a dropped pin. */
  approximate?: boolean;
}

function InProgressBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
      </span>
      <span className="text-xs font-bold text-[#047857]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        กำลังปฏิบัติงาน
      </span>
    </div>
  );
}

function CheckInTimeChip({ text }: Readonly<{ text: string }>) {
  return (
    <div
      className="rounded-[10px] bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[#8A8C8E] shadow-sm"
      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
    >
      {text}
    </div>
  );
}

/** The Service Progress map: same job-site view as check-in, minus the 200/500m rings (only
 * meaningful before check-in) and with a pulsing "in progress" badge instead of a distance chip. */
export default function ServiceProgressMap({ jobLat, jobLng, checkInTimeText, approximate }: Readonly<ServiceProgressMapProps>) {
  return (
    <CheckInMap
      jobLat={jobLat}
      jobLng={jobLng}
      caregiverLat={null}
      caregiverLng={null}
      hideDistanceChip
      showRadiusCircles={false}
      overlayBadge={<InProgressBadge />}
      bottomLeftContent={checkInTimeText ? <CheckInTimeChip text={checkInTimeText} /> : undefined}
      approximate={approximate}
    />
  );
}
