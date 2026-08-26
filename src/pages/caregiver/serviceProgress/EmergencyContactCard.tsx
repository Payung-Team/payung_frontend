import { Icon } from '../../../components/ui/Icon';

export interface EmergencyContactCardProps {
  name?: string | null;
  phone?: string | null;
  relationship?: string | null;
}

/** Sourced from Booking.dayOfContact* — already-existing DB columns, exposed on
 * CaregiverBookingSummary once the caregiverBooking(id) backend addition ships (plan §3.1). */
export default function EmergencyContactCard({ name, phone, relationship }: Readonly<EmergencyContactCardProps>) {
  if (!name || !phone) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(220,38,38,0.25)] bg-[#FEF2F2] p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
          <Icon name="emergency" color="#DC2626" />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-[#991B1B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ผู้ติดต่อฉุกเฉิน
          </p>
          <p className="text-sm font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {name}
            {relationship ? ` (${relationship})` : ''} · {phone}
          </p>
        </div>
      </div>
      <a
        href={`tel:${phone}`}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#DC2626] px-3.5 py-2 text-sm font-bold text-white transition hover:bg-[#B91C1C] focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <Icon name="call" size="small" color="#FFFFFF" />
        โทรหา
      </a>
    </div>
  );
}
