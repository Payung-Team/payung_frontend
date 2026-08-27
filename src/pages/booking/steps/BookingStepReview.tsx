import { useEffect, useRef } from 'react';
import { useBooking } from '../../../context/BookingContext';

const PLATFORM_FEE_PERCENT = 10;

interface Props {
  onStartSearch: () => void;
}

function formatThaiDate(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

const SLOT_LABELS: Record<string, string> = {
  morning: 'รอบเช้า',
  afternoon: 'รอบบ่าย',
  evening: 'รอบเย็น',
  night: 'รอบดึก',
};

function ReviewSection({
  title,
  icon,
  onEdit,
  children,
}: {
  title: string;
  icon: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-icons text-[#52B69A]" style={{ fontSize: 18 }}>
            {icon}
          </span>
          <h3 className="text-sm font-bold text-[#1A1A1A]">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-bold text-[#52B69A] border border-[#E0E2E5] rounded-lg hover:bg-[#F0FAF4] transition cursor-pointer"
        >
          แก้ไข
        </button>
      </div>
      <div className="mt-3 space-y-2 text-sm">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-[#8A8C8E] flex-none">{label}</span>
      <span
        className={`text-right font-semibold break-words ${
          highlight ? 'text-red-500' : 'text-[#1A1A1A]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function BookingStepReview({ onStartSearch }: Props) {
  const { bookingDraft, goToStep, setStepSubmit } = useBooking();

  // Register submit → onStartSearch
  const submitRef = useRef<() => void>(() => {});
  submitRef.current = onStartSearch;
  useEffect(() => {
    setStepSubmit(() => submitRef.current());
    return () => setStepSubmit(null);
  }, [setStepSubmit]);

  const serviceLocs = bookingDraft?.serviceLocation || [];
  const displayServiceLocation =
    serviceLocs.length === 2
      ? 'ที่บ้านผู้ป่วย + ร่วมเดินทางภายนอก'
      : serviceLocs.includes('at_home')
        ? 'ที่บ้านผู้ป่วย'
        : serviceLocs.includes('accompany_outside')
          ? 'ร่วมเดินทางข้างนอก'
          : '-';

  const atHomeAddress = bookingDraft?.locationDetails?.at_home?.address || '';
  const hospitalName = bookingDraft?.locationDetails?.accompany_outside?.hospitalName || '';
  const meetingPoint = bookingDraft?.locationDetails?.accompany_outside?.meetingPoint || '';

  const addressParts = [];
  if (serviceLocs.includes('at_home') && atHomeAddress) addressParts.push(atHomeAddress);
  if (serviceLocs.includes('accompany_outside') && hospitalName)
    addressParts.push(
      `ปลายทาง: ${hospitalName}${meetingPoint ? ` (จุดนัดพบ: ${meetingPoint})` : ''}`,
    );
  const displayAddress = addressParts.length > 0 ? addressParts.join(' · ') : '-';

  const slotText = SLOT_LABELS[bookingDraft?.dateTime?.slot || ''] || '';
  const startTimeVal = bookingDraft?.dateTime?.startTime || '';
  const displaySlotTime = startTimeVal ? `${slotText} (${startTimeVal} น.)` : '-';

  const durationVal = bookingDraft?.dateTime?.duration || 4;
  const endTimeVal = bookingDraft?.dateTime?.endTime || '';
  const displayDuration =
    startTimeVal && endTimeVal
      ? `${durationVal} ชม. · เริ่ม ${startTimeVal} น. · สิ้นสุด ${endTimeVal} น.`
      : `${durationVal} ชม.`;

  const patient = bookingDraft?.recipient?.patientDetails;
  const conditions = patient?.conditions || [];
  const hasConditions = conditions.length > 0;
  const allergies = patient?.allergies || '';
  const hasAllergies =
    !!allergies && allergies.trim().toLowerCase() !== 'ไม่มี' && allergies.trim() !== '';

  const tasksCount =
    (bookingDraft?.jobDetails?.tasks?.length || 0) +
    (bookingDraft?.jobDetails?.customTasks?.length || 0);

  const caregiverRate = 250;
  const hours = durationVal;
  const caregiverCost = caregiverRate * hours;
  const platformFee = Math.round(caregiverCost * (PLATFORM_FEE_PERCENT / 100));
  const totalCost = caregiverCost + platformFee;

  return (
    <div className="space-y-4">
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">ตรวจสอบก่อนส่งคำขอ</h2>
        <p className="text-sm text-[#8A8C8E] mt-1">แตะ "แก้ไข" ที่หัวข้อใดก็ได้ ระบบจะพากลับมาที่นี่</p>
      </section>

      <ReviewSection title="วัน เวลา และสถานที่นัดหมาย" icon="schedule" onEdit={() => goToStep(2)}>
        <Row label="สถานที่รับบริการ" value={displayServiceLocation} />
        <Row label="ที่อยู่ระบุ" value={displayAddress} />
        <Row label="วันที่จัดนัดหมาย" value={formatThaiDate(bookingDraft?.dateTime?.date)} />
        <Row label="เวลานัดทำบริการ" value={displaySlotTime} />
        <Row label="ระยะเวลา" value={displayDuration} />
      </ReviewSection>

      <ReviewSection title="ประวัติสุขภาพคนไข้ผู้รับการดูแล" icon="person" onEdit={() => goToStep(4)}>
        <Row label="ชื่อ-นามสกุล คนไข้" value={patient?.name || '-'} />
        <Row label="อายุ" value={patient?.age ? `${patient.age} ปี` : '-'} />
        <Row
          label="เพศ / สัดส่วน"
          value={`เพศ${patient?.gender || '-'} · น้ำหนัก ${patient?.weight || '-'} กก. · ส่วนสูง ${patient?.height || '-'} ซม.`}
        />
        <Row label="ความสามารถช่วยเหลือตนเอง" value={patient?.supportLevel || '-'} />
        {(hasConditions || hasAllergies) && (
          <div className="mt-2 bg-[#FFF3E0] border border-[#FFC570] rounded-xl p-3 flex flex-col gap-1.5 text-sm">
            {hasConditions && (
              <div className="text-[#E08C00] font-bold">
                โรคประจำตัวที่ต้องเฝ้าระวัง: {conditions.join(', ')}
              </div>
            )}
            {hasAllergies && (
              <div
                className={`text-[#D97706] font-bold ${
                  hasConditions ? 'border-t border-dashed border-[#FFC570] pt-1.5' : ''
                }`}
              >
                ประวัติการแพ้ยาหรือแพ้อาหาร: {allergies}
              </div>
            )}
          </div>
        )}
        <Row label="ยาคนไข้ประจำวัน" value={patient?.medicines || 'ไม่มี'} />
        <Row label="กรุ๊ปเลือด" value={patient?.bloodGroup ? `กรุ๊ป ${patient.bloodGroup}` : '-'} />
      </ReviewSection>

      <ReviewSection title="ช่องทางติดต่อหน้างานในวันบริการ" icon="phone" onEdit={() => goToStep(4)}>
        <Row label="ผู้ติดต่อรับสาย" value={bookingDraft?.contactPerson?.name || '-'} />
        <Row label="เบอร์โทรศัพท์" value={bookingDraft?.contactPerson?.phone || '-'} />
        <Row label="ความสัมพันธ์กับผู้ป่วย" value={bookingDraft?.contactPerson?.relationship || '-'} />
      </ReviewSection>

      <ReviewSection
        title={`แผนภารกิจการดูแล (${tasksCount} งานย่อย)`}
        icon="assignment"
        onEdit={() => goToStep(1)}
      >
        <div className="bg-white border border-[#E0E2E5] rounded-lg p-3 max-h-[150px] overflow-y-auto">
          {tasksCount === 0 ? (
            <span className="text-xs italic text-gray-400">ไม่มีการระบุภารกิจย่อย</span>
          ) : (
            <ul className="list-disc pl-5 flex flex-col gap-1.5 text-sm">
              {bookingDraft?.jobDetails?.tasks?.map((t) => (
                <li key={t.id} className="text-[#1A1A1A]">
                  {t.name}
                </li>
              ))}
              {bookingDraft?.jobDetails?.customTasks?.map((t) => (
                <li key={t.id} className="text-[#3B5BDB]">
                  {t.name} (งานกรอกเพิ่มเติม)
                </li>
              ))}
            </ul>
          )}
        </div>
        {bookingDraft?.jobDetails?.notes && (
          <div className="mt-2 bg-[#FFFDF6] border border-[#FDF0CD] rounded-lg p-3 text-sm font-bold text-[#1A1A1A]">
            หมายเหตุแนบท้าย: "{bookingDraft.jobDetails.notes}"
          </div>
        )}
      </ReviewSection>

      {/* Cost breakdown */}
      <section className="bg-[#F0FAF4] border border-[#BFE0D6] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#1B5C48]">ค่าบริการโดยประมาณ</h3>
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#1A1A1A]">
              ค่าบริการ Caregiver (฿{caregiverRate} × {hours} ชม.)
            </span>
            <span className="font-semibold">฿{caregiverCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1A1A1A]">ค่าบริการแพลตฟอร์ม ({PLATFORM_FEE_PERCENT}%)</span>
            <span className="font-semibold">฿{platformFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-[#A7D8C2] pt-2 mt-1 items-center">
            <span className="font-bold text-[#1A1A1A]">ยอดรวมโดยประมาณ</span>
            <span className="font-bold text-lg text-[#52B69A]">
              ฿{totalCost.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-[#8A8C8E] leading-relaxed pt-1">
            ยอดนี้เป็นการประมาณ ยอดจริงยืนยันหลังการจองสมบูรณ์
          </p>
        </div>
      </section>
    </div>
  );
}
