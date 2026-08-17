import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import type { Booking } from './CaregiverBookings';
import {
  ACCEPT_BOOKING,
  DECLINE_BOOKING,
  CANCEL_ACCEPTANCE,
  COMPLETE_BOOKING,
  GET_CAREGIVER_BOOKINGS,
  GET_CAREGIVER_BOOKING_HISTORY,
  PROOF_OF_WORK,
} from '../../graphql/queries';
import { DeclineModal } from '../../components/ui/DeclineModal';
import { CancelAcceptanceModal } from '../../components/ui/CancelAcceptanceModal';
import { AcceptBookingModal } from '../../components/ui/AcceptBookingModal';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import CheckOutModal from '../../components/caregiver/CheckOutModal';
import CheckOutSuccess from '../../components/caregiver/CheckOutSuccess';
import ProofOfWorkPanel from '../../components/caregiver/ProofOfWorkPanel';
import {
  elapsedMinutesSince,
  formatDurationTh,
  formatThaiTime,
  type ProofOfWorkSummary,
} from '../../lib/monitoring';

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
  in_progress:      { label: 'กำลังปฏิบัติงาน', dot: '#059669', bg: '#ECFDF5', text: '#065F46' },
  awaiting_release: { label: 'รอโอนเงิน',       dot: '#0EA5E9', bg: '#F0F9FF', text: '#0369A1' },
  needs_review:     { label: 'รอตรวจสอบ',       dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  declined:  { label: 'ปฏิเสธแล้ว',         dot: '#EF4444', bg: '#FEF2F2', text: '#B91C1C' },
  completed: { label: 'เสร็จสิ้น',          dot: '#52B69A', bg: '#E6F5ED', text: '#3A9A7E' },
  cancelled: { label: 'ยกเลิกแล้ว',         dot: '#6B7280', bg: '#F3F4F6', text: '#374151' },
};

const STATUS_BANNER: Record<string, { icon: string; iconColor: string; bg: string; border: string; textColor: string; message: (name: string) => string }> = {
  pending:   { icon: 'notifications_active', iconColor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1E40AF', message: (n) => `${n} ส่งคำขอจองบริการมาให้คุณ กรุณาตรวจสอบและตอบรับหรือปฏิเสธ` },
  accepted:  { icon: 'hourglass_top',        iconColor: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', textColor: '#92400E', message: (n) => `คุณรับงานของ ${n} แล้ว กำลังรอให้ผู้ป่วยชำระเงินยืนยัน` },
  confirmed: { icon: 'check_circle',         iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: (n) => `การนัดหมายกับ ${n} ได้รับการยืนยันแล้ว พบกันในวันนัดหมาย` },
  // ★ ห้ามเขียนว่า "รอลูกค้ายืนยัน" — ผู้ดูแลกดปิดงานเองแล้วงานจบทันที (ทีมตัดสินใจ 2026-07-27)
  in_progress:      { icon: 'directions_run', iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: (n) => `คุณกำลังปฏิบัติงานให้ ${n} อยู่ กดจบงานได้เลยเมื่อดูแลเสร็จ` },
  awaiting_release: { icon: 'send',           iconColor: '#0EA5E9', bg: '#F0F9FF', border: '#BAE6FD', textColor: '#0C4A6E', message: () => `ปิดงานเรียบร้อยแล้ว ระบบจะโอนเงินให้คุณภายใน 24 ชั่วโมง` },
  needs_review:     { icon: 'fact_check',     iconColor: '#D97706', bg: '#FFFBEB', border: '#FDE68A', textColor: '#92400E', message: () => `ปิดงานแล้ว แอดมินจะตรวจสอบก่อนโอนเงิน` },
  declined:  { icon: 'cancel',              iconColor: '#DC2626', bg: '#FEF2F2', border: '#FECACA', textColor: '#991B1B', message: (n) => `คุณได้ปฏิเสธคำขอจองของ ${n}` },
  completed: { icon: 'task_alt',            iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: () => `งานนี้เสร็จสิ้นเรียบร้อยแล้ว` },
  cancelled: { icon: 'do_not_disturb_on',  iconColor: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', textColor: '#374151', message: () => `การจองนี้ถูกยกเลิกแล้ว` },
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
  const booking = location.state?.booking as Booking | undefined;

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  /** true = เพิ่งกดปิดงานสำเร็จในรอบนี้ → โชว์หน้าสรุปแทนหน้ารายละเอียด */
  const [justCheckedOut, setJustCheckedOut] = useState(false);
  /** ใช้ให้ "ทำงานมาแล้ว x นาที" ขยับเอง โดยไม่ต้องรีเฟรชหน้า */
  const [tick, setTick] = useState(() => new Date());

  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const [acceptBooking] = useMutation(ACCEPT_BOOKING);
  const [declineBooking] = useMutation(DECLINE_BOOKING);
  const [cancelAcceptance] = useMutation(CANCEL_ACCEPTANCE);
  const [completeBooking] = useMutation(COMPLETE_BOOKING);

  /**
   * สรุปหลักฐานการทำงาน — แหล่งความจริงเดียวของเวลาเช็คอิน/เวลาทำงานจริง
   *
   * ข้ามการยิงในสถานะที่ยังไม่มีทางมี job event (ประหยัด request และกัน error ที่ไม่จำเป็น)
   */
  const needsProof = !!booking && ['in_progress', 'awaiting_release', 'needs_review', 'completed'].includes(booking.status);

  const { data: proofData, refetch: refetchProof } = useQuery(PROOF_OF_WORK, {
    variables: { bookingId: booking?.id },
    skip: !needsProof,
    fetchPolicy: 'cache-and-network',
  });

  const proof = (proofData as { proofOfWork?: ProofOfWorkSummary } | undefined)?.proofOfWork ?? null;

  // เดินนาฬิกาทุก 30 วิ เฉพาะตอนที่มีงานกำลังทำอยู่จริง
  const jobRunning = !!proof?.checkIn && !proof?.checkOut;
  useEffect(() => {
    if (!jobRunning) return;
    const timer = window.setInterval(() => setTick(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [jobRunning]);

  const showToast = (message: string, isError = false) => {
    if (isError) showError(message, 3000);
    else showSuccess(message, 3000);
    setTimeout(() => navigate('/caregiver/bookings'), 2500);
  };

  if (!booking) {
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

  const idSuffix = booking.id.toUpperCase().replaceAll('-', '').slice(-6);
  const ref = `REF-${idSuffix}`;
  const badge = STATUS_BADGE[booking.status] ?? STATUS_BADGE.cancelled;
  const banner = STATUS_BANNER[booking.status] ?? STATUS_BANNER.cancelled;
  const svcLabel = SERVICE_TYPE_LABELS[booking.serviceType] ?? booking.serviceType ?? '—';
  const dateStr = booking.bookingDate ? formatThaiDate(booking.bookingDate) : '—';
  const tasks = booking.tasks ?? [];
  const tasksText = tasks.length > 0 ? tasks.join(', ') : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDay = new Date(booking.bookingDate);
  bookingDay.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((bookingDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isStartable = booking.status === 'confirmed' && diffDays <= 3;

  // ── PYG-358 ────────────────────────────────────────────────────────────
  // "กำลังทำงานอยู่" = เช็คอินแล้วแต่ยังไม่ได้ปิดงาน
  // ใช้ job event เป็นเกณฑ์ ไม่ใช่ booking.status เพียงอย่างเดียว เพราะ event
  // คือสิ่งที่ backend ใช้ตัดสินจริง (status เป็นผลลัพธ์ที่ตามมาทีหลัง)
  const canCheckOut = booking.status === 'in_progress' || jobRunning;
  const elapsedMinutes = proof?.checkIn ? elapsedMinutesSince(proof.checkIn.serverTs, tick) : 0;

  // หน้าสรุปหลังกดปิดงานสำเร็จ
  if (justCheckedOut && proof) {
    return (
      <CheckOutSuccess
        bookingRef={ref}
        bookingDateText={dateStr}
        price={booking.price}
        proof={proof}
        onBack={() => navigate('/caregiver/bookings')}
      />
    );
  }

  const refetchActive = [
    { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'PENDING', limit: 50 } } },
    { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'ACCEPTED', limit: 50 } } },
    { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'CONFIRMED', limit: 50 } } },
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

      {/* PYG-358 — เช็คเอาท์ / จบงาน */}
      {proof?.checkIn && (
        <CheckOutModal
          isOpen={showCheckOutModal}
          bookingId={booking.id}
          bookingRef={ref}
          proof={proof}
          jobLat={booking.locationLat}
          jobLng={booking.locationLng}
          onClose={() => setShowCheckOutModal(false)}
          onSuccess={async () => {
            setShowCheckOutModal(false);
            // อ่านคำตัดสินจากเซิร์ฟเวอร์อีกครั้ง — mutation คืนเฉพาะธงของ event นี้
            // แต่หน้าสรุปต้องใช้ verdict + ธงที่สะสมมาจากทั้งเช็คอินและเช็คเอาท์
            await refetchProof();
            setJustCheckedOut(true);
          }}
        />
      )}

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

          {/* ── PYG-358 STEP 1.3 — เวลาเช็คอินและเวลาที่ทำงานมาแล้ว ──
              ★ นับจาก server_ts ที่ proofOfWork คืนมา ไม่ใช่นาฬิกาของเครื่อง */}
          {canCheckOut && proof?.checkIn && (
            <div
              className="mb-[18px] flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3.5 py-3"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              <span className="material-icons text-[18px] text-[#059669]">timer</span>
              <span className="text-[13px] font-bold text-[#065F46]">
                เช็คอิน {formatThaiTime(proof.checkIn.serverTs)}
              </span>
              <span className="text-[13px] text-[#059669]">·</span>
              <span className="text-[13px] font-semibold text-[#065F46]">
                ทำงานมาแล้ว {formatDurationTh(elapsedMinutes)}
              </span>
            </div>
          )}

          {/* Main card */}
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

          {/* ── PYG-358 STEP 5 — หลักฐานจากเซิร์ฟเวอร์ (งานที่ปิดไปแล้ว) ── */}
          {proof?.checkOut && (
            <div style={{ marginTop: 18 }}>
              <ProofOfWorkPanel proof={proof} />
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

            {/* ── PYG-358 — ปุ่มปิดงาน ──
                ★ ห้าม disable เพราะสัญญาณตำแหน่งหรือเวลาทำงานสั้น
                  คำเตือนทั้งหมดอยู่ในกล่องยืนยัน ไม่ใช่ที่ปุ่มนี้ */}
            {canCheckOut && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCheckOutModal(true)}
                  className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#1B7A5A] px-10 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(27,122,90,0.3)] transition-colors hover:bg-[#146349] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B69A] focus-visible:ring-offset-2 sm:w-auto"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                >
                  <span className="material-icons text-[18px]">logout</span>
                  เช็คเอาท์ / จบงาน
                </button>
                <p
                  className="text-center text-[12px] leading-5 text-[#8A8C8E]"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                >
                  กดจบงานได้เลยเมื่อดูแลเสร็จ ไม่ต้องรอถึงเวลาที่คาดไว้
                </p>
              </>
            )}

            {booking.status === 'confirmed' && (
              <button type="button"
                disabled={!isStartable}
                onClick={async () => {
                  if (!isStartable) return;
                  try {
                    await completeBooking({
                      variables: { bookingId: booking.id },
                      refetchQueries: [
                        { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'CONFIRMED', limit: 50 } } },
                        { query: GET_CAREGIVER_BOOKING_HISTORY, variables: { input: { page: 1, limit: 50 } } },
                      ],
                      awaitRefetchQueries: true,
                    });
                    showToast('ส่งงานเสร็จสิ้นเรียบร้อยแล้ว');
                  } catch {
                    showToast('ไม่สามารถส่งงานได้ กรุณาลองใหม่', true);
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, padding: '0 40px', background: isStartable ? '#52B69A' : 'rgba(82,182,154,0.5)', border: 'none', borderRadius: 12, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 15, fontWeight: 700, color: '#FFFFFF', cursor: isStartable ? 'pointer' : 'not-allowed' }}>
                <span className="material-icons" style={{ fontSize: 18 }}>event_available</span>
                {isStartable ? 'ส่งการดูแล' : `ส่งการดูแลได้อีก ${diffDays - 3} วัน`}
              </button>
            )}

          </div>

        </div>
      </div>
    </>
  );
}
