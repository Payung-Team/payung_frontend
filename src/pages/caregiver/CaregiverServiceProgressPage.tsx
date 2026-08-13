import { useQuery } from '@apollo/client/react';
import { GET_PROOF_OF_WORK } from '../../graphql/queries';
import type { Booking } from './CaregiverBookings';
import ServiceProgressMap from './serviceProgress/ServiceProgressMap';
import TimeCards from './serviceProgress/TimeCards';
import EmergencyContactCard from './serviceProgress/EmergencyContactCard';
import ExpandableSection from './serviceProgress/ExpandableSection';
import CheckoutButton from './serviceProgress/CheckoutButton';
import { Icon } from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';

export interface CaregiverServiceProgressPageProps {
  booking: Booking & { locationLat?: number | null; locationLng?: number | null };
  onCheckedOut: () => void;
}

interface ProofOfWorkData {
  proofOfWork: {
    checkIn: { serverTs: string } | null;
    checkOut: { serverTs: string } | null;
  };
}

function TaskTagsCard({ tasks }: Readonly<{ tasks: string[] }>) {
  if (tasks.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
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
      <p className="mt-2.5 text-[11px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        การติ๊กเสร็จงานจะเปิดใช้งานเร็ว ๆ นี้
      </p>
    </div>
  );
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
  const { data, loading } = useQuery<ProofOfWorkData>(GET_PROOF_OF_WORK, {
    variables: { bookingId: booking.id },
  });

  const checkInServerTs = data?.proofOfWork?.checkIn?.serverTs ?? null;
  const checkOutServerTs = data?.proofOfWork?.checkOut?.serverTs ?? null;
  const jobLat = booking.locationLat ?? null;
  const jobLng = booking.locationLng ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[621fr_414fr]">
      <div className="order-2 flex flex-col gap-5 lg:order-1">
        <ServiceProgressMap jobLat={jobLat} jobLng={jobLng} />

        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
          <p className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ผู้รับบริการ
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #168AAD 0%, #52B69A 100%)' }}
            >
              <span className="text-lg font-bold" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {booking.patientName?.charAt(0) ?? '?'}
              </span>
            </span>
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {booking.patientName}
              </p>
              <p className="text-xs text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {booking.careRecipientName ? `สำหรับ: ${booking.careRecipientName}` : 'สำหรับตัวเอง'}
              </p>
            </div>
          </div>
        </div>

        <ExpandableSection title="ดูรายละเอียดการจอง">
          <div className="flex flex-col gap-2.5">
            <BookingDetailRow icon="calendar_today" label="วันที่" value={booking.bookingDate || '—'} />
            <BookingDetailRow icon="schedule" label="เวลา" value={booking.time || '—'} />
            {booking.locationName && <BookingDetailRow icon="place" label="สถานที่" value={booking.locationName} />}
            {booking.serviceFormat && <BookingDetailRow icon="directions" label="รูปแบบ" value={booking.serviceFormat} />}
            {booking.price > 0 && <BookingDetailRow icon="payments" label="รายได้" value={`฿${booking.price.toLocaleString()}`} />}
          </div>
        </ExpandableSection>

        <ExpandableSection title="ดูโปรไฟล์ผู้รับบริการ">
          <p className="text-xs text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ข้อมูลโปรไฟล์ผู้รับบริการจะเปิดใช้งานเร็ว ๆ นี้
          </p>
        </ExpandableSection>

        <TaskTagsCard tasks={booking.tasks ?? []} />
      </div>

      <div className="order-1 flex flex-col gap-5 lg:order-2">
        {loading ? (
          <Skeleton height={96} />
        ) : (
          <TimeCards checkInServerTs={checkInServerTs} checkOutServerTs={checkOutServerTs} />
        )}

        {checkOutServerTs ? (
          <div className="rounded-2xl bg-white p-5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            <Icon name="task_alt" color="#047857" size="large" />
            <p className="mt-2 text-sm font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              จบงานเรียบร้อยแล้ว
            </p>
          </div>
        ) : (
          <CheckoutButton bookingId={booking.id} onCheckedOut={onCheckedOut} />
        )}

        <EmergencyContactCard
          name={booking.dayOfContactName}
          phone={booking.dayOfContactPhone}
          relationship={booking.dayOfContactRelationship}
        />
      </div>
    </div>
  );
}
