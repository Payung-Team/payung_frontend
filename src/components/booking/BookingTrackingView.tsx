import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useBooking, type ConfirmedBooking } from '../../context/BookingContext';
import { useJobEvents } from '../../hooks/useJobEvents';
import { ACTIVE_JOB_STATUSES } from '../../utils/bookingStatus';
import { QRCodeSVG } from 'qrcode.react';
import { useJobQr } from '../../hooks/useJobQr';
import { shouldShowJobQr } from '../../lib/jobQr';
import { copyTextToClipboard, QR_TEST_TOOLS_ENABLED } from '../../lib/qrTestTools';
import { JobQrCard } from './JobQrCard';

// ── Tracking Service view (PYG-361) ─────────────────────────────────────────────
// Shown to patients once a confirmed booking's service date has arrived. Three
// states are implemented so far — caregiver hasn't checked in, just checked in,
// and actively working (ticking tasks off and posting care-log entries). All of
// it is mocked: no backend field exists yet for check-in / task-progress /
// care-log. Wire this up to the Supabase job_events subscription once the API
// adds those fields.

export type TrackingState = 'awaiting_checkin' | 'checked_in' | 'working' | 'checked_out';

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

function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatThaiTime(d: Date): string {
  return `${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} น.`;
}

// TODO(PYG-361): once proofOfWork exists, drive this from checkOut.serverTs —
// never from the device clock.
function formatElapsed(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} นาที`;
  if (minutes === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${minutes} นาที`;
}

// ── Still mocked ─────────────────────────────────────────────────────────────
// Check-in/check-out now comes from proofOfWork, but these have no backend yet:
//   • careLogs   — no care_logs table exists. Needs its own card.
//   • tasks.done — booking_tasks has no done/completed_at column. Needs its own card.
//   • health.*   — real values from booking.draft win; these are only fallbacks.
// The 24h auto-release countdown is deliberately absent: there is no release_at
// column and no release cron yet (PYG-366 / PYG-367), so any number would be a guess.
const MOCK = {
  careNote: 'ต้องวัดน้ำตาลก่อนเริ่มกายภาพทุกครั้ง',
  // Note the caregiver types on check-out. proof.checkOut.note is the real field
  // and always wins — this only keeps the card reviewable on test bookings.
  checkOutNote: 'ลืมล้างจาน',
  tasks: [
    { id: 't1', name: 'วัดระดับน้ำตาล', done: false },
    { id: 't2', name: 'กายภาพบำบัดเบื้องต้น', done: false },
    { id: 't3', name: 'พยุงเดิน', done: false },
  ],
  checkInLocation: 'ห้วยขวาง',
  // Fallbacks so the detail panel renders fully while test bookings still lack
  // patientDetails. Real values from booking.draft always win.
  health: {
    age: 65,
    gender: 'หญิง',
    bloodGroup: 'กรุ๊ป B',
    weight: 58,
    height: 155,
    regularHospital: 'รพ.รามาธิบดี',
    medicines: 'ยาลดความดัน, ยาเบาหวาน',
    allergies: 'แพ้ยาเพนิซิลลิน',
    careInstructions: 'เพิ่งผ่าตัดเปลี่ยนสะโพกใหม่ 2 สัปดาห์ ยังช่วยพยุงเดินค่อนข้างช้า จำเป็นต้องพลิกตัวสม่ำเสมอ',
  },
  // Care-log entries, newest first. minutesAfterCheckIn keeps every timestamp
  // consistent with the mocked check-in time.
  careLogs: [
    { id: 'l1', minutesAfterCheckIn: 40, category: 'food', text: 'กินข้าวต้ม', hasPhoto: true },
    { id: 'l2', minutesAfterCheckIn: 34, category: 'activity', text: 'พาเดินฝึกกายภาพในห้อง 10 นาที คุณสมศรีให้ความร่วมมือดีมากค่ะ', hasPhoto: false },
    { id: 'l3', minutesAfterCheckIn: 20, category: 'vitals', text: 'วัดความดัน 128/80 ชีพจร 74 ปกติดีค่ะ', hasPhoto: false },
    { id: 'l4', minutesAfterCheckIn: 8, category: 'medication', text: 'ให้ยาลดความดันมื้อเช้าเรียบร้อยค่ะ', hasPhoto: false },
  ],
  // Flip to true to exercise the "booking has no coordinates" case — the map
  // card must disappear entirely, with no error and no empty box.
  jobCoordsMissing: false,
};

const CARE_LOG_CATEGORY: Record<string, { icon: string; label: string }> = {
  food: { icon: 'restaurant', label: 'อาหาร' },
  activity: { icon: 'directions_walk', label: 'กิจกรรม' },
  vitals: { icon: 'monitor_heart', label: 'สุขภาพร่างกาย' },
  medication: { icon: 'medication', label: 'ยา' },
};

const LOG_PREVIEW_COUNT = 3;

// Only used while the job is still running — once the caregiver checks out the
// timeline swaps this step for a "ปิดงาน" one.
function buildProgressDetail(isCheckedIn: boolean, elapsedStr: string): string {
  return isCheckedIn ? `มาแล้ว ${elapsedStr}` : '—';
}

const STATUS_PILL: Record<TrackingState, { label: string; bg: string; dot: string; text: string }> = {
  awaiting_checkin: { label: 'รอผู้ดูแลเช็คอิน', bg: '#F0F1F3', dot: '#575859', text: '#575859' },
  checked_in: { label: 'ผู้ดูแลกำลังทำงาน', bg: '#EFF6FF', dot: '#1D4ED8', text: '#1D4ED8' },
  working: { label: 'ผู้ดูแลกำลังทำงาน', bg: '#EFF6FF', dot: '#1D4ED8', text: '#1D4ED8' },
  // Never rendered — the checked-out layout hides the pill and says "การดูแลเสร็จสิ้น"
  // in the banner instead. Present only to keep the record exhaustive.
  checked_out: { label: 'ดูแลเสร็จสิ้น', bg: '#ECFDF5', dot: '#059669', text: '#047857' },
};

// Stacked label-above-value field used by the booking-detail panel's 3-up grid.
// (InfoRow in BookingDetailFields puts the value on the right instead.)
function DetailField({ label, value, danger = false }: Readonly<{ label: string; value: string; danger?: boolean }>) {
  return (
    <div>
      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', margin: 0, lineHeight: '16px' }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: danger ? '#DC2626' : '#1A1A1A', margin: 0, lineHeight: '20px' }}>
        {value || '—'}
      </p>
    </div>
  );
}

const FIELD_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '14px 24px',
} as const;

function CaregiverAvatar({
  name, avatarUrl, size = 56, online = false,
  fallbackBg = 'linear-gradient(135deg, #F0A500 0%, #FFC570 100%)',
  shadow = '0px 4px 16px rgba(82,182,154,0.2)',
}: Readonly<{ name: string; avatarUrl?: string | null; size?: number; online?: boolean; fallbackBg?: string; shadow?: string }>) {
  const initial = name?.charAt(0) ?? '?';
  const frameStyle = {
    width: size, height: size, borderRadius: size / 2,
    border: '2.4px solid #FFFFFF', boxShadow: shadow,
    boxSizing: 'border-box' as const,
  };
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} style={{ ...frameStyle, objectFit: 'cover' }} />
      ) : (
        <div
          style={{
            ...frameStyle,
            background: fallbackBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: size * 0.38, fontWeight: 700, color: '#FFFFFF' }}>{initial}</span>
        </div>
      )}
      {online && (
        <span
          aria-hidden
          style={{
            position: 'absolute', right: 0, bottom: 0,
            width: 14, height: 14, borderRadius: 7,
            background: '#10B981', border: '1.6px solid #FFFFFF', boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  );
}

// Sidebar stat: icon bubble + label above value.
function StatRow({ icon, iconColor, iconBg, label, value }: Readonly<{ icon: string; iconColor: string; iconBg: string; label: string; value: string }>) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <div style={{ width: 36, height: 36, borderRadius: 18, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-icons" style={{ fontSize: 17, color: iconColor }}>{icon}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', margin: 0, lineHeight: '16px' }}>{label}</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '20px' }}>{value}</p>
      </div>
    </div>
  );
}

// Plain centred label/value column for the sidebar summary strip. `divided`
// draws the hairline that separates it from the column on its left.
function SummaryStat({ label, value, divided = false }: Readonly<{ label: string; value: string; divided?: boolean }>) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '0 8px', borderLeft: divided ? '0.8px solid #F0F1F3' : undefined }}>
      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', margin: 0, lineHeight: '16px' }}>{label}</p>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '2px 0 0', lineHeight: '20px' }}>{value}</p>
    </div>
  );
}

// ── Awaiting check-in layout ─────────────────────────────────────────────────
// วันนัดมาถึงแล้วแต่ผู้ดูแลยังไม่เช็คอิน — สิ่งเดียวที่ผู้ใช้ต้องทำคือเปิด QR ให้ผู้ดูแลสแกน
// จึงตัดแผนงาน / บันทึก / ไทม์ไลน์ (ที่ยังว่างทั้งหมด) ออก เหลือ CTA กับการ์ดผู้ดูแล

const FONT_TH = "'Bai Jamjuree', sans-serif";

function AwaitingStat({ label, value, divided = false }: Readonly<{ label: string; value: string; divided?: boolean }>) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: 'center', borderLeft: divided ? '0.8px solid #F3F4F6' : undefined }}>
      <p style={{ fontFamily: FONT_TH, fontSize: 12, color: '#8A8C8E', margin: 0, lineHeight: '18px' }}>{label}</p>
      <p style={{ fontFamily: FONT_TH, fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: '2px 0 0', lineHeight: '22px' }}>{value}</p>
    </div>
  );
}

// ── Caregiver stats + call ───────────────────────────────────────────────────

/**
 * คะแนน / จำนวนงาน / ประสบการณ์ จากข้อมูลจริง (myBooking.caregiver)
 * ช่องที่ไม่มีข้อมูลถูกซ่อน ไม่แสดงเลขสมมติ — ผู้ใช้ใช้ตัวเลขนี้ตัดสินใจเชื่อใจผู้ดูแล
 */
function CaregiverStats({ booking, size = 'md' }: Readonly<{ booking: ConfirmedBooking; size?: 'md' | 'sm' }>) {
  const fs = size === 'md' ? 13 : 11;
  const iconFs = size === 'md' ? 14 : 12;
  const rating = booking.caregiverRating;
  const reviews = booking.caregiverReviewCount ?? 0;
  const jobs = booking.caregiverCompletedJobs;
  const years = booking.caregiverExperienceYears;
  const muted = { fontFamily: FONT_TH, fontSize: fs, color: '#8A8C8E', lineHeight: '20px' } as const;

  return (
    <>
      {rating != null && reviews > 0 ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {size === 'md'
            ? <span className="material-icons" style={{ fontSize: 15, color: '#F59E0B' }}>star</span>
            : <StarRating rating={rating} />}
          <span style={{ ...muted, fontWeight: 700, color: '#1A1A1A' }}>{rating.toFixed(1)}</span>
          <span style={muted}>({reviews})</span>
        </span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span className="material-icons" style={{ fontSize: iconFs + 1, color: '#C6C8CB' }}>star_border</span>
          <span style={muted}>ยังไม่มีรีวิว</span>
        </span>
      )}
      {jobs != null && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span className="material-icons" style={{ fontSize: iconFs, color: '#8A8C8E' }}>task_alt</span>
          <span style={muted}>{jobs.toLocaleString()} งาน</span>
        </span>
      )}
      {years != null && years > 0 && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span className="material-icons" style={{ fontSize: iconFs, color: '#8A8C8E' }}>workspace_premium</span>
          <span style={muted}>{years} ปี</span>
        </span>
      )}
    </>
  );
}

/** มือถือ/แท็บเล็ต = จอสัมผัสที่ไม่มี hover → กดแล้วโทรออกได้จริง */
function canPlaceCalls(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse) and (hover: none)').matches;
}

/** 081-234-5678 → 0812345678 (tel: รับเฉพาะตัวเลขกับ +) */
function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/**
 * ปุ่มโทรหาผู้ดูแล
 *   มือถือ → เปิดหน้าโทรออกทันที (tel:)
 *   คอม    → คอมโทรไม่ได้ จึงแสดงเบอร์ในป๊อปอัปแทน พร้อมปุ่มคัดลอก
 * ไม่มีเบอร์ (ผู้ดูแลไม่ได้กรอก หรือ booking ยังไม่ชำระเงิน) → ปุ่มกดไม่ได้ พร้อมบอกเหตุผล
 */
function CallCaregiverButton({
  phone,
  variant = 'icon',
}: Readonly<{ phone?: string | null; variant?: 'icon' | 'full' }>) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const disabled = !phone;
  const handleClick = () => {
    if (!phone) return;
    if (canPlaceCalls()) {
      window.location.href = toTelHref(phone);
    } else {
      setOpen((v) => !v);
    }
  };

  const buttonStyle: CSSProperties = variant === 'icon'
    ? { boxSizing: 'border-box', width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '0.8px solid #E5E7EB', borderRadius: 12 }
    : { boxSizing: 'border-box', width: '100%', display: 'inline-flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0 12px', gap: 6, height: 40, background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 12 };

  return (
    <div style={{ position: 'relative', flex: variant === 'full' ? 1 : undefined }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label="โทรหาผู้ดูแล"
        aria-expanded={open}
        title={disabled ? 'ยังไม่มีเบอร์ติดต่อของผู้ดูแล' : 'โทรหาผู้ดูแล'}
        style={{ ...buttonStyle, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
      >
        <span className="material-icons" style={{ fontSize: variant === 'icon' ? 19 : 16, color: '#009265' }}>call</span>
        {variant === 'full' && (
          <span style={{ fontFamily: FONT_TH, fontSize: 13, fontWeight: 600, color: '#1A1A1A', lineHeight: '20px' }}>โทร</span>
        )}
      </button>

      {open && phone && (
        <>
          {/* คลิกที่ไหนก็ได้นอกป๊อปอัปเพื่อปิด */}
          <div aria-hidden onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div
            role="dialog"
            aria-label="เบอร์โทรผู้ดูแล"
            style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 41, minWidth: 240, boxSizing: 'border-box', padding: 16, background: '#FFFFFF', border: '0.8px solid #E5E7EB', borderRadius: 12, boxShadow: '0px 8px 24px rgba(0,0,0,0.12)' }}
          >
            <p style={{ fontFamily: FONT_TH, fontSize: 12, color: '#8A8C8E', margin: 0, lineHeight: '18px' }}>เบอร์โทรผู้ดูแล</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: '4px 0 0', lineHeight: '28px', letterSpacing: 0.5, userSelect: 'all' }}>
              {phone}
            </p>
            <button
              type="button"
              onClick={async () => {
                const ok = await copyTextToClipboard(phone);
                setCopied(ok);
              }}
              style={{ marginTop: 12, width: '100%', height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: copied ? '#ECFDF5' : '#FFFFFF', border: `0.8px solid ${copied ? 'rgba(16,185,129,.4)' : '#E5E7EB'}`, borderRadius: 10, cursor: 'pointer' }}
            >
              <span className="material-icons" style={{ fontSize: 16, color: copied ? '#047857' : '#575859' }}>{copied ? 'check' : 'content_copy'}</span>
              <span style={{ fontFamily: FONT_TH, fontSize: 13, fontWeight: 600, color: copied ? '#047857' : '#575859' }}>
                {copied ? 'คัดลอกแล้ว' : 'คัดลอกเบอร์'}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AwaitingCheckInView({
  booking,
  durationStr,
  detailsPanel,
  showDetails,
  onToggleDetails,
  onBack,
  onReportProblem,
}: Readonly<{
  booking: ConfirmedBooking;
  durationStr: string;
  detailsPanel: ReactNode;
  showDetails: boolean;
  onToggleDetails: () => void;
  onBack: () => void;
  onReportProblem: () => void;
}>) {
  // กด "เปิด QR Code" แล้ว QR ขึ้นแทนที่เนื้อหาการ์ดเลย (ไม่ใช่ modal)
  // ไม่มีปุ่มปิด — พอผู้ดูแลสแกนสำเร็จ หน้าจะสลับเป็นสถานะกำลังให้บริการเอง
  const [showQr, setShowQr] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#F6FAF9', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 1200, padding: '24px 24px 96px', boxSizing: 'border-box' }}>

        {/* Back link */}
        <button
          type="button"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: '0 0 12px', cursor: 'pointer' }}
        >
          <span className="material-icons" style={{ fontSize: 18, color: '#8A8C8E' }}>arrow_back</span>
          <span style={{ fontFamily: FONT_TH, fontSize: 13, fontWeight: 500, color: '#8A8C8E', lineHeight: '20px' }}>
            กลับไปนัดหมายของฉัน
          </span>
        </button>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: FONT_TH, fontSize: 28, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '42px', letterSpacing: -0.7 }}>
              {booking.ref}
            </h1>
            <p style={{ fontFamily: FONT_TH, fontSize: 14, color: '#8A8C8E', margin: '2px 0 0', lineHeight: '21px' }}>
              ติดตามการทำงานของผู้ดูแล
            </p>
          </div>
          <button
            type="button"
            onClick={onReportProblem}
            style={{ boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 40, background: '#FFFFFF', border: '0.8px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}
          >
            <span className="material-icons" style={{ fontSize: 17, color: '#DC2626' }}>flag</span>
            <span style={{ fontFamily: FONT_TH, fontSize: 13, fontWeight: 600, color: '#DC2626', lineHeight: '20px' }}>แจ้งปัญหา</span>
          </button>
        </div>

        {/* Status + QR call-to-action */}
        <div style={{ marginTop: 20, boxSizing: 'border-box', background: '#FFFFFF', border: '1.6px solid rgba(0,146,101,0.25)', boxShadow: '0px 6px 24px rgba(0,146,101,0.1)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 28px', background: '#FFFBEB', borderBottom: '0.8px solid rgba(245,158,11,0.25)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 9999, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-icons" style={{ fontSize: 22, color: '#B45309' }}>schedule</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: FONT_TH, fontSize: 16, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '24px' }}>
                ผู้ดูแลยังไม่ได้เริ่มการดูแล
              </p>
              <p style={{ fontFamily: FONT_TH, fontSize: 13, color: '#8A6A2A', margin: '2px 0 0', lineHeight: '20px' }}>
                หากถึงเวลานัดแล้วผู้ดูแลยังไม่มา โปรดติดต่อผู้ดูแล หรือแจ้งปัญหาเข้ามา
              </p>
            </div>
          </div>

          {showQr ? (
            <InlineCheckInQr bookingId={booking.id} bookingStatus={booking.status} />
          ) : (
          <div style={{ boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: 28, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 420px', minWidth: 0 }}>
              <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 9999, background: '#F0FAF4', boxShadow: '0px 0px 0px 3px rgba(59,130,246,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-icons" style={{ fontSize: 30, color: '#009265' }}>qr_code_2</span>
                <span aria-hidden style={{ position: 'absolute', inset: -0.5, borderRadius: 9999, border: '2.4px solid #009265', opacity: 0.47 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 10px', height: 24, background: '#F0FAF4', borderRadius: 9999, fontFamily: FONT_TH, fontSize: 11, fontWeight: 700, color: '#047857', lineHeight: '16px' }}>
                  ขั้นตอนถัดไป
                </span>
                <h2 style={{ fontFamily: FONT_TH, fontSize: 19, fontWeight: 700, color: '#064E3B', margin: '6px 0 0', lineHeight: '26px' }}>
                  QR Code สำหรับเช็คอินเริ่มการดูแล
                </h2>
                <p style={{ fontFamily: FONT_TH, fontSize: 14, color: '#575859', margin: '8px 0 0', lineHeight: '24px' }}>
                  <strong style={{ fontWeight: 700, color: '#1A1A1A' }}>เมื่อผู้ดูแลมาถึงและพบกันแล้ว</strong>{' '}
                  ให้กดปุ่มนี้เพื่อสร้าง QR แล้วให้ผู้ดูแลสแกนด้วยแอป Payung เพื่อเริ่มจับเวลาการทำงาน
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowQr(true)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 32px', height: 56, background: '#009265', border: 'none', boxShadow: '0px 6px 18px rgba(0,146,101,0.28)', borderRadius: 12, cursor: 'pointer' }}
              >
                <span className="material-icons" style={{ fontSize: 24, color: '#FFFFFF' }}>qr_code_2</span>
                <span style={{ fontFamily: FONT_TH, fontSize: 16, fontWeight: 700, color: '#FFFFFF', lineHeight: '24px' }}>เปิด QR Code</span>
              </button>
              <p style={{ fontFamily: FONT_TH, fontSize: 12, color: '#8A8C8E', margin: '10px 0 0', lineHeight: '18px', textAlign: 'center' }}>
                กดเมื่อผู้ดูแลมาถึงแล้ว
              </p>
            </div>
          </div>
          )}
        </div>

        {/* Caregiver card */}
        <div style={{ marginTop: 16, boxSizing: 'border-box', background: '#FFFFFF', border: '0.8px solid #F3F4F6', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)', borderRadius: 16, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <CaregiverAvatar
              name={booking.caregiverName}
              avatarUrl={booking.caregiverAvatarUrl}
              size={68}
              fallbackBg="#0EA5E9"
              shadow="0px 4px 16px rgba(14,165,233,0.25)"
            />
            <div style={{ flex: '1 1 240px', minWidth: 0, paddingTop: 4 }}>
              <p style={{ fontFamily: FONT_TH, fontSize: 11, fontWeight: 600, color: '#8A8C8E', margin: 0, lineHeight: '16px', letterSpacing: 0.4 }}>ผู้ดูแล</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6 }}>
                <span style={{ fontFamily: FONT_TH, fontSize: 19, fontWeight: 700, color: '#1A1A1A', lineHeight: '28px' }}>{booking.caregiverName}</span>
                <span className="material-icons" style={{ fontSize: 18, color: '#009265' }}>verified</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 6, flexWrap: 'wrap' }}>
                <CaregiverStats booking={booking} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <CallCaregiverButton phone={booking.caregiverPhone} />
              <button
                type="button"
                onClick={onToggleDetails}
                aria-expanded={showDetails}
                style={{ boxSizing: 'border-box', height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 20px', background: '#FFFFFF', border: '0.8px solid #E5E7EB', borderRadius: 12, cursor: 'pointer' }}
              >
                <span style={{ fontFamily: FONT_TH, fontSize: 14, fontWeight: 600, color: '#1A1A1A', lineHeight: '21px' }}>รายละเอียดการจอง</span>
                <span
                  className="material-icons"
                  style={{ fontSize: 18, color: '#1A1A1A', transition: 'transform 0.15s ease', transform: showDetails ? 'rotate(180deg)' : 'none' }}
                >
                  expand_more
                </span>
              </button>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '0.8px solid #F3F4F6', display: 'flex' }}>
            <AwaitingStat label="เช็คอิน" value="ยังไม่เริ่ม" />
            <AwaitingStat label="ระยะเวลา" value={durationStr} divided />
          </div>
        </div>

        {showDetails && detailsPanel}
      </div>

    </div>
  );
}

/**
 * QR ที่วาดลงในการ์ดเลย (หลังกด "เปิด QR Code")
 *
 * ★ กติกาเดียวกับ JobQrCard: วาด QR เฉพาะตอน backend บอก isActive เท่านั้น
 *   สถานะอื่น (ยังไม่ถึงเวลา / หมดเวลา / โหลดไม่ได้) ส่งต่อให้ JobQrCard พูดแทน
 *   เพื่อไม่ต้องเขียนข้อความชุดนั้นซ้ำสองที่ — query เดียวกันจึงได้จาก cache ของ Apollo
 */
function InlineCheckInQr({ bookingId, bookingStatus }: Readonly<{ bookingId: string; bookingStatus: ConfirmedBooking['status'] }>) {
  const eligible = shouldShowJobQr(bookingStatus);
  const { qr, loading, rotate, rotating, rotateErrorMessage } = useJobQr(bookingId, { skip: !eligible });
  const [showTestTools, setShowTestTools] = useState(false);

  if (loading && !qr) {
    return (
      <div aria-busy="true" style={{ padding: '32px 28px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 324, maxWidth: '100%', aspectRatio: '1', background: '#F9FAFB', border: '0.8px dashed #E0E2E5', borderRadius: 16 }} />
      </div>
    );
  }

  if (!eligible || !qr || !qr.isActive || qr.status === 'CHECKED_OUT') {
    return (
      <div style={{ padding: 28 }}>
        <JobQrCard bookingId={bookingId} bookingStatus={bookingStatus} />
      </div>
    );
  }

  return (
    <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 28px 32px' }}>
      <h2 style={{ fontFamily: FONT_TH, fontSize: 22, fontWeight: 700, color: '#064E3B', margin: 0, lineHeight: '32px', textAlign: 'center' }}>
        ให้ผู้ดูแลสแกน QR นี้
      </h2>

      <div style={{ marginTop: 20, boxSizing: 'border-box', width: 324, maxWidth: '100%', padding: 16, background: '#FFFFFF', border: '1.6px solid rgba(0,146,101,0.25)', borderRadius: 16, lineHeight: 0 }}>
        <QRCodeSVG
          // ★ ค่าดิบล้วน ๆ ห้ามเติม prefix/URL (ดูหมายเหตุความปลอดภัยใน JobQrCard.tsx)
          value={qr.token}
          size={288}
          level="M"
          marginSize={0}
          bgColor="#FFFFFF"
          fgColor="#10302A"
          title="QR สำหรับให้ผู้ดูแลสแกนเพื่อเช็คอิน"
          style={{ width: '100%', height: 'auto' }}
        />
      </div>

      {/* ตัดบรรทัดเองตรง "…ให้ใคร" — ปล่อยให้เบราว์เซอร์ตัด คำว่า "ใคร" จะหลุดไปบรรทัดล่าง
          จอแคบกว่าข้อความ แต่ละบรรทัดยังตัดต่อเองได้ตามปกติ */}
      <div style={{ marginTop: 12, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 8 }}>
        <span className="material-icons" style={{ fontSize: 16, color: '#8A8C8E', flexShrink: 0, marginTop: 1 }}>shield</span>
        <p style={{ fontFamily: FONT_TH, fontSize: 12, color: '#8A8C8E', margin: 0, lineHeight: '18px', textAlign: 'center' }}>
          <span style={{ display: 'block' }}>
            QR นี้ใช้ได้กับงานใบนี้และผู้ดูแลที่รับงานเท่านั้น โปรดแสดงให้ผู้ดูแลสแกนจากหน้าจอ ไม่ต้องส่งต่อให้ใคร
          </span>
          <span style={{ display: 'block' }}>
            ถ้าเผลอส่งต่อหรือถ่ายรูปไปแล้ว กด "ออก QR ใหม่" ได้ทันที ใบเก่าจะใช้ไม่ได้อีก
          </span>
        </p>
      </div>

      {/* ออก QR ใหม่ — ฟีเจอร์จริง (ไม่ใช่เครื่องมือทดสอบ) สำหรับกรณีเผลอส่งต่อ/ถ่ายรูปไป
          ใบเก่าใช้ไม่ได้ทันที จึงคงไว้แม้ดีไซน์ไม่ได้วาด แต่ทำให้เบาที่สุด */}
      <button
        type="button"
        onClick={rotate}
        disabled={rotating}
        title="ออก QR ใบใหม่ — ใบเดิมจะใช้ไม่ได้ทันที"
        style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: '4px 8px', cursor: rotating ? 'progress' : 'pointer', opacity: rotating ? 0.6 : 1 }}
      >
        <span className="material-icons" style={{ fontSize: 14, color: '#8A8C8E' }}>{rotating ? 'hourglass_top' : 'autorenew'}</span>
        <span style={{ fontFamily: FONT_TH, fontSize: 12, fontWeight: 600, color: '#8A8C8E', textDecoration: 'underline' }}>
          {rotating ? 'กำลังออกใบใหม่…' : 'ออก QR ใหม่'}
        </span>
      </button>
      {rotateErrorMessage !== null && (
        <p role="alert" style={{ fontFamily: FONT_TH, fontSize: 11, color: '#B91C1C', margin: '4px 0 0', lineHeight: '16px', textAlign: 'center' }}>
          {rotateErrorMessage}
        </p>
      )}

      {/* เครื่องมือทดสอบชั่วคราว (คัดลอกโทเค็น / บันทึกรูป) — ปิดเองใน build จริง ดู lib/qrTestTools.ts */}
      {QR_TEST_TOOLS_ENABLED && (
        <div style={{ marginTop: 8, width: '100%', maxWidth: 480 }}>
          <button
            type="button"
            onClick={() => setShowTestTools((v) => !v)}
            style={{ display: 'block', margin: '0 auto', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT_TH, fontSize: 11, color: '#B0B3B8', textDecoration: 'underline' }}
          >
            {showTestTools ? 'ซ่อนเครื่องมือทดสอบ QR' : 'เครื่องมือทดสอบ QR'}
          </button>
          {showTestTools && (
            <div style={{ marginTop: 8 }}>
              <JobQrCard bookingId={bookingId} bookingStatus={bookingStatus} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CareLogEntry {
  id: string;
  time: string;
  category: string;
  text: string;
  hasPhoto: boolean;
}

function CareLogItem({ entry, isLast }: Readonly<{ entry: CareLogEntry; isLast: boolean }>) {
  const meta = CARE_LOG_CATEGORY[entry.category];
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 10, flexShrink: 0 }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: '#52B69A', marginTop: 6, flexShrink: 0 }} />
        {!isLast && <span style={{ width: 1, flex: 1, background: '#E5E7EB' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 20 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#8A8C8E', lineHeight: '16px' }}>
            {entry.time}
          </span>
          {meta && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#E6F5ED', borderRadius: 9999 }}>
              <span className="material-icons" style={{ fontSize: 11, color: '#3A9A7E' }}>{meta.icon}</span>
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, fontWeight: 700, color: '#3A9A7E', lineHeight: '16px' }}>{meta.label}</span>
            </span>
          )}
        </div>
        <div style={{ marginTop: 6, boxSizing: 'border-box', background: '#FFFFFF', border: '0.8px solid #E5E7EB', borderRadius: 12, padding: '12px 16px' }}>
          <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#1A1A1A', margin: 0, lineHeight: '21px' }}>
            {entry.text}
          </p>
          {entry.hasPhoto && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.8px solid #F0F1F3' }}>
              {/* Photo placeholder — real uploads land here once the care-log API exists. */}
              <div style={{ position: 'relative', width: 64, height: 64, border: '0.8px solid #E5E7EB', borderRadius: 10, background: 'linear-gradient(135deg, #F0F1F3 0%, #E5E7EB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons" style={{ fontSize: 22, color: '#B0B3B8' }}>image</span>
                <span style={{ position: 'absolute', right: 2, bottom: 2, width: 20, height: 20, borderRadius: 8, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons" style={{ fontSize: 13, color: '#FFFFFF' }}>zoom_in</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mock street grid — absolute insets lifted straight from the design spec.
// Purely decorative; the real screen will render Google Maps here.
const MAP_ROADS: Array<{ inset: string; bg: string }> = [
  { inset: '0 27.62% 0 27.62%', bg: '#EEF7F3' },        // map panel
  { inset: '46.15% 27.62% 43.85% 27.62%', bg: '#D8ECE4' }, // main road, horizontal
  { inset: '0 48.66% 0 48.66%', bg: '#D8ECE4' },        // main road, vertical
  { inset: '15.38% 27.62% 80.38% 27.62%', bg: '#E2F0EA' },
  { inset: '81.54% 27.62% 14.23% 27.62%', bg: '#E2F0EA' },
  { inset: '0 63.77% 0 35%', bg: '#E2F0EA' },
  { inset: '0 35.34% 0 63.43%', bg: '#E2F0EA' },
];

const MAP_BLOCKS: string[] = [
  '22.31% 52.69% 56.15% 37.91%',
  '22.31% 37.91% 56.15% 53.36%',
  '60% 52.69% 20.77% 37.91%',
  '60% 37.91% 20.77% 53.36%',
];

const MAP_PIN_RINGS: Array<{ inset: string; bg: string; opacity: number }> = [
  { inset: '41.15% 47.09% 38.85% 47.09%', bg: '#52B69A', opacity: 0.05 },
  { inset: '45.38% 48.32% 43.08% 48.32%', bg: '#52B69A', opacity: 0.22 },
  { inset: '48.08% 49.1% 45.77% 49.1%', bg: '#52B69A', opacity: 1 },
  { inset: '49.92% 49.64% 47.62% 49.64%', bg: '#FFFFFF', opacity: 1 },
];

function CheckInMapCard({ checkInTime, location }: Readonly<{ checkInTime: string; location: string }>) {
  const chipBase = {
    position: 'absolute' as const,
    background: 'rgba(255,255,255,0.95)',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.03)',
  };
  return (
    <div style={{ marginTop: 20, background: '#FFFFFF', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 18 }}>
      <div style={{ position: 'relative', height: 280, border: '0.8px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', boxSizing: 'border-box' }}>
        {MAP_ROADS.map((road) => (
          <div key={road.inset} aria-hidden style={{ position: 'absolute', inset: road.inset, background: road.bg }} />
        ))}
        {MAP_BLOCKS.map((inset) => (
          <div key={inset} aria-hidden style={{ position: 'absolute', inset, background: '#DCEFE6', opacity: 0.85 }} />
        ))}
        {MAP_PIN_RINGS.map((ring) => (
          <div key={ring.inset} aria-hidden style={{ position: 'absolute', inset: ring.inset, background: ring.bg, opacity: ring.opacity, borderRadius: '50%' }} />
        ))}

        {/* Live pill */}
        <div style={{ ...chipBase, left: 10.8, top: 10.8, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999 }}>
          <span style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
            <span aria-hidden style={{ position: 'absolute', left: -3.9, top: -3.9, width: 15.8, height: 15.8, borderRadius: '50%', background: '#10B981', opacity: 0.2 }} />
            <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#10B981' }} />
          </span>
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, fontWeight: 700, color: '#047857', lineHeight: '16px' }}>
            กำลังปฏิบัติงาน
          </span>
        </div>

        {/* Check-in time */}
        <div style={{ ...chipBase, left: 10.8, bottom: 10.8, padding: '6px 10px', borderRadius: 10 }}>
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', lineHeight: '16px' }}>
            เช็คอิน <strong style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: '#1A1A1A' }}>{checkInTime}</strong>
          </span>
        </div>

        {/* Mock disclaimer */}
        <div style={{ position: 'absolute', right: 10.8, bottom: 10.8, background: 'rgba(255,255,255,0.9)', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 10 }}>
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 10, fontWeight: 700, color: '#52B69A', lineHeight: '15px' }}>
            แผนที่จำลอง · จริงใช้ Google Maps
          </span>
        </div>
      </div>
      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', margin: 0, padding: '10px 16px', lineHeight: '16px', textAlign: 'center' }}>
        ตำแหน่งที่ผู้ดูแลเช็คอิน · {location}
      </p>
    </div>
  );
}

function StarRating({ rating }: Readonly<{ rating: number }>) {
  const stars = [0, 1, 2, 3, 4];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {stars.map((i) => (
        <span
          key={i}
          className="material-icons"
          style={{ fontSize: 13, color: '#FFA92C' }}
        >
          {i < Math.round(rating) ? 'star' : 'star_border'}
        </span>
      ))}
    </span>
  );
}

interface TimelineStep {
  key: string;
  icon: string;
  label: string;
  detail: string;
  state: 'done' | 'active' | 'pending';
}

const TIMELINE_STYLE: Record<TimelineStep['state'], { dotBg: string; iconColor: string; lineColor: string; labelColor: string }> = {
  done: { dotBg: '#10B981', iconColor: '#FFFFFF', lineColor: 'rgba(16,185,129,0.4)', labelColor: '#1A1A1A' },
  active: { dotBg: '#52B69A', iconColor: '#FFFFFF', lineColor: 'rgba(16,185,129,0.4)', labelColor: '#3A9A7E' },
  pending: { dotBg: '#E8EBEF', iconColor: '#8A8C8E', lineColor: '#E5E7EB', labelColor: '#1A1A1A' },
};

function ProgressTimeline({ steps }: Readonly<{ steps: TimelineStep[] }>) {
  return (
    <div>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const { dotBg, iconColor: dotIconColor, lineColor, labelColor } = TIMELINE_STYLE[step.state];
        return (
          <div key={step.key} style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: dotBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-icons" style={{ fontSize: 12, color: dotIconColor }}>{step.icon}</span>
              </div>
              {!isLast && <div style={{ width: 1, flex: 1, minHeight: 24, background: lineColor, marginTop: 2 }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 12, flex: 1 }}>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 700, color: labelColor, margin: 0, lineHeight: '18px' }}>
                {step.label}
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#8A8C8E', margin: '2px 0 0', lineHeight: '16px' }}>
                {step.detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BookingTrackingView({
  booking,
  onBack,
  onReportProblem,
  onWriteReview,
  onRebook,
  hasReviewed = false,
}: Readonly<{
  booking: ConfirmedBooking;
  onBack: () => void;
  onReportProblem: () => void;
  onWriteReview: () => void;
  onRebook: () => void;
  hasReviewed?: boolean;
}>) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const { toggleSaveCaregiver, isCaregiverSaved } = useBooking();

  // ── Live data ───────────────────────────────────────────────────────────────
  // proofOfWork is the source of truth for check-in/check-out. The care log and
  // task-progress parts of this screen are still mocked (see MOCK below).
  const { proof } = useJobEvents(booking.id);

  // `?mock=` stays as a dev override so the states that have no real data yet can
  // still be reviewed. Real data always wins when it exists.
  const { search } = useLocation();
  const mockParam = new URLSearchParams(search).get('mock');
  const mockState: TrackingState | null =
    mockParam === 'checked_in' || mockParam === 'working' || mockParam === 'checked_out'
      ? mockParam
      : null;

  // Memoised on the raw timestamp string: a fresh Date every render would make the
  // clock effect below re-subscribe on every render.
  const checkInTs = proof?.checkIn?.serverTs ?? null;
  const checkOutTs = proof?.checkOut?.serverTs ?? null;
  const checkedInAt = useMemo(() => (checkInTs ? new Date(checkInTs) : null), [checkInTs]);
  const checkedOutAt = useMemo(() => (checkOutTs ? new Date(checkOutTs) : null), [checkOutTs]);

  // The booking status is a second, independent signal that the job has started.
  // Trust it while proofOfWork is still in flight — otherwise an in-progress job
  // flashes "ยังไม่เช็คอิน" on first paint, which is exactly the false reassurance
  // this screen exists to prevent.
  const statusSaysStarted = ACTIVE_JOB_STATUSES.has(booking.status);
  const hasStarted = checkedInAt !== null || statusSaysStarted;

  // A real check-out timestamp is the end of the job, whatever the status says.
  const hasCheckedOut = checkedOutAt !== null || mockState === 'checked_out';

  let state: TrackingState;
  if (hasCheckedOut) {
    state = 'checked_out';
  } else if (hasStarted) {
    // 'working' vs 'checked_in' only decides whether the (still mocked) care log
    // renders, so the override keeps its say here.
    state = mockState === 'checked_in' ? 'checked_in' : 'working';
  } else {
    state = mockState ?? 'awaiting_checkin';
  }
  // The care log and task progress are history once the job ends, so they must
  // keep rendering after check-out — not fall back to the empty state.
  const isWorking = state === 'working' || state === 'checked_out';
  const isCheckedIn = state !== 'awaiting_checkin';

  // Mock clock, used only when `?mock=` is driving a state that has no real
  // check-in row behind it.
  const [mockCheckedInAt] = useState(() => new Date(Date.now() - 42 * 60_000));
  const usingMockClock = checkedInAt === null && mockState !== null;
  const effectiveCheckedInAt = checkedInAt ?? (usingMockClock ? mockCheckedInAt : null);
  const effectiveCheckedOutAt = checkedOutAt
    ?? (mockState === 'checked_out' && effectiveCheckedInAt
      ? new Date(effectiveCheckedInAt.getTime() + 31 * 60_000)
      : null);

  // Live elapsed clock, anchored to the SERVER timestamp — never the device clock.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isCheckedIn || hasCheckedOut) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [isCheckedIn, hasCheckedOut]);

  // Show a dash rather than a guess while the real timestamps are loading.
  const checkInTimeStr = effectiveCheckedInAt ? formatThaiTime(effectiveCheckedInAt) : '—';
  let elapsedStr = '—';
  if (proof?.actualMinutes != null) {
    elapsedStr = formatElapsed(proof.actualMinutes * 60_000);
  } else if (effectiveCheckedInAt) {
    // Freeze on the check-out timestamp once it exists — a still-ticking total
    // after the job ended would be a lie.
    const end = effectiveCheckedOutAt?.getTime() ?? now;
    elapsedStr = formatElapsed(end - effectiveCheckedInAt.getTime());
  }
  const checkOutTimeStr = effectiveCheckedOutAt ? formatThaiTime(effectiveCheckedOutAt) : '—';
  const pill = STATUS_PILL[state];

  // Once the job is over, the plan and the care log are a record rather than a
  // live feed — same dimming the pre-check-in state already uses.
  const dimPastCards = !isCheckedIn || hasCheckedOut;
  const checkOutNote = proof?.checkOut?.note ?? (hasCheckedOut ? MOCK.checkOutNote : null);
  const canSaveCaregiver = Boolean(booking.caregiverId);
  const isSaved = canSaveCaregiver && isCaregiverSaved(booking.caregiverId);

  // Hide the map when the booking has no coordinates — that is a gap in our data,
  // not the caregiver's fault, and an empty map would just look broken.
  const hideMap = proof ? proof.jobCoordsMissing : MOCK.jobCoordsMissing;

  const dt = booking.draft.dateTime;
  const est = booking.draft.estimatedCost;
  const svcTypes = booking.draft.serviceTypes ?? [];
  const svcTypeLabel = svcTypes.map((t) => SERVICE_TYPE_LABELS[t] ?? t).join(', ') || '—';
  const dateStr = dt?.date ? formatThaiDate(dt.date) : '—';
  const timeStr = dt?.startTime && dt?.endTime ? `${dt.startTime}–${dt.endTime} น.` : (dt?.slot ?? '—');
  const durationStr = dt?.duration ? `${dt.duration} ชม.` : '—';
  const locationStr = booking.draft.locationDetails?.at_home?.address
    || booking.draft.locationDetails?.accompany_outside?.hospitalName
    || '—';
  const total = est?.total ?? 0;

  const loc = booking.draft.locationDetails;
  const areaStr = [loc?.district, loc?.province].filter(Boolean).join(', ') || locationStr;
  // The map is still a mock drawing, so we caption it with the booking's district
  // rather than reverse-geocoding proof.checkIn.lat/lng.
  const checkInAreaStr = loc?.district || MOCK.checkInLocation;
  const serviceModeStr = booking.draft.serviceLocation?.includes('accompany_outside')
    ? 'พาไปโรงพยาบาล'
    : 'ดูแลที่บ้านผู้ป่วย';
  const noteToCaregiver = booking.draft.jobDetails?.notes;

  const pd = booking.draft.recipient?.patientDetails;
  const h = MOCK.health;
  const ageStr = `${pd?.age ?? h.age} ปี`;
  const genderStr = pd?.gender || h.gender;
  const bloodStr = pd?.bloodGroup ?? h.bloodGroup;
  const weightStr = `${pd?.weight ?? h.weight} กก.`;
  const heightStr = `${pd?.height ?? h.height} ซม.`;
  const hospitalStr = pd?.regularHospital ?? h.regularHospital;
  const medicinesStr = pd?.medicines ?? h.medicines;
  const allergiesStr = pd?.allergies ?? h.allergies;
  const careInstructionsStr = pd?.careInstructions ?? h.careInstructions;
  const tasks = booking.draft.jobDetails?.tasks ?? [];
  const tasksText = tasks.length > 0 ? tasks.map((t) => t.name).join(', ') : null;
  const confirmedAtStr = formatThaiDate(booking.confirmedAt);

  // Mock progress: in the working state the caregiver has ticked off all but
  // the last task.
  const planTasks = MOCK.tasks.map((t, i) => ({ ...t, done: isWorking && i < MOCK.tasks.length - 1 }));
  const doneCount = planTasks.filter((t) => t.done).length;
  const totalCount = planTasks.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Still mocked — there is no care_logs table yet. Timestamps are derived from
  // the real check-in time so they at least stay coherent with the rest.
  const careLogs: CareLogEntry[] = isWorking && effectiveCheckedInAt
    ? MOCK.careLogs.map((l) => ({
        ...l,
        time: formatThaiTime(new Date(effectiveCheckedInAt.getTime() + l.minutesAfterCheckIn * 60_000)),
      }))
    : [];
  const visibleLogs = showAllLogs ? careLogs : careLogs.slice(0, LOG_PREVIEW_COUNT);
  const lastTaskUpdate = careLogs.length > 1 ? careLogs[1].time : null;

  const timelineSteps: TimelineStep[] = [
    { key: 'confirmed', icon: 'event_available', label: 'ยืนยันการจอง', detail: dt?.date ? `${confirmedAtStr} · ${timeStr}` : confirmedAtStr, state: 'done' },
    {
      key: 'checkin',
      icon: 'login',
      label: 'ผู้ดูแลเช็คอิน',
      detail: isCheckedIn ? checkInTimeStr : 'ยังไม่เช็คอิน',
      state: isCheckedIn ? 'done' : 'pending',
    },
  ];
  if (hasCheckedOut) {
    // The job is over: "กำลังให้บริการ" would be a step about nothing, so the
    // closing step carries the total on its own.
    timelineSteps.push({
      key: 'checkout',
      icon: 'logout',
      label: 'ปิดงาน',
      detail: checkOutTimeStr,
      state: 'done',
    });
  } else {
    timelineSteps.push({
      key: 'in_progress',
      icon: 'hourglass_top',
      label: 'กำลังให้บริการ',
      detail: buildProgressDetail(isCheckedIn, elapsedStr),
      state: isCheckedIn ? 'active' : 'pending',
    });
  }

  // Shared by both layouts (awaiting check-in and the live/finished one).
  const detailsPanel = (
    <div style={{ marginTop: 12, background: '#FFFFFF', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 18, padding: 20 }}>
      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '26px' }}>
        รายละเอียดการจอง
      </p>

      <div style={{ ...FIELD_GRID, marginTop: 12 }}>
        <DetailField label="ประเภทบริการ" value={svcTypeLabel} />
        <DetailField label="วันที่" value={dateStr} />
        <DetailField label="เวลา" value={timeStr} />
        <DetailField label="ระยะเวลา" value={durationStr} />
        <DetailField label="สถานที่" value={areaStr} />
        <DetailField label="รูปแบบ" value={serviceModeStr} />
        <DetailField label="ค่าบริการ" value={total > 0 ? `฿${total.toLocaleString()}` : '—'} />
      </div>

      {noteToCaregiver && (
        <div style={{ marginTop: 16, boxSizing: 'border-box', background: '#FFFBEB', border: '0.8px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, fontWeight: 700, color: '#D97706', margin: 0, lineHeight: '16px' }}>
            ข้อควรระวัง / หมายเหตุถึงผู้ดูแล
          </p>
          <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#1A1A1A', margin: '2px 0 0', lineHeight: '21px' }}>
            {noteToCaregiver}
          </p>
        </div>
      )}

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '0.8px solid #F0F1F3' }}>
        <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '22px' }}>
          ข้อมูลสุขภาพของฉัน (กรอกตอนจอง)
        </p>

        <div style={{ ...FIELD_GRID, marginTop: 12 }}>
          <DetailField label="อายุ" value={ageStr} />
          <DetailField label="เพศ" value={genderStr} />
          <DetailField label="กรุ๊ปเลือด" value={bloodStr} />
          <DetailField label="น้ำหนัก" value={weightStr} />
          <DetailField label="ส่วนสูง" value={heightStr} />
          <DetailField label="โรงพยาบาลประจำ" value={hospitalStr} />
          <DetailField label="ยาที่ใช้ประจำ" value={medicinesStr} />
          <DetailField label="ประวัติแพ้ยา/อาหาร" value={allergiesStr} danger={Boolean(allergiesStr)} />
        </div>

        {careInstructionsStr && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', margin: 0, lineHeight: '16px' }}>
              ข้อมูลสุขภาพเพิ่มเติม
            </p>
            <div style={{ marginTop: 4, boxSizing: 'border-box', background: '#F9FAFB', border: '0.8px solid #E5E7EB', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#1A1A1A', margin: 0, lineHeight: '21px' }}>
                {careInstructionsStr}
              </p>
            </div>
          </div>
        )}
      </div>

      {tasksText && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '0.8px solid #F0F1F3' }}>
          <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', margin: 0, lineHeight: '16px' }}>
            รายละเอียดภารกิจ
          </p>
          <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#1A1A1A', margin: '2px 0 0', lineHeight: '21px' }}>
            {tasksText}
          </p>
        </div>
      )}
    </div>
  );

  // Hooks all run above this line, so the early return is safe.
  if (!isCheckedIn) {
    return (
      <AwaitingCheckInView
        booking={booking}
        durationStr={durationStr}
        detailsPanel={detailsPanel}
        showDetails={showDetails}
        onToggleDetails={() => setShowDetails((v) => !v)}
        onBack={onBack}
        onReportProblem={onReportProblem}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F6FAF9', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 1000, padding: '24px 20px 100px', boxSizing: 'border-box' }}>

        {/* Back link */}
        <button
          type="button"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', marginBottom: 18 }}
        >
          <span className="material-icons" style={{ fontSize: 18, color: '#575859' }}>arrow_back</span>
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#575859', lineHeight: '20px' }}>
            กลับไปนัดหมายของฉัน
          </span>
        </button>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0, lineHeight: '33px', letterSpacing: 0.55 }}>
              {booking.ref}
            </h1>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', margin: '4px 0 0', lineHeight: '20px' }}>
              ติดตามการทำงานของผู้ดูแล
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: 6 }}
          >
            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#3A9A7E', textDecoration: 'underline', lineHeight: '20px' }}>
              รายละเอียดการจอง
            </span>
            <span
              className="material-icons"
              style={{ fontSize: 16, color: '#3A9A7E', transition: 'transform 0.15s ease', transform: showDetails ? 'rotate(180deg)' : 'none' }}
            >
              expand_more
            </span>
          </button>
        </div>

        {/* Collapsible booking details panel */}
        {showDetails && detailsPanel}

        {/* QR ให้ผู้ดูแลสแกน (PYG-437) — วางไว้บนสุดของเนื้อหาเพราะเป็น "สิ่งที่ผู้ใช้
            ต้องลงมือทำ" บนหน้านี้ ส่วนการ์ดอื่นเป็นข้อมูลให้อ่าน
            ซ่อนทั้งใบเมื่อเช็คเอาท์แล้ว — การ์ด "การดูแลเสร็จสิ้น" ด้านล่างพูดแทนแล้ว
            (ตัวการ์ดเองก็กันอีกชั้น ถ้า job_session เป็น CHECKED_OUT จะไม่วาด QR อยู่ดี) */}
        {!hasCheckedOut && (
          <div style={{ marginTop: 20 }}>
            <JobQrCard bookingId={booking.id} bookingStatus={booking.status} />
          </div>
        )}

        {/* Checked in → live location map (mocked). Hidden entirely when the
            booking has no coordinates. */}
        {isCheckedIn && !hideMap && !hasCheckedOut && (
          <CheckInMapCard checkInTime={checkInTimeStr} location={checkInAreaStr} />
        )}

        {/* Job finished → the only two things left to do are review or dispute,
            both time-boxed by the payout window. */}
        {hasCheckedOut && (
          <div style={{ marginTop: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 20, background: '#FFFFFF', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-icons" style={{ fontSize: 24, color: '#059669' }}>task_alt</span>
              </div>
              <div>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '26px' }}>
                  การดูแลเสร็จสิ้น
                </p>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#575859', margin: 0, lineHeight: '18px' }}>
                  รีวิวผู้ดูแล หรือแจ้งปัญหาได้ภายใน 24 ชั่วโมง ก่อนระบบโอนเงิน
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {hasReviewed ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 20px', height: 44, background: '#ECFDF5', border: '0.8px solid rgba(16,185,129,0.3)', borderRadius: 12, boxSizing: 'border-box' }}>
                  <span className="material-icons" style={{ fontSize: 18, color: '#047857' }}>check_circle</span>
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#047857', lineHeight: '21px' }}>คุณรีวิวแล้ว</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onWriteReview}
                  style={{ boxSizing: 'border-box', display: 'inline-flex', flexDirection: 'row', alignItems: 'center', padding: '0 20px', gap: 8, height: 44, background: '#52B69A', border: 'none', boxShadow: '0px 4px 12px rgba(82,182,154,0.2)', borderRadius: 12, cursor: 'pointer' }}
                >
                  <span className="material-icons" style={{ fontSize: 18, color: '#FFFFFF' }}>star</span>
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#FFFFFF', lineHeight: '21px' }}>ให้คะแนนรีวิว</span>
                </button>
              )}
              <button
                type="button"
                onClick={onReportProblem}
                style={{ boxSizing: 'border-box', display: 'inline-flex', flexDirection: 'row', alignItems: 'center', padding: '0 20px', gap: 8, height: 44, background: '#FFFFFF', border: '0.8px solid rgba(220,38,38,0.4)', borderRadius: 12, cursor: 'pointer' }}
              >
                <span className="material-icons" style={{ fontSize: 18, color: '#DC2626' }}>flag</span>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#DC2626', lineHeight: '21px' }}>แจ้งปัญหา</span>
              </button>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>

          {/* Left column */}
          <div style={{ flex: '1 1 520px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Note the caregiver left on check-out */}
            {hasCheckedOut && checkOutNote && (
              <div style={{ boxSizing: 'border-box', background: '#FFFFFF', border: '0.8px solid rgba(245,158,11,0.3)', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 18, padding: 20 }}>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '26px' }}>
                  โน้ตจากผู้ดูแล
                </p>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#1A1A1A', margin: '8px 0 0', lineHeight: '21px' }}>
                  {checkOutNote}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#8A8C8E', margin: '8px 0 0', lineHeight: '16px' }}>
                  ปิดงานเมื่อ {checkOutTimeStr}
                </p>
              </div>
            )}

            {/* แผนงานที่ผู้ดูแลทำ */}
            <div style={{ boxSizing: 'border-box', background: '#FFFFFF', opacity: dimPastCards ? 0.7 : 1, boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 18, padding: 20 }}>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '26px' }}>
                แผนงานที่ผู้ดูแลทำ
              </p>

              <div style={{ marginTop: 12, boxSizing: 'border-box', background: '#FFFBEB', border: '0.8px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, fontWeight: 700, color: '#D97706', margin: 0, lineHeight: '16px' }}>
                  ข้อควรระวัง / หมายเหตุที่คุณแจ้งไว้
                </p>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#1A1A1A', margin: '2px 0 0', lineHeight: '21px' }}>
                  {MOCK.careNote}
                </p>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 600, color: '#575859', lineHeight: '18px' }}>
                    ทำแล้ว {doneCount} จาก {totalCount} รายการ
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: '#3A9A7E', lineHeight: '18px' }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ marginTop: 12, width: '100%', height: 6, background: '#F0F1F3', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: 6, background: '#52B69A' }} />
                </div>

                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {planTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        boxSizing: 'border-box', display: 'flex', flexDirection: 'row', alignItems: 'center',
                        padding: '12px 14px', gap: 12, borderRadius: 12,
                        background: task.done ? '#ECFDF5' : '#FFFFFF',
                        border: task.done ? '0.8px solid rgba(16,185,129,0.3)' : '0.8px solid #E5E7EB',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          boxSizing: 'border-box', width: 20, height: 20, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: task.done ? '#059669' : '#FFFFFF',
                          border: task.done ? '0.8px solid #059669' : '0.8px solid #E0E2E5',
                        }}
                      >
                        {task.done && <span className="material-icons" style={{ fontSize: 14, color: '#FFFFFF' }}>check</span>}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, lineHeight: '20px',
                          fontWeight: task.done ? 600 : 400,
                          color: task.done ? '#047857' : '#1A1A1A',
                          textDecoration: task.done ? 'line-through' : 'none',
                        }}
                      >
                        {task.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {lastTaskUpdate && (
                <p style={{ marginTop: 16, paddingTop: 12, borderTop: '0.8px solid #F0F1F3', fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#C6C8CB', textAlign: 'right', marginBottom: 0, lineHeight: '16px' }}>
                  บันทึกเมื่อ {lastTaskUpdate}
                </p>
              )}
            </div>

            {/* บันทึกการดูแล */}
            <div style={{ boxSizing: 'border-box', background: '#FFFFFF', opacity: dimPastCards ? 0.7 : 1, boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 18, padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '26px' }}>
                  {careLogs.length > 0 ? 'บันทึกจากผู้ดูแล' : 'บันทึกการดูแล'}
                </p>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#8A8C8E', lineHeight: '18px' }}>
                  {careLogs.length} รายการ
                </span>
              </div>

              {careLogs.length > 0 ? (
                <>
                  <div style={{ marginTop: 12 }}>
                    {visibleLogs.map((entry, idx) => (
                      <CareLogItem key={entry.id} entry={entry} isLast={idx === visibleLogs.length - 1} />
                    ))}
                  </div>
                  {careLogs.length > LOG_PREVIEW_COUNT && (
                    <button
                      type="button"
                      onClick={() => setShowAllLogs((v) => !v)}
                      style={{ marginTop: 16, boxSizing: 'border-box', width: '100%', display: 'inline-flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px 0', gap: 6, background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 10, cursor: 'pointer' }}
                    >
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#3A9A7E', lineHeight: '20px' }}>
                        {showAllLogs ? 'ย่อบันทึก' : `ดูบันทึกทั้งหมด (${careLogs.length})`}
                      </span>
                      <span
                        className="material-icons"
                        style={{ fontSize: 18, color: '#3A9A7E', transition: 'transform 0.15s ease', transform: showAllLogs ? 'rotate(180deg)' : 'none' }}
                      >
                        expand_more
                      </span>
                    </button>
                  )}
                </>
              ) : (
                <div style={{ marginTop: 12, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', background: '#F9FAFB', border: '0.8px dashed #E0E2E5', borderRadius: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: '#F0F1F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ fontSize: 22, color: '#8A8C8E' }}>event_note</span>
                  </div>
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#575859', margin: '10px 0 0', lineHeight: '20px', textAlign: 'center' }}>
                    ยังไม่มีบันทึกการดูแล
                  </p>
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', margin: '4px 0 0', lineHeight: '20px', textAlign: 'center' }}>
                    บันทึกที่ผู้ดูแลส่งจะแสดงให้คุณเห็นทันที
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right column — caregiver sidebar */}
          <div style={{ flex: '0 1 374px', minWidth: 300, position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ boxSizing: 'border-box', background: '#FFFFFF', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 18 }}>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <CaregiverAvatar name={booking.caregiverName} avatarUrl={booking.caregiverAvatarUrl} online={isCheckedIn && !hasCheckedOut} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* After check-out the green banner above already states the
                        outcome — a second live-looking pill here would fight it. */}
                    {!hasCheckedOut && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', height: 24.5, background: pill.bg, borderRadius: 9999 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: pill.dot, flexShrink: 0 }} />
                        <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, fontWeight: 700, color: pill.text, lineHeight: '16px' }}>{pill.label}</span>
                      </span>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: hasCheckedOut ? 0 : 4 }}>
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', lineHeight: '26px' }}>
                        {booking.caregiverName}
                      </span>
                      <span className="material-icons" style={{ fontSize: 17, color: '#3A9A7E' }}>verified</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <CaregiverStats booking={booking} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                {hasCheckedOut && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.8px solid #F0F1F3', display: 'flex', flexDirection: 'row' }}>
                    <SummaryStat label="เช็คอิน" value={checkInTimeStr} />
                    <SummaryStat label="เช็คเอาท์" value={checkOutTimeStr} divided />
                    <SummaryStat label="ระยะเวลา" value={elapsedStr} divided />
                  </div>
                )}
                {!hasCheckedOut && isCheckedIn && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.8px solid #F0F1F3', display: 'flex', flexDirection: 'row', gap: 12 }}>
                    <StatRow icon="login" iconColor="#1D4ED8" iconBg="#EFF6FF" label="เริ่มงาน" value={checkInTimeStr} />
                    <StatRow icon="hourglass_top" iconColor="#3A9A7E" iconBg="#E6F5ED" label="ระยะเวลา" value={elapsedStr} />
                  </div>
                )}

                {/* Actions */}
                {hasCheckedOut ? (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={onRebook}
                      style={{ flex: 1, boxSizing: 'border-box', display: 'inline-flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0 12px', gap: 6, height: 40, background: '#52B69A', border: 'none', boxShadow: '0px 4px 12px rgba(82,182,154,0.2)', borderRadius: 12, cursor: 'pointer' }}
                    >
                      <span className="material-icons" style={{ fontSize: 16, color: '#FFFFFF' }}>event_repeat</span>
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 700, color: '#FFFFFF', lineHeight: '20px' }}>จองอีกครั้ง</span>
                    </button>
                    {canSaveCaregiver && (
                      <button
                        type="button"
                        onClick={() => toggleSaveCaregiver({
                          id: booking.caregiverId,
                          fullName: booking.caregiverName,
                          avatarUrl: booking.caregiverAvatarUrl,
                          hourlyRate: booking.caregiverHourlyRate,
                          skills: booking.draft.serviceTypes ?? [],
                          province: booking.caregiverProvince ?? '',
                        })}
                        aria-pressed={isSaved}
                        title={isSaved ? 'นำผู้ดูแลออกจากรายการบันทึก' : 'บันทึกผู้ดูแล'}
                        style={{ boxSizing: 'border-box', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: 40, height: 40, flexShrink: 0, background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 12, cursor: 'pointer' }}
                      >
                        <span className="material-icons" style={{ fontSize: 18, color: isSaved ? '#F43F5E' : '#575859' }}>
                          {isSaved ? 'favorite' : 'favorite_border'}
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'row', gap: 10 }}>
                    <CallCaregiverButton phone={booking.caregiverPhone} variant="full" />
                  </div>
                )}
              </div>

              {/* Progress timeline */}
              <div style={{ boxSizing: 'border-box', padding: '16px 20px', background: '#F9FAFB', borderTop: '0.8px solid #F0F1F3', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 10, fontWeight: 700, color: '#8A8C8E', margin: '0 0 12px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  ความคืบหน้า
                </p>
                <ProgressTimeline steps={timelineSteps} />
              </div>
            </div>

            {/* Once the amber banner is gone, "แจ้งปัญหา" lives here — it must stay
                as prominent as the rest of the sidebar. */}
            {isCheckedIn && !hasCheckedOut && (
              <button
                type="button"
                onClick={onReportProblem}
                style={{ boxSizing: 'border-box', width: '100%', display: 'inline-flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0 20px', gap: 8, height: 44, background: '#FFFFFF', border: '0.8px solid rgba(220,38,38,0.4)', borderRadius: 12, cursor: 'pointer' }}
              >
                <span className="material-icons" style={{ fontSize: 18, color: '#DC2626' }}>flag</span>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#DC2626', lineHeight: '21px' }}>แจ้งปัญหา</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingTrackingView;
