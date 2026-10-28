import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { mapToBooking, type Booking } from './CaregiverBookings';
import {
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
import Skeleton from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
import JobInfoModals, { type JobInfoPanel } from './serviceProgress/JobInfoModals';
import { hasAnyProfileData } from '../../lib/patientProfile';
import { caregiverEarnings, formatBaht } from '../../lib/caregiverEarnings';
import { serviceTypeLabel } from '../../lib/serviceTypeLabels';
import CaregiverServiceProgressPage from './CaregiverServiceProgressPage';
import CheckOutSuccess from '../../components/caregiver/CheckOutSuccess';
import type { ProofOfWorkSummary } from '../../lib/monitoring';
import CheckInView from './checkin/CheckInView';
import { getPayoutStatusMeta } from '../../lib/payoutStatus';
import { formatThaiDate } from '../../lib/thaiDate';
import BookingActivitiesList from '../../components/booking/BookingActivitiesList';
import { useBookingActivities } from '../../hooks/useBookingActivities';
import { useCareActivityStrings } from '../../lib/careActivityStrings';
import {
  ACCEPT_BOOKING_WITH_INFECTION_ACK,
  INFECTION_ACK_REQUIRED,
} from '../../graphql/infectionDisclosure';
import CaregiverInfectionSection from '../../components/infection/CaregiverInfectionSection';
import { useCaregiverInfection } from '../../components/infection/useCaregiverInfection';
import { infectionKey } from '../../lib/infectionDisclosure';
import { useInfectionStrings } from '../../lib/infectionStrings';
import { extractGraphQLErrorExtensions } from '../../lib/apolloErrors';

const IN_PROGRESS_STATUSES: ReadonlyArray<Booking['status']> = ['in_progress'];

function isBookingToday(bookingDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(bookingDate);
  day.setHours(0, 0, 0, 0);
  return day.getTime() === today.getTime();
}

const STATUS_BADGE: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  pending:   { label: 'คำขอใหม่',           dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  accepted:  { label: 'รอคนไข้ชำระเงิน',    dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  confirmed: { label: 'ยืนยันแล้ว',         dot: '#10B981', bg: '#ECFDF5', text: '#047857' },
  declined:  { label: 'ปฏิเสธแล้ว',         dot: '#EF4444', bg: '#FEF2F2', text: '#B91C1C' },
  completed: { label: 'เสร็จสิ้น',          dot: '#52B69A', bg: '#E6F5ED', text: '#3A9A7E' },
  cancelled: { label: 'ยกเลิกแล้ว',         dot: '#6B7280', bg: '#F3F4F6', text: '#374151' },
  in_progress:      { label: 'กำลังปฏิบัติงาน',   dot: '#10B981', bg: '#ECFDF5', text: '#047857' },
};

const STATUS_BANNER: Record<string, { icon: string; iconColor: string; bg: string; border: string; textColor: string; message: (name: string) => string }> = {
  pending:   { icon: 'notifications_active', iconColor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1E40AF', message: (n) => `${n} ส่งคำขอจองบริการมาให้คุณ กรุณาตรวจสอบและตอบรับหรือปฏิเสธ` },
  accepted:  { icon: 'hourglass_top',        iconColor: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', textColor: '#92400E', message: (n) => `คุณรับงานของ ${n} แล้ว กำลังรอให้ผู้ป่วยชำระเงินยืนยัน` },
  confirmed: { icon: 'check_circle',         iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: (n) => `การนัดหมายกับ ${n} ได้รับการยืนยันแล้ว พบกันในวันนัดหมาย` },
  declined:  { icon: 'cancel',              iconColor: '#DC2626', bg: '#FEF2F2', border: '#FECACA', textColor: '#991B1B', message: (n) => `คุณได้ปฏิเสธคำขอจองของ ${n}` },
  completed: { icon: 'task_alt',            iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: () => `งานนี้เสร็จสิ้นเรียบร้อยแล้ว` },
  cancelled: { icon: 'do_not_disturb_on',  iconColor: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', textColor: '#374151', message: () => `การจองนี้ถูกยกเลิกแล้ว` },
  in_progress:      { icon: 'directions_run', iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: (n) => `คุณกำลังปฏิบัติงานให้ ${n}` },
};

const CARD = 'bg-white border-[0.8px] border-[#E0E2E5] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] rounded-[20px] p-5 md:p-6';

function CardTitle({ icon, count, children }: Readonly<{ icon: string; count?: number; children: React.ReactNode }>) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="material-icons" style={{ fontSize: 18, color: '#52B69A' }}>{icon}</span>
      <h3 className="m-0 text-[15px] font-bold leading-[22px] text-[#1A1A1A]">{children}</h3>
      {count != null && (
        <span className="px-2 h-5 rounded-full bg-[#F0F1F3] font-['Inter'] text-[11px] font-semibold text-[#575859] flex items-center">{count}</span>
      )}
    </div>
  );
}

/** ข้อมูลหลักแบบป้ายอยู่บน ค่าอยู่ล่าง — อ่านไล่ลงได้ ไม่ต้องกวาดตาซ้าย-ขวาบนจอกว้าง */
function KeyFact({ icon, label, value, sub }: Readonly<{ icon: string; label: string; value: string; sub?: string }>) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#F9FAFB] px-3.5 py-3 h-full">
      <span className="material-icons flex-shrink-0 mt-0.5" style={{ fontSize: 20, color: '#52B69A' }}>{icon}</span>
      <div className="min-w-0">
        <p className="m-0 text-xs text-[#8A8C8E] leading-[18px]">{label}</p>
        <p className="m-0 text-[15px] font-semibold leading-[22px] text-[#1A1A1A] break-words">{value || '—'}</p>
        {sub && <p className="m-0 text-xs text-[#575859] leading-[18px]">{sub}</p>}
      </div>
    </div>
  );
}

export default function CaregiverBookingDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const stateBooking = location.state?.booking as Booking | undefined;
  // มาจากหน้ารายการ (กดการ์ด) → ย้อนประวัติ ได้แท็บ/ตัวกรองเดิมกลับมา (เก็บอยู่ใน URL ของหน้ารายการ)
  // มาจากที่อื่น (แจ้งเตือน / หน้า home / เปิดลิงก์ตรง) → ไปหน้ารายการตามปกติ
  const fromList = location.state?.fromList === true;
  const backToList = () => {
    if (fromList) navigate(-1);
    else navigate('/caregiver/bookings');
  };

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  /** มีค่าเมื่อเพิ่งปิดงานสำเร็จในรอบนี้ — ใช้สลับไปหน้าสรุปผลแทนหน้าความคืบหน้า */
  const [checkedOutProof, setCheckedOutProof] = useState<ProofOfWorkSummary | null>(null);
  /** เช็คอินสำเร็จ = backend เปลี่ยน status เป็น in_progress ไปแล้วแน่นอน จึงสลับหน้าได้เลย
   *  ไม่ต้องรอ refetch — ไม่งั้นการ์ด "เช็คอินแล้ว" จะค้างอยู่ในหน้าเช็คอินระหว่างรอ network */
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [infoPanel, setInfoPanel] = useState<JobInfoPanel>(null);

  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const [declineBooking] = useMutation(DECLINE_BOOKING);
  const [cancelAcceptance] = useMutation(CANCEL_ACCEPTANCE);

  // stateBooking (router state, from the list) is only a first-paint shortcut — the fetched copy
  // wins so refetchBooking() after check-in/check-out actually moves the page to the next status.
  // errorPolicy: 'all' stays so a network blip falls back to stateBooking instead of a blank page.
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
  const activities = useBookingActivities(id, 'caregiver');
  const cas = useCareActivityStrings();

  // ── S10 · PYG-620: โรคติดเชื้อ — ต้องรับทราบก่อนตอบรับ ─────────────────────────
  // ปุ่มที่ปิดไว้เป็นแค่ความสะดวก ตัวบังคับจริงคือ BE (INFECTION_ACK_REQUIRED · PYG-619)
  const infection = useCaregiverInfection(booking?.id);
  const infectionText = useInfectionStrings();
  const [acceptWithInfectionAck] = useMutation(ACCEPT_BOOKING_WITH_INFECTION_ACK);
  // เก็บ "ค่าที่รับทราบ" ไม่ใช่ boolean — โหลดใหม่แล้วค่าเปลี่ยน การรับทราบเดิมหลุดเองโดยไม่ต้องมี effect
  const [ackedKey, setAckedKey] = useState<string | null>(null);
  const [infectionChanged, setInfectionChanged] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const infectionValueKey = infection.disclosure
    ? infectionKey(infection.disclosure.hasInfectiousDisease)
    : null;
  const infectionAck = ackedKey !== null && ackedKey === infectionValueKey;
  const isPendingRequest = booking?.status === 'pending';
  // โหลดไม่เสร็จ / โหลดไม่ได้ ก็ยังรับงานไม่ได้ — ห้ามรับโดยที่ยังไม่เห็นข้อมูล
  const needsInfectionAck =
    isPendingRequest && (infection.disclosure !== null || infection.loading || infection.error);
  const acceptBlocked = (needsInfectionAck && !infectionAck) || accepting;

  const showToast = (message: string, isError = false) => {
    if (isError) showError(message, 3000);
    else showSuccess(message, 3000);
    setTimeout(backToList, 2500);
  };

  if (!booking) {
    if (fetchingBooking) {
      return (
        <div style={{ minHeight: '100vh', background: '#F6FAF9' }}>
          <div className="mx-auto max-w-300 px-6 py-7">
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
          <button type="button" onClick={backToList}
            style={{ marginTop: 16, padding: '8px 20px', background: '#52B69A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            กลับไปยังงานของฉัน
          </button>
        </div>
      </div>
    );
  }

  const payoutBadge = getPayoutStatusMeta(booking.payoutStatus);

  if (checkedOutProof) {
    return (
      <CheckOutSuccess
        bookingRef={`REF-${booking.id.toUpperCase().replaceAll('-', '').slice(-6)}`}
        bookingDateText={booking.bookingDate ? formatThaiDate(booking.bookingDate) : '—'}
        grossAmount={booking.price}
        payoutAmount={booking.payoutAmount}
        paidAmount={booking.paidAmount}
        proof={checkedOutProof}
        onBack={backToList}
      />
    );
  }

  if (justCheckedIn || IN_PROGRESS_STATUSES.includes(booking.status)) {
    return (
      <div style={{ minHeight: '100vh', background: '#F6FAF9' }}>
        <div className="mx-auto max-w-300 px-6 py-6 pb-25">
          <button
            type="button"
            onClick={backToList}
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
  const svcLabel = serviceTypeLabel(booking.serviceType);
  const dateStr = booking.bookingDate ? formatThaiDate(booking.bookingDate) : '—';
  const tasks = booking.tasks ?? [];
  const recipientName = booking.careRecipientName ?? booking.patientName ?? '—';
  // PYG-460 — snapshot สุขภาพ ณ วันจอง · ข้อมูลเบื้องต้นโชว์ในการ์ด รายละเอียดเต็มอยู่ในป๊อปอัปโปรไฟล์
  const profile = booking.patientProfile;
  const hasProfile = hasAnyProfileData(profile);
  const profileFacts = [
    { label: 'อายุ', value: profile?.age != null ? `${profile.age} ปี` : null },
    { label: 'เพศ', value: profile?.gender ?? null },
    { label: 'น้ำหนัก', value: profile?.weight != null ? `${profile.weight} กก.` : null },
    { label: 'ส่วนสูง', value: profile?.height != null ? `${profile.height} ซม.` : null },
    { label: 'กรุ๊ปเลือด', value: profile?.bloodGroup || null },
  ].filter((f): f is { label: string; value: string } => !!f.value);
  // คำขอใหม่ (ยังไม่ตอบรับ) — โชว์เท่าที่หน้า home โชว์: เพศ · อายุ · การช่วยเหลือตัวเอง
  //   ข้อมูลสุขภาพเต็ม / ผู้ติดต่อ / บันทึกจากผู้ป่วย เปิดให้เห็นหลังตอบรับงานแล้วเท่านั้น
  const isRequest = booking.status === 'pending';
  // รอชำระเงิน (accepted) ก็ยังไม่ใช่งานที่ยืนยันแล้ว — ปิดข้อมูลสุขภาพ / ผู้ติดต่อ / บันทึกเหมือนคำขอใหม่
  //   จนผู้ป่วยชำระเงินยืนยันการจอง (ถ้าผู้ป่วยไม่จ่าย งานหลุดได้ ผู้ดูแลไม่ควรได้ข้อมูลไปแล้ว)
  const isInfoLocked = isRequest || booking.status === 'accepted';
  // ประวัติงาน — จบไปแล้ว ไม่ต้องเห็นข้อมูลสุขภาพ / ผู้ติดต่อ / บันทึกจากผู้ป่วยอีก
  const isHistory = booking.status === 'completed' || booking.status === 'declined' || booking.status === 'cancelled';
  const netEarnings = caregiverEarnings(booking.price, booking.payoutAmount, booking.paidAmount).net;
  const recipientBrief = [
    profile?.gender,
    profile?.age != null ? `${profile.age} ปี` : null,
    profile?.supportLevel,
  ].filter(Boolean).join(' · ');

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
      {!isInfoLocked && !isHistory && <JobInfoModals booking={booking} open={infoPanel} onClose={() => setInfoPanel(null)} />}

      {/* Modals */}
      <AcceptBookingModal
        isOpen={showAcceptModal}
        booking={booking}
        onClose={() => setShowAcceptModal(false)}
        formatThaiDate={formatThaiDate}
        onConfirm={async () => {
          setShowAcceptModal(false);
          if (accepting) return;
          setAccepting(true);
          try {
            await acceptWithInfectionAck({
              variables: { bookingId: booking.id, infectionAcknowledged: infectionAck },
              refetchQueries: refetchActive,
              awaitRefetchQueries: true,
            });
            showToast('ตอบรับการจองเรียบร้อยแล้ว');
          } catch (err: unknown) {
            // E2: ญาติแก้ค่าระหว่างที่เปิดค้าง — โหลดค่าใหม่ ล้างการรับทราบ อยู่หน้าเดิมให้รับทราบใหม่
            //   (422 มาเป็น ServerError จึงอ่านผ่าน extractGraphQLErrorExtensions ที่อ่าน body ด้วย)
            if (extractGraphQLErrorExtensions(err)?.code === INFECTION_ACK_REQUIRED) {
              setAckedKey(null);
              setInfectionChanged(true);
              await infection.refetch();
              showError(infectionText.cgAckRequiredToast, 4000);
              return;
            }
            const msg = (err as any)?.graphQLErrors?.[0]?.message ?? '';
            showToast(msg.includes('ซ้อนทับ') ? 'ช่วงเวลาซ้อนทับกับงานที่ยืนยันไปแล้ว' : 'ไม่สามารถตอบรับได้ กรุณาลองใหม่', true);
          } finally {
            setAccepting(false);
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
        {/* คำขอใหม่มีแถบปุ่มลอยด้านล่าง (สูงสุด ~110px บนมือถือเมื่อมีคำใบ้) → เผื่อที่ให้เนื้อหาท้ายหน้า */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: `28px 24px ${booking.status === 'pending' ? 140 : 100}px`, boxSizing: 'border-box' }}>

          {/* Back */}
          <button type="button" onClick={backToList}
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

          {/* Status banner — งานเสร็จแล้วใช้การ์ดรายได้ด้านล่างแทน (มีข้อความ "เสร็จสิ้น" อยู่ในตัว) */}
          {booking.status !== 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, background: banner.bg, border: `0.8px solid ${banner.border}`, borderRadius: 12, marginBottom: 18 }}>
            <span className="material-icons" style={{ fontSize: 18, color: banner.iconColor, flexShrink: 0, marginTop: 1 }}>{banner.icon}</span>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: banner.textColor, margin: 0, lineHeight: '20px' }}>
              {banner.message(booking.patientName)}
            </p>
          </div>
          )}

          {/* Main card — สถานะ confirmed มี CheckInView ของตัวเองด้านล่าง (ข้อมูลชุดเดียวกัน
              จัดใหม่เป็นการ์ดก่อนเริ่มงาน + ป๊อปอัป) จึงซ่อนการ์ดนี้ไม่ให้แสดงซ้ำ
              สถานะอื่น (pending/accepted/declined/completed/cancelled) ยังใช้การ์ดนี้ */}
          {booking.status !== 'confirmed' && (
          <div className="flex flex-col gap-4 font-['Bai_Jamjuree']">

            {/* ── 0. ประวัติงาน (เสร็จสิ้น) — รายได้คือสิ่งแรกที่อยากรู้ ── */}
            {booking.status === 'completed' && (
              <section className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#3A9A7E] via-[#52B69A] to-[#76C893] p-6 md:p-7 text-white shadow-[0px_4px_16px_rgba(58,154,126,0.2)]">
                <div className="absolute rounded-full bg-white/10" style={{ width: 200, height: 200, right: -40, top: -70 }} />
                <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                  <div>
                    <p className="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-white/90">
                      <span className="material-icons" style={{ fontSize: 18 }}>task_alt</span>
                      งานนี้เสร็จสิ้นเรียบร้อยแล้ว
                    </p>
                    <p className="m-0 mt-4 text-sm text-white/85">รายได้สุทธิ</p>
                    <p className="m-0 font-['Inter'] text-[40px] md:text-[44px] font-bold leading-[48px]">
                      {booking.price > 0 ? formatBaht(netEarnings) : '—'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 md:items-end">
                    <span className="text-xs text-white/80">สถานะการโอนเงิน</span>
                    <span className="text-base font-bold">{payoutBadge.label}</span>
                  </div>
                </div>
              </section>
            )}

            {/* ── 1. คน — ผู้รับบริการ + ผู้ติดต่อวันนัด (ดูก่อนว่าจะไปดูแลใคร)
                ประวัติงาน (เสร็จ/ปฏิเสธ/ยกเลิก) ไม่ต้องเห็นข้อมูลสุขภาพ/ผู้ติดต่ออีก → ย้ายชื่อไปอยู่ในการ์ดสรุปงานแทน ── */}
            {!isHistory && (
            <div className={`grid grid-cols-1 gap-4 ${!isInfoLocked && booking.dayOfContactName ? 'md:grid-cols-2' : ''}`}>
              <section className={CARD}>
                <CardTitle icon="elderly">ผู้รับบริการ</CardTitle>
                <div className="flex items-center gap-3">
                  {/* รูปของผู้รับบริการ (signed URL) · ไม่มีรูป = ตัวอักษรย่อ */}
                  <Avatar src={booking.recipientAvatarUrl} name={recipientName} size={48} fallbackColor="#E7F5EE" className="!border-0 !text-[#2F8B70] !shadow-none flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="m-0 text-base font-bold leading-6 text-[#1A1A1A] truncate">{recipientName}</p>
                    <p className="m-0 text-xs text-[#8A8C8E]">
                      {booking.careRecipientName && booking.careRecipientName !== booking.patientName
                        ? `จองโดย ${booking.patientName}`
                        : 'จองให้ตัวเอง'}
                    </p>
                  </div>
                </div>

                {/* ข้อมูลเบื้องต้น */}
                {isInfoLocked ? (
                  <>
                    {recipientBrief && (
                      <p className="m-0 mt-3 text-sm text-[#575859]">{recipientBrief}</p>
                    )}
                    <p className="m-0 mt-3 flex items-center gap-1.5 text-xs text-[#8A8C8E]">
                      <span className="material-icons" style={{ fontSize: 14 }}>lock</span>
                      {isRequest ? 'ข้อมูลสุขภาพและผู้ติดต่อจะแสดงหลังตอบรับงาน' : 'ข้อมูลสุขภาพและผู้ติดต่อจะแสดงหลังผู้รับบริการชำระเงินยืนยันการจอง'}
                    </p>
                  </>
                ) : hasProfile ? (
                  <div className="mt-4 flex flex-col gap-4">
                    {/* ข้อมูลร่างกาย — ตารางป้ายบน/ค่าล่าง */}
                    {profileFacts.length > 0 && (
                      <dl className="m-0 grid grid-cols-3 gap-x-3 gap-y-3 rounded-xl bg-[#F9FAFB] px-3.5 py-3">
                        {profileFacts.map((fact) => (
                          <div key={fact.label} className="min-w-0">
                            <dt className="text-[11px] leading-4 text-[#8A8C8E]">{fact.label}</dt>
                            <dd className="m-0 mt-0.5 text-sm font-bold leading-5 text-[#1A1A1A]">{fact.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {(profile?.supportLevel || !!profile?.conditions?.length) && (
                      <dl className="m-0 flex flex-col gap-3">
                        {profile?.supportLevel && (
                          <div>
                            <dt className="text-xs leading-[18px] text-[#8A8C8E]">การช่วยเหลือตัวเอง</dt>
                            <dd className="m-0 mt-0.5 text-sm font-semibold leading-5 text-[#1A1A1A]">{profile.supportLevel}</dd>
                          </div>
                        )}
                        {!!profile?.conditions?.length && (
                          <div>
                            <dt className="text-xs leading-[18px] text-[#8A8C8E]">โรคประจำตัว</dt>
                            <dd className="m-0 mt-0.5 text-sm font-semibold leading-5 text-[#1A1A1A]">{profile.conditions.join(', ')}</dd>
                          </div>
                        )}
                      </dl>
                    )}

                    {/* ★ ประวัติแพ้ยาโชว์เด่นเสมอ — ผิดแล้วอันตรายถึงชีวิต (เหมือน RecipientActionRow) */}
                    {profile?.allergies && (
                      <div className="flex items-start gap-2 rounded-lg bg-[#FEF2F2] border-[0.8px] border-[#FECACA] px-3 py-2">
                        <span className="material-icons flex-shrink-0" style={{ fontSize: 16, color: '#DC2626', marginTop: 1 }}>warning</span>
                        <span className="text-xs font-semibold leading-5 text-[#991B1B] break-words">แพ้: {profile.allergies}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="m-0 mt-3 text-xs text-[#8A8C8E]">ผู้จองไม่ได้กรอกข้อมูลสุขภาพ — สอบถามผู้ติดต่อก่อนเริ่มดูแล</p>
                )}

                {!isInfoLocked && (
                  <button
                    type="button"
                    onClick={() => setInfoPanel('profile')}
                    className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#3A9A7E] hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    ดูโปรไฟล์ทั้งหมด
                    <span className="material-icons" style={{ fontSize: 16 }}>chevron_right</span>
                  </button>
                )}
              </section>

              {!isInfoLocked && booking.dayOfContactName && (
                <section className={CARD}>
                  <CardTitle icon="contact_phone">ผู้ติดต่อในวันนัดหมาย</CardTitle>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 text-base font-bold leading-6 text-[#1A1A1A] truncate">{booking.dayOfContactName}</p>
                      <p className="m-0 text-xs text-[#8A8C8E]">
                        {[booking.dayOfContactRelationship, booking.dayOfContactPhone].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    {booking.dayOfContactPhone && (
                      <a
                        href={`tel:${booking.dayOfContactPhone}`}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border-[0.8px] border-[#52B69A] text-[13px] font-semibold text-[#3A9A7E] hover:bg-[#F0FAF4] transition-colors"
                      >
                        <span className="material-icons" style={{ fontSize: 16 }}>call</span>
                        โทร
                      </a>
                    )}
                  </div>
                </section>
              )}
            </div>
            )}

            {/* ── 2. สรุปงาน — งานอะไร · เมื่อไร · ที่ไหน · ได้เท่าไร ── */}
            <section className={CARD}>
              {/* แถวบน: ประเภทงาน (ซ้าย) · รายได้ (ขวา) — แถวล่าง: วันที่/เวลา/สถานที่ กว้างเท่ากันเต็มการ์ด */}
              <div className="flex flex-col md:flex-row md:items-stretch gap-4">
                <div className="flex-1 min-w-0 md:self-center">
                  <p className="m-0 text-xs font-semibold text-[#52B69A]">ประเภทงาน</p>
                  <h2 className="m-0 mt-0.5 text-xl md:text-2xl font-bold leading-8 text-[#1A1A1A]">{svcLabel}</h2>
                  {booking.serviceFormat && (
                    <p className="m-0 mt-0.5 text-[13px] text-[#575859]">{booking.serviceFormat}</p>
                  )}
                </div>

                {/* ประวัติงาน — เหลือแค่ชื่อ/รูปผู้รับบริการ ไว้จำได้ว่างานของใคร */}
                {isHistory && (
                  <div className="flex items-center gap-3 md:self-center">
                    <Avatar src={booking.recipientAvatarUrl} name={recipientName} size={40} fallbackColor="#E7F5EE" className="!border-0 !text-[#2F8B70] !shadow-none flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="m-0 text-[11px] text-[#8A8C8E]">ผู้รับบริการ</p>
                      <p className="m-0 text-[15px] font-bold leading-[22px] text-[#1A1A1A] truncate">{recipientName}</p>
                    </div>
                  </div>
                )}

                {/* รายได้ — คำขอใหม่อยู่ในแถบปุ่มลอย · งานเสร็จอยู่การ์ดบนสุด · ปฏิเสธ/ยกเลิกไม่มีรายได้
                    เหลือแสดงตรงนี้เฉพาะ "รอชำระเงิน" (accepted) */}
                {booking.status === 'accepted' && (
                <div className="md:w-[260px] flex-shrink-0 flex flex-col justify-center rounded-2xl bg-[#F0FAF4] border-[0.8px] border-[#D1FAE5] px-4 py-3">
                  <p className="m-0 text-xs font-semibold text-[#059669]">รายได้สุทธิ</p>
                  <p className="m-0 mt-1 font-['Inter'] text-[28px] font-bold leading-9 text-[#059669]">
                    {booking.price > 0 ? formatBaht(netEarnings) : '—'}
                  </p>
                </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <KeyFact icon="event" label="วันที่ให้บริการ" value={dateStr} />
                {/* PYG-526: "09:00 – 13:00" + ระยะเวลาแยกเป็นบรรทัดรอง */}
                <KeyFact icon="schedule" label="เวลา" value={booking.time || '—'} sub={booking.durationText} />
                <div className="sm:col-span-2 md:col-span-1">
                  <KeyFact icon="place" label="สถานที่รับบริการ" value={booking.locationName ?? '—'} />
                </div>
              </div>
            </section>

            {/* ── 3. สิ่งที่ต้องทำ ── */}
            <section className={CARD}>
              {/* PYG-635: กิจกรรมจากรายการกลาง (snapshot ณ วันจอง) */}
              {activities.length > 0 && (
                <div className="mb-5">
                  <CardTitle icon="checklist">{cas.detailTitle}</CardTitle>
                  <div className="rounded-xl bg-[#F9FAFB] p-3.5">
                    <BookingActivitiesList activities={activities} />
                    <p className="mt-3 text-[11px] text-[#8A8C8E]">{cas.detailNote}</p>
                  </div>
                </div>
              )}

              <CardTitle icon="assignment" count={tasks.length || undefined}>รายละเอียดภารกิจ</CardTitle>
              {tasks.length > 0 ? (
                <ol className="m-0 p-0 list-none flex flex-col rounded-xl border-[0.8px] border-[#F0F1F3] divide-y divide-[#F0F1F3]">
                  {tasks.map((task, i) => (
                    <li key={`${i}-${task}`} className="flex items-start gap-3 px-3.5 py-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E6F5ED] text-[#3A9A7E] font-['Inter'] text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-6 text-[#1A1A1A]">{task}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="m-0 text-[13px] text-[#B0B3B8]">ไม่ได้ระบุภารกิจเพิ่มเติม</p>
              )}

              {!isInfoLocked && !isHistory && booking.notes && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#FFF8E7] border-[0.8px] border-[#FFEAA7] p-3.5">
                  <span className="material-icons flex-shrink-0" style={{ fontSize: 18, color: '#B7791F' }}>sticky_note_2</span>
                  <div>
                    <p className="m-0 text-xs font-bold text-[#8A6D3B]">บันทึกจากผู้ป่วย</p>
                    <p className="m-0 mt-0.5 text-[13px] leading-5 text-[#5C4A1E]">{booking.notes}</p>
                  </div>
                </div>
              )}
            </section>
          </div>
          )}

          {/* ── S10 · PYG-620: โรคติดเชื้อ — เหนือปุ่มตอบรับ เห็นก่อนกดรับงานเสมอ (R4) ── */}
          {/* ประวัติงานไม่ต้องแสดงข้อมูลสุขภาพของผู้รับบริการอีก */}
          {!isHistory && (infection.disclosure || infection.loading || infection.error) && (
            <div style={{ marginTop: 24 }}>
              <CaregiverInfectionSection
                disclosure={infection.disclosure}
                loading={infection.loading}
                error={infection.error}
                onRetry={() => void infection.refetch()}
                showAck={isPendingRequest}
                ack={infectionAck}
                onAckChange={(checked) => setAckedKey(checked ? infectionValueKey : null)}
                changed={infectionChanged}
                ackedAt={infection.disclosure?.acknowledgedAt ?? null}
              />
            </div>
          )}

          {/* ── Floating accept / decline bar (คำขอใหม่) ──
              ลอยไว้ล่างจอให้กดได้ตลอด · บนมือถือวางเหนือแถบเมนูล่างของแอป (--mobile-nav-h จาก MobileNavigation)
              ยังต้องรับทราบโรคติดเชื้อในหน้าก่อน (ปุ่มปิด + คำใบ้อยู่ในแถบ) */}
          {booking.status === 'pending' && (
            <div className="fixed bottom-[var(--mobile-nav-h,0px)] md:bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-[#E0E2E5] shadow-[0px_-4px_16px_rgba(0,0,0,0.04)] font-['Bai_Jamjuree']">
              <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                {/* รายได้ (แสดงเสมอ) · มือถือ: รายได้ → คำใบ้ → ปุ่ม · จอกว้าง: รายได้ | คำใบ้ชิดซ้ายของปุ่ม | ปุ่ม */}
                <div className="flex-1 min-w-0">
                  {/* ระยะเวลา (ซ้าย, ข้อมูลรอง) · รายได้ (ขวา, ตัวหลัก)
                      ไม่เขียนรวมเป็น "฿300 / 1 ชม." ที่อ่านเป็นเรทรายชั่วโมงได้ */}
                  <div className="flex items-center justify-between md:justify-start gap-3">
                    {booking.durationText && (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 md:mr-2 md:pr-4 md:border-r md:border-[#E0E2E5] text-[13px] text-[#575859]">
                        <span className="material-icons" style={{ fontSize: 16, color: '#8A8C8E' }}>schedule</span>
                        ทำงาน <span className="font-semibold text-[#1A1A1A]">{booking.durationText}</span>
                      </span>
                    )}
                    <div className="min-w-0 ml-auto md:ml-0 text-right md:text-left">
                      <p className="m-0 text-xs leading-4 text-[#575859]">รายได้สุทธิ</p>
                      <p className="m-0 font-['Inter'] text-2xl font-bold leading-8 text-[#059669]">
                        {booking.price > 0 ? formatBaht(netEarnings) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
                {needsInfectionAck && !infectionAck && (
                  <p id="accept-infection-hint" className="m-0 flex items-center gap-1.5 md:max-w-[340px] text-xs md:text-[13px] font-semibold leading-5 text-[#33453D]">
                    <span className="material-icons flex-shrink-0" style={{ fontSize: 16, color: '#F59E0B' }}>info</span>
                    {infectionText.cgAcceptHint}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeclineModal(true)}
                    className="flex-1 md:flex-none h-11 px-5 rounded-xl bg-white border-[0.8px] border-[#FCA5A5] text-sm font-semibold text-[#DC2626] hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    ปฏิเสธ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAcceptModal(true)}
                    disabled={acceptBlocked}
                    aria-describedby={needsInfectionAck && !infectionAck ? 'accept-infection-hint' : undefined}
                    className={`flex-[2] md:flex-none inline-flex items-center justify-center gap-2 h-11 px-7 rounded-xl text-[15px] font-bold transition-colors ${
                      acceptBlocked
                        ? 'bg-[#E4E9E7] text-[#5F6662] cursor-not-allowed'
                        : 'bg-[#009265] hover:bg-[#087C58] text-white shadow-[0px_4px_14px_rgba(0,146,101,0.3)] cursor-pointer'
                    }`}
                  >
                    <span className="material-icons" style={{ fontSize: 18 }}>check_circle</span>
                    ตอบรับการจอง
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>

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
            <CheckInView
              booking={booking}
              dateText={dateStr}
              canCheckInToday={canCheckInToday}
              onCheckedIn={() => {
                // การสแกนที่สำเร็จ = backend เช็คอินให้เรียบร้อยแล้ว → สลับไปหน้าความคืบหน้า
                setJustCheckedIn(true);
                void refetchBooking();
              }}
            />
          )}

        </div>
      </div>
    </>
  );
}
