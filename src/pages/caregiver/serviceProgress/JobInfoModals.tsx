import { Icon } from '../../../components/ui/Icon';
import InfoModal from './InfoModal';
import PatientFullProfile from './PatientFullProfile';
import EarningsBreakdown from './EarningsBreakdown';
import { hasAnyProfileData } from '../../../lib/patientProfile';
import { serviceTypeLabel } from '../../../lib/serviceTypeLabels';
import { formatThaiDate } from '../../../lib/thaiDate';
import type { Booking } from '../CaregiverBookings';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

/** ป๊อปอัปไหนเปิดอยู่ — null = ไม่มี */
export type JobInfoPanel = 'profile' | 'details' | null;

export interface JobInfoModalsProps {
  booking: Booking;
  open: JobInfoPanel;
  onClose: () => void;
}

function DetailRow({ icon, label, value }: Readonly<{ icon: string; label: string; value: string }>) {
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <Icon name={icon} size="small" color="#B0B3B8" style={{ marginTop: 2 }} />
      <span className="w-20 shrink-0 text-xs text-[#8A8C8E]" style={FONT}>
        {label}
      </span>
      <span className="min-w-0 flex-1 break-words text-right text-sm font-semibold text-[#1A1A1A]" style={FONT}>
        {value}
      </span>
    </div>
  );
}

/**
 * ป๊อปอัปข้อมูลอ้างอิงของงาน — โปรไฟล์ผู้รับบริการ และรายละเอียดงาน
 *
 * รวมไว้ที่เดียวเพราะหน้าเช็คอินกับหน้าระหว่างทำงานต้องให้ข้อมูลชุดเดียวกันเป๊ะ ๆ
 * ถ้าแยกเขียนสองที่ วันหนึ่งจะเพี้ยนกันแน่ (เคยเพี้ยนมาแล้วตอนที่เป็นการ์ดสองใบ)
 */
export default function JobInfoModals({ booking, open, onClose }: Readonly<JobInfoModalsProps>) {
  const recipientName = booking.careRecipientName || booking.patientName;

  return (
    <>
      {/* ── โปรไฟล์ผู้รับบริการ — แสดงทุกอย่างที่ผู้จองกรอกไว้ ── */}
      <InfoModal
        isOpen={open === 'profile'}
        onClose={onClose}
        title="โปรไฟล์ผู้รับบริการ"
        subtitle={recipientName}
        size="lg"
      >
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#FFEAA7] bg-[#FFFBF0] p-3">
          <Icon name="shield" size="small" color="#B45309" />
          <p className="text-[11px] leading-relaxed text-[#8A6D1F]" style={FONT}>
            {hasAnyProfileData(booking.patientProfile)
              ? 'ข้อมูลนี้เป็นภาพ ณ วันที่จอง — ตรวจสอบประวัติแพ้ยาและระดับการช่วยเหลือทุกครั้งก่อนเริ่มดูแล'
              : 'การจองนี้ไม่มีข้อมูลสุขภาพที่กรอกไว้ — สอบถามจากผู้ติดต่อในวันนัดหมายก่อนเริ่มดูแล'}
          </p>
        </div>
        <PatientFullProfile
          recipientName={recipientName}
          bookedByName={booking.careRecipientName ? booking.patientName : null}
          profile={booking.patientProfile}
          dayOfContactName={booking.dayOfContactName}
          dayOfContactPhone={booking.dayOfContactPhone}
          dayOfContactRelationship={booking.dayOfContactRelationship}
        />
      </InfoModal>

      {/* ── รายละเอียดงาน ── */}
      <InfoModal isOpen={open === 'details'} onClose={onClose} title="รายละเอียดงาน" subtitle={recipientName}>
        <div className="divide-y divide-[#F5F6F7]">
          <DetailRow icon="medical_services" label="ประเภทบริการ" value={serviceTypeLabel(booking.serviceType)} />
          <DetailRow icon="calendar_today" label="วันที่" value={formatThaiDate(booking.bookingDate)} />
          <DetailRow icon="schedule" label="เวลา" value={booking.time ? `${booking.time} น.` : '—'} />
          {booking.durationText && <DetailRow icon="hourglass_bottom" label="ระยะเวลา" value={booking.durationText} />}
          {booking.locationName && <DetailRow icon="place" label="สถานที่" value={booking.locationName} />}
          {booking.serviceFormat && <DetailRow icon="directions" label="รูปแบบ" value={booking.serviceFormat} />}
          {booking.dayOfContactName && (
            <DetailRow
              icon="contact_phone"
              label="ผู้ติดต่อ"
              value={`${booking.dayOfContactName}${booking.dayOfContactRelationship ? ` (${booking.dayOfContactRelationship})` : ''}${
                booking.dayOfContactPhone ? ` · ${booking.dayOfContactPhone}` : ''
              }`}
            />
          )}
        </div>

        {/* รายได้ — แยกให้เห็นว่าหักอะไรไปเท่าไรและเหลือเท่าไร ไม่ใช่ตัวเลขเดียวกำกวม */}
        {booking.price > 0 && (
          <div className="mt-4">
            <EarningsBreakdown price={booking.price} payoutAmount={booking.payoutAmount} />
          </div>
        )}

        {booking.notes && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#FFEAA7] bg-[#FFF8E7] p-3">
            <Icon name="sticky_note_2" size="small" color="#B45309" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#B45309]" style={FONT}>
                ข้อความจากผู้รับบริการ
              </p>
              <p className="mt-0.5 break-words text-xs text-[#8A6D1F]" style={FONT}>
                {booking.notes}
              </p>
            </div>
          </div>
        )}
      </InfoModal>
    </>
  );
}
