import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { PROOF_OF_WORK } from '../../graphql/queries';
import type { Booking } from './CaregiverBookings';
import ShiftStatusCard from './serviceProgress/ShiftStatusCard';
import ChecklistCard from './serviceProgress/ChecklistCard';
import CareLogCard from './serviceProgress/CareLogCard';
import CheckOutScanModal from './serviceProgress/CheckOutScanModal';
import InfoModal from './serviceProgress/InfoModal';
import PatientFullProfile from './serviceProgress/PatientFullProfile';
import { hasAnyProfileData } from '../../lib/patientProfile';
import { caregiverEarnings, formatBaht, type CaregiverEarnings } from '../../lib/caregiverEarnings';
import { Icon } from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import type { ProofOfWorkSummary } from '../../lib/monitoring';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

export interface CaregiverServiceProgressPageProps {
  booking: Booking & { locationLat?: number | null; locationLng?: number | null };
  /** ได้ proof ที่ดึงใหม่หลังปิดงาน (null ถ้าดึงไม่สำเร็จ) เพื่อให้หน้าแม่พาไปหน้าสรุปผลได้ */
  onCheckedOut: (proof: ProofOfWorkSummary | null) => void;
}

interface ProofOfWorkData {
  proofOfWork: ProofOfWorkSummary;
}

function BookingDetailRow({ icon, label, value }: Readonly<{ icon: string; label: string; value: string }>) {
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

/** รายได้ของงานนี้แบบเห็นที่มาที่ไป — ยอดที่ลูกค้าจ่าย หักค่าธรรมเนียม เหลือสุทธิเท่าไร
 *  ตัวเลขสุทธิเป็นประมาณการจนกว่า payout จริงจะถูกบันทึก (ดู lib/caregiverEarnings) */
function EarningsBreakdown({ earnings }: Readonly<{ earnings: CaregiverEarnings }>) {
  return (
    <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[#575859]" style={FONT}>
          ค่าบริการที่ผู้รับบริการชำระ
        </span>
        <span className="text-sm font-semibold text-[#1A1A1A]" style={FONT}>
          {formatBaht(earnings.gross)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="text-xs text-[#575859]" style={FONT}>
          ค่าธรรมเนียมแพลตฟอร์ม ({earnings.feePercent}%)
        </span>
        <span className="text-sm font-semibold text-[#DC2626]" style={FONT}>
          −{formatBaht(earnings.fee)}
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-dashed border-[#E0E2E5] pt-2.5">
        <span className="text-sm font-bold text-[#1A1A1A]" style={FONT}>
          รายได้สุทธิที่คุณได้รับ
        </span>
        <span className="text-lg font-bold text-[#009265]" style={FONT}>
          {formatBaht(earnings.net)}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-[#8A8C8E]" style={FONT}>
        {earnings.isActual
          ? 'ยอดนี้เป็นยอดโอนจริงที่ระบบบันทึกไว้แล้ว'
          : 'เป็นยอดประมาณการ — ระบบจะโอนหลังปิดงานและพ้นระยะตรวจสอบ ยอดจริงยืนยันเมื่อโอนเงิน'}
      </p>
    </div>
  );
}

/**
 * หน้าระหว่างปฏิบัติงานของผู้ดูแล — เรียงตามสิ่งที่ผู้ดูแลต้องใช้จริงระหว่างอยู่หน้างาน:
 *
 *   1. การ์ดสถานะกะงานบนสุด — ทำมานานแค่ไหน เลิกกี่โมง + ผู้รับบริการและทางเข้าดูข้อมูล
 *                             (โครงเดียวกับการ์ดติดตามงานฝั่งผู้รับบริการ)
 *   2. เนื้อหน้า            — สิ่งที่ต้อง "ทำ": เช็คลิสต์แผนงาน และบันทึกการดูแล
 *   3. แถบล่างที่ติดหน้าจอ   — "สแกนจบงาน" (เปิดโมดัลสแกน) และ "โทรฉุกเฉิน"
 *
 * เดิมการ์ดสแกน QR อยู่กลางหน้าบนสุดและมีเวลาเช็คอินซ่อนอยู่ข้างใน ทำให้สิ่งที่ทำบ่อยที่สุด
 * (เช็คลิสต์/บันทึก) ถูกดันลงไปใต้เส้นพับ และสิ่งที่ทำครั้งเดียวตอนจบกลับเด่นที่สุด
 * ตอนนี้ตัวสแกนอยู่ในโมดัลที่เรียกจากแถบล่าง ส่วนข้อมูลอ้างอิง (โปรไฟล์/รายละเอียดงาน)
 * อยู่ในป๊อปอัป จึงเหลือพื้นที่ทั้งหน้าให้เช็คลิสต์และบันทึกการดูแล
 */
export default function CaregiverServiceProgressPage({ booking, onCheckedOut }: Readonly<CaregiverServiceProgressPageProps>) {
  const [scanOpen, setScanOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data, loading, refetch } = useQuery<ProofOfWorkData>(PROOF_OF_WORK, {
    variables: { bookingId: booking.id },
  });

  const proof = data?.proofOfWork ?? null;
  const checkInServerTs = proof?.checkIn?.serverTs ?? null;
  const checkOutServerTs = proof?.checkOut?.serverTs ?? null;

  /** ต้องดึง proof ใหม่ก่อนเสมอ — หน้าสรุปผลอ่าน actualMinutes/verdict/reviewReasons จากเซิร์ฟเวอร์
   *  ค่าที่อยู่ในมือตอนนี้ยังเป็นก่อนปิดงาน จึงใช้แสดงผลไม่ได้ */
  async function handleCheckedOut() {
    try {
      const result = await refetch();
      onCheckedOut(result.data?.proofOfWork ?? null);
    } catch {
      onCheckedOut(null);
    }
  }

  const recipientName = booking.careRecipientName || booking.patientName;
  const earnings = caregiverEarnings(booking.price, booking.payoutAmount);

  return (
    <div className="flex flex-col gap-6">
      {loading && !proof ? (
        <Skeleton height={220} borderRadius={18} />
      ) : (
        <ShiftStatusCard
          checkInServerTs={checkInServerTs}
          checkOutServerTs={checkOutServerTs}
          bookedDurationText={booking.durationText}
          patientName={booking.patientName}
          careRecipientName={booking.careRecipientName}
          patientProfile={booking.patientProfile}
          netEarningsText={booking.price > 0 ? formatBaht(earnings.net) : undefined}
          netIsActual={earnings.isActual}
          onViewProfile={() => setProfileOpen(true)}
          onViewBookingDetails={() => setDetailsOpen(true)}
        />
      )}

      {/* สิ่งที่ต้องทำระหว่างกะ — ได้พื้นที่ทั้งหน้าเพราะข้อมูลอ้างอิงย้ายไปอยู่ในป๊อปอัปแล้ว */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <ChecklistCard tasks={booking.bookingTasks ?? []} notes={booking.notes} />
        </div>
        <div className="min-w-0">
          <CareLogCard bookingId={booking.id} />
        </div>
      </div>

      {/* ── แถบปฏิบัติการล่าง (fixed) ──
          bottom-20 บนมือถือ = อยู่เหนือ MobileNavigation ที่ fixed อยู่ก้นจอ
          สองปุ่มนี้คือสิ่งเดียวที่ผู้ดูแลต้องกดได้ทันทีไม่ว่าเลื่อนอยู่ตรงไหนของหน้า */}
      {checkOutServerTs === null && (
        <div className="fixed bottom-20 left-0 right-0 z-30 border-t border-[#E5E7EB] bg-white/95 backdrop-blur md:bottom-0">
          <div className="mx-auto flex max-w-300 items-center gap-3 px-6 py-3">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#DC2626] text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(220,38,38,0.3)] transition hover:bg-[#B91C1C] focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2"
              style={FONT}
            >
              <Icon name="qr_code_scanner" color="#FFFFFF" />
              สแกนจบงาน
            </button>
            {booking.dayOfContactPhone && (
              <a
                href={`tel:${booking.dayOfContactPhone}`}
                aria-label={`โทรหาผู้ติดต่อฉุกเฉิน${booking.dayOfContactName ? ` ${booking.dayOfContactName}` : ''}`}
                className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#FCA5A5] bg-white px-5 text-[15px] font-bold text-[#DC2626] transition hover:bg-[#FEF2F2] focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2"
                style={FONT}
              >
                <Icon name="call" size="small" color="#DC2626" />
                <span className="hidden sm:inline">โทรฉุกเฉิน</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── ป๊อปอัปโปรไฟล์ผู้รับบริการ — แสดงทุกอย่างที่ผู้จองกรอกไว้ ── */}
      <InfoModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
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

      {/* ── ป๊อปอัปรายละเอียดงาน ── */}
      <InfoModal isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} title="รายละเอียดงาน" subtitle={recipientName}>
        <div className="divide-y divide-[#F5F6F7]">
          <BookingDetailRow icon="calendar_today" label="วันที่" value={booking.bookingDate || '—'} />
          <BookingDetailRow icon="schedule" label="เวลา" value={booking.time || '—'} />
          {booking.durationText && <BookingDetailRow icon="hourglass_bottom" label="ระยะเวลา" value={booking.durationText} />}
          {booking.locationName && <BookingDetailRow icon="place" label="สถานที่" value={booking.locationName} />}
          {booking.serviceFormat && <BookingDetailRow icon="directions" label="รูปแบบ" value={booking.serviceFormat} />}
          {booking.dayOfContactName && (
            <BookingDetailRow
              icon="contact_phone"
              label="ผู้ติดต่อ"
              value={`${booking.dayOfContactName}${booking.dayOfContactRelationship ? ` (${booking.dayOfContactRelationship})` : ''}${
                booking.dayOfContactPhone ? ` · ${booking.dayOfContactPhone}` : ''
              }`}
            />
          )}
        </div>

        {/* รายได้ — เดิมโชว์ booking.price ห้วน ๆ ว่า "รายได้" ซึ่งเป็นยอดที่ผู้รับบริการจ่าย
            ไม่ใช่ยอดที่ผู้ดูแลได้รับ จึงแยกให้เห็นว่าหักอะไรไปเท่าไรและเหลือเท่าไร */}
        {booking.price > 0 && <EarningsBreakdown earnings={earnings} />}
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

      <CheckOutScanModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        bookingId={booking.id}
        onScanned={(result) => {
          // เช็ค action ก่อน: หน้านี้เด้งไปหน้าสรุปผลได้เฉพาะตอนที่ "ปิดงาน" จริง
          // ถ้าเป็น CHECK_IN (เข้าหน้านี้มาโดยที่ยังไม่เคยสแกน) แค่ดึงข้อมูลใหม่พอ
          if (result.action === 'CHECK_OUT') void handleCheckedOut();
          else void refetch();
        }}
      />
    </div>
  );
}
