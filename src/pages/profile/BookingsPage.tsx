import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useBooking, type ConfirmedBooking, type BookingRequest, type SavedCaregiver } from '../../context/BookingContext';
import { GET_MY_BOOKING_HISTORY } from '../../graphql/queries';
import { mapGqlStatus, ACTIVE_JOB_STATUSES } from '../../utils/bookingStatus';

// ── Types ──────────────────────────────────────────────────────────────────────

type TabKey = 'upcoming' | 'pending' | 'history';

// ── Helpers ────────────────────────────────────────────────────────────────────

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

/** Appointment start as epoch ms for sorting (date + startTime); bookings without a date sort last. */
function appointmentTime(b: ConfirmedBooking): number {
  const dt = b.draft.dateTime;
  const day = dt?.date ? new Date(dt.date) : null;
  if (!day || Number.isNaN(day.getTime())) return Number.POSITIVE_INFINITY;
  day.setHours(0, 0, 0, 0);
  const [h, m] = (dt?.startTime ?? '').split(':').map(Number);
  return day.getTime() + ((h || 0) * 60 + (m || 0)) * 60_000;
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

// ── Booking Card ───────────────────────────────────────────────────────────────

/** Month + day for the date block: { month: "ก.ย.", day: "4" }. */
function monthDay(dateStr?: string): { month: string; day: string } {
  const d = dateStr ? new Date(dateStr) : null;
  if (!d || Number.isNaN(d.getTime())) return { month: '', day: '—' };
  return {
    month: new Intl.DateTimeFormat('th-TH', { month: 'short' }).format(d),
    day: new Intl.DateTimeFormat('th-TH', { day: 'numeric' }).format(d),
  };
}

/** Compact row, same layout as the Family Group appointment card — full details live on the detail page. */
function BookingCard({ booking, onViewDetail, isDueSection }: Readonly<{ booking: ConfirmedBooking; onViewDetail?: () => void; isDueSection?: boolean }>) {
  const dt = booking.draft.dateTime;
  const { month, day } = monthDay(dt?.date);
  // Within the "upcoming" tab's due (today/overdue) sub-tab, show a distinct badge.
  const badge = booking.status === 'confirmed' && isDueSection
    ? { label: 'ถึงกำหนดบริการแล้ว', bg: '#EFF6FF', text: '#1D4ED8' }
    : STATUS_BADGE[booking.status];
  const recipientLabel =
    booking.draft.recipient?.type === 'self'
      ? 'สำหรับตัวเอง'
      : (booking.draft.recipient?.patientDetails?.name ?? 'สมาชิก');

  const est = booking.draft.estimatedCost;
  const hourlyRate = est?.hourlyRate ?? booking.caregiverHourlyRate;
  const hours = est?.hours ?? dt?.duration ?? 0;
  const subtotal = hourlyRate * hours;
  const total = est?.total ?? (subtotal + (est?.platformFee ?? Math.round(subtotal * 0.1)));

  const locType = booking.draft.serviceLocation?.[0];
  const locLabel = locType === 'at_home' ? 'ดูแลที่บ้านผู้ป่วย' : locType === 'accompany_outside' ? 'พาออกนอกบ้าน' : null;
  const ld = booking.draft.locationDetails;
  const address =
    locType === 'at_home'
      ? (ld?.at_home?.address ?? ([ld?.district, ld?.province].filter(Boolean).join(', ') || null))
      : locType === 'accompany_outside'
        ? (ld?.accompany_outside?.hospitalName ?? null)
        : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onViewDetail}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewDetail?.(); } }}
      className="flex cursor-pointer items-center gap-5 rounded-2xl border border-gray-100 bg-[#FBFDFC] px-5 py-4 transition-colors hover:border-[#D1FAE5] hover:bg-[#F0FAF4]"
      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
    >
      <div className="flex w-14 shrink-0 flex-col items-center gap-0.5 text-center">
        <span className="text-[13px] font-medium text-[#8A8C8E]">{month}</span>
        <span className="text-[24px] font-bold leading-tight text-[#064E3B]">{day}</span>
        {dt?.startTime && <span className="text-[12px] text-[#8A8C8E]">{dt.startTime}</span>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="truncate text-[16px] font-semibold text-[#1A1A1A]">{recipientLabel}</p>
          <span
            className="inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold"
            style={{ background: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
        </div>
        <p className="mt-1.5 truncate text-[13px] text-[#8A8C8E]">{booking.ref}</p>
        {(address || locLabel) && (
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[13px] text-[#8A8C8E]">
            {address && (
              <>
                <span className="material-icons shrink-0 text-[#B4BCBA]" style={{ fontSize: 15 }}>location_on</span>
                <span className="truncate">{address}</span>
              </>
            )}
            {locLabel && (
              <span className="ml-3 inline-flex shrink-0 items-center gap-1.5">
                <span className="material-icons text-[#B4BCBA]" style={{ fontSize: 15 }}>home</span>
                {locLabel}
              </span>
            )}
          </p>
        )}
      </div>

      {total > 0 && (
        <p className="shrink-0 text-[18px] font-bold text-[#064E3B]" style={{ fontFamily: "'Inter', sans-serif" }}>
          ฿{Math.round(total).toLocaleString('th-TH')}
        </p>
      )}
      <span className="material-icons shrink-0 text-[#C4C7CA]" style={{ fontSize: 22 }}>chevron_right</span>
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
  onViewDetail: (booking: ConfirmedBooking) => void;
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
  tab, bookings, onViewDetail, isLoading,
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
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, background: '#FCFDFD' }}>
        {isLoading ? (
          /* Loading skeletons */
          [1, 2].map((n) => (
            <div key={n} className="h-[104px] w-full animate-pulse rounded-2xl bg-gray-100" />
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
              onViewDetail={() => onViewDetail(b)}
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
  const { confirmedBookings, savedCaregivers, toggleSaveCaregiver } = useBooking();
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [upcomingSubTab, setUpcomingSubTab] = useState<'today' | 'later'>('today');
  const [showSaved, setShowSaved] = useState(false);

  // ── API bookings (GraphQL) ───────────────────────────────────────────────
  const { data: gqlData, loading: isFetching } = useQuery(GET_MY_BOOKING_HISTORY, {
    variables: { input: { limit: 50 } },
    fetchPolicy: 'cache-and-network',
  });

  const apiBookings: ConfirmedBooking[] = useMemo(
    () => (gqlData?.myBookingHistory?.data ?? []).map((item: Parameters<typeof mapGqlBooking>[0]) => mapGqlBooking(item)),
    [gqlData],
  );

  // Merge: API bookings + local-only bookings not in API (from context)
  const allBookings = useMemo(() => {
    const apiIds = new Set(apiBookings.map((b) => b.id));
    const localOnly = confirmedBookings.filter((b) => !apiIds.has(b.id));
    return [...apiBookings, ...localOnly];
  }, [apiBookings, confirmedBookings]);

  // ── History filter state ────────────────────────────────────────────────
  const [historyStatusFilter, setHistoryStatusFilter] = useState<HistoryStatusFilter>('all');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  const grouped: Record<TabKey, ConfirmedBooking[]> = {
    // Jobs that have started (in_progress / awaiting_release / needs_review) stay here
    // rather than in history: they are not finished, and the patient must keep seeing
    // them to raise a problem before the money is released.
    upcoming: allBookings
      .filter((b) => b.status === 'confirmed' || ACTIVE_JOB_STATUSES.has(b.status))
      .sort((a, b) => appointmentTime(a) - appointmentTime(b)),
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
          onViewDetail={(b) => navigate(`/bookings/${b.id}`, { state: { booking: b } })}
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
