import { useQuery } from '@apollo/client/react';
import { PROOF_OF_WORK } from '../../graphql/queries';
import { useJobCoordinates } from '../../hooks/useJobCoordinates';
import type { Booking } from './CaregiverBookings';
import ServiceProgressWorkCard from './serviceProgress/ServiceProgressWorkCard';
import PatientHeaderCard from './serviceProgress/PatientHeaderCard';
import ChecklistCard from './serviceProgress/ChecklistCard';
import CareLogCard from './serviceProgress/CareLogCard';
import EmergencyContactCard from './serviceProgress/EmergencyContactCard';
import ExpandableSection from './serviceProgress/ExpandableSection';
import { Icon } from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import type { ProofOfWorkSummary } from '../../lib/monitoring';

export interface CaregiverServiceProgressPageProps {
  booking: Booking & { locationLat?: number | null; locationLng?: number | null };
  /** ได้ proof ที่ดึงใหม่หลังปิดงาน (null ถ้าดึงไม่สำเร็จ) เพื่อให้หน้าแม่พาไปหน้าสรุปผลได้ */
  onCheckedOut: (proof: ProofOfWorkSummary | null) => void;
}

interface ProofOfWorkData {
  proofOfWork: ProofOfWorkSummary;
}

const PROFILE_SECTION_ID = 'service-progress-patient-profile';

/** ยังไม่มี booking reference จริงจาก backend — ใช้ท้าย id เหมือนที่ CaregiverBookingDetailPage ทำ
 *  เพื่อให้รหัสที่ผู้ใช้เห็นในหน้าเดียวกันตรงกัน */
function bookingRefOf(bookingId: string): string {
  return `REF-${bookingId.toUpperCase().replaceAll('-', '').slice(-6)}`;
}

function BookingDetailRow({ icon, label, value }: Readonly<{ icon: string; label: string; value: string }>) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} size="small" color="#B0B3B8" />
      <span className="w-24 shrink-0 text-xs text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {label}
      </span>
      <span className="text-sm font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {value}
      </span>
    </div>
  );
}

export default function CaregiverServiceProgressPage({ booking, onCheckedOut }: Readonly<CaregiverServiceProgressPageProps>) {
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
  const jobCoords = useJobCoordinates(booking.locationLat, booking.locationLng, booking.locationName);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[621fr_414fr]">
      <div className="order-2 flex flex-col gap-5 lg:order-1">
        <PatientHeaderCard
          patientName={booking.patientName}
          careRecipientName={booking.careRecipientName}
          profileSectionId={PROFILE_SECTION_ID}
        />

        <div className="flex items-start gap-2.5 rounded-xl border border-[#FFEAA7] bg-[#FFF8E7] p-3.5">
          <Icon name="warning" size="small" color="#B45309" />
          <p className="text-xs text-[#8A6D1F]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            โปรดตรวจสอบข้อมูลผู้รับบริการในโปรไฟล์ก่อนเริ่มดูแล เพื่อความปลอดภัย
          </p>
        </div>

        {loading || !proof ? (
          <Skeleton height={260} />
        ) : (
          <ServiceProgressWorkCard
            bookingId={booking.id}
            bookingRef={bookingRefOf(booking.id)}
            proof={proof}
            jobLat={jobCoords.lat}
            jobLng={jobCoords.lng}
            checkInServerTs={checkInServerTs}
            checkOutServerTs={checkOutServerTs}
            bookedDurationText={booking.durationText}
            approximateLocation={jobCoords.source === 'geocoded'}
            onCheckedOut={handleCheckedOut}
          />
        )}

        <ChecklistCard tasks={booking.tasks ?? []} notes={booking.notes} />
      </div>

      <div className="order-1 flex flex-col gap-5 lg:order-2">
        <EmergencyContactCard
          name={booking.dayOfContactName}
          phone={booking.dayOfContactPhone}
          relationship={booking.dayOfContactRelationship}
        />

        <ExpandableSection title="ดูรายละเอียดการจอง">
          <div className="flex flex-col gap-2.5">
            <BookingDetailRow icon="calendar_today" label="วันที่" value={booking.bookingDate || '—'} />
            <BookingDetailRow icon="schedule" label="เวลา" value={booking.time || '—'} />
            {booking.locationName && <BookingDetailRow icon="place" label="สถานที่" value={booking.locationName} />}
            {booking.serviceFormat && <BookingDetailRow icon="directions" label="รูปแบบ" value={booking.serviceFormat} />}
            {booking.price > 0 && <BookingDetailRow icon="payments" label="รายได้" value={`฿${booking.price.toLocaleString()}`} />}
          </div>
        </ExpandableSection>

        <div id={PROFILE_SECTION_ID}>
          <ExpandableSection title="ดูโปรไฟล์ผู้รับบริการ">
            <p className="text-xs text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              ข้อมูลโปรไฟล์ผู้รับบริการจะเปิดใช้งานเร็ว ๆ นี้
            </p>
          </ExpandableSection>
        </div>

        <CareLogCard />
      </div>
    </div>
  );
}
