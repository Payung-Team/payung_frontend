import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ConfirmedBooking } from '../../context/BookingContext';
import { useJobEvents } from '../../hooks/useJobEvents';
import { ACTIVE_JOB_STATUSES } from '../../utils/bookingStatus';

// ── Tracking Service view (PYG-361) ─────────────────────────────────────────────
// Shown to patients once a confirmed booking's service date has arrived. Three
// states are implemented so far — caregiver hasn't checked in, just checked in,
// and actively working (ticking tasks off and posting care-log entries). All of
// it is mocked: no backend field exists yet for check-in / task-progress /
// care-log. Wire this up to the Supabase job_events subscription once the API
// adds those fields.

export type TrackingState = 'awaiting_checkin' | 'checked_in' | 'working';

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
//   • rating / reviewCount / jobsCount / yearsExperience — not on CaregiverBriefDto.
//   • health.*   — real values from booking.draft win; these are only fallbacks.
// The 24h auto-release countdown is deliberately absent: there is no release_at
// column and no release cron yet (PYG-366 / PYG-367), so any number would be a guess.
const MOCK = {
  rating: 4.8,
  reviewCount: 92,
  jobsCount: 142,
  yearsExperience: 8,
  careNote: 'ต้องวัดน้ำตาลก่อนเริ่มกายภาพทุกครั้ง',
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

function buildProgressDetail(isCheckedIn: boolean, checkedOutAt: Date | null, elapsedStr: string): string {
  if (!isCheckedIn) return '—';
  return checkedOutAt ? `รวม ${elapsedStr}` : `มาแล้ว ${elapsedStr}`;
}

function getProgressState(isCheckedIn: boolean, checkedOutAt: Date | null): TimelineStep['state'] {
  if (!isCheckedIn) return 'pending';
  return checkedOutAt ? 'done' : 'active';
}

const STATUS_PILL: Record<TrackingState, { label: string; bg: string; dot: string; text: string }> = {
  awaiting_checkin: { label: 'รอผู้ดูแลเช็คอิน', bg: '#F0F1F3', dot: '#575859', text: '#575859' },
  checked_in: { label: 'ผู้ดูแลกำลังทำงาน', bg: '#EFF6FF', dot: '#1D4ED8', text: '#1D4ED8' },
  working: { label: 'ผู้ดูแลกำลังทำงาน', bg: '#EFF6FF', dot: '#1D4ED8', text: '#1D4ED8' },
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

function CaregiverAvatar({ name, avatarUrl, size = 56, online = false }: Readonly<{ name: string; avatarUrl?: string | null; size?: number; online?: boolean }>) {
  const initial = name?.charAt(0) ?? '?';
  const frameStyle = {
    width: size, height: size, borderRadius: size / 2,
    border: '2.4px solid #FFFFFF', boxShadow: '0px 4px 16px rgba(82,182,154,0.2)',
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
            background: 'linear-gradient(135deg, #F0A500 0%, #FFC570 100%)',
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
  onMessage,
}: Readonly<{
  booking: ConfirmedBooking;
  onBack: () => void;
  onReportProblem: () => void;
  onMessage: () => void;
}>) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // ── Live data ───────────────────────────────────────────────────────────────
  // proofOfWork is the source of truth for check-in/check-out. The care log and
  // task-progress parts of this screen are still mocked (see MOCK below).
  const { proof } = useJobEvents(booking.id);

  // `?mock=` stays as a dev override so the states that have no real data yet can
  // still be reviewed. Real data always wins when it exists.
  const { search } = useLocation();
  const mockParam = new URLSearchParams(search).get('mock');
  const mockState: TrackingState | null =
    mockParam === 'checked_in' || mockParam === 'working' ? mockParam : null;

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

  let state: TrackingState;
  if (hasStarted) {
    // 'working' vs 'checked_in' only decides whether the (still mocked) care log
    // renders, so the override keeps its say here.
    state = mockState === 'checked_in' ? 'checked_in' : 'working';
  } else {
    state = mockState ?? 'awaiting_checkin';
  }
  const isWorking = state === 'working';
  const isCheckedIn = state !== 'awaiting_checkin';

  // Mock clock, used only when `?mock=` is driving a state that has no real
  // check-in row behind it.
  const [mockCheckedInAt] = useState(() => new Date(Date.now() - 42 * 60_000));
  const usingMockClock = checkedInAt === null && mockState !== null;
  const effectiveCheckedInAt = checkedInAt ?? (usingMockClock ? mockCheckedInAt : null);

  // Live elapsed clock, anchored to the SERVER timestamp — never the device clock.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isCheckedIn || checkedOutAt) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [isCheckedIn, checkedOutAt]);

  // Show a dash rather than a guess while the real timestamps are loading.
  const checkInTimeStr = effectiveCheckedInAt ? formatThaiTime(effectiveCheckedInAt) : '—';
  let elapsedStr = '—';
  if (proof?.actualMinutes != null) {
    elapsedStr = formatElapsed(proof.actualMinutes * 60_000);
  } else if (effectiveCheckedInAt) {
    elapsedStr = formatElapsed(now - effectiveCheckedInAt.getTime());
  }
  const pill = STATUS_PILL[state];

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
    {
      key: 'in_progress',
      icon: 'hourglass_top',
      label: checkedOutAt ? 'ให้บริการเสร็จสิ้น' : 'กำลังให้บริการ',
      detail: buildProgressDetail(isCheckedIn, checkedOutAt, elapsedStr),
      state: getProgressState(isCheckedIn, checkedOutAt),
    },
  ];
  if (checkedOutAt) {
    timelineSteps.push({
      key: 'checkout',
      icon: 'logout',
      label: 'ผู้ดูแลเช็คเอาท์',
      detail: formatThaiTime(checkedOutAt),
      state: 'done',
    });
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
        {showDetails && (
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
        )}

        {/* Checked in → live location map (mocked). Hidden entirely when the
            booking has no coordinates. */}
        {isCheckedIn && !hideMap && (
          <CheckInMapCard checkInTime={checkInTimeStr} location={checkInAreaStr} />
        )}

        {/* Not-started alert banner */}
        {!isCheckedIn && (
          <div style={{ marginTop: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 20, background: '#FFFFFF', border: '0.8px solid rgba(245,158,11,0.4)', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-icons" style={{ fontSize: 24, color: '#D97706' }}>schedule</span>
              </div>
              <div>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '26px' }}>
                  ผู้ดูแลยังไม่ได้เริ่มการดูแล
                </p>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#575859', margin: 0, lineHeight: '18px' }}>
                  หากถึงเวลานัดแล้วผู้ดูแลยังไม่เช็คอิน โปรดติดต่อผู้ดูแล หรือแจ้งปัญหาเข้ามา
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onReportProblem}
              style={{ boxSizing: 'border-box', display: 'inline-flex', flexDirection: 'row', alignItems: 'center', padding: '0 20px', gap: 8, height: 44, background: '#FFFFFF', border: '0.8px solid rgba(220,38,38,0.4)', borderRadius: 12, cursor: 'pointer', flexShrink: 0 }}
            >
              <span className="material-icons" style={{ fontSize: 18, color: '#DC2626' }}>flag</span>
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#DC2626', lineHeight: '21px' }}>แจ้งปัญหา</span>
            </button>
          </div>
        )}

        {/* Two-column layout */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>

          {/* Left column */}
          <div style={{ flex: '1 1 520px', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* แผนงานที่ผู้ดูแลทำ */}
            <div style={{ boxSizing: 'border-box', background: '#FFFFFF', opacity: isCheckedIn ? 1 : 0.7, boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 18, padding: 20 }}>
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
            <div style={{ boxSizing: 'border-box', background: '#FFFFFF', opacity: isCheckedIn ? 1 : 0.7, boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 18, padding: 20 }}>
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
                  <CaregiverAvatar name={booking.caregiverName} avatarUrl={booking.caregiverAvatarUrl} online={isCheckedIn} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', height: 24.5, background: pill.bg, borderRadius: 9999 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: pill.dot, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, fontWeight: 700, color: pill.text, lineHeight: '16px' }}>{pill.label}</span>
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', lineHeight: '26px' }}>
                        {booking.caregiverName}
                      </span>
                      <span className="material-icons" style={{ fontSize: 17, color: '#3A9A7E' }}>verified</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <StarRating rating={MOCK.rating} />
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: '#1A1A1A' }}>{MOCK.rating}</span>
                        <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E' }}>({MOCK.reviewCount})</span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-icons" style={{ fontSize: 12, color: '#8A8C8E' }}>task_alt</span>
                        <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E' }}>{MOCK.jobsCount} งาน</span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-icons" style={{ fontSize: 12, color: '#8A8C8E' }}>workspace_premium</span>
                        <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E' }}>{MOCK.yearsExperience} ปี</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                {isCheckedIn ? (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.8px solid #F0F1F3', display: 'flex', flexDirection: 'row', gap: 12 }}>
                    <StatRow icon="login" iconColor="#1D4ED8" iconBg="#EFF6FF" label="เริ่มงาน" value={checkInTimeStr} />
                    <StatRow
                      icon="hourglass_top"
                      iconColor="#3A9A7E"
                      iconBg="#E6F5ED"
                      label={checkedOutAt ? 'รวมเวลา' : 'ระยะเวลา'}
                      value={elapsedStr}
                    />
                  </div>
                ) : (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '0.8px solid #F0F1F3', display: 'flex', flexDirection: 'row' }}>
                    <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
                      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', margin: 0, lineHeight: '16px' }}>เช็คอิน</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '2px 0 0', lineHeight: '20px' }}>ยังไม่เริ่ม</p>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', padding: '0 8px', borderLeft: '0.8px solid #F0F1F3' }}>
                      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', margin: 0, lineHeight: '16px' }}>ระยะเวลา</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '2px 0 0', lineHeight: '20px' }}>{durationStr}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'row', gap: 10 }}>
                  <button
                    type="button"
                    onClick={onMessage}
                    style={{ flex: 1, boxSizing: 'border-box', display: 'inline-flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0 12px', gap: 6, height: 40, background: '#52B69A', border: 'none', boxShadow: '0px 4px 12px rgba(82,182,154,0.2)', borderRadius: 12, cursor: 'pointer' }}
                  >
                    <span className="material-icons" style={{ fontSize: 16, color: '#FFFFFF' }}>chat_bubble</span>
                    <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 700, color: '#FFFFFF', lineHeight: '20px' }}>ส่งข้อความ</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isCheckedIn}
                    title={isCheckedIn ? undefined : 'ยังไม่รองรับการโทรในขณะนี้'}
                    style={{ flex: 1, boxSizing: 'border-box', display: 'inline-flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0 12px', gap: 6, height: 40, background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 12, cursor: isCheckedIn ? 'pointer' : 'not-allowed', opacity: isCheckedIn ? 1 : 0.6 }}
                  >
                    <span className="material-icons" style={{ fontSize: 16, color: '#3B82F6' }}>call</span>
                    <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#1A1A1A', lineHeight: '20px' }}>โทร</span>
                  </button>
                </div>
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
            {isCheckedIn && (
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
