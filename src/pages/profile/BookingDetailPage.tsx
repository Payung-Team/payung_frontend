import React, { useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { supabase } from '../../lib/supabase';
import type { ConfirmedBooking, BookingRequest } from '../../context/BookingContext';
import { GET_MY_BOOKING, GET_PAYMENT_BY_BOOKING } from '../../graphql/queries';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
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

const STATUS_BADGE: Record<ConfirmedBooking['status'], { label: string; dot: string; bg: string; text: string }> = {
  pending:          { label: 'รอผู้ดูแลตอบรับ', dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  awaiting_payment: { label: 'รอชำระเงิน',      dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  accepted:         { label: 'ยืนยันแล้ว',      dot: '#10B981', bg: '#ECFDF5', text: '#047857' },
  rejected:         { label: 'ปฏิเสธแล้ว',      dot: '#EF4444', bg: '#FEF2F2', text: '#991B1B' },
  cancelled:        { label: 'ยกเลิกแล้ว',      dot: '#9CA3AF', bg: '#F9FAFB', text: '#6B7280' },
  completed:        { label: 'เสร็จสิ้น',       dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
};

const STATUS_BANNER: Record<ConfirmedBooking['status'], { icon: string; iconColor: string; bg: string; border: string; textColor: string; message: (name: string) => string }> = {
  pending:          { icon: 'info',              iconColor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1E40AF', message: (n) => `ส่งคำขอของคุณไปยัง ${n} เรียบร้อยแล้ว ขณะนี้รอการตอบรับ` },
  awaiting_payment: { icon: 'credit_card',       iconColor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1D4ED8', message: (n) => `${n} ได้ตอบรับคำขอของคุณแล้ว – กรุณาชำระเงินเพื่อยืนยันการจอง` },
  accepted:         { icon: 'check_circle',      iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: (n) => `${n} ยืนยันการจองของคุณแล้ว พบกันในวันนัดหมาย` },
  rejected:         { icon: 'cancel',            iconColor: '#DC2626', bg: '#FEF2F2', border: '#FECACA', textColor: '#991B1B', message: (n) => `${n} ไม่สามารถรับงานนี้ได้ คุณสามารถค้นหาผู้ดูแลท่านอื่น` },
  cancelled:        { icon: 'do_not_disturb_on', iconColor: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', textColor: '#374151', message: () => `การจองนี้ถูกยกเลิกแล้ว` },
  completed:        { icon: 'task_alt',          iconColor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1E40AF', message: () => `การนัดหมายเสร็จสิ้นเรียบร้อยแล้ว` },
};

const CANCELLABLE_STATUSES = new Set<ConfirmedBooking['status']>(['pending', 'awaiting_payment', 'accepted']);

// ── Sub-components ─────────────────────────────────────────────────────────────

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

// ── GQL → ConfirmedBooking mapper (mirrors BookingsPage.mapGqlBooking) ─────────

function computeEndTime(startTime: string, durationHours: number): string {
  try {
    const [sh, sm] = startTime.split(':').map(Number);
    const endMin = sh * 60 + sm + Math.round(durationHours * 60);
    const eh = Math.floor(endMin / 60) % 24;
    const em = endMin % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  } catch { return ''; }
}

function mapGqlStatus(s: string): ConfirmedBooking['status'] {
  const v = s.toLowerCase();
  if (v === 'awaiting_payment' || v === 'accepted') return 'awaiting_payment';
  if (v === 'confirmed') return 'accepted';
  if (v === 'rejected' || v === 'declined') return 'rejected';
  if (v === 'cancelled') return 'cancelled';
  if (v === 'completed') return 'completed';
  return 'pending';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGqlBooking(api: any): ConfirmedBooking {
  const idSuffix = String(api.id).toUpperCase().replaceAll('-', '').slice(-6);
  const startTime: string = api.startTime ?? '';
  const durationHours: number = api.durationHours ?? 0;
  const endTime = startTime && durationHours ? computeEndTime(startTime, durationHours) : '';
  const serviceLocations: ('at_home' | 'accompany_outside')[] = (api.serviceLocations ?? []).filter(
    (l: string) => l === 'at_home' || l === 'accompany_outside',
  );
  const tasks: { id: string; name: string }[] = (api.tasks ?? []).map((name: string) => ({ id: name, name }));

  const resolvedPatientName: string | undefined = api.patientName || api.careRecipientName || undefined;

  const draft: BookingRequest = {
    serviceTypes: api.serviceType ? [api.serviceType] : [],
    serviceLocation: serviceLocations,
    dateTime: { date: api.bookingDate ?? '', slot: api.timeSlot ?? '', startTime, endTime, duration: durationHours },
    locationDetails: { at_home: { address: api.locationAddress ?? '', lat: 0, lng: 0 } },
    jobDetails: { tasks, notes: api.notes ?? '' },
    estimatedCost: (() => {
      const base = api.estimatedCost ?? 0;
      const fee = Math.round(base * 0.1);
      return { hourlyRate: api.caregiver?.hourlyRate ?? 0, hours: durationHours, platformFee: fee, total: base + fee };
    })(),
    recipient: resolvedPatientName
      ? { type: 'member', patientDetails: { name: resolvedPatientName, age: 0 } }
      : { type: 'self' },
    contactPerson: (api.dayOfContactName || api.dayOfContactPhone || api.dayOfContactRelationship)
      ? {
          name: api.dayOfContactName ?? '',
          phone: api.dayOfContactPhone ?? '',
          relationship: api.dayOfContactRelationship ?? '',
        }
      : undefined,
  };

  return {
    id: api.id,
    ref: `REF-${idSuffix}`,
    caregiverId: api.caregiver?.id ?? '',
    caregiverName: api.caregiver?.fullName ?? '(รอจับคู่)',
    caregiverAvatarUrl: api.caregiver?.avatarUrl ?? null,
    caregiverHourlyRate: api.caregiver?.hourlyRate ?? 0,
    confirmedAt: api.createdAt ?? new Date().toISOString(),
    status: mapGqlStatus(api.status ?? ''),
    draft,
  };
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // Navigation state used as instant initial data while query loads
  const stateBooking = location.state?.booking as ConfirmedBooking | undefined;

  const { data, loading } = useQuery(GET_MY_BOOKING, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const booking = useMemo<ConfirmedBooking | undefined>(() => {
    if (data?.myBooking) return mapGqlBooking(data.myBooking);
    return stateBooking;
  }, [data, stateBooking]);

  const { data: paymentData } = useQuery(GET_PAYMENT_BY_BOOKING, {
    variables: { bookingId: id },
    skip: !id,
  });
  const payment = paymentData?.paymentByBooking as { id: string; paymentStatus: string; amount: number } | undefined;

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('ยกเลิกคำขอจองสำเร็จ');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  if (loading && !booking) {
    return (
      <div style={{ minHeight: '100vh', background: '#F6FAF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-icons" style={{ fontSize: 40, color: '#52B69A', animation: 'spin 1s linear infinite' }}>refresh</span>
          <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, color: '#8A8C8E', marginTop: 12 }}>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ minHeight: '100vh', background: '#F6FAF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 16, color: '#8A8C8E' }}>ไม่พบข้อมูลการจอง</p>
          <button
            type="button"
            onClick={() => navigate('/bookings')}
            style={{ marginTop: 16, padding: '8px 20px', background: '#52B69A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            กลับไปยังนัดหมาย
          </button>
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGE[booking.status];
  const banner = STATUS_BANNER[booking.status];
  const dt = booking.draft.dateTime;
  const est = booking.draft.estimatedCost;
  const svcTypes = booking.draft.serviceTypes ?? [];
  const svcTypeLabel = svcTypes.map((t) => SERVICE_TYPE_LABELS[t] ?? t).join(', ') || '—';
  const dateStr = dt?.date ? formatThaiDate(dt.date) : '—';
  const timeStr = dt?.startTime && dt?.endTime ? `${dt.startTime}–${dt.endTime} น.` : (dt?.slot ?? '—');
  const durationStr = dt?.duration ? `${dt.duration} ชั่วโมง` : '—';
  const locationStr = booking.draft.locationDetails?.at_home?.address
    || booking.draft.locationDetails?.accompany_outside?.hospitalName
    || '—';
  const recipientName = booking.draft.recipient?.patientDetails?.name ?? 'ตัวเอง';
  const contactPerson = booking.draft.contactPerson;
  const total = est?.total ?? 0;
  const tasks = booking.draft.jobDetails?.tasks ?? [];
  const tasksText = tasks.length > 0 ? tasks.map((t) => t.name).join(', ') : null;
  const cgInitial = booking.caregiverName?.charAt(0) ?? '?';
  const isCancellable = CANCELLABLE_STATUSES.has(booking.status);
  const caregiverDisplayName = booking.caregiverName === '(รอจับคู่)' ? 'ผู้ดูแล' : booking.caregiverName;

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => navigate('/bookings'), 300);
    }, 2500);
  };

  const hasHeldPayment = payment?.paymentStatus === 'held';

  const handleConfirmCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:3000/graphql';
      const restBaseUrl = graphqlUrl.replace('/graphql', '/api/v1');
      const res = await fetch(`${restBaseUrl}/bookings/${booking.id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowCancelModal(false);
      showToast(hasHeldPayment ? 'ยกเลิกสำเร็จ คืนเงินภายใน 3-5 วันทำการ' : 'ยกเลิกคำขอจองสำเร็จ');
    } catch {
      setIsCancelling(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (isSubmittingDispute || disputeReason.trim().length < 20) return;
    setIsSubmittingDispute(true);
    try {
      // TODO: connect BE — PATCH /api/v1/bookings/:id/dispute
      // const { data: { session } } = await supabase.auth.getSession();
      // const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:3000/graphql';
      // const restBaseUrl = graphqlUrl.replace('/graphql', '/api/v1');
      // await fetch(`${restBaseUrl}/bookings/${booking.id}/dispute`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      //   body: JSON.stringify({ reason: disputeReason }),
      // });
      await new Promise((r) => setTimeout(r, 600)); // stub delay
      setShowDisputeModal(false);
      setDisputeReason('');
      setDisputeSubmitted(true);
      setToastMessage('ทีมงานจะตรวจสอบภายใน 24 ชม.');
      setToastVisible(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  return (
    <>
      {/* Toast */}
      <div
        style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 24px',
          background: '#047857',
          boxShadow: '0px 8px 32px rgba(0,0,0,0.15)',
          borderRadius: 12,
          opacity: toastVisible ? 1 : 0,
          transform: toastVisible ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: 'none',
        }}
      >
        <span className="material-icons" style={{ fontSize: 20, color: '#FFFFFF' }}>check_circle</span>
        <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontWeight: 600, fontSize: 14, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
          {toastMessage}
        </span>
      </div>

      {/* Cancel Confirm Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => !isCancelling && setShowCancelModal(false)}
        >
          <div
            style={{ width: '100%', maxWidth: 420, background: '#FFFFFF', borderRadius: 20, boxShadow: '0px 20px 60px rgba(0,0,0,0.15)', padding: '32px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 60, height: 60, borderRadius: 30, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <span className="material-icons" style={{ fontSize: 32, color: '#DC2626' }}>report_problem</span>
            </div>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 18, fontWeight: 700, color: '#1A1A1A', textAlign: 'center', margin: 0 }}>
              {hasHeldPayment ? 'ยืนยันการยกเลิกการจอง?' : 'ยืนยันการยกเลิกคำขอจอง'}
            </p>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#575859', textAlign: 'center', margin: '10px 0 0', maxWidth: 330, lineHeight: '21px' }}>
              คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำขอจองสำหรับ{' '}
              <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{booking.caregiverName}</span>?
              <br />การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            {hasHeldPayment && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#ECFDF5', border: '0.8px solid #A7F3D0', borderRadius: 10, margin: '14px 0 24px', width: '100%' }}>
                <span className="material-icons" style={{ fontSize: 18, color: '#059669', flexShrink: 0 }}>payments</span>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#065F46', margin: 0, lineHeight: '20px' }}>
                  คืนเงิน ฿{payment!.amount.toLocaleString()} เต็มจำนวนภายใน 3-5 วันทำการ
                </p>
              </div>
            )}
            {!hasHeldPayment && <div style={{ marginBottom: 24 }} />}
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button type="button" onClick={() => setShowCancelModal(false)} disabled={isCancelling}
                style={{ flex: 1, height: 44, background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 10, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#575859', cursor: 'pointer' }}>
                ย้อนกลับ
              </button>
              <button type="button" onClick={handleConfirmCancel} disabled={isCancelling}
                style={{ flex: 1, height: 44, background: '#DC2626', border: 'none', borderRadius: 10, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#FFFFFF', cursor: isCancelling ? 'wait' : 'pointer', opacity: isCancelling ? 0.7 : 1 }}>
                {isCancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => !isSubmittingDispute && setShowDisputeModal(false)}
        >
          <div
            style={{ width: '100%', maxWidth: 460, background: '#FFFFFF', borderRadius: 20, boxShadow: '0px 20px 60px rgba(0,0,0,0.15)', padding: '32px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 60, height: 60, borderRadius: 30, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <span className="material-icons" style={{ fontSize: 32, color: '#F08C00' }}>flag</span>
            </div>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 18, fontWeight: 700, color: '#1A1A1A', textAlign: 'center', margin: 0 }}>
              แจ้งปัญหาเกี่ยวกับบริการ
            </p>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#575859', textAlign: 'center', margin: '8px 0 18px', lineHeight: '21px' }}>
              โปรดอธิบายปัญหาที่พบ ทีมงานจะตรวจสอบและติดต่อกลับภายใน 24 ชั่วโมง
            </p>
            <div style={{ width: '100%', position: 'relative' }}>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="อธิบายปัญหาที่พบ เช่น ผู้ดูแลไม่ตรงตามที่ระบุ บริการไม่ครบถ้วน..."
                rows={4}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px 28px',
                  background: '#F9FAFB', border: `1px solid ${disputeReason.trim().length > 0 && disputeReason.trim().length < 20 ? '#FCA5A5' : '#E0E2E5'}`,
                  borderRadius: 10, resize: 'none',
                  fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#1A1A1A', lineHeight: '20px',
                  outline: 'none',
                }}
              />
              <span style={{
                position: 'absolute', bottom: 8, right: 12,
                fontFamily: "'Inter', sans-serif", fontSize: 11,
                color: disputeReason.trim().length < 20 ? '#DC2626' : '#8A8C8E',
              }}>
                {disputeReason.trim().length}/20 ตัวอักษรขั้นต่ำ
              </span>
            </div>
            {disputeReason.trim().length > 0 && disputeReason.trim().length < 20 && (
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#DC2626', margin: '6px 0 0', alignSelf: 'flex-start' }}>
                กรุณาอธิบายรายละเอียดอย่างน้อย 20 ตัวอักษร
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 20 }}>
              <button
                type="button"
                onClick={() => { setShowDisputeModal(false); setDisputeReason(''); }}
                disabled={isSubmittingDispute}
                style={{ flex: 1, height: 44, background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 10, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#575859', cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmitDispute}
                disabled={isSubmittingDispute || disputeReason.trim().length < 20}
                style={{ flex: 1, height: 44, background: disputeReason.trim().length >= 20 ? '#F08C00' : '#E5E7EB', border: 'none', borderRadius: 10, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: disputeReason.trim().length >= 20 ? '#FFFFFF' : '#9CA3AF', cursor: disputeReason.trim().length >= 20 ? 'pointer' : 'not-allowed', opacity: isSubmittingDispute ? 0.7 : 1 }}
              >
                {isSubmittingDispute ? 'กำลังส่ง...' : 'ส่งเรื่อง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page */}
      <div style={{ minHeight: '100vh', background: '#F6FAF9' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px 100px' }}>

          {/* Back link */}
          <button
            type="button"
            onClick={() => navigate('/bookings')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 18 }}
          >
            <span className="material-icons" style={{ fontSize: 16, color: '#52B69A' }}>arrow_back</span>
            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#52B69A', lineHeight: '20px' }}>
              กลับไปยังนัดหมายทั้งหมด
            </span>
          </button>

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <h1 style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px', lineHeight: '30px' }}>
                รายละเอียดใบสมัครจองบริการ
              </h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#8A8C8E', margin: 0, lineHeight: '18px' }}>
                Booking Reference: {booking.ref}
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
              {banner.message(caregiverDisplayName)}
            </p>
          </div>

          {/* Main card */}
          <div style={{ background: '#FFFFFF', border: '0.8px solid #E0E2E5', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 20, padding: 24 }}>

            {/* ── Section 1: ข้อมูลผู้ดูแล ── */}
            <SectionTitle>ข้อมูลผู้ดูแล</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* Avatar + check badge */}
                <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                  {booking.caregiverAvatarUrl ? (
                    <img src={booking.caregiverAvatarUrl} alt={booking.caregiverName} style={{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover', border: '2.4px solid #FFFFFF', boxShadow: '0px 4px 16px rgba(82,182,154,0.2)' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: 'linear-gradient(135deg, #52B69A 0%, #76C893 100%)', border: '2.4px solid #FFFFFF', boxShadow: '0px 4px 16px rgba(82,182,154,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>{cgInitial}</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 18, height: 18, borderRadius: 9, background: '#52B69A', border: '1.6px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ fontSize: 11, color: '#FFFFFF' }}>check</span>
                  </div>
                </div>

                <div>
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '21px' }}>
                    {booking.caregiverName}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {booking.caregiverHourlyRate > 0 && (
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#575859', lineHeight: '18px' }}>
                        ฿{booking.caregiverHourlyRate.toLocaleString()}/ชม.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {booking.caregiverId && booking.caregiverName !== '(รอจับคู่)' && (
                <button
                  type="button"
                  onClick={() => navigate(`/caregivers/${booking.caregiverId}`)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 32, padding: '0 12px', background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 6, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 600, color: '#575859', cursor: 'pointer', flexShrink: 0 }}
                >
                  ดูโปรไฟล์
                </button>
              )}
            </div>

            <Divider />

            {/* ── Section 2: รายละเอียดนัดหมาย ── */}
            <SectionTitle>รายละเอียดนัดหมาย</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <InfoRow label="ประเภทงานบริการ" value={svcTypeLabel} valueFont="thai" />
              <InfoRow label="วันที่ให้บริการ" value={dateStr} />
              <InfoRow label="เวลาให้บริการ" value={timeStr} />
              <InfoRow label="ระยะเวลาบริการ" value={durationStr} />
            </div>
            <InfoRow label="สถานที่รับบริการ" value={locationStr} />

            <Divider />

            {/* ── Section 3: ข้อมูลคนไข้ ── */}
            <SectionTitle>ข้อมูลคนไข้</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <InfoRow label="ชื่อผู้รับบริการ" value={recipientName} valueFont="thai" />
            </div>

            {contactPerson?.name && (
              <>
                <Divider />
                <SectionTitle>ผู้ติดต่อในวันนัดหมาย</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <InfoRow label="ชื่อผู้ติดต่อ" value={contactPerson.name} valueFont="thai" />
                  <InfoRow label="เบอร์โทรศัพท์" value={contactPerson.phone} />
                  {contactPerson.relationship && (
                    <InfoRow label="ความสัมพันธ์" value={contactPerson.relationship} valueFont="thai" />
                  )}
                </div>
              </>
            )}

            <Divider />

            {/* ── Section 4: รายละเอียดภารกิจ ── */}
            <SectionTitle>รายละเอียดภารกิจ</SectionTitle>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14 }}>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontStyle: 'italic', fontSize: 13, color: tasksText ? '#575859' : '#B0B3B8', margin: 0, lineHeight: '20px' }}>
                {tasksText ?? 'ไม่ได้ระบุภารกิจเพิ่มเติม'}
              </p>
            </div>

            <Divider />

            {/* ── Section 5: ราคา ── */}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
                ราคาค่าบริการประมาณการทั้งสิ้น
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, color: '#52B69A', margin: 0, lineHeight: '33px' }}>
                {total > 0 ? `฿${total.toLocaleString()}` : '—'}
              </p>
            </div>
          </div>

          {/* Pay button (awaiting_payment status) */}
          {booking.status === 'awaiting_payment' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => navigate(`/bookings/${booking.id}/payment`, { state: { booking } })}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  height: 50, padding: '0 40px',
                  background: '#3B82F6', border: 'none',
                  boxShadow: '0px 4px 14px rgba(26,86,219,0.35)',
                  borderRadius: 12, fontFamily: "'Bai Jamjuree', sans-serif",
                  fontSize: 15, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer',
                }}
              >
                <span className="material-icons" style={{ fontSize: 18 }}>credit_card</span>
                ชำระเงิน {total > 0 ? `฿${total.toLocaleString()}` : ''}
              </button>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 28px', background: '#FFFFFF', border: '1px solid #FCA5A5', borderRadius: 8, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 700, color: '#DC2626', cursor: 'pointer' }}
              >
                <span className="material-icons" style={{ fontSize: 16 }}>cancel</span>
                ยกเลิกการจอง
              </button>
            </div>
          )}

          {/* Cancel button (pending / accepted — no payment required) */}
          {isCancellable && booking.status !== 'awaiting_payment' && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 28px', background: '#FFFFFF', border: '1px solid #FCA5A5', borderRadius: 8, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 700, color: '#DC2626', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
              >
                <span className="material-icons" style={{ fontSize: 16 }}>cancel</span>
                ยกเลิกการจอง
              </button>
            </div>
          )}

          {/* Dispute button (completed bookings) */}
          {booking.status === 'completed' && (
            <div style={{ marginTop: 16 }}>
              {disputeSubmitted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#FFFBEB', border: '0.8px solid #FCD34D', borderRadius: 10 }}>
                  <span className="material-icons" style={{ fontSize: 18, color: '#F08C00' }}>hourglass_top</span>
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#B45309', margin: 0 }}>
                    แจ้งปัญหาแล้ว — ทีมงานกำลังตรวจสอบภายใน 24 ชม.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 28px', background: '#FFFFFF', border: '1px solid #FCD34D', borderRadius: 8, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 700, color: '#D97706', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>warning_amber</span>
                  แจ้งปัญหา
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
