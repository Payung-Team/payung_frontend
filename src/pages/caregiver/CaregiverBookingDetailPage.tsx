import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { mapToBooking, type Booking } from './CaregiverBookings';
import {
  ACCEPT_BOOKING,
  DECLINE_BOOKING,
  CANCEL_ACCEPTANCE,
  GET_CAREGIVER_BOOKING,
  GET_CAREGIVER_BOOKINGS,
} from '../../graphql/queries';
import { DeclineModal } from '../../components/ui/DeclineModal';
import { CancelAcceptanceModal } from '../../components/ui/CancelAcceptanceModal';
import { AcceptBookingModal } from '../../components/ui/AcceptBookingModal';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { useJobCoordinates } from '../../hooks/useJobCoordinates';
import Skeleton from '../../components/ui/Skeleton';
import CheckInMap from './CheckInMap';
import CaregiverCheckInPanel from './CaregiverCheckInPanel';
import CaregiverServiceProgressPage from './CaregiverServiceProgressPage';
import CheckOutSuccess from '../../components/caregiver/CheckOutSuccess';
import type { ProofOfWorkSummary } from '../../lib/monitoring';
import PatientSummaryCard from './checkin/PatientSummaryCard';
import BookingDetailCard from './checkin/BookingDetailCard';

const IN_PROGRESS_STATUSES: ReadonlyArray<Booking['status']> = ['in_progress', 'awaiting_release', 'needs_review'];

function isBookingToday(bookingDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(bookingDate);
  day.setHours(0, 0, 0, 0);
  return day.getTime() === today.getTime();
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  general_care: 'ดูแลทั่วไป',
  bedridden_care: 'ดูแลผู้ป่วยติดเตียง',
  physiotherapy: 'กายภาพบำบัด',
  medication: 'ช่วยจัดการยา',
  companion: 'เป็นเพื่อน/พูดคุย',
  nursing: 'พยาบาลวิชาชีพ',
  basic_care: 'ดูแลเบื้องต้น',
  elderly_care: 'ดูแลผู้สูงอายุ',
  home_health: 'สุขภาพที่บ้าน',
  patient_transport: 'รับส่งผู้ป่วย',
  post_surgery: 'หลังผ่าตัด',
};

const STATUS_BADGE: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  pending:   { label: 'คำขอใหม่',           dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  accepted:  { label: 'รอคนไข้ชำระเงิน',    dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  confirmed: { label: 'ยืนยันแล้ว',         dot: '#10B981', bg: '#ECFDF5', text: '#047857' },
  declined:  { label: 'ปฏิเสธแล้ว',         dot: '#EF4444', bg: '#FEF2F2', text: '#B91C1C' },
  completed: { label: 'เสร็จสิ้น',          dot: '#52B69A', bg: '#E6F5ED', text: '#3A9A7E' },
  cancelled: { label: 'ยกเลิกแล้ว',         dot: '#6B7280', bg: '#F3F4F6', text: '#374151' },
  in_progress:      { label: 'กำลังปฏิบัติงาน',   dot: '#10B981', bg: '#ECFDF5', text: '#047857' },
  awaiting_release: { label: 'รอปิดงาน',          dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  needs_review:     { label: 'รอแอดมินตรวจสอบ',   dot: '#DC2626', bg: '#FEF2F2', text: '#B91C1C' },
};

const STATUS_BANNER: Record<string, { icon: string; iconColor: string; bg: string; border: string; textColor: string; message: (name: string) => string }> = {
  pending:   { icon: 'notifications_active', iconColor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1E40AF', message: (n) => `${n} ส่งคำขอจองบริการมาให้คุณ กรุณาตรวจสอบและตอบรับหรือปฏิเสธ` },
  accepted:  { icon: 'hourglass_top',        iconColor: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', textColor: '#92400E', message: (n) => `คุณรับงานของ ${n} แล้ว กำลังรอให้ผู้ป่วยชำระเงินยืนยัน` },
  confirmed: { icon: 'check_circle',         iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: (n) => `การนัดหมายกับ ${n} ได้รับการยืนยันแล้ว พบกันในวันนัดหมาย` },
  declined:  { icon: 'cancel',              iconColor: '#DC2626', bg: '#FEF2F2', border: '#FECACA', textColor: '#991B1B', message: (n) => `คุณได้ปฏิเสธคำขอจองของ ${n}` },
  completed: { icon: 'task_alt',            iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: () => `งานนี้เสร็จสิ้นเรียบร้อยแล้ว` },
  cancelled: { icon: 'do_not_disturb_on',  iconColor: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', textColor: '#374151', message: () => `การจองนี้ถูกยกเลิกแล้ว` },
  in_progress:      { icon: 'directions_run', iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: (n) => `คุณกำลังปฏิบัติงานให้ ${n}` },
  awaiting_release: { icon: 'hourglass_top',  iconColor: '#B45309', bg: '#FFFBEB', border: '#FDE68A', textColor: '#92400E', message: () => `เช็คเอาท์แล้ว กำลังรอปิดงาน` },
  needs_review:     { icon: 'flag',           iconColor: '#DC2626', bg: '#FEF2F2', border: '#FECACA', textColor: '#991B1B', message: () => `งานนี้ถูกส่งให้แอดมินตรวจสอบ` },
};

function Divider() {
  return <div style={{ height: '0.8px', background: '#F0F1F3', margin: '18px 0' }} />;
}

function SectionTitle({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 700, color: '#8A8C8E', margin: '0 0 10px', lineHeight: '20px' }}>
      {children}
    </p>
  );
}

function InfoRow({ label, value, valueFont = 'inter' }: Readonly<{ label: string; value: string; valueFont?: 'inter' | 'thai' }>) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', lineHeight: '20px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: valueFont === 'inter' ? "'Inter', sans-serif" : "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#1A1A1A', lineHeight: '20px', textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );
}

function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0]) + 543;
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const month = monthNames[parseInt(parts[1]) - 1];
    const day = parseInt(parts[2]);
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export default function CaregiverBookingDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const stateBooking = location.state?.booking as Booking | undefined;

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<{ lat: number; lng: number } | null>(null);
  /** มีค่าเมื่อเพิ่งปิดงานสำเร็จในรอบนี้ — ใช้สลับไปหน้าสรุปผลแทนหน้าความคืบหน้า */
  const [checkedOutProof, setCheckedOutProof] = useState<ProofOfWorkSummary | null>(null);

  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const [acceptBooking] = useMutation(ACCEPT_BOOKING);
  const [declineBooking] = useMutation(DECLINE_BOOKING);
  const [cancelAcceptance] = useMutation(CANCEL_ACCEPTANCE);

  // caregiverBooking(id) is a planned backend addition (implementation plan §3.1) — this query
  // errors on a backend that doesn't have it yet, which errorPolicy: 'all' tolerates. Until it
  // ships, the page still works via stateBooking (the happy path: arriving from the list), it
  // just can't survive a bare refresh/deep-link for a booking not present in router state.
  const { data: fetchedData, loading: fetchingBooking, refetch: refetchBooking } = useQuery<{
    caregiverBooking: Record<string, unknown> | null;
  }>(GET_CAREGIVER_BOOKING, {
    variables: { id: id ?? '' },
    skip: !id,
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
  });
  const fetchedBooking = fetchedData?.caregiverBooking ? mapToBooking(fetchedData.caregiverBooking) : undefined;
  const booking = fetchedBooking ?? stateBooking;
  // Called unconditionally (rules of hooks) even though booking may still be undefined here —
  // the hook itself tolerates undefined lat/lng/address.
  const jobCoords = useJobCoordinates(booking?.locationLat, booking?.locationLng, booking?.locationName);

  const showToast = (message: string, isError = false) => {
    if (isError) showError(message, 3000);
    else showSuccess(message, 3000);
    setTimeout(() => navigate('/caregiver/bookings'), 2500);
  };

  if (!booking) {
    if (fetchingBooking) {
      return (
        <div style={{ minHeight: '100vh', background: '#F6FAF9' }}>
          <div className="mx-auto max-w-180 px-6 py-7">
            <Skeleton height={24} width={180} className="mb-4" />
            <Skeleton height={140} className="mb-4" />
            <Skeleton height={220} />
          </div>
        </div>
      );
    }
    return (
      <div style={{ minHeight: '100vh', background: '#F6FAF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 16, color: '#8A8C8E' }}>ไม่พบข้อมูลการจอง</p>
          <button type="button" onClick={() => navigate('/caregiver/bookings')}
            style={{ marginTop: 16, padding: '8px 20px', background: '#52B69A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            กลับไปยังงานของฉัน
          </button>
        </div>
      </div>
    );
  }

  if (checkedOutProof) {
    return (
      <CheckOutSuccess
        bookingRef={`REF-${booking.id.toUpperCase().replaceAll('-', '').slice(-6)}`}
        bookingDateText={booking.bookingDate ? formatThaiDate(booking.bookingDate) : '—'}
        price={booking.price}
        proof={checkedOutProof}
        onBack={() => navigate('/caregiver/bookings')}
      />
    );
  }

  if (IN_PROGRESS_STATUSES.includes(booking.status)) {
    return (
      <div style={{ minHeight: '100vh', background: '#F6FAF9' }}>
        <div className="mx-auto max-w-275 px-5 py-6 pb-25">
          <button
            type="button"
            onClick={() => navigate('/caregiver/bookings')}
            className="mb-4 inline-flex items-center gap-1.5 rounded-lg text-[#575859] hover:text-[#52B69A] focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
          >
            <span className="material-icons text-base">arrow_back</span>
            <span className="text-sm font-semibold" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              กลับไปงานของฉัน
            </span>
          </button>
          <CaregiverServiceProgressPage
            booking={booking}
            onCheckedOut={(proof) => {
              // proof เป็น null = ดึงข้อมูลใหม่ไม่สำเร็จ → ไม่เด้งหน้าสรุป ปล่อยให้ refetch
              // พาไปหน้าตามสถานะใหม่แทน ดีกว่าโชว์หน้าสรุปที่ตัวเลขว่าง
              setCheckedOutProof(proof);
              void refetchBooking();
            }}
          />
        </div>
      </div>
    );
  }

  const idSuffix = booking.id.toUpperCase().replaceAll('-', '').slice(-6);
  const ref = `REF-${idSuffix}`;
  const badge = STATUS_BADGE[booking.status] ?? STATUS_BADGE.cancelled;
  const banner = STATUS_BANNER[booking.status] ?? STATUS_BANNER.cancelled;
  const svcLabel = SERVICE_TYPE_LABELS[booking.serviceType] ?? booking.serviceType ?? '—';
  const dateStr = booking.bookingDate ? formatThaiDate(booking.bookingDate) : '—';
  const tasks = booking.tasks ?? [];
  const tasksText = tasks.length > 0 ? tasks.join(', ') : null;

  // Matches the backend's own gate in checkInBooking (confirmed + payment held + same-day) —
  // payment status isn't exposed on CaregiverBookingSummary, so that half is validated
  // server-side only; if it fails, the mutation's Thai error surfaces via the existing toast.
  const canCheckInToday = booking.status === 'confirmed' && isBookingToday(booking.bookingDate);

  const refetchActive = [
    { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'PENDING', limit: 50 } } },
    { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'ACCEPTED', limit: 50 } } },
    { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'CONFIRMED', limit: 50 } } },
    ...(id ? [{ query: GET_CAREGIVER_BOOKING, variables: { id } }] : []),
  ];

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />

      {/* Modals */}
      <AcceptBookingModal
        isOpen={showAcceptModal}
        booking={booking}
        onClose={() => setShowAcceptModal(false)}
        formatThaiDate={formatThaiDate}
        onConfirm={async () => {
          setShowAcceptModal(false);
          try {
            await acceptBooking({ variables: { bookingId: booking.id }, refetchQueries: refetchActive, awaitRefetchQueries: true });
            showToast('ตอบรับการจองเรียบร้อยแล้ว');
          } catch (err: unknown) {
            const msg = (err as any)?.graphQLErrors?.[0]?.message ?? '';
            showToast(msg.includes('ซ้อนทับ') ? 'ช่วงเวลาซ้อนทับกับงานที่ยืนยันไปแล้ว' : 'ไม่สามารถตอบรับได้ กรุณาลองใหม่', true);
          }
        }}
      />

      <DeclineModal
        isOpen={showDeclineModal}
        booking={booking}
        onClose={() => setShowDeclineModal(false)}
        onSubmit={async (reason) => {
          setShowDeclineModal(false);
          try {
            await declineBooking({
              variables: { input: { bookingId: booking.id, reason } },
              refetchQueries: refetchActive,
              awaitRefetchQueries: true,
            });
            showToast('ปฏิเสธคำขอจองเรียบร้อยแล้ว');
          } catch {
            showToast('ไม่สามารถปฏิเสธได้ กรุณาลองใหม่', true);
          }
        }}
      />

      <CancelAcceptanceModal
        isOpen={showCancelModal}
        booking={booking}
        onClose={() => setShowCancelModal(false)}
        onSubmit={async (reason) => {
          setShowCancelModal(false);
          try {
            await cancelAcceptance({
              variables: { input: { bookingId: booking.id, reason } },
              refetchQueries: refetchActive,
              awaitRefetchQueries: true,
            });
            showToast('ยกเลิกการตอบรับเรียบร้อยแล้ว');
          } catch {
            showToast('ไม่สามารถยกเลิกได้ กรุณาลองใหม่', true);
          }
        }}
      />

      {/* Page */}
      <div style={{ minHeight: '100vh', background: '#F6FAF9' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px 100px' }}>

          {/* Back */}
          <button type="button" onClick={() => navigate('/caregiver/bookings')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 18 }}>
            <span className="material-icons" style={{ fontSize: 16, color: '#52B69A' }}>arrow_back</span>
            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#52B69A', lineHeight: '20px' }}>
              กลับไปยังงานของฉัน
            </span>
          </button>

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <h1 style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px', lineHeight: '30px' }}>
                รายละเอียดงานดูแล
              </h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#8A8C8E', margin: 0, lineHeight: '18px' }}>
                Booking Reference: {ref}
              </p>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 24, background: badge.bg, borderRadius: 9999, flexShrink: 0, marginTop: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: badge.dot, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 600, color: badge.text, lineHeight: '18px' }}>
                {badge.label}
              </span>
            </span>
          </div>

          {/* Status banner */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, background: banner.bg, border: `0.8px solid ${banner.border}`, borderRadius: 12, marginBottom: 18 }}>
            <span className="material-icons" style={{ fontSize: 18, color: banner.iconColor, flexShrink: 0, marginTop: 1 }}>{banner.icon}</span>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: banner.textColor, margin: 0, lineHeight: '20px' }}>
              {banner.message(booking.patientName)}
            </p>
          </div>

          {/* Main card — superseded by PatientSummaryCard + BookingDetailCard once the check-in
              cards render below (same info, restyled to the Figma check-in spec), so it's hidden
              for that branch to avoid showing everything twice. Still used for every other status. */}
          {!canCheckInToday && (
          <div style={{ background: '#FFFFFF', border: '0.8px solid #E0E2E5', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 20, padding: 24 }}>

            {/* ── Section 1: ผู้จอง ── */}
            <SectionTitle>ผู้จอง / ผู้ใช้บริการ</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: 'linear-gradient(135deg, #52B69A 0%, #76C893 100%)', border: '2.4px solid #FFFFFF', boxShadow: '0px 4px 16px rgba(82,182,154,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
                  {booking.patientName?.charAt(0) ?? 'พ'}
                </span>
              </div>
              <div>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '21px' }}>
                  {booking.patientName}
                </p>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', margin: '2px 0 0', lineHeight: '18px' }}>
                  {booking.careRecipientName
                    ? `ดูแลให้: ${booking.careRecipientName}`
                    : 'สำหรับตัวเอง'}
                </p>
              </div>
            </div>

            <Divider />

            {/* ── Section 2: รายละเอียดนัดหมาย ── */}
            <SectionTitle>รายละเอียดนัดหมาย</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <InfoRow label="ประเภทงานบริการ" value={svcLabel} valueFont="thai" />
              <InfoRow label="วันที่ให้บริการ" value={dateStr} />
              <InfoRow label="เวลาให้บริการ" value={booking.time ? `${booking.time} น.` : '—'} />
              <InfoRow label="ระยะเวลาบริการ" value={booking.durationText ?? '—'} />
            </div>
            <InfoRow label="สถานที่รับบริการ" value={booking.locationName ?? '—'} />
            {booking.serviceFormat && (
              <InfoRow label="รูปแบบบริการ" value={booking.serviceFormat} valueFont="thai" />
            )}

            <Divider />

            {/* ── Section 3: ข้อมูลคนไข้ ── */}
            <SectionTitle>ข้อมูลคนไข้</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <InfoRow label="ชื่อผู้รับบริการ" value={booking.careRecipientName ?? booking.patientName ?? '—'} valueFont="thai" />
            </div>

            {/* ── Section 4: ผู้ติดต่อ ── */}
            {booking.dayOfContactName && (
              <>
                <Divider />
                <SectionTitle>ผู้ติดต่อในวันนัดหมาย</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <InfoRow label="ชื่อผู้ติดต่อ" value={booking.dayOfContactName} valueFont="thai" />
                  <InfoRow label="เบอร์โทรศัพท์" value={booking.dayOfContactPhone ?? '—'} />
                  {booking.dayOfContactRelationship && (
                    <InfoRow label="ความสัมพันธ์" value={booking.dayOfContactRelationship} valueFont="thai" />
                  )}
                </div>
              </>
            )}

            <Divider />

            {/* ── Section 5: รายละเอียดภารกิจ ── */}
            <SectionTitle>รายละเอียดภารกิจ</SectionTitle>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14 }}>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontStyle: 'italic', fontSize: 13, color: tasksText ? '#575859' : '#B0B3B8', margin: 0, lineHeight: '20px' }}>
                {tasksText ?? 'ไม่ได้ระบุภารกิจเพิ่มเติม'}
              </p>
            </div>

            {booking.notes && (
              <div style={{ marginTop: 12, background: '#FFF8E7', border: '0.8px solid #FFEAA7', borderRadius: 10, padding: 14 }}>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#8A6D3B', margin: 0, lineHeight: '20px' }}>
                  บันทึกจากผู้ป่วย: {booking.notes}
                </p>
              </div>
            )}

            <Divider />

            {/* ── Section 6: ราคา ── */}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                รายได้โดยประมาณทั้งสิ้น
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, color: '#52B69A', margin: 0, lineHeight: '33px' }}>
                {booking.price > 0 ? `฿${booking.price.toLocaleString()}` : '—'}
              </p>
            </div>
          </div>
          )}

          {/* ── Action buttons ── */}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>

            {booking.status === 'pending' && (
              <>
                <button type="button" onClick={() => setShowAcceptModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, padding: '0 40px', background: '#009265', border: 'none', boxShadow: '0px 4px 14px rgba(0,146,101,0.3)', borderRadius: 12, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 15, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>
                  <span className="material-icons" style={{ fontSize: 18 }}>check_circle</span>
                  ตอบรับการจอง
                </button>
                <button type="button" onClick={() => setShowDeclineModal(true)}
                  style={{ height: 37, padding: '0 28px', background: '#FFFFFF', border: '0.8px solid #FCA5A5', borderRadius: 8, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}>
                  ปฏิเสธการจอง
                </button>
              </>
            )}

            {booking.status === 'accepted' && (
              <button type="button" onClick={() => setShowCancelModal(true)}
                style={{ height: 37, padding: '0 28px', background: '#FFFFFF', border: '0.8px solid #FCA5A5', borderRadius: 8, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}>
                ยกเลิกการตอบรับ
              </button>
            )}

          </div>

          {/* ── Check-in (PYG-360) ──
              Replaces the old "ส่งการดูแล" / completeBooking flow for confirmed bookings — that
              button jumped straight to completion and predates the check-in/check-out monitoring
              module. Two competing primary actions for the same status didn't make sense, so this
              is the only "start the job" affordance now. */}
          {booking.status === 'confirmed' && (
            <div className="mt-6">
              {canCheckInToday ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[621fr_414fr]">
                  <div className="order-2 flex flex-col gap-5 lg:order-1">
                    <CheckInMap
                      jobLat={jobCoords.lat}
                      jobLng={jobCoords.lng}
                      caregiverLat={previewPosition?.lat ?? null}
                      caregiverLng={previewPosition?.lng ?? null}
                      approximate={jobCoords.source === 'geocoded'}
                    />
                    <PatientSummaryCard
                      patientName={booking.patientName}
                      careRecipientName={booking.careRecipientName}
                    />
                    <BookingDetailCard
                      serviceLabel={svcLabel}
                      dateText={dateStr}
                      timeText={booking.time ? `${booking.time} น.` : '—'}
                      durationText={booking.durationText}
                      locationName={booking.locationName}
                      serviceFormat={booking.serviceFormat}
                      price={booking.price}
                      tasks={tasks}
                      notes={booking.notes}
                      dayOfContactName={booking.dayOfContactName}
                      dayOfContactPhone={booking.dayOfContactPhone}
                      dayOfContactRelationship={booking.dayOfContactRelationship}
                    />
                  </div>
                  <div className="order-1 lg:order-2">
                    <CaregiverCheckInPanel
                      bookingId={booking.id}
                      jobLat={jobCoords.lat}
                      jobLng={jobCoords.lng}
                      bookingDate={booking.bookingDate}
                      startTime={booking.time ? booking.time.split(' - ')[0] : null}
                      onCheckedIn={() => refetchBooking()}
                      onPreviewPositionChange={setPreviewPosition}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  จะเช็คอินได้ในวันที่ {formatThaiDate(booking.bookingDate)}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
