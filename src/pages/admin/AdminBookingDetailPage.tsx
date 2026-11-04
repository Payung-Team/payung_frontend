import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { ADMIN_BOOKING_DETAIL } from '../../graphql/adminBookings';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import { userFacingErrorMessage } from '../../lib/apolloErrors';
import { serviceTypeLabel } from '../../lib/serviceTypeLabels';
import { BookingStatusBadge, PaymentStatusText } from '../../components/features/payment/BookingStatusBadges';
import BookingMatchingCard from '../../components/features/payment/BookingMatchingCard';
import {
  bookingStatusLabel,
  formatTHB,
  formatThaiDate,
  formatThaiDateTime,
} from '../../components/features/payment/bookingMeta';

interface StatusChange {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedByName: string | null;
  createdAt: string;
}

interface BookingDetail {
  id: string;
  status: string;
  bookingDate: string;
  startTime: string;
  durationHours: number;
  timeSlot: string;
  serviceType: string;
  serviceLocations: string[];
  locationAddress: string;
  estimatedCost: number | null;
  platformFee: number | null;
  disputeStatus: string;
  disputeReason: string | null;
  rejectionReason: string | null;
  tasks: string[];
  notes: string | null;
  createdAt: string;
  acceptedAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  patientEmail: string | null;
  careRecipientName: string | null;
  bookedByName: string | null;
  dayOfContactName: string | null;
  dayOfContactPhone: string | null;
  dayOfContactRelationship: string | null;
  caregiverId: string | null;
  caregiverName: string | null;
  caregiverNumber: string | null;
  caregiverPhone: string | null;
  /** users.id — ใช้กับ /admin/users/:id */
  caregiverUserId: string | null;
  requiredLevel: string | null;
  levelFromAdl: string | null;
  levelFromFlags: string | null;
  levelFromServices: string | null;
  levelCalculatedAt: string | null;
  requiredSkills: { code: string; nameTh: string; sources: string[] }[];
  payment: {
    id: string;
    amount: number;
    capturedAmount: number | null;
    refundedAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    omiseChargeId: string | null;
    failureMessage: string | null;
    createdAt: string;
  } | null;
  statusHistory: StatusChange[];
}

// ── labels ───────────────────────────────────────────────────────────────
const PAYMENT_METHOD_LABEL: Record<string, string> = { credit_card: 'บัตรเครดิต/เดบิต', promptpay: 'PromptPay' };
const LOCATION_LABEL: Record<string, string> = { at_home: 'ที่บ้าน', at_hospital: 'โรงพยาบาล', hospital: 'โรงพยาบาล' };
const TIME_SLOT_LABEL: Record<string, string> = { morning: 'ช่วงเช้า', afternoon: 'ช่วงบ่าย', evening: 'ช่วงเย็น', night: 'ช่วงกลางคืน' };

/** ลำดับปกติของ booking — สถานะปลายทางที่ "หลุดเส้นทาง" (ยกเลิก/ปฏิเสธ/หมดเวลา) แสดงเป็นแถบแดงแทน */
const FLOW = [
  { key: 'created', label: 'สร้างการจอง', icon: 'edit_calendar' },
  { key: 'accepted', label: 'ผู้ดูแลตอบรับ', icon: 'how_to_reg' },
  { key: 'confirmed', label: 'ยืนยัน/ชำระเงิน', icon: 'verified' },
  { key: 'in_progress', label: 'กำลังดูแล', icon: 'volunteer_activism' },
  { key: 'completed', label: 'เสร็จสิ้น', icon: 'task_alt' },
] as const;
const STATUS_STEP: Record<string, number> = { unmatched: 0, pending: 0, accepted: 1, confirmed: 2, in_progress: 3, completed: 4 };
const TERMINAL: Record<string, { label: string; icon: string }> = {
  cancelled: { label: 'การจองนี้ถูกยกเลิก', icon: 'cancel' },
  rejected: { label: 'ผู้ดูแลปฏิเสธการจองนี้', icon: 'block' },
  expired: { label: 'การจองหมดเวลา (ไม่มีผู้รับงาน / ไม่ได้ชำระเงิน)', icon: 'timer_off' },
};

/** เส้นทางเงิน — held = กันวงเงินบัตร, captured = ตัดเงินจริง, transferred = โอนให้ผู้ดูแล */
const PAY_FLOW = [
  { key: 'pending', label: 'รอชำระ' },
  { key: 'held', label: 'กันวงเงิน' },
  { key: 'captured', label: 'ตัดเงินแล้ว' },
  { key: 'transferred', label: 'โอนผู้ดูแล' },
];
const PAY_STEP: Record<string, number> = { pending: 0, held: 1, captured: 2, transferred: 3, refunded: 2, partially_refunded: 2 };
const PAY_BAD = new Set(['failed', 'voided', 'expired']);

const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || '?';

// ── building blocks ──────────────────────────────────────────────────────
function Card({ title, icon, action, children, className = '' }: { title: string; icon: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#059669]">
            <Icon name={icon} variant="outlined" size="small" color="currentColor" />
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ContactRow({ icon, children }: { icon: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 text-sm text-gray-700">
      <span className="mt-0.5 shrink-0 text-gray-400">
        <Icon name={icon} variant="outlined" size="small" color="currentColor" />
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function PersonCard({
  role, tone, name, sub, href, rows, empty,
}: {
  role: string;
  tone: 'blue' | 'emerald';
  name: string | null;
  sub?: ReactNode;
  href?: string;
  rows: ReactNode;
  empty?: string;
}) {
  const toneCls = tone === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700';
  return (
    <section className="flex-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{role}</p>
        {name && href && (
          <Link
            to={href}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 transition-colors hover:border-[#059669] hover:bg-emerald-50 hover:text-[#047857]"
          >
            <Icon name="account_circle" variant="outlined" size="small" color="currentColor" />
            ดูโปรไฟล์
            <Icon name="chevron_right" size="small" color="currentColor" />
          </Link>
        )}
      </div>
      {name ? (
        <>
          <div className="flex items-center gap-3">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold ${toneCls}`}>
              {initials(name)}
            </span>
            <div className="min-w-0">
              {href ? (
                <Link to={href} className="block truncate text-base font-bold text-gray-900 hover:text-[#2563EB] hover:underline">
                  {name}
                </Link>
              ) : (
                <p className="truncate text-base font-bold text-gray-900">{name}</p>
              )}
              {sub && <div className="truncate text-xs text-gray-500">{sub}</div>}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">{rows}</div>
        </>
      ) : (
        <div className="flex items-center gap-3 text-gray-400">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-200">
            <Icon name="person_search" variant="outlined" color="currentColor" />
          </span>
          <p className="text-sm">{empty}</p>
        </div>
      )}
    </section>
  );
}

function InfoTile({ icon, label, value, sub }: { icon: string; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#059669] shadow-sm">
        <Icon name={icon} variant="outlined" size="small" color="currentColor" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="truncate text-sm font-semibold text-gray-900">{value}</p>
        {sub && <p className="truncate text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

/** แถบความคืบหน้าแนวนอน (จอเล็กเรียงแนวตั้ง) */
function Stepper({ steps, current, dates }: { steps: readonly { key: string; label: string; icon: string }[]; current: number; dates: (string | null)[] }) {
  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:gap-0">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="relative flex items-center gap-3 sm:flex-1 sm:flex-col sm:text-center">
            {i > 0 && (
              <span
                className={`absolute hidden h-0.5 sm:block ${i <= current ? 'bg-[#059669]' : 'bg-gray-200'}`}
                style={{ left: 'calc(-50% + 22px)', right: 'calc(50% + 22px)', top: 20 }}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                done ? 'bg-[#059669] text-white' : active ? 'bg-emerald-50 text-[#059669] ring-2 ring-[#059669]' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Icon name={done ? 'check' : s.icon} variant="outlined" size="small" color="currentColor" />
            </span>
            <div className="sm:mt-2">
              <p className={`text-xs font-semibold ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</p>
              <p className="text-[11px] text-gray-400">{dates[i] ? formatThaiDateTime(dates[i]!) : active ? 'ขั้นปัจจุบัน' : ''}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── page ─────────────────────────────────────────────────────────────────
export default function AdminBookingDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data, loading, error } = useQuery<{ adminBookingDetail: BookingDetail }>(ADMIN_BOOKING_DETAIL, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const b = data?.adminBookingDetail;

  const back = (
    <Link to="/admin/payments" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900">
      <Icon name="arrow_back" size="small" color="currentColor" />
      กลับไปหน้ารายการจอง
    </Link>
  );
  const shell = (children: ReactNode) => (
    <div className="bg-[#F9FAFB] text-gray-900">
      <div className="mx-auto flex max-w-328 flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        {back}
        {children}
      </div>
    </div>
  );

  if (loading && !b) {
    return shell(
      <>
        <Skeleton height={190} borderRadius={16} />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton height={200} borderRadius={16} />
          <Skeleton height={200} borderRadius={16} />
        </div>
        <Skeleton height={260} borderRadius={16} />
      </>,
    );
  }

  if (error || !b) {
    return shell(
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <Icon name="error_outline" variant="outlined" color="currentColor" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-gray-900">โหลดรายละเอียดการจองไม่สำเร็จ</h2>
        <p className="mt-1 max-w-md text-sm text-gray-500">
          {error ? userFacingErrorMessage(error, 'กรุณาลองใหม่อีกครั้ง') : 'ไม่พบรายการจอง'}
        </p>
      </div>,
    );
  }

  const p = b.payment;
  const terminal = TERMINAL[b.status];
  const historyAt = (s: string) => b.statusHistory.find((h) => h.toStatus === s)?.createdAt ?? null;
  const stepDates = [b.createdAt, b.acceptedAt ?? historyAt('accepted'), b.confirmedAt ?? historyAt('confirmed'), historyAt('in_progress'), b.completedAt ?? historyAt('completed')];
  const step = STATUS_STEP[b.status] ?? 0;

  // ไม่มีแถวใน booking_status_history (booking เก่า) → สร้าง timeline จาก timestamp บน booking แทน
  const timeline =
    b.statusHistory.length > 0
      ? b.statusHistory.map((h) => ({
          id: h.id,
          title: `${h.fromStatus ? `${bookingStatusLabel(h.fromStatus)} → ` : ''}${bookingStatusLabel(h.toStatus)}`,
          at: h.createdAt,
          by: h.changedByName ?? 'ระบบ',
          reason: h.reason,
        }))
      : [
          { id: 'c', title: 'สร้างการจอง', at: b.createdAt, by: b.bookedByName ?? b.patientName, reason: null },
          b.acceptedAt && { id: 'a', title: 'ผู้ดูแลตอบรับ', at: b.acceptedAt, by: b.caregiverName ?? '-', reason: null },
          p && { id: 'p', title: `ชำระเงิน (${PAYMENT_METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod})`, at: p.createdAt, by: b.patientName, reason: null },
          b.confirmedAt && { id: 'f', title: 'ยืนยันการจอง', at: b.confirmedAt, by: 'ระบบ', reason: null },
          b.completedAt && { id: 'd', title: 'เสร็จสิ้นงาน', at: b.completedAt, by: b.caregiverName ?? '-', reason: null },
        ]
          .filter((x): x is { id: string; title: string; at: string; by: string; reason: null } => !!x)
          .sort((x, y) => x.at.localeCompare(y.at));

  // สัดส่วนเงิน: ค่าบริการ (ผู้ดูแล) + ค่าธรรมเนียมแพลตฟอร์ม
  const service = b.estimatedCost ?? 0;
  const fee = b.platformFee ?? 0;
  const total = p?.amount ?? service + fee;
  const servicePct = service + fee > 0 ? (service / (service + fee)) * 100 : 100;
  const payStep = p ? PAY_STEP[p.paymentStatus] ?? 0 : -1;
  const payBad = p ? PAY_BAD.has(p.paymentStatus) : false;

  return shell(
    <>
      {/* ── Hero: รหัส + ความคืบหน้า ── */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-emerald-50 to-white p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900" title={b.id}>
                Booking #{b.id.slice(0, 8).toUpperCase()}
              </h1>
              <BookingStatusBadge status={b.status} />
              {b.disputeStatus !== 'none' && (
                <Link to="/admin/disputes" className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 hover:underline">
                  <Icon name="gavel" size="small" color="currentColor" /> Dispute
                </Link>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {serviceTypeLabel(b.serviceType)} · {formatThaiDate(b.bookingDate)} · จองเมื่อ {formatThaiDateTime(b.createdAt)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-gray-500">ยอดรวม</p>
            <p className="text-2xl font-bold text-gray-900">{formatTHB(total)}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 p-5">
          {terminal ? (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-700">
              <Icon name={terminal.icon} variant="outlined" color="currentColor" />
              <div>
                <p className="text-sm font-semibold">{terminal.label}</p>
                {b.rejectionReason && <p className="mt-0.5 text-xs">เหตุผล: {b.rejectionReason}</p>}
              </div>
            </div>
          ) : (
            <Stepper steps={FLOW} current={b.status === 'completed' ? FLOW.length : step} dates={stepDates} />
          )}
        </div>
      </section>

      {/* ── คนสองฝั่ง ── */}
      <div className="flex flex-col items-stretch gap-3 lg:flex-row">
        <PersonCard
          role="ผู้จอง"
          tone="blue"
          name={b.patientName}
          href={`/admin/users/patient/${b.patientId}`}
          sub={b.bookedByName ? `จองแทนโดย ${b.bookedByName}` : b.careRecipientName && b.careRecipientName !== b.patientName ? `ดูแล: ${b.careRecipientName}` : 'ผู้จองเอง'}
          rows={
            <>
              <ContactRow icon="call">{b.patientPhone}</ContactRow>
              <ContactRow icon="mail">{b.patientEmail}</ContactRow>
              <ContactRow icon="elderly">{b.careRecipientName && `ผู้รับการดูแล: ${b.careRecipientName}`}</ContactRow>
              <ContactRow icon="contact_phone">
                {b.dayOfContactName &&
                  `ผู้ติดต่อวันงาน: ${b.dayOfContactName}${b.dayOfContactRelationship ? ` (${b.dayOfContactRelationship})` : ''}${b.dayOfContactPhone ? ` · ${b.dayOfContactPhone}` : ''}`}
              </ContactRow>
            </>
          }
        />

        <span className="mx-auto flex h-10 w-10 shrink-0 rotate-90 self-center items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm lg:rotate-0" aria-hidden="true">
          <Icon name="arrow_forward" size="small" color="currentColor" />
        </span>

        <PersonCard
          role="ผู้ดูแลที่ถูกจอง"
          tone="emerald"
          name={b.caregiverName}
          sub={b.caregiverNumber}
          href={b.caregiverUserId ? `/admin/users/${b.caregiverUserId}` : undefined}
          empty="ยังไม่มีผู้ดูแลรับงานนี้"
          rows={
            <>
              <ContactRow icon="call">{b.caregiverPhone}</ContactRow>
              <ContactRow icon="schedule">{b.acceptedAt && `ตอบรับเมื่อ ${formatThaiDateTime(b.acceptedAt)}`}</ContactRow>
            </>
          }
        />
      </div>

      {/* ── การจับคู่: ระดับ/ทักษะที่ต้องการ + ผู้ดูแลที่เข้าเกณฑ์ (โหลดเมื่อกด) ── */}
      <BookingMatchingCard
        bookingId={b.id}
        requiredLevel={b.requiredLevel}
        levelFromAdl={b.levelFromAdl}
        levelFromFlags={b.levelFromFlags}
        levelFromServices={b.levelFromServices}
        levelCalculatedAt={b.levelCalculatedAt}
        requiredSkills={b.requiredSkills}
        locationAddress={b.locationAddress}
      />

      {/* ── รายละเอียดงาน ── */}
      <Card title="รายละเอียดงาน" icon="event_note">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile icon="calendar_month" label="วันที่ดูแล" value={formatThaiDate(b.bookingDate)} />
          <InfoTile icon="schedule" label="เวลา" value={`${b.startTime} น. · ${b.durationHours} ชม.`} sub={TIME_SLOT_LABEL[b.timeSlot] ?? b.timeSlot} />
          <InfoTile icon="medical_services" label="ประเภทบริการ" value={serviceTypeLabel(b.serviceType)} />
          <InfoTile icon="home" label="สถานที่" value={b.serviceLocations.map((l) => LOCATION_LABEL[l] ?? l).join(', ') || '-'} />
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-gray-100 p-3 text-sm text-gray-700">
          <span className="text-gray-400">
            <Icon name="location_on" variant="outlined" size="small" color="currentColor" />
          </span>
          {b.locationAddress}
        </div>

        {b.tasks.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold text-gray-500">งานที่ต้องทำ ({b.tasks.length})</p>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {b.tasks.map((t, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
                  <span className="mt-0.5 text-[#059669]">
                    <Icon name="check_circle" variant="outlined" size="small" color="currentColor" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(b.notes || b.disputeReason) && (
          <div className="mt-5 flex flex-col gap-2">
            {b.notes && (
              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <span className="font-semibold">หมายเหตุ: </span>
                {b.notes}
              </div>
            )}
            {b.disputeReason && (
              <div className="rounded-xl bg-orange-50 p-3 text-sm text-orange-900">
                <span className="font-semibold">เหตุผลการแจ้ง Dispute: </span>
                {b.disputeReason}
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── การชำระเงิน ── */}
        <Card
          title="การชำระเงิน"
          icon="payments"
          action={p && <span className="text-xs font-semibold"><PaymentStatusText status={p.paymentStatus} /></span>}
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500">ยอดชำระทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900">{formatTHB(total)}</p>
            </div>
            {p && <p className="text-xs text-gray-500">{PAYMENT_METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}</p>}
          </div>

          {/* แถบสัดส่วน */}
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="bg-[#059669]" style={{ width: `${servicePct}%` }} />
            <div className="bg-blue-400" style={{ width: `${100 - servicePct}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" /> ค่าบริการผู้ดูแล <b className="text-gray-900">{formatTHB(b.estimatedCost)}</b>
            </span>
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> ค่าธรรมเนียมแพลตฟอร์ม <b className="text-gray-900">{formatTHB(b.platformFee)}</b>
            </span>
          </div>

          {/* เส้นทางเงิน */}
          <div className="mt-5 border-t border-gray-100 pt-4">
            {!p ? (
              <p className="text-sm text-gray-400">ยังไม่มีการชำระเงิน</p>
            ) : payBad ? (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <PaymentStatusText status={p.paymentStatus} />
                {p.failureMessage && <p className="mt-1 text-xs">{p.failureMessage}</p>}
              </div>
            ) : (
              <ol className="flex items-center">
                {PAY_FLOW.map((s, i) => {
                  const done = i <= payStep;
                  return (
                    <li key={s.key} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${done ? 'bg-[#059669] text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {done ? '✓' : i + 1}
                        </span>
                        <span className={`whitespace-nowrap text-[11px] ${done ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
                      </div>
                      {i < PAY_FLOW.length - 1 && <span className={`mx-1 mb-5 h-0.5 flex-1 ${i < payStep ? 'bg-[#059669]' : 'bg-gray-200'}`} />}
                    </li>
                  );
                })}
              </ol>
            )}

            {p && (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <dt className="text-gray-500">ยอดที่ตัดเงินแล้ว</dt>
                <dd className="text-right font-semibold text-gray-900">{formatTHB(p.capturedAmount)}</dd>
                {p.refundedAmount > 0 && (
                  <>
                    <dt className="text-gray-500">คืนเงินแล้ว</dt>
                    <dd className="text-right font-semibold text-red-600">-{formatTHB(p.refundedAmount)}</dd>
                  </>
                )}
                <dt className="text-gray-500">Omise Charge</dt>
                <dd className="truncate text-right font-mono text-gray-700" title={p.omiseChargeId ?? ''}>{p.omiseChargeId ?? '-'}</dd>
              </dl>
            )}
          </div>
        </Card>

        {/* ── Timeline ── */}
        <Card title="ไทม์ไลน์" icon="history">
          <ol className="relative ml-1">
            {timeline.map((t, i) => (
              <li key={t.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < timeline.length - 1 && <span className="absolute left-[7px] top-4 h-full w-0.5 bg-gray-200" aria-hidden="true" />}
                <span className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] ${i === timeline.length - 1 ? 'border-[#059669] bg-white' : 'border-white bg-[#059669] ring-1 ring-[#059669]'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-500">
                    {formatThaiDateTime(t.at)} · {t.by}
                  </p>
                  {t.reason && <p className="mt-0.5 text-xs text-gray-500">เหตุผล: {t.reason}</p>}
                </div>
              </li>
            ))}
          </ol>
          {b.statusHistory.length === 0 && (
            <p className="mt-4 text-[11px] text-gray-400">* สร้างจากเวลาที่บันทึกไว้ในการจอง (ยังไม่มีประวัติสถานะแบบละเอียด)</p>
          )}
        </Card>
      </div>
    </>,
  );
}
