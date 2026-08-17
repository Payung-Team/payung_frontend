import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useBooking, type ConfirmedBooking, type BookingRequest, type SavedCaregiver } from '../../context/BookingContext';
import { GET_MY_BOOKING_HISTORY } from '../../graphql/queries';
import { mapGqlStatus, ACTIVE_JOB_STATUSES } from '../../utils/bookingStatus';
import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

type TabKey = 'upcoming' | 'pending' | 'history';

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

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TAB_META: Record<TabKey, { label: string; icon: string; sectionTitle: string; sectionSubtitle: string }> = {
  upcoming: {
    label: 'นัดหมายที่จะมาถึง',
    icon: 'event_available',
    sectionTitle: 'นัดหมายที่จะมาถึง',
    sectionSubtitle: 'การนัดหมายที่ยืนยันและชำระเงินแล้ว',
  },
  pending: {
    label: 'รอดำเนินการ',
    icon: 'pending_actions',
    sectionTitle: 'รอดำเนินการ',
    sectionSubtitle: 'คำขอที่รอตอบรับหรือรอชำระเงิน',
  },
  history: {
    label: 'ประวัติการนัดหมาย',
    icon: 'history',
    sectionTitle: 'ประวัติการนัดหมาย',
    sectionSubtitle: 'การนัดหมายที่ผ่านมาทั้งหมด',
  },
};

const STATUS_BADGE: Record<ConfirmedBooking['status'], { label: string; dot: string; bg: string; text: string }> = {
  pending:          { label: 'รอตอบรับ',     dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  accepted:         { label: 'รอชำระเงิน',   dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  confirmed:        { label: 'ยืนยันแล้ว',   dot: '#10B981', bg: '#ECFDF5', text: '#047857' },
  in_progress:      { label: 'กำลังให้บริการ', dot: '#1D4ED8', bg: '#EFF6FF', text: '#1D4ED8' },
  awaiting_release: { label: 'รอโอนเงิน',    dot: '#8B5CF6', bg: '#F5F3FF', text: '#6D28D9' },
  needs_review:     { label: 'กำลังตรวจสอบ', dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  rejected:         { label: 'ปฏิเสธแล้ว',   dot: '#EF4444', bg: '#FEF2F2', text: '#991B1B' },
  cancelled:        { label: 'ยกเลิกแล้ว',   dot: '#9CA3AF', bg: '#F9FAFB', text: '#6B7280' },
  completed:        { label: 'เสร็จสิ้น',    dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
};

// ── Booking Card ───────────────────────────────────────────────────────────────

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

// ── API helpers ────────────────────────────────────────────────────────────────

function computeEndTime(startTime: string, durationHours: number): string {
  try {
    const [sh, sm] = startTime.split(':').map(Number);
    const endMin = sh * 60 + sm + Math.round(durationHours * 60);
    const eh = Math.floor(endMin / 60) % 24;
    const em = endMin % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGqlBooking(api: any): ConfirmedBooking {
  const idSuffix = String(api.id).toUpperCase().replace(/-/g, '').slice(-6);
  const startTime: string = api.startTime ?? '';
  const durationHours: number = api.durationHours ?? 0;
  const endTime = startTime && durationHours ? computeEndTime(startTime, durationHours) : '';
  const serviceLocations: ('at_home' | 'accompany_outside')[] = (api.serviceLocations ?? []).filter(
    (l: string) => l === 'at_home' || l === 'accompany_outside',
  );
  const tasks: { id: string; name: string }[] = (api.tasks ?? []).map((name: string) => ({ id: name, name }));

  const draft: BookingRequest = {
    serviceTypes: api.serviceType ? [api.serviceType] : [],
    serviceLocation: serviceLocations,
    dateTime: {
      date: api.bookingDate ?? '',
      slot: api.timeSlot ?? '',
      startTime,
      endTime,
      duration: durationHours,
    },
    locationDetails: {
      at_home: { address: api.locationAddress ?? '', lat: 0, lng: 0 },
    },
    jobDetails: { tasks },
    estimatedCost: (() => {
      const base = api.estimatedCost ?? 0;
      const fee = Math.round(base * 0.1);
      return { hourlyRate: api.caregiver?.hourlyRate ?? 0, hours: durationHours, platformFee: fee, total: base + fee };
    })(),
    recipient: api.careRecipientName
      ? { type: 'member', patientDetails: { name: api.careRecipientName, age: 0 } }
      : { type: 'self' },
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

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p
      style={{
        fontFamily: "'Bai Jamjuree', sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.7px',
        textTransform: 'uppercase',
        color: '#52B69A',
        lineHeight: '15px',
        margin: '0 0 8px',
      }}
    >
      {children}
    </p>
  );
}

function DetailRow({ icon, label, value }: Readonly<{ icon: string; label: string; value: string }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span className="material-icons" style={{ fontSize: 14, color: '#B0B3B8', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', width: 90, flexShrink: 0, lineHeight: '18px' }}>{label}</span>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#1A1A1A', fontWeight: 600, lineHeight: '18px', flex: 1 }}>{value}</span>
    </div>
  );
}

function BookingCard({ booking, onCancel, onViewDetail, onPayment, isDueSection }: Readonly<{ booking: ConfirmedBooking; onCancel?: () => void; onViewDetail?: () => void; onPayment?: () => void; isDueSection?: boolean }>) {
  const [expanded, setExpanded] = useState(false);

  const dt = booking.draft.dateTime;
  const days = dt?.date ? daysUntil(dt.date) : null;
  // Within the "upcoming" tab's due (today/overdue) sub-tab, show a distinct badge + the
  // appointment's time range instead of the generic "confirmed" badge + "days until" pill.
  const isDueConfirmed = booking.status === 'confirmed' && isDueSection;
  const badge = isDueConfirmed
    ? { label: 'ถึงกำหนดบริการแล้ว', dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' }
    : STATUS_BADGE[booking.status];
  const recipientType = booking.draft.recipient?.type;
  const recipientLabel =
    recipientType === 'self'
      ? 'สำหรับตัวเอง'
      : (booking.draft.recipient?.patientDetails?.name ?? 'สมาชิก');

  // Expanded section data
  const est = booking.draft.estimatedCost;
  const hourlyRate = est?.hourlyRate ?? booking.caregiverHourlyRate;
  const hours = est?.hours ?? dt?.duration ?? 0;
  const subtotal = hourlyRate * hours;
  const platformFee = est?.platformFee ?? Math.round(subtotal * 0.1);
  const total = est?.total ?? (subtotal + platformFee);

  const locType = booking.draft.serviceLocation?.[0];
  const locLabel = locType === 'at_home' ? 'ดูแลที่บ้านผู้ป่วย' : locType === 'accompany_outside' ? 'พาออกนอกบ้าน' : '—';
  const ld = booking.draft.locationDetails;
  let locationStr = '—';
  if (locType === 'at_home') {
    const parts = [ld?.district, ld?.province].filter(Boolean);
    locationStr = parts.length > 0 ? parts.join(', ') : (ld?.at_home?.address ?? '—');
  } else if (locType === 'accompany_outside') {
    locationStr = ld?.accompany_outside?.hospitalName ?? '—';
  }

  const svcTypes = booking.draft.serviceTypes ?? [];
  const svcTypeLabel = svcTypes.map((t) => SERVICE_TYPE_LABELS[t] ?? t).join(', ') || '—';
  const timeStr = dt?.startTime && dt?.endTime ? `${dt.startTime}–${dt.endTime} น.` : '—';
  const allTasks = [...(booking.draft.jobDetails?.tasks ?? []), ...(booking.draft.jobDetails?.customTasks ?? [])];
  const conditions = booking.draft.recipient?.patientDetails?.conditions;
  const conditionStr = conditions && conditions.length > 0 ? `อาการ: ${conditions.join(', ')}` : null;
  const cgInitial = booking.caregiverName?.charAt(0) ?? '?';

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '0.8px solid #E5E7EB',
        boxShadow: '0px 1px 4px rgba(0,0,0,0.03)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          background: '#FAFBFC',
          borderBottom: '0.8px solid #F0F1F3',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 10px',
            height: 24,
            background: badge.bg,
            borderRadius: 9999,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 3, background: badge.dot, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 600, color: badge.text, lineHeight: '18px' }}>
            {badge.label}
          </span>
        </span>

        {isDueConfirmed ? (
          dt?.startTime && dt?.endTime && (
            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', lineHeight: '16px' }}>
              {dt.startTime}–{dt.endTime} น.
            </span>
          )
        ) : (
          days !== null && days >= 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 10px',
                height: '20.5px',
                background: '#EFF6FF',
                borderRadius: 6,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: '#1D4ED8',
                lineHeight: '16px',
              }}
            >
              อีก {days} วัน
            </span>
          )
        )}
      </div>

      {/* Card body — click to toggle */}
      <div
        onClick={() => setExpanded((prev) => !prev)}
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 16px', gap: 12, cursor: 'pointer' }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '0.5px',
              color: '#1A1A1A',
              lineHeight: '27px',
            }}
          >
            {booking.ref}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="material-icons" style={{ fontSize: 13, color: '#3B82F6' }}>person</span>
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#575859', lineHeight: '18px' }}>
                {recipientLabel}
              </span>
            </span>

            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#D1D5DB', margin: '0 8px' }}>·</span>

            {dt?.date ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className="material-icons" style={{ fontSize: 13, color: '#8A8C8E' }}>calendar_today</span>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#575859', lineHeight: '18px' }}>
                  {formatThaiDate(dt.date)}
                </span>
              </span>
            ) : (
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E' }}>—</span>
            )}

            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#D1D5DB', margin: '0 8px' }}>·</span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="material-icons" style={{ fontSize: 13, color: '#52B69A' }}>person_outline</span>
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#575859', lineHeight: '18px' }}>
                {booking.caregiverName}
              </span>
            </span>
          </div>
        </div>

        <span
          className="material-icons"
          style={{
            fontSize: 22,
            color: '#8A8C8E',
            flexShrink: 0,
            transition: 'transform 0.2s ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          expand_more
        </span>
      </div>

      {/* ── Expanded detail sections ──────────────────────────────── */}
      {expanded && (
        <>
          {/* Section 1: ผู้รับบริการ */}
          <div style={{ borderTop: '0.8px solid #F0F1F3', padding: '12px 16px', borderBottom: '0.8px solid #F0F1F3' }}>
            <SectionLabel>ผู้รับบริการ</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  background: '#EFF6FF',
                  borderRadius: 10,
                  flexShrink: 0,
                }}
              >
                <span className="material-icons" style={{ fontSize: 18, color: '#3B82F6' }}>person</span>
              </div>
              <div>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 15, fontWeight: 700, color: '#1A1A1A', lineHeight: '22px', margin: 0 }}>
                  {recipientLabel}
                </p>
                {conditionStr && (
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#DC2626', lineHeight: '16px', margin: '2px 0 0' }}>
                    {conditionStr}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: รายละเอียดการจอง */}
          <div style={{ padding: '12px 16px', borderBottom: '0.8px solid #F0F1F3' }}>
            <SectionLabel>รายละเอียดการจอง</SectionLabel>
            <DetailRow icon="medical_services" label="ประเภทบริการ"  value={svcTypeLabel} />
            <DetailRow icon="calendar_today"   label="วันที่ให้บริการ" value={dt?.date ? formatThaiDate(dt.date) : '—'} />
            <DetailRow icon="schedule"         label="เวลา"          value={timeStr} />
            <DetailRow icon="place"            label="สถานที่"        value={locationStr} />
            <DetailRow icon="directions"       label="รูปแบบบริการ"  value={locLabel} />

            {/* Duration + Estimate box */}
            <div
              style={{
                display: 'flex',
                background: '#F0FAF4',
                border: '0.8px solid #D1FAE5',
                borderRadius: 10,
                overflow: 'hidden',
                marginTop: 4,
                marginBottom: allTasks.length > 0 || booking.draft.jobDetails?.notes ? 12 : 0,
              }}
            >
              <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ระยะเวลา
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: '#1A1A1A', lineHeight: '24px' }}>
                  {hours > 0 ? `${hours} ชม.` : '—'}
                </span>
              </div>
              <div style={{ width: '0.8px', background: '#D1FAE5', alignSelf: 'stretch' }} />
              <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ประมาณการ
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: '#059669', lineHeight: '24px' }}>
                  {total > 0 ? `฿${total.toLocaleString()}` : '—'}
                </span>
              </div>
            </div>

            {/* Task chips */}
            {allTasks.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: booking.draft.jobDetails?.notes ? 10 : 0 }}>
                {allTasks.map((task) => (
                  <span
                    key={task.id}
                    style={{
                      fontFamily: "'Bai Jamjuree', sans-serif",
                      fontSize: 11,
                      color: '#575859',
                      background: '#F0F1F3',
                      borderRadius: 20,
                      padding: '2.8px 10px',
                      lineHeight: '16px',
                    }}
                  >
                    {task.name}
                  </span>
                ))}
              </div>
            )}

            {/* Notes box */}
            {booking.draft.jobDetails?.notes && (
              <div style={{ background: '#FFF8E7', border: '0.8px solid #FFEAA7', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 700, color: '#8A6D3B', lineHeight: '18px', margin: 0 }}>
                  หมายเหตุ: {booking.draft.jobDetails.notes}
                </p>
              </div>
            )}
          </div>

          {/* Section 3: ผู้ดูแล */}
          <div style={{ padding: '12px 16px', borderBottom: '0.8px solid #F0F1F3' }}>
            <SectionLabel>ผู้ดูแล</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {booking.caregiverAvatarUrl ? (
                <img
                  src={booking.caregiverAvatarUrl}
                  alt={booking.caregiverName}
                  style={{ width: 44, height: 44, borderRadius: 22, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    background: 'linear-gradient(135deg, #3A9A7E 0%, #52B69A 60%, #76C893 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
                    {cgInitial}
                  </span>
                </div>
              )}
              <div>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 15, fontWeight: 700, color: '#1A1A1A', lineHeight: '22px', margin: 0 }}>
                  {booking.caregiverName}
                </p>
                {booking.caregiverProvince && (
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '18px', margin: '1px 0 0' }}>
                    {booking.caregiverProvince}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: สรุปค่าใช้จ่าย */}
          <div style={{ padding: '12px 16px', borderBottom: '0.8px solid #F0F1F3' }}>
            <SectionLabel>สรุปค่าใช้จ่าย</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '18px' }}>
                  ค่าบริการ ({hourlyRate.toLocaleString()} × {hours} ชม.)
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#1A1A1A', fontWeight: 600 }}>
                  ฿{subtotal.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '18px' }}>
                  ค่าบริการแพลตฟอร์ม
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#1A1A1A', fontWeight: 600 }}>
                  ฿{platformFee.toLocaleString()}
                </span>
              </div>
            </div>
            <div style={{ height: '0.8px', background: '#F0F1F3', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 700, color: '#1A1A1A', lineHeight: '20px' }}>
                รวมทั้งหมด
              </span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: '#52B69A', lineHeight: '24px' }}>
                ฿{total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Section 5: Action buttons */}
          <div style={{ padding: '12px 16px' }}>
            {/* backend 'accepted' = caregiver said yes, payment still due — lead with the pay button */}
            {booking.status === 'accepted' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={onPayment}
                  style={{
                    width: '100%',
                    height: 44,
                    background: '#3B82F6',
                    border: 'none',
                    boxShadow: '0px 4px 14px rgba(26,86,219,0.3)',
                    borderRadius: 10,
                    fontFamily: "'Bai Jamjuree', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>credit_card</span>
                  ชำระเงิน{total > 0 ? ` ฿${total.toLocaleString()}` : ''}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={onViewDetail}
                    style={{
                      flex: 1,
                      height: 38,
                      background: '#FFFFFF',
                      border: '0.8px solid #E0E2E5',
                      borderRadius: 8,
                      fontFamily: "'Bai Jamjuree', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#575859',
                      cursor: 'pointer',
                    }}
                  >
                    ดูรายละเอียด
                  </button>
                  <button
                    type="button"
                    onClick={onCancel}
                    style={{
                      height: 38,
                      padding: '0 16px',
                      background: '#FEF2F2',
                      border: '0.8px solid #FCA5A5',
                      borderRadius: 8,
                      fontFamily: "'Bai Jamjuree', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#DC2626',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ยกเลิกคำขอ
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={onViewDetail}
                  style={{
                    flex: 1,
                    height: 40,
                    background: '#FFFFFF',
                    border: '0.8px solid #E0E2E5',
                    borderRadius: 8,
                    fontFamily: "'Bai Jamjuree', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#575859',
                    cursor: 'pointer',
                  }}
                >
                  ดูรายละเอียด
                </button>
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <button
                    type="button"
                    onClick={onCancel}
                    style={{
                      height: 40,
                      padding: '0 16px',
                      background: '#FEF2F2',
                      border: '0.8px solid #FCA5A5',
                      borderRadius: 8,
                      fontFamily: "'Bai Jamjuree', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#DC2626',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ยกเลิกคำขอ
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Cancel Confirm Modal ───────────────────────────────────────────────────────

function CancelConfirmModal({ booking, onClose, onConfirm }: Readonly<{
  booking: ConfirmedBooking | null;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  if (!booking) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0px 20px 60px rgba(0,0,0,0.15)',
          padding: '32px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            background: '#FEF2F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <span className="material-icons" style={{ fontSize: 32, color: '#DC2626' }}>report_problem</span>
        </div>

        {/* Title */}
        <p style={{
          fontFamily: "'Bai Jamjuree', sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: '#1A1A1A',
          lineHeight: '27px',
          textAlign: 'center',
          margin: 0,
        }}>
          ยืนยันการยกเลิกคำขอจอง
        </p>

        {/* Body */}
        <p style={{
          fontFamily: "'Bai Jamjuree', sans-serif",
          fontSize: 13,
          fontWeight: 400,
          color: '#575859',
          lineHeight: '21px',
          textAlign: 'center',
          margin: '10px 0 24px',
          maxWidth: 330,
        }}>
          คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำขอจองสำหรับ{' '}
          <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{booking.caregiverName}</span>?
          <br />
          การดำเนินการนี้ไม่สามารถย้อนกลับได้
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              height: 44,
              background: '#FFFFFF',
              border: '0.8px solid #E0E2E5',
              borderRadius: 10,
              fontFamily: "'Bai Jamjuree', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#575859',
              cursor: 'pointer',
            }}
          >
            ย้อนกลับ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 44,
              background: '#DC2626',
              border: 'none',
              borderRadius: 10,
              fontFamily: "'Bai Jamjuree', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            ยืนยันยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Saved Caregivers Modal ─────────────────────────────────────────────────────

const SKILL_LABELS: Record<string, string> = {
  mobility: 'ช่วยเคลื่อนไหว',
  medication: 'ดูแลยา',
  bathing: 'อาบน้ำ / สุขอนามัย',
  cooking: 'ทำอาหาร',
  companionship: 'เป็นเพื่อนคุย',
  wound_care: 'ดูแลแผล',
  physical_therapy: 'กายภาพบำบัด',
  physiotherapy: 'กายภาพบำบัด',
  dementia_care: 'ดูแลสมองเสื่อม',
  general_care: 'ดูแลทั่วไป',
  bedridden_care: 'ดูแลผู้ป่วยติดเตียง',
  companion: 'เป็นเพื่อน/พูดคุย',
};

interface SavedCaregiversModalProps {
  isOpen: boolean;
  onClose: () => void;
  caregivers: SavedCaregiver[];
  onRemove: (id: string) => void;
  onViewProfile: (cg: SavedCaregiver) => void;
  onSearch: () => void;
}

function SavedCaregiversModal({ isOpen, onClose, caregivers, onRemove, onViewProfile, onSearch }: Readonly<SavedCaregiversModalProps>) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#FFFFFF',
          borderRadius: 20,
          maxHeight: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0px 24px 60px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px 16px',
            borderBottom: '0.8px solid #F0F1F3',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                background: 'linear-gradient(135deg, #FFF0F3 0%, #FFE4EA 100%)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-icons" style={{ fontSize: 22, color: '#F43F5E' }}>favorite</span>
            </div>
            <div>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '26px' }}>
                ผู้ดูแลที่บันทึกไว้
              </p>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', margin: 0, lineHeight: '18px' }}>
                {caregivers.length > 0 ? `${caregivers.length} คน` : 'ยังไม่มีรายการ'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              background: '#F5F5F5',
              border: 'none',
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span className="material-icons" style={{ fontSize: 18, color: '#575859' }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {caregivers.length === 0 ? (
            /* ── Empty state ── */
            <div style={{ padding: '48px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFF0F3 0%, #FFE4EA 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <span className="material-icons" style={{ fontSize: 40, color: '#FECDD3' }}>favorite_border</span>
              </div>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: '0 0 8px', lineHeight: '24px' }}>
                ยังไม่มีผู้ดูแลที่บันทึกไว้
              </p>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', margin: '0 0 24px', lineHeight: '20px', maxWidth: 280 }}>
                กดปุ่ม "บันทึก" ในหน้าโปรไฟล์ผู้ดูแล เพื่อเพิ่มรายการที่สนใจ
              </p>
              <button
                type="button"
                onClick={onSearch}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 42,
                  padding: '0 22px',
                  background: '#52B69A',
                  border: 'none',
                  borderRadius: 10,
                  fontFamily: "'Bai Jamjuree', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0px 4px 12px rgba(82, 182, 154, 0.3)',
                }}
              >
                <span className="material-icons" style={{ fontSize: 16 }}>search</span>
                ค้นหาผู้ดูแล
              </button>
            </div>
          ) : (
            /* ── Caregiver cards ── */
            <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {caregivers.map((cg) => {
                const initial = cg.fullName.charAt(0);
                const skillLabels = cg.skills.slice(0, 3).map((s) => SKILL_LABELS[s] ?? s);
                const locationStr = [cg.district, cg.province].filter(Boolean).join(', ') || cg.province;
                return (
                  <div
                    key={cg.id}
                    style={{
                      background: '#FFFFFF',
                      border: '0.8px solid #E5E7EB',
                      borderRadius: 16,
                      padding: '14px 14px 12px',
                      boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Top row: avatar + info + rate */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      {cg.avatarUrl ? (
                        <img
                          src={cg.avatarUrl}
                          alt={cg.fullName}
                          style={{ width: 54, height: 54, borderRadius: 27, objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 27,
                            background: 'linear-gradient(135deg, #3A9A7E 0%, #52B69A 60%, #76C893 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0px 4px 12px rgba(82,182,154,0.3)',
                          }}
                        >
                          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>
                            {initial}
                          </span>
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <p style={{
                            fontFamily: "'Bai Jamjuree', sans-serif",
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#1A1A1A',
                            margin: 0,
                            lineHeight: '22px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {cg.fullName}
                          </p>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 800, color: '#52B69A' }}>
                              ฿{cg.hourlyRate.toLocaleString()}
                            </span>
                            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E' }}>/ชม.</span>
                          </div>
                        </div>

                        {/* Rating row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          {cg.avgRating ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <span className="material-icons" style={{ fontSize: 13, color: '#F59E0B' }}>star</span>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>
                                {cg.avgRating.toFixed(1)}
                              </span>
                            </span>
                          ) : null}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <span className="material-icons" style={{ fontSize: 12, color: '#B0B3B8' }}>place</span>
                            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '18px' }}>
                              {locationStr}
                            </span>
                          </span>
                        </div>

                        {/* Skill chips */}
                        {skillLabels.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
                            {skillLabels.map((s) => (
                              <span
                                key={s}
                                style={{
                                  fontFamily: "'Bai Jamjuree', sans-serif",
                                  fontSize: 11,
                                  color: '#52B69A',
                                  background: '#F0FAF4',
                                  border: '0.8px solid #D1FAE5',
                                  borderRadius: 20,
                                  padding: '2px 8px',
                                  lineHeight: '16px',
                                }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: '0.8px', background: '#F0F1F3', margin: '12px 0 10px' }} />

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => onViewProfile(cg)}
                        style={{
                          flex: 1,
                          height: 38,
                          background: '#52B69A',
                          border: 'none',
                          borderRadius: 9,
                          fontFamily: "'Bai Jamjuree', sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: 15 }}>person</span>
                        ดูโปรไฟล์
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(cg.id)}
                        style={{
                          height: 38,
                          padding: '0 14px',
                          background: '#FFF0F3',
                          border: '0.8px solid #FECDD3',
                          borderRadius: 9,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: 14, color: '#F43F5E' }}>favorite</span>
                        <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 600, color: '#F43F5E' }}>
                          ลบออก
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab Button ─────────────────────────────────────────────────────────────────

interface TabBtnProps {
  tabKey: TabKey;
  active: boolean;
  count: number;
  hasRedDot?: boolean;
  onClick: () => void;
}

function TabBtn({ tabKey, active, count, hasRedDot = false, onClick }: Readonly<TabBtnProps>) {
  const meta = TAB_META[tabKey];

  let countBg = '#F0F1F3';
  if (active) countBg = 'rgba(255,255,255,0.25)';
  else if (tabKey === 'pending') countBg = '#FEE2E2';

  let countColor = '#575859';
  if (active) countColor = '#FFFFFF';
  else if (tabKey === 'pending') countColor = '#EF4444';

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex flex-row justify-center items-center flex-1 transition-all duration-150 cursor-pointer"
      style={{
        gap: 6,
        height: 45,
        padding: '10px 8px',
        background: active ? '#52B69A' : 'transparent',
        boxShadow: active ? '0px 4px 14px rgba(82,182,154,0.35)' : 'none',
        borderRadius: 10,
        border: 'none',
      }}
    >
      <span className="material-icons shrink-0" style={{ fontSize: 18, color: active ? '#FFFFFF' : '#575859' }}>
        {meta.icon}
      </span>
      {/* Hide label on mobile, show on sm+ */}
      <span
        className="hidden sm:inline truncate"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: active ? '#FFFFFF' : '#575859', lineHeight: '21px' }}
      >
        {meta.label}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 20,
          height: 20,
          padding: '0 4px',
          background: countBg,
          borderRadius: 9999,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          color: countColor,
          lineHeight: '16px',
          flexShrink: 0,
        }}
      >
        {count}
      </span>

      {hasRedDot && !active && (
        <span
          className="absolute"
          style={{ width: 7, height: 7, right: 6, top: 4, background: '#DC2626', borderRadius: 4 }}
        />
      )}
    </button>
  );
}

// ── Booking List Frame ─────────────────────────────────────────────────────────

type HistoryStatusFilter = 'all' | 'completed' | 'cancelled' | 'rejected';

interface BookingListFrameProps {
  tab: TabKey;
  bookings: ConfirmedBooking[];
  onCancelBooking: (id: string) => void;
  onViewDetail: (booking: ConfirmedBooking) => void;
  onPayBooking?: (booking: ConfirmedBooking) => void;
  isLoading?: boolean;
  historyStatusFilter?: HistoryStatusFilter;
  onHistoryStatusFilterChange?: (f: HistoryStatusFilter) => void;
  historyDateFrom?: string;
  onHistoryDateFromChange?: (v: string) => void;
  historyDateTo?: string;
  onHistoryDateToChange?: (v: string) => void;
  upcomingSubTab?: 'today' | 'later';
  onUpcomingSubTabChange?: (t: 'today' | 'later') => void;
  upcomingTodayCount?: number;
  upcomingLaterCount?: number;
}

function BookingListFrame({
  tab, bookings, onCancelBooking, onViewDetail, onPayBooking, isLoading,
  historyStatusFilter, onHistoryStatusFilterChange,
  historyDateFrom, onHistoryDateFromChange,
  historyDateTo, onHistoryDateToChange,
  upcomingSubTab, onUpcomingSubTabChange,
  upcomingTodayCount = 0, upcomingLaterCount = 0,
}: Readonly<BookingListFrameProps>) {
  const meta = TAB_META[tab];

  const FRAME_COLORS = {
    upcoming: { iconBg: '#E6F5ED', iconColor: '#52B69A', cntBg: '#E6F5ED', cntColor: '#059669' },
    pending:  { iconBg: '#FEF3C7', iconColor: '#F59E0B', cntBg: '#FEE2E2', cntColor: '#EF4444' },
    history:  { iconBg: '#F3F4F6', iconColor: '#9CA3AF', cntBg: '#F0F1F3', cntColor: '#575859' },
  };
  const { iconBg, iconColor, cntBg, cntColor } = FRAME_COLORS[tab];

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '0.8px solid #E5E7EB',
        boxShadow: '0px 4px 20px rgba(0,0,0,0.04)',
        borderRadius: 20,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* Frame header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 24px 20px',
          background: '#FFFFFF',
          borderBottom: '0.8px solid #F0F1F3',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              background: iconBg,
              borderRadius: 10,
              flexShrink: 0,
            }}
          >
            <span className="material-icons" style={{ fontSize: 22, color: iconColor }}>{meta.icon}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 16, fontWeight: 700, color: '#1A1A1A', lineHeight: '19px' }}>
              {meta.sectionTitle}
            </span>
            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '14px', marginTop: 3 }}>
              {meta.sectionSubtitle}
            </span>
          </div>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 26,
            padding: '0 12px',
            background: cntBg,
            borderRadius: 9999,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: cntColor,
            lineHeight: '18px',
          }}
        >
          {bookings.length} นัดหมาย
        </span>
      </div>

      {/* Upcoming sub-tabs (Today vs Not yet due) */}
      {tab === 'upcoming' && onUpcomingSubTabChange && (
        <div style={{ padding: '16px 24px 0', background: '#FCFDFD' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              padding: 6,
              background: '#F3F4F6',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {(
              [
                { key: 'today' as const, label: 'วันนี้', count: upcomingTodayCount },
                { key: 'later' as const, label: 'ยังไม่ถึงวันนัดหมาย', count: upcomingLaterCount },
              ]
            ).map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => onUpcomingSubTabChange(key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  height: 40,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: "'Bai Jamjuree', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'background 0.15s, color 0.15s',
                  background: upcomingSubTab === key ? '#FFFFFF' : 'transparent',
                  color: upcomingSubTab === key ? '#1A1A1A' : '#6B7280',
                  boxShadow: upcomingSubTab === key ? '0px 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {label}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 20,
                    height: 20,
                    padding: '0 6px',
                    borderRadius: 9999,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    background: upcomingSubTab === key ? '#EFF6FF' : '#FFFFFF',
                    color: upcomingSubTab === key ? '#1D4ED8' : '#6B7280',
                  }}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History filter bar */}
      {tab === 'history' && onHistoryStatusFilterChange && (
        <div style={{ padding: '14px 24px 0', background: '#FCFDFD', borderBottom: '0.8px solid #F0F1F3' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingBottom: 14 }}>
            {/* Status chips */}
            {(
              [
                { key: 'all' as const,       label: 'ทั้งหมด'    },
                { key: 'completed' as const, label: 'เสร็จสิ้น'  },
                { key: 'cancelled' as const, label: 'ยกเลิกแล้ว' },
                { key: 'rejected' as const,  label: 'ถูกปฏิเสธ'  },
              ]
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onHistoryStatusFilterChange(key)}
                style={{
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 9999,
                  border: 'none',
                  fontFamily: "'Bai Jamjuree', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: historyStatusFilter === key ? '#52B69A' : '#E6F5ED',
                  color: historyStatusFilter === key ? '#FFFFFF' : '#3A9A7E',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {label}
              </button>
            ))}

            {/* Date range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', whiteSpace: 'nowrap' }}>จาก:</span>
              <input
                type="date"
                value={historyDateFrom ?? ''}
                onChange={(e) => onHistoryDateFromChange?.(e.target.value)}
                style={{
                  height: 32, padding: '0 8px', borderRadius: 8,
                  border: '0.8px solid #E0E2E5', fontSize: 12,
                  fontFamily: "'Bai Jamjuree', sans-serif", color: '#1A1A1A',
                  background: '#FFFFFF', outline: 'none', cursor: 'pointer',
                }}
              />
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', whiteSpace: 'nowrap' }}>ถึง:</span>
              <input
                type="date"
                value={historyDateTo ?? ''}
                onChange={(e) => onHistoryDateToChange?.(e.target.value)}
                style={{
                  height: 32, padding: '0 8px', borderRadius: 8,
                  border: '0.8px solid #E0E2E5', fontSize: 12,
                  fontFamily: "'Bai Jamjuree', sans-serif", color: '#1A1A1A',
                  background: '#FFFFFF', outline: 'none', cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cards area */}
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, background: '#FCFDFD' }}>
        {isLoading ? (
          /* Loading skeletons */
          [1, 2].map((n) => (
            <div key={n} style={{ background: '#FFFFFF', border: '0.8px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ height: 44, background: '#FAFBFC', borderBottom: '0.8px solid #F0F1F3' }}>
                <div style={{ width: 80, height: 22, background: '#F0F1F3', borderRadius: 9999, margin: '11px 16px' }} />
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ width: 140, height: 22, background: '#F0F1F3', borderRadius: 6 }} />
                <div style={{ width: '70%', height: 16, background: '#F7F8F9', borderRadius: 6 }} />
              </div>
            </div>
          ))
        ) : bookings.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, color: '#8A8C8E' }}>
              ไม่มีรายการในหมวดนี้
            </span>
          </div>
        ) : (
          bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={() => onCancelBooking(b.id)}
              onViewDetail={() => onViewDetail(b)}
              onPayment={onPayBooking ? () => onPayBooking(b) : undefined}
              isDueSection={tab === 'upcoming' && upcomingSubTab === 'today'}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const BookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { confirmedBookings, savedCaregivers, toggleSaveCaregiver, cancelBooking } = useBooking();
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [upcomingSubTab, setUpcomingSubTab] = useState<'today' | 'later'>('today');
  const [showSaved, setShowSaved] = useState(false);
  const [pendingCancelBooking, setPendingCancelBooking] = useState<ConfirmedBooking | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── API bookings (GraphQL) ───────────────────────────────────────────────
  const { data: gqlData, loading: isFetching, refetch } = useQuery(GET_MY_BOOKING_HISTORY, {
    variables: { input: { limit: 50 } },
    fetchPolicy: 'cache-and-network',
  });

  // Local override map: tracks status mutations (cancel) made in this session
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Map<string, ConfirmedBooking['status']>>(new Map());

  // Map raw GQL data, applying any local status overrides
  const apiBookings: ConfirmedBooking[] = useMemo(
    () => (gqlData?.myBookingHistory?.data ?? []).map((item: Parameters<typeof mapGqlBooking>[0]) => {
      const mapped = mapGqlBooking(item);
      const override = localStatusOverrides.get(mapped.id);
      return override ? { ...mapped, status: override } : mapped;
    }),
    [gqlData, localStatusOverrides],
  );

  // Merge: API bookings + local-only bookings not in API (from context)
  const allBookings = useMemo(() => {
    const apiIds = new Set(apiBookings.map((b) => b.id));
    const localOnly = confirmedBookings.filter((b) => !apiIds.has(b.id));
    return [...apiBookings, ...localOnly];
  }, [apiBookings, confirmedBookings]);

  // ── Cancel handlers ─────────────────────────────────────────────────────

  const showToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
  };

  const handleCancelBooking = (id: string) => {
    const booking = allBookings.find((b) => b.id === id);
    if (booking) setPendingCancelBooking(booking);
  };

  const handleConfirmCancel = async () => {
    if (!pendingCancelBooking) return;
    const id = pendingCancelBooking.id;

    // Optimistic update
    cancelBooking(id);
    setLocalStatusOverrides((prev) => new Map(prev).set(id, 'cancelled'));
    setPendingCancelBooking(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiBase = import.meta.env.VITE_GRAPHQL_URL?.replace('/graphql', '') ?? '';
      const res = await fetch(`${apiBase}/api/v1/bookings/${id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        showToast();
        refetch();
      } else {
        // Revert optimistic update on failure
        setLocalStatusOverrides((prev) => { const m = new Map(prev); m.delete(id); return m; });
      }
    } catch {
      setLocalStatusOverrides((prev) => { const m = new Map(prev); m.delete(id); return m; });
    }
  };

  // ── History filter state ────────────────────────────────────────────────
  const [historyStatusFilter, setHistoryStatusFilter] = useState<HistoryStatusFilter>('all');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  const grouped: Record<TabKey, ConfirmedBooking[]> = {
    // Jobs that have started (in_progress / awaiting_release / needs_review) stay here
    // rather than in history: they are not finished, and the patient must keep seeing
    // them to raise a problem before the money is released.
    upcoming: allBookings.filter((b) => b.status === 'confirmed' || ACTIVE_JOB_STATUSES.has(b.status)),
    pending:  allBookings.filter((b) => b.status === 'pending' || b.status === 'accepted'),
    history:  allBookings.filter((b) => b.status === 'rejected' || b.status === 'cancelled' || b.status === 'completed'),
  };

  // Upcoming tab: split into "today" (today or overdue) vs "later" (not yet due)
  const upcomingToday = grouped.upcoming.filter((b) => {
    const d = b.draft.dateTime?.date ? daysUntil(b.draft.dateTime.date) : null;
    return d !== null && d <= 0;
  });
  const upcomingLater = grouped.upcoming.filter((b) => {
    const d = b.draft.dateTime?.date ? daysUntil(b.draft.dateTime.date) : null;
    return d === null || d > 0;
  });

  const filteredHistory = useMemo(() => {
    let list = grouped.history;
    if (historyStatusFilter !== 'all') {
      const statusMap: Record<Exclude<HistoryStatusFilter, 'all'>, ConfirmedBooking['status']> = {
        completed: 'completed',
        cancelled: 'cancelled',
        rejected:  'rejected',
      };
      list = list.filter((b) => b.status === statusMap[historyStatusFilter]);
    }
    if (historyDateFrom) {
      list = list.filter((b) => {
        const d = b.draft.dateTime?.date;
        return d ? d >= historyDateFrom : false;
      });
    }
    if (historyDateTo) {
      list = list.filter((b) => {
        const d = b.draft.dateTime?.date;
        return d ? d <= historyDateTo : false;
      });
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped.history, historyStatusFilter, historyDateFrom, historyDateTo]);

  const hasPendingNew = grouped.pending.length > 0;

  return (
    <>
    {/* ── Toast notification ── */}
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 24px',
        background: '#047857',
        boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.15)',
        borderRadius: 12,
        opacity: toastVisible ? 1 : 0,
        transform: toastVisible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        pointerEvents: toastVisible ? 'auto' : 'none',
      }}
    >
      <span className="material-icons" style={{ fontSize: 20, color: '#FFFFFF', flexShrink: 0 }}>check_circle</span>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontWeight: 600, fontSize: 14, lineHeight: '21px', color: '#FFFFFF', whiteSpace: 'nowrap' }}>
        ยกเลิกคำขอจองสำเร็จ
      </span>
    </div>

    <CancelConfirmModal
      booking={pendingCancelBooking}
      onClose={() => setPendingCancelBooking(null)}
      onConfirm={handleConfirmCancel}
    />
    <SavedCaregiversModal
      isOpen={showSaved}
      onClose={() => setShowSaved(false)}
      caregivers={savedCaregivers}
      onRemove={(id) => {
        const cg = savedCaregivers.find((c) => c.id === id);
        if (cg) toggleSaveCaregiver(cg);
      }}
      onViewProfile={(cg) => {
        setShowSaved(false);
        navigate(`/caregivers/${cg.id}`, { state: { caregiver: cg } });
      }}
      onSearch={() => {
        setShowSaved(false);
        navigate('/search');
      }}
    />
    <div className="min-h-screen" style={{ background: '#F6FAF9' }}>
      <div className="mx-auto px-4 sm:px-6 py-7 pb-24" style={{ maxWidth: 1000 }}>

        {/* Page header */}
        <div className="flex flex-row justify-between items-center pb-1.5">
          <h1
            style={{
              fontFamily: "'Bai Jamjuree', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: '#1A1A1A',
              lineHeight: '36px',
              margin: 0,
            }}
          >
            นัดหมายของฉัน
          </h1>

          <button
            type="button"
            onClick={() => setShowSaved(true)}
            className="inline-flex flex-row justify-center items-center cursor-pointer hover:bg-gray-50 transition-colors duration-150"
            style={{
              gap: 6,
              padding: '0 12px',
              height: 40,
              background: '#FFFFFF',
              border: '0.8px solid #E0E2E5',
              borderRadius: 8,
            }}
          >
            <span className="material-icons" style={{ fontSize: 16, color: savedCaregivers.length > 0 ? '#F43F5E' : '#575859' }}>
              {savedCaregivers.length > 0 ? 'favorite' : 'favorite_border'}
            </span>
            <span
              className="hidden sm:inline"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#575859', lineHeight: '20px' }}
            >
              ผู้ดูแลที่บันทึกไว้
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 19,
                height: '20.5px',
                padding: '0 4px',
                background: savedCaregivers.length > 0 ? '#FFF0F3' : '#F0F1F3',
                borderRadius: 9999,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: savedCaregivers.length > 0 ? '#F43F5E' : '#575859',
                lineHeight: '16px',
              }}
            >
              {savedCaregivers.length}
            </span>
          </button>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            background: '#FFFFFF',
            border: '0.8px solid #E5E7EB',
            boxShadow: '0px 4px 12px rgba(0,0,0,0.03)',
            borderRadius: 14,
            padding: '6.8px',
            margin: '28px 0 24px',
          }}
        >
          <TabBtn tabKey="upcoming" active={activeTab === 'upcoming'} count={grouped.upcoming.length} onClick={() => { setActiveTab('upcoming'); setUpcomingSubTab('today'); }} />
          <TabBtn tabKey="pending"  active={activeTab === 'pending'}  count={grouped.pending.length}  hasRedDot={hasPendingNew} onClick={() => setActiveTab('pending')} />
          <TabBtn tabKey="history"  active={activeTab === 'history'}  count={grouped.history.length}  onClick={() => setActiveTab('history')} />
        </div>

        {/* Content */}
        <BookingListFrame
          tab={activeTab}
          bookings={
            activeTab === 'history'
              ? filteredHistory
              : activeTab === 'upcoming'
              ? (upcomingSubTab === 'today' ? upcomingToday : upcomingLater)
              : grouped[activeTab]
          }
          onCancelBooking={handleCancelBooking}
          onViewDetail={(b) => navigate(`/bookings/${b.id}`, { state: { booking: b } })}
          onPayBooking={(b) => navigate(`/bookings/${b.id}/payment`, { state: { booking: b } })}
          isLoading={isFetching}
          historyStatusFilter={historyStatusFilter}
          onHistoryStatusFilterChange={setHistoryStatusFilter}
          historyDateFrom={historyDateFrom}
          onHistoryDateFromChange={setHistoryDateFrom}
          historyDateTo={historyDateTo}
          onHistoryDateToChange={setHistoryDateTo}
          upcomingSubTab={upcomingSubTab}
          onUpcomingSubTabChange={setUpcomingSubTab}
          upcomingTodayCount={upcomingToday.length}
          upcomingLaterCount={upcomingLater.length}
        />
      </div>
    </div>
    </>
  );
};

export default BookingsPage;
