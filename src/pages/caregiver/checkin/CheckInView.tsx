import { useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import PreShiftCard from './PreShiftCard';
import TaskPreviewCard from './TaskPreviewCard';
import JobScanModal from '../serviceProgress/JobScanModal';
import JobInfoModals, { type JobInfoPanel } from '../serviceProgress/JobInfoModals';
import type { Booking } from '../CaregiverBookings';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

export interface CheckInViewProps {
  booking: Booking;
  /** ข้อความวันที่แบบไทยที่หน้าแม่แปลงไว้แล้ว */
  dateText: string;
  /** ตรงกับ gate ของ backend: confirmed + payment held + วันเดียวกัน (ครึ่งหลังเช็คฝั่ง server) */
  canCheckInToday: boolean;
  /** เรียกเมื่อสแกนเช็คอินสำเร็จ — หน้าแม่สลับไปหน้าความคืบหน้า */
  onCheckedIn: () => void;
}

const STEPS: ReadonlyArray<{ icon: string; title: string; detail: string }> = [
  {
    icon: 'directions_walk',
    title: 'ไปถึงสถานที่ตามเวลานัดหมาย',
    detail: 'ดูที่อยู่ได้ที่ "ดูรายละเอียดงาน" · ถ้าไปไม่ทันให้โทรแจ้งผู้ติดต่อไว้ก่อน',
  },
  {
    icon: 'fact_check',
    title: 'ตรวจข้อมูลผู้รับบริการก่อนลงมือ',
    detail: 'กด "ดูโปรไฟล์" เพื่อดูประวัติแพ้ยา โรคประจำตัว และระดับการช่วยเหลือ',
  },
  {
    icon: 'qr_code_scanner',
    title: 'สแกน QR ของผู้รับบริการเพื่อเริ่มงาน',
    detail: 'ให้ผู้รับบริการเปิดหน้า QR ของการจอง แล้วกดปุ่ม "สแกนเริ่มงาน" ด้านล่าง',
  },
];

/**
 * หน้าเช็คอินของผู้ดูแล (สถานะ confirmed) — โครงเดียวกับหน้าระหว่างปฏิบัติงาน:
 *
 *   1. การ์ดก่อนเริ่มงาน   — เริ่มกี่โมง อีกนานไหม ได้เท่าไร ดูแลใคร + ทางเข้าดูข้อมูล
 *   2. เนื้อหน้า           — แผนงานที่ต้องทำ (อ่านอย่างเดียว) และขั้นตอนก่อนเริ่มงาน
 *   3. แถบล่างที่ติดหน้าจอ  — "สแกนเริ่มงาน" และ "โทรผู้ติดต่อ"
 *
 * เดิมหน้านี้วางการ์ดสแกน QR ไว้คอลัมน์ขวาน้ำหนักเท่าข้อมูลงาน และทั้งสองคอลัมน์ยาวเท่ากัน
 * ทำให้ไม่มีลำดับสายตาว่าควรอ่านอะไรก่อนแล้วทำอะไรเป็นขั้นสุดท้าย
 */
export default function CheckInView({ booking, dateText, canCheckInToday, onCheckedIn }: Readonly<CheckInViewProps>) {
  const [scanOpen, setScanOpen] = useState(false);
  const [infoPanel, setInfoPanel] = useState<JobInfoPanel>(null);

  return (
    <div className="flex flex-col gap-6">
      <PreShiftCard
        bookingDate={booking.bookingDate}
        dateText={dateText}
        timeText={booking.time}
        durationText={booking.durationText}
        price={booking.price}
        canCheckInToday={canCheckInToday}
        patientName={booking.patientName}
        careRecipientName={booking.careRecipientName}
        recipientAvatarUrl={booking.recipientAvatarUrl}
        patientProfile={booking.patientProfile}
        onViewProfile={() => setInfoPanel('profile')}
        onViewBookingDetails={() => setInfoPanel('details')}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <TaskPreviewCard tasks={booking.tasks ?? []} notes={booking.notes} />
        </div>

        <div className="min-w-0">
          <section className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF]">
                <Icon name="route" size="small" color="#1D4ED8" />
              </span>
              <p className="text-[17px] font-bold text-[#1A1A1A]" style={FONT}>
                ขั้นตอนก่อนเริ่มงาน
              </p>
            </div>

            <ol className="mt-4 flex flex-col gap-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex items-start gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF7F3] text-xs font-bold text-[#31866F]"
                    style={FONT}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A1A]" style={FONT}>
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#8A8C8E]" style={FONT}>
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {!canCheckInToday && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3">
                <Icon name="event_available" size="small" color="#1D4ED8" />
                <p className="text-[11px] leading-relaxed text-[#1E40AF]" style={FONT}>
                  ปุ่มสแกนเริ่มงานจะใช้ได้ในวันที่ {dateText} — ระบบอนุญาตให้เช็คอินเฉพาะวันนัดหมายเท่านั้น
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── แถบปฏิบัติการล่าง (fixed) — เหมือนหน้าระหว่างปฏิบัติงาน
          โชว์เฉพาะวันที่เช็คอินได้จริง ไม่ยั่วให้กดปุ่มที่ backend จะปฏิเสธอยู่ดี ── */}
      {canCheckInToday && (
        <div className="fixed bottom-20 left-0 right-0 z-30 border-t border-[#E5E7EB] bg-white/95 backdrop-blur md:bottom-0">
          <div className="mx-auto flex max-w-300 items-center gap-3 px-6 py-3">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#009265] text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,146,101,0.3)] transition hover:bg-[#007A54] focus:outline-none focus:ring-2 focus:ring-[#009265] focus:ring-offset-2"
              style={FONT}
            >
              <Icon name="qr_code_scanner" color="#FFFFFF" />
              สแกนเริ่มงาน
            </button>
            {booking.dayOfContactPhone && (
              <a
                href={`tel:${booking.dayOfContactPhone}`}
                aria-label={`โทรหาผู้ติดต่อ${booking.dayOfContactName ? ` ${booking.dayOfContactName}` : ''}`}
                className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-5 text-[15px] font-bold text-[#1A1A1A] transition hover:border-[#52B69A] hover:text-[#3A9A7E] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2"
                style={FONT}
              >
                <Icon name="call" size="small" color="currentColor" />
                <span className="hidden sm:inline">โทรผู้ติดต่อ</span>
              </a>
            )}
          </div>
        </div>
      )}

      <JobInfoModals booking={booking} open={infoPanel} onClose={() => setInfoPanel(null)} />

      <JobScanModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        bookingId={booking.id}
        purpose="check_in"
        onScanned={onCheckedIn}
      />
    </div>
  );
}
