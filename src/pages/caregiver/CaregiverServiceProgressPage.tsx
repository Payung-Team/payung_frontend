import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { PROOF_OF_WORK } from '../../graphql/queries';
import type { Booking } from './CaregiverBookings';
import ShiftStatusCard from './serviceProgress/ShiftStatusCard';
import ChecklistCard from './serviceProgress/ChecklistCard';
import CareLogCard from './serviceProgress/CareLogCard';
import JobScanModal from './serviceProgress/JobScanModal';
import JobInfoModals, { type JobInfoPanel } from './serviceProgress/JobInfoModals';
import { caregiverEarnings, formatBaht } from '../../lib/caregiverEarnings';
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

/**
 * หน้าระหว่างปฏิบัติงานของผู้ดูแล — เรียงตามสิ่งที่ผู้ดูแลต้องใช้จริงระหว่างอยู่หน้างาน:
 *
 *   1. การ์ดสถานะกะงานบนสุด — ทำมานานแค่ไหน เลิกกี่โมง + ผู้รับบริการและทางเข้าดูข้อมูล
 *                             (โครงเดียวกับการ์ดก่อนเริ่มงานในหน้าเช็คอิน)
 *   2. เนื้อหน้า            — สิ่งที่ต้อง "ทำ": เช็คลิสต์แผนงาน และบันทึกการดูแล
 *   3. แถบล่างที่ติดหน้าจอ   — "สแกนจบงาน" (เปิดโมดัลสแกน) และ "โทรฉุกเฉิน"
 *
 * เดิมการ์ดสแกน QR อยู่กลางหน้าบนสุดและมีเวลาเช็คอินซ่อนอยู่ข้างใน ทำให้สิ่งที่ทำบ่อยที่สุด
 * (เช็คลิสต์/บันทึก) ถูกดันลงไปใต้เส้นพับ และสิ่งที่ทำครั้งเดียวตอนจบกลับเด่นที่สุด
 * ตอนนี้ตัวสแกนอยู่ในโมดัลที่เรียกจากแถบล่าง ส่วนข้อมูลอ้างอิง (โปรไฟล์/รายละเอียดงาน)
 * อยู่ในป๊อปอัปร่วมกับหน้าเช็คอิน จึงเหลือพื้นที่ทั้งหน้าให้เช็คลิสต์และบันทึกการดูแล
 */
export default function CaregiverServiceProgressPage({ booking, onCheckedOut }: Readonly<CaregiverServiceProgressPageProps>) {
  const [scanOpen, setScanOpen] = useState(false);
  const [infoPanel, setInfoPanel] = useState<JobInfoPanel>(null);

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
          recipientAvatarUrl={booking.recipientAvatarUrl}
          patientProfile={booking.patientProfile}
          netEarningsText={booking.price > 0 ? formatBaht(earnings.net) : undefined}
          netIsActual={earnings.isActual}
          onViewProfile={() => setInfoPanel('profile')}
          onViewBookingDetails={() => setInfoPanel('details')}
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

      <JobInfoModals booking={booking} open={infoPanel} onClose={() => setInfoPanel(null)} />

      <JobScanModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        bookingId={booking.id}
        purpose="check_out"
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
