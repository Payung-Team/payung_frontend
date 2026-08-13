import CheckInMap from '../CheckInMap';

export interface ServiceProgressMapProps {
  jobLat: number | null;
  jobLng: number | null;
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

/** The Service Progress map: same job-site view as check-in, minus the 200/500m rings (only
 * meaningful before check-in) and with a pulsing "in progress" badge instead of a distance chip. */
export default function ServiceProgressMap({ jobLat, jobLng }: Readonly<ServiceProgressMapProps>) {
  return (
    <CheckInMap
      jobLat={jobLat}
      jobLng={jobLng}
      caregiverLat={null}
      caregiverLng={null}
      hideDistanceChip
      showRadiusCircles={false}
      overlayBadge={<InProgressBadge />}
    />
  );
}
