import { Icon } from '../../../components/ui/Icon';

export interface BookingDetailCardProps {
  serviceLabel: string;
  dateText: string;
  timeText: string;
  durationText?: string;
  locationName?: string;
  serviceFormat?: string;
  price: number;
  tasks: string[];
  notes?: string;
  dayOfContactName?: string;
  dayOfContactPhone?: string;
  dayOfContactRelationship?: string;
}

interface DetailRow {
  icon: string;
  label: string;
  value: string;
}

function DetailRowView({ icon, label, value }: Readonly<DetailRow>) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} size="small" color="#B0B3B8" className="mt-0.5" />
      <span className="w-[92px] shrink-0 text-xs text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {label}
      </span>
      <span className="text-[13px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {value}
      </span>
    </div>
  );
}

/** Matches the Figma "รายละเอียดการจอง" card on the check-in screen. */
export default function BookingDetailCard({
  serviceLabel,
  dateText,
  timeText,
  durationText,
  locationName,
  serviceFormat,
  price,
  tasks,
  notes,
  dayOfContactName,
  dayOfContactPhone,
  dayOfContactRelationship,
}: Readonly<BookingDetailCardProps>) {
  const rows: DetailRow[] = [
    { icon: 'medical_services', label: 'ประเภทบริการ', value: serviceLabel },
    { icon: 'calendar_today', label: 'วันที่', value: dateText },
    { icon: 'schedule', label: 'เวลา', value: timeText },
    ...(durationText ? [{ icon: 'hourglass_bottom', label: 'ระยะเวลา', value: durationText }] : []),
    ...(locationName ? [{ icon: 'place', label: 'สถานที่', value: locationName }] : []),
    ...(serviceFormat ? [{ icon: 'directions', label: 'รูปแบบ', value: serviceFormat }] : []),
    ...(price > 0 ? [{ icon: 'payments', label: 'รายได้', value: `฿${price.toLocaleString()}` }] : []),
  ];

  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <h2 className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        รายละเอียดการจอง
      </h2>

      <div className="mt-4 flex flex-col gap-2.5">
        {rows.map((row) => (
          <DetailRowView key={row.label} {...row} />
        ))}
      </div>

      {tasks.length > 0 && (
        <div className="mt-4 border-t border-[#F0F1F3] pt-4">
          <p
            className="text-[10px] font-bold uppercase tracking-wide text-[#8A8C8E]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            รายการแผนงาน
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tasks.map((task) => (
              <span
                key={task}
                className="rounded-full bg-[#F0F1F3] px-2.5 py-1 text-xs text-[#575859]"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                {task}
              </span>
            ))}
          </div>
        </div>
      )}

      {notes && (
        <div className="mt-4 rounded-[10px] border border-[#FFEAA7] bg-[#FFF8E7] px-3.5 py-2.5">
          <p className="text-xs font-bold text-[#8A6D3B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ข้อความจากผู้รับบริการ: {notes}
          </p>
        </div>
      )}

      {dayOfContactName && (
        <div className="mt-4 border-t border-[#F0F1F3] pt-4">
          <p
            className="text-[10px] font-bold uppercase tracking-wide text-[#8A8C8E]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ผู้ติดต่อในวันนัดหมาย
          </p>
          <div className="mt-2 flex flex-col gap-2.5">
            <DetailRowView icon="person" label="ชื่อผู้ติดต่อ" value={dayOfContactName} />
            {dayOfContactPhone && <DetailRowView icon="call" label="เบอร์โทรศัพท์" value={dayOfContactPhone} />}
            {dayOfContactRelationship && (
              <DetailRowView icon="diversity_3" label="ความสัมพันธ์" value={dayOfContactRelationship} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
