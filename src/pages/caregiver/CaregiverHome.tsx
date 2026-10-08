import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import { RatingDistribution } from '../../components/ui/RatingDistribution';
import Skeleton from '../../components/ui/Skeleton';
import StatusBadge, { type StatusBadgeMeta } from '../../components/ui/StatusBadge';
import { ToastContainer } from '../../components/ui/Toast';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import {
  CAREGIVER_REVIEWS,
  GET_CAREGIVER_BOOKINGS,
  GET_CAREGIVER_PROFILE,
  GET_UNREAD_COUNT,
  GET_USER,
  SET_CAREGIVER_SEARCHABLE,
} from '../../graphql/queries';
import { useToast } from '../../hooks/useToast';
import { formatBookingTimeRange } from '../../lib/bookingTime';
import { formatDisplayPrice, NO_PRICE_LABEL } from '../../lib/displayPrice';
import { serviceTypeLabel } from '../../lib/serviceTypeLabels';
import { skillLabel } from '../../lib/skillLabels';
import { formatTimeAgo } from '../../utils/formatTimeAgo';

interface UserData {
  me: {
    id: string;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  };
}

interface CaregiverProfile {
  id: string;
  caregiverNumber?: string | null;
  fullName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  hourlyRate?: number | null;
  skills?: string[] | null;
  experienceYears?: number | null;
  kycStatus: string;
  isSearchable: boolean;
  updatedAt?: string | null;
}

interface CaregiverData {
  myCaregiverProfile: CaregiverProfile;
}

interface BookingSummary {
  id: string;
  status: string;
  serviceType?: string | null;
  tasks?: string[] | null;
  bookingDate: string;
  startTime?: string | null;
  endTime?: string | null;
  durationHours?: number | null;
  estimatedCost?: number | null;
  locationAddress?: string | null;
  notes?: string | null;
  patient?: { displayName?: string | null; avatarUrl?: string | null } | null;
  careRecipientName?: string | null;
  recipientAvatarUrl?: string | null;
  createdAt: string;
  patientProfile?: {
    age?: number | null;
    gender?: string | null;
    supportLevel?: string | null;
  } | null;
}

interface CaregiverBookingsData {
  caregiverBookings: {
    data: BookingSummary[];
    pagination: { total: number };
  };
}

interface UnreadCountData {
  unreadCount: number;
}

interface BackendReview {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  isVisible: boolean;
  createdAt: string;
}

interface CaregiverReviewsData {
  caregiverReviews: {
    data: BackendReview[];
    pagination: { total: number };
  };
}

interface HomeBooking {
  id: string;
  status: 'pending' | 'accepted' | 'confirmed';
  patientName: string;
  recipientAvatarUrl?: string;
  serviceType: string;
  bookingDate: string;
  timeRangeText: string;
  price: number | null;
  locationName?: string;
  tasks: string[];
  notes?: string;
  createdAt: string;
  age?: number;
  gender?: string;
  supportLevel?: string;
}

type LoadableCount = number | null | undefined;

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

function kycBadgeMeta(status: string): StatusBadgeMeta {
  switch (status) {
    case 'verified':
      return { label: 'ยืนยันตัวตนแล้ว', badgeClass: 'bg-[#E5F7EF] text-[#176B4A]', dotClass: 'bg-[#2F9D70]' };
    case 'pending':
      return { label: 'กำลังตรวจสอบ', badgeClass: 'bg-[#FFF0D9] text-[#945C10]', dotClass: 'bg-[#E89A2E]' };
    case 'rejected':
      return { label: 'ต้องแก้ไขเอกสาร', badgeClass: 'bg-[#FDE8E8] text-[#A72D39]', dotClass: 'bg-[#D14A56]' };
    default:
      return { label: 'ยังไม่ยืนยันตัวตน', badgeClass: 'bg-[#EEF1F0] text-[#68736F]', dotClass: 'bg-[#98A39F]' };
  }
}

function toHomeBooking(summary: BookingSummary): HomeBooking {
  const status = summary.status.toLowerCase();
  return {
    id: summary.id,
    status: status === 'accepted' || status === 'confirmed' ? status : 'pending',
    patientName: summary.careRecipientName?.trim() || summary.patient?.displayName?.trim() || 'ผู้ใช้บริการ',
    recipientAvatarUrl: summary.recipientAvatarUrl ?? summary.patient?.avatarUrl ?? undefined,
    serviceType: serviceTypeLabel(summary.serviceType),
    bookingDate: summary.bookingDate,
    timeRangeText: formatBookingTimeRange({
      startTime: summary.startTime,
      endTime: summary.endTime,
      durationHours: summary.durationHours,
    }),
    price: typeof summary.estimatedCost === 'number' && summary.estimatedCost > 0 ? summary.estimatedCost : null,
    locationName: summary.locationAddress?.trim() || undefined,
    tasks: summary.tasks?.filter(Boolean) ?? [],
    notes: summary.notes?.trim() || undefined,
    createdAt: summary.createdAt,
    age: summary.patientProfile?.age ?? undefined,
    gender: summary.patientProfile?.gender ?? undefined,
    supportLevel: summary.patientProfile?.supportLevel ?? undefined,
  };
}

function formatThaiDate(dateStr: string, withYear = true): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(date);
}

function scheduleTimestamp(booking: HomeBooking): number {
  const start = /^\d{2}:\d{2}/.exec(booking.timeRangeText)?.[0] ?? '23:59';
  const value = new Date(`${booking.bookingDate}T${start}:00`).getTime();
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

function profileReadiness(profile: CaregiverProfile) {
  const items = [
    Boolean(profile.fullName?.trim()),
    Boolean(profile.phone?.trim()),
    Boolean(profile.address?.trim()),
    Boolean(profile.bio?.trim()),
    (profile.skills?.length ?? 0) > 0,
    typeof profile.experienceYears === 'number',
    Boolean(profile.gender),
    Boolean(profile.dateOfBirth),
  ];
  const completed = items.filter(Boolean).length;
  return { completed, total: items.length, percent: Math.round((completed / items.length) * 100) };
}

// ─── Sub-components ───────────────────────────────────────────────────────

function PageLoadingState() {
  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#F5F9F7]" aria-label="กำลังโหลดหน้าหลักผู้ดูแล" aria-busy="true">
      <div className="mx-auto max-w-[1160px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Skeleton height={76} borderRadius={18} />
          <Skeleton height={76} borderRadius={18} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Skeleton height={470} borderRadius={22} />
            <Skeleton height={220} borderRadius={18} />
            <Skeleton height={260} borderRadius={18} />
          </div>
          <div className="space-y-5">
            <Skeleton height={250} borderRadius={18} />
            <Skeleton height={285} borderRadius={18} />
            <Skeleton height={190} borderRadius={18} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PageErrorState({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#F5F9F7] px-4 py-12" style={FONT}>
      <div className="mx-auto flex min-h-[440px] max-w-[680px] flex-col items-center justify-center rounded-[24px] border border-[#DFE9E5] bg-white px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF0F1] text-[#C43D4B]">
          <Icon name="cloud_off" size="large" color="currentColor" className="!text-[30px]" />
        </span>
        <h1 className="mt-5 text-[24px] font-bold">โหลดข้อมูลหน้าหลักไม่สำเร็จ</h1>
        <p className="mt-2 max-w-[440px] text-[14px] leading-6 text-[#68736F]">กรุณาตรวจสอบการเชื่อมต่อ แล้วลองโหลดข้อมูลโปรไฟล์อีกครั้ง</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-7 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#1B5C48] px-5 text-[14px] font-bold text-white transition hover:bg-[#144938] focus-visible:ring-2 focus-visible:ring-[#52B69A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="refresh" size="small" color="currentColor" />
          {retrying ? 'กำลังลองใหม่...' : 'ลองโหลดอีกครั้ง'}
        </button>
      </div>
    </div>
  );
}

function Greeting({
  displayName,
  avatarUrl,
  pendingCount,
  nextJob,
}: {
  displayName: string;
  avatarUrl?: string | null;
  pendingCount: LoadableCount;
  nextJob?: HomeBooking;
}) {
  const firstName = displayName.split(/\s+/)[0];
  return (
    <header className="flex min-w-0 items-center gap-4 px-1 py-1">
      <Avatar src={avatarUrl ?? undefined} name={displayName} size={58} fallbackColor="#52B69A" className="!border-2 !shadow-none" />
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-bold leading-tight text-[#202624] sm:text-[26px]">สวัสดี คุณ{firstName}</h1>
        <p className="mt-1 text-[13px] leading-5 text-[#6F7A76]">
          {pendingCount === undefined ? (
            'กำลังตรวจสอบงานของคุณ'
          ) : pendingCount === null ? (
            'ข้อมูลคำขอยังโหลดไม่สำเร็จ'
          ) : (
            <>
              วันนี้มี <strong className="text-[#26332E]">{pendingCount.toLocaleString('th-TH')} คำขอรอตอบ</strong>
              {nextJob ? ` · งานถัดไป ${formatThaiDate(nextJob.bookingDate, false)} ${nextJob.timeRangeText || ''}` : ' · ยังไม่มีงานที่กำลังจะถึง'}
            </>
          )}
        </p>
      </div>
    </header>
  );
}

function AvailabilityCard({
  isSearchable,
  isVerified,
  toggling,
  onToggle,
}: {
  isSearchable: boolean;
  isVerified: boolean;
  toggling: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="flex min-h-[76px] items-center justify-between gap-5 rounded-[18px] border border-[#E1EAE6] bg-white px-5 py-4 shadow-[0_3px_14px_rgba(27,92,72,0.04)]" aria-labelledby="availability-heading">
      <div className="min-w-0">
        <h2 id="availability-heading" className="text-[14px] font-bold text-[#25312D]">
          {isVerified ? (isSearchable ? 'พร้อมรับงาน' : 'พักรับงาน') : 'ยังเปิดรับงานไม่ได้'}
        </h2>
        <p className="mt-0.5 text-[11px] text-[#7A8581]">
          {toggling ? 'กำลังบันทึกสถานะ...' : isVerified ? (isSearchable ? 'ผู้ใช้สามารถค้นหาและจองคุณได้' : 'โปรไฟล์ไม่แสดงในผลการค้นหา') : 'ยืนยันตัวตนก่อนเปิดรับงาน'}
        </p>
      </div>
      <ToggleSwitch
        checked={isSearchable}
        onChange={onToggle}
        disabled={!isVerified || toggling}
        ariaLabel={isSearchable ? 'ปิดสถานะพร้อมรับงาน' : 'เปิดสถานะพร้อมรับงาน'}
        className="shrink-0"
      />
    </section>
  );
}

function UrgentRequestCard({ booking }: { booking?: HomeBooking }) {
  if (!booking) {
    return (
      <section className="overflow-hidden rounded-[22px] border border-[#D7E7E0] bg-white">
        <div className="flex items-center gap-2 bg-[#ECF8F3] px-5 py-4 text-[#1D6B50]">
          <Icon name="notifications_active" size="small" color="currentColor" />
          <h2 className="text-[15px] font-bold">สิ่งที่ต้องทำตอนนี้</h2>
        </div>
        <div className="flex min-h-[210px] flex-col items-center justify-center px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF7F1] text-[#3A9A7E]">
            <Icon name="done_all" size="large" color="currentColor" />
          </span>
          <h3 className="mt-4 text-[16px] font-bold text-[#26332E]">ไม่มีคำขอใหม่ที่ต้องตอบ</h3>
          <p className="mt-1 max-w-[360px] text-[12px] leading-5 text-[#7A8581]">เมื่อมีผู้ใช้ส่งคำขอใหม่ รายละเอียดสำคัญจะปรากฏตรงนี้ทันที</p>
        </div>
      </section>
    );
  }

  const profileMeta = [booking.gender, booking.age != null ? `${booking.age} ปี` : null, booking.supportLevel].filter(Boolean);
  const price = formatDisplayPrice(booking.price);

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#96D7BE] bg-white shadow-[0_8px_30px_rgba(27,92,72,0.05)]" aria-labelledby="urgent-request-title">
      <div className="flex items-center justify-between gap-3 bg-[#ECF8F3] px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2 text-[#176B4A]">
          <Icon name="notifications_active" size="small" color="currentColor" />
          <h2 id="urgent-request-title" className="text-[15px] font-bold">สิ่งที่ต้องทำตอนนี้</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F0FF] px-2.5 py-1 text-[11px] font-bold text-[#2D67C7]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4787EA]" /> คำขอใหม่
        </span>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar src={booking.recipientAvatarUrl} name={booking.patientName} size={70} fallbackColor="#E7F5EE" className="!border-0 !text-[#2F8B70] !shadow-none" />
            <div className="min-w-0">
              <p className="text-[12px] text-[#7A8581]">{booking.serviceType}</p>
              <h3 className="mt-0.5 truncate text-[21px] font-bold text-[#202624]">{booking.patientName}</h3>
              {profileMeta.length > 0 && <p className="mt-1 text-[12px] text-[#68736F]">{profileMeta.join(' · ')}</p>}
            </div>
          </div>
          <div className="shrink-0 rounded-xl bg-[#FFF8E8] px-3.5 py-2.5 sm:text-right">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#A85F11] sm:justify-end">
              <Icon name="schedule" className="!text-[15px]" color="currentColor" /> คำขอที่ได้รับ
            </p>
            <p className="mt-1 text-[13px] font-bold text-[#5E3A16]">{formatTimeAgo(booking.createdAt)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[14px] bg-[#F7F9F8] px-4 py-3.5">
            <p className="flex items-center gap-2 text-[11px] text-[#7A8581]"><Icon name="event" className="!text-[17px]" color="#3A9A7E" /> วันและเวลา</p>
            <strong className="mt-1.5 block text-[14px] text-[#26332E]">{formatThaiDate(booking.bookingDate)}</strong>
            <span className="mt-0.5 block text-[12px] text-[#68736F]">{booking.timeRangeText || 'ยังไม่มีข้อมูลเวลา'}</span>
          </div>
          <div className="rounded-[14px] bg-[#F7F9F8] px-4 py-3.5">
            <p className="flex items-center gap-2 text-[11px] text-[#7A8581]"><Icon name="location_on" className="!text-[17px]" color="#3A9A7E" /> สถานที่</p>
            <strong className="mt-1.5 block text-[14px] leading-5 text-[#26332E]">{booking.locationName ?? 'ยังไม่มีข้อมูลสถานที่'}</strong>
          </div>
        </div>

        <div className="mt-3 rounded-[14px] bg-[#F7F9F8] px-4 py-3.5">
          <p className="flex items-center gap-2 text-[11px] text-[#7A8581]"><Icon name="payments" className="!text-[17px]" color="#3A9A7E" /> ค่าบริการโดยประมาณ</p>
          <strong className="mt-1 block text-[18px] text-[#26332E]">{price ?? NO_PRICE_LABEL}</strong>
        </div>

        {booking.tasks.length > 0 && (
          <div className="mt-5">
            <p className="text-[12px] font-bold text-[#45514D]">งานที่ต้องทำ</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {booking.tasks.slice(0, 5).map((task) => <span key={task} className="rounded-full bg-[#EAF7F1] px-3 py-1.5 text-[11px] font-semibold text-[#27775F]">{task}</span>)}
              {booking.tasks.length > 5 && <span className="rounded-full bg-[#F0F3F2] px-3 py-1.5 text-[11px] font-semibold text-[#68736F]">+{booking.tasks.length - 5}</span>}
            </div>
          </div>
        )}

        {booking.notes && (
          <div className="mt-4 flex items-start gap-3 rounded-[14px] bg-[#FFF9E9] px-4 py-3.5 text-[#6E4C1C]">
            <Icon name="speaker_notes" size="small" color="#B66C16" />
            <p className="text-[12px] leading-5"><strong>หมายเหตุจากผู้จอง:</strong> {booking.notes}</p>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[#EEF2F0] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/caregiver/bookings" className="inline-flex min-h-11 items-center justify-center text-[12px] font-bold text-[#2D7B64] no-underline hover:underline">ดูคำขอทั้งหมด</Link>
          <Link
            to={`/caregiver/bookings/${booking.id}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#52B69A] px-6 text-[14px] font-bold text-white no-underline shadow-[0_5px_16px_rgba(82,182,154,0.24)] transition hover:bg-[#3F9F85] focus-visible:ring-2 focus-visible:ring-[#1B5C48] focus-visible:ring-offset-2"
          >
            ดูรายละเอียดและตอบรับ <Icon name="arrow_forward" size="small" color="currentColor" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function WorkSummary({
  pending,
  accepted,
  confirmed,
  unread,
}: {
  pending: LoadableCount;
  accepted: LoadableCount;
  confirmed: LoadableCount;
  unread: LoadableCount;
}) {
  const rows = [
    { icon: 'mark_email_unread', label: 'คำขอใหม่', value: pending, color: '#2D67C7', bg: '#EAF2FF' },
    { icon: 'schedule', label: 'รอผู้ใช้ชำระเงิน', value: accepted, color: '#B76A13', bg: '#FFF4DE' },
    { icon: 'event_available', label: 'งานที่ยืนยันแล้ว', value: confirmed, color: '#1D8A63', bg: '#E7F7F0' },
    { icon: 'notifications_none', label: 'แจ้งเตือนที่ยังไม่อ่าน', value: unread, color: '#6C5AA7', bg: '#F1EEFB' },
  ];
  return (
    <section className="rounded-[18px] border border-[#E1EAE6] bg-white px-5 py-5 shadow-[0_3px_14px_rgba(27,92,72,0.04)]" aria-labelledby="summary-title">
      <h2 id="summary-title" className="text-[16px] font-bold text-[#25312D]">สรุปงานของฉัน</h2>
      <div className="mt-4 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex min-h-12 items-center gap-3 rounded-xl px-1 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ color: row.color, backgroundColor: row.bg }}>
              <Icon name={row.icon} className="!text-[18px]" color="currentColor" />
            </span>
            <span className="min-w-0 flex-1 text-[12px] text-[#56615D]">{row.label}</span>
            <strong className="text-[15px] text-[#25312D]">{row.value === undefined ? '…' : row.value === null ? '—' : row.value.toLocaleString('th-TH')}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function UpcomingJobs({ jobs }: { jobs: HomeBooking[] }) {
  return (
    <section aria-labelledby="upcoming-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="upcoming-title" className="text-[16px] font-bold text-[#25312D]">งานที่กำลังจะถึง</h2>
        <Link to="/caregiver/bookings" className="text-[12px] font-bold text-[#2D7B64] no-underline hover:underline">ดูงานทั้งหมด</Link>
      </div>
      {jobs.length === 0 ? (
        <div className="rounded-[18px] border border-[#E1EAE6] bg-white px-5 py-8 text-center">
          <Icon name="event_busy" size="large" color="#A8B1AD" />
          <p className="mt-2 text-[13px] font-bold text-[#56615D]">ยังไม่มีงานที่กำลังจะถึง</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.slice(0, 3).map((job) => (
            <article key={job.id} className="flex flex-col gap-4 rounded-[18px] border border-[#E1EAE6] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(27,92,72,0.03)] sm:flex-row sm:items-center">
              <Avatar src={job.recipientAvatarUrl} name={job.patientName} size={52} fallbackColor="#E7F5EE" className="!border-0 !text-[#2F8B70] !shadow-none" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${job.status === 'confirmed' ? 'bg-[#E7F7F0] text-[#1D7C5A]' : 'bg-[#FFF4DE] text-[#A85F11]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${job.status === 'confirmed' ? 'bg-[#31A87B]' : 'bg-[#E59A35]'}`} />
                    {job.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอชำระเงิน'}
                  </span>
                  <span className="text-[11px] font-semibold text-[#68736F]">{formatThaiDate(job.bookingDate)} · {job.timeRangeText || 'ยังไม่มีข้อมูลเวลา'}</span>
                </div>
                <h3 className="mt-1.5 truncate text-[14px] font-bold text-[#25312D]">{job.patientName} · {job.serviceType}</h3>
                <p className="mt-0.5 truncate text-[11px] text-[#7A8581]">{job.locationName ?? 'ยังไม่มีข้อมูลสถานที่'}</p>
              </div>
              <Link to={`/caregiver/bookings/${job.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#D9E3DF] px-4 text-[12px] font-bold text-[#44504C] no-underline transition hover:bg-[#F5F9F7]">
                ดูรายละเอียด <Icon name="chevron_right" size="small" color="currentColor" />
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ProfileCard({ profile }: { profile: CaregiverProfile }) {
  const readiness = profileReadiness(profile);
  const translatedSkills = (profile.skills ?? []).map(skillLabel);
  return (
    <section className="rounded-[18px] border border-[#E1EAE6] bg-white px-5 py-5 shadow-[0_3px_14px_rgba(27,92,72,0.04)]" aria-labelledby="profile-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="profile-title" className="text-[16px] font-bold text-[#25312D]">โปรไฟล์ของฉัน</h2>
        <StatusBadge {...kycBadgeMeta(profile.kycStatus)} />
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px] text-[#7A8581]">
        <span>ความสมบูรณ์ของโปรไฟล์</span>
        <strong className="text-[13px] text-[#27775F]">{readiness.percent}%</strong>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ECF1EF]">
        <div className="h-full rounded-full bg-[#52B69A]" style={{ width: `${readiness.percent}%` }} />
      </div>
      <p className="mt-4 line-clamp-3 text-[12px] leading-5 text-[#68736F]">
        {profile.bio?.trim() || 'ยังไม่มีคำแนะนำตัว เพิ่มข้อมูลเพื่อให้ผู้ใช้รู้จักประสบการณ์และรูปแบบการดูแลของคุณ'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {translatedSkills.slice(0, 4).map((skill) => <span key={skill} className="rounded-full bg-[#EAF7F1] px-2.5 py-1 text-[10px] font-semibold text-[#27775F]">{skill}</span>)}
        {translatedSkills.length > 4 && <span className="rounded-full bg-[#F0F3F2] px-2.5 py-1 text-[10px] font-semibold text-[#68736F]">+{translatedSkills.length - 4}</span>}
        {translatedSkills.length === 0 && <span className="text-[11px] text-[#9AA39F]">ยังไม่ได้ระบุทักษะ</span>}
      </div>
      <Link to="/caregiver/edit-profile" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D9E3DF] text-[12px] font-bold text-[#33413C] no-underline transition hover:bg-[#F5F9F7]">
        <Icon name="edit" size="small" color="currentColor" />
        {readiness.percent === 100 ? 'แก้ไขโปรไฟล์' : `เพิ่มข้อมูลให้ครบ ${readiness.total - readiness.completed} รายการ`}
      </Link>
    </section>
  );
}

function QuickActions() {
  const actions = [
    { href: '/caregiver/settings/job-reception', icon: 'tune', title: 'ตั้งค่างาน', detail: 'ตั้งเวลาว่างและพื้นที่รับงาน' },
    { href: '/caregiver/edit-profile', icon: 'manage_accounts', title: 'แก้ไขโปรไฟล์', detail: 'แก้ไขข้อมูลส่วนตัวและทักษะ' },
  ];
  return (
    <section className="overflow-hidden rounded-[18px] border border-[#E1EAE6] bg-white shadow-[0_3px_14px_rgba(27,92,72,0.04)]" aria-labelledby="quick-title">
      <h2 id="quick-title" className="px-5 pb-2 pt-5 text-[16px] font-bold text-[#25312D]">ทางลัด</h2>
      <div className="divide-y divide-[#EEF2F0] px-3 pb-3">
        {actions.map((action) => (
          <Link key={action.href} to={action.href} className="group flex items-center gap-3 rounded-xl px-2 py-3.5 text-inherit no-underline transition hover:bg-[#F5F9F7]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF7F1] text-[#2F8B70]"><Icon name={action.icon} size="medium" color="currentColor" /></span>
            <span className="min-w-0 flex-1"><strong className="block text-[13px] text-[#25312D]">{action.title}</strong><span className="mt-0.5 block truncate text-[10px] text-[#7A8581]">{action.detail}</span></span>
            <Icon name="chevron_right" size="small" color="#99A39F" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function ReviewsSection({ reviews, total, loading, error, onRetry }: { reviews: BackendReview[]; total: number; loading: boolean; error: boolean; onRetry: () => void }) {
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
  return (
    <section aria-labelledby="reviews-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="reviews-title" className="text-[16px] font-bold text-[#25312D]">รีวิวล่าสุด</h2>
        {total > 0 && <span className="text-[11px] font-semibold text-[#2D7B64]">ทั้งหมด {total.toLocaleString('th-TH')} รีวิว</span>}
      </div>
      <div className="rounded-[18px] border border-[#E1EAE6] bg-white px-5 py-5 shadow-[0_2px_10px_rgba(27,92,72,0.03)] sm:px-6">
        {loading ? (
          <div className="space-y-3"><Skeleton height={72} borderRadius={12} /><Skeleton height={72} borderRadius={12} /></div>
        ) : error ? (
          <div className="flex min-h-32 flex-col items-center justify-center text-center"><Icon name="error_outline" size="large" color="#B84450" /><p className="mt-2 text-[13px] font-bold text-[#8F303A]">โหลดรีวิวไม่สำเร็จ</p><button type="button" onClick={onRetry} className="mt-2 min-h-10 cursor-pointer px-3 text-[12px] font-bold text-[#9A3641]">ลองอีกครั้ง</button></div>
        ) : reviews.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center gap-4 text-center sm:text-left"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF1D8] text-[#D48621]"><Icon name="star_outline" size="large" color="currentColor" /></span><div><p className="text-[14px] font-bold text-[#33413C]">ยังไม่มีรีวิว</p><p className="mt-1 text-[11px] text-[#7A8581]">รีวิวจะแสดงหลังผู้ใช้รับบริการเสร็จแล้ว</p></div></div>
        ) : (
          <div className="grid gap-5 md:grid-cols-[145px_1fr]">
            <div className="md:border-r md:border-[#EEF2F0] md:pr-5">
              <strong className="block text-[38px] leading-none text-[#202624]" style={{ fontFamily: "'Inter', sans-serif" }}>{avgRating?.toFixed(1)}</strong>
              <div className="mt-2 flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Icon key={star} name="star" className="!text-[16px]" color={avgRating !== null && star <= Math.round(avgRating) ? '#E9A23B' : '#D7DEDB'} />)}</div>
              <p className="mt-1 text-[10px] text-[#7A8581]">{total.toLocaleString('th-TH')} รีวิว</p>
              <div className="mt-4 hidden md:block"><RatingDistribution reviews={reviews} /></div>
            </div>
            <div className="divide-y divide-[#EEF2F0]">
              {reviews.slice(0, 2).map((review) => (
                <article key={review.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#62C59E] text-[12px] font-bold text-white">{review.reviewerName.charAt(0) || 'ผ'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3"><strong className="truncate text-[12px] text-[#25312D]">{review.reviewerName}</strong><span className="shrink-0 text-[10px] text-[#8A9490]">{formatTimeAgo(review.createdAt)}</span></div>
                      <div className="mt-0.5 flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Icon key={star} name="star" className="!text-[13px]" color={star <= review.rating ? '#E9A23B' : '#D7DEDB'} />)}</div>
                      <p className="mt-1.5 text-[12px] leading-5 text-[#68736F]">{review.comment || 'ผู้ใช้ไม่ได้เขียนความคิดเห็นเพิ่มเติม'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PartialDataError({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#F1D5D8] bg-[#FFF8F8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="status">
      <div className="flex items-start gap-3"><Icon name="sync_problem" size="medium" color="#B84450" /><div><p className="text-[12px] font-bold text-[#8F303A]">ข้อมูลบางส่วนยังโหลดไม่สำเร็จ</p><p className="mt-0.5 text-[10px] text-[#A15B62]">จำนวนงานหรือการแจ้งเตือนอาจยังไม่เป็นปัจจุบัน</p></div></div>
      <button type="button" onClick={onRetry} disabled={retrying} className="min-h-10 cursor-pointer self-start rounded-lg px-3 text-[11px] font-bold text-[#9A3641] hover:bg-[#FDE8E8] disabled:opacity-60 sm:self-auto">{retrying ? 'กำลังโหลด...' : 'ลองอีกครั้ง'}</button>
    </div>
  );
}

export default function CaregiverHome() {
  const userQuery = useQuery<UserData>(GET_USER, { fetchPolicy: 'cache-and-network' });
  const profileQuery = useQuery<CaregiverData>(GET_CAREGIVER_PROFILE, { fetchPolicy: 'cache-and-network' });
  const unreadQuery = useQuery<UnreadCountData>(GET_UNREAD_COUNT, { fetchPolicy: 'cache-and-network', pollInterval: 30_000 });
  const pendingQuery = useQuery<CaregiverBookingsData>(GET_CAREGIVER_BOOKINGS, { variables: { input: { status: 'PENDING', limit: 5 } }, fetchPolicy: 'cache-and-network', pollInterval: 30_000 });
  const acceptedQuery = useQuery<CaregiverBookingsData>(GET_CAREGIVER_BOOKINGS, { variables: { input: { status: 'ACCEPTED', limit: 5 } }, fetchPolicy: 'cache-and-network', pollInterval: 30_000 });
  const confirmedQuery = useQuery<CaregiverBookingsData>(GET_CAREGIVER_BOOKINGS, { variables: { input: { status: 'CONFIRMED', limit: 5 } }, fetchPolicy: 'cache-and-network', pollInterval: 30_000 });

  const profile = profileQuery.data?.myCaregiverProfile;
  const reviewsQuery = useQuery<CaregiverReviewsData>(CAREGIVER_REVIEWS, {
    variables: { input: { caregiverId: profile?.id ?? '', limit: 50, page: 1 } },
    skip: !profile?.id,
    fetchPolicy: 'cache-and-network',
  });

  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const [optimisticSearchable, setOptimisticSearchable] = useState<boolean | null>(null);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [retryingPrimary, setRetryingPrimary] = useState(false);
  const [retryingPartial, setRetryingPartial] = useState(false);
  const [setCaregiverSearchable] = useMutation(SET_CAREGIVER_SEARCHABLE);

  const pendingBookings = useMemo(
    () => (pendingQuery.data?.caregiverBookings.data ?? []).map(toHomeBooking).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [pendingQuery.data],
  );
  const upcomingJobs = useMemo(
    () => [
      ...(confirmedQuery.data?.caregiverBookings.data ?? []).map(toHomeBooking),
      ...(acceptedQuery.data?.caregiverBookings.data ?? []).map(toHomeBooking),
    ].sort((a, b) => scheduleTimestamp(a) - scheduleTimestamp(b)),
    [acceptedQuery.data, confirmedQuery.data],
  );
  const reviews = useMemo(
    () => (reviewsQuery.data?.caregiverReviews.data ?? []).filter((review) => review.isVisible),
    [reviewsQuery.data],
  );

  const isInitialLoading = !profile && profileQuery.loading;
  const profileFailed = !profile && Boolean(profileQuery.error);
  const pendingCount = pendingQuery.error ? null : pendingQuery.data?.caregiverBookings.pagination.total;
  const acceptedCount = acceptedQuery.error ? null : acceptedQuery.data?.caregiverBookings.pagination.total;
  const confirmedCount = confirmedQuery.error ? null : confirmedQuery.data?.caregiverBookings.pagination.total;
  const unreadCount = unreadQuery.error ? null : unreadQuery.data?.unreadCount;
  const hasPartialError = Boolean(userQuery.error || unreadQuery.error || pendingQuery.error || acceptedQuery.error || confirmedQuery.error);
  const isSearchable = optimisticSearchable ?? profile?.isSearchable ?? false;

  const fullName = [userQuery.data?.me?.firstName, userQuery.data?.me?.lastName].filter(Boolean).join(' ').trim();
  const displayName = profile?.fullName?.trim() || fullName || userQuery.data?.me?.displayName?.trim() || 'ผู้ดูแล';

  const handleToggleAvailability = async () => {
    if (!profile || profile.kycStatus !== 'verified' || togglingAvailability) return;
    const next = !isSearchable;
    setOptimisticSearchable(next);
    setTogglingAvailability(true);
    try {
      await setCaregiverSearchable({ variables: { isSearchable: next }, refetchQueries: [{ query: GET_CAREGIVER_PROFILE }], awaitRefetchQueries: true });
      setOptimisticSearchable(null);
      showSuccess(next ? 'เปิดสถานะพร้อมรับงานแล้ว' : 'พักรับงานชั่วคราวแล้ว');
    } catch {
      setOptimisticSearchable(null);
      showError('บันทึกสถานะการรับงานไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setTogglingAvailability(false);
    }
  };

  const retryPrimary = async () => {
    setRetryingPrimary(true);
    try { await Promise.all([profileQuery.refetch(), userQuery.refetch()]); } finally { setRetryingPrimary(false); }
  };

  const retryPartial = async () => {
    setRetryingPartial(true);
    try { await Promise.all([userQuery.refetch(), unreadQuery.refetch(), pendingQuery.refetch(), acceptedQuery.refetch(), confirmedQuery.refetch()]); } finally { setRetryingPartial(false); }
  };

  if (isInitialLoading) return <PageLoadingState />;
  if (profileFailed || !profile) return <PageErrorState retrying={retryingPrimary} onRetry={() => void retryPrimary()} />;

  return (
    <>
      <div className="min-h-[calc(100vh-70px)] bg-[#F5F9F7] text-[#202624] antialiased" style={FONT}>
        <main className="mx-auto max-w-[1160px] px-4 py-7 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <Greeting displayName={displayName} avatarUrl={userQuery.data?.me?.avatarUrl} pendingCount={pendingCount} nextJob={upcomingJobs[0]} />
            <AvailabilityCard isSearchable={isSearchable} isVerified={profile.kycStatus === 'verified'} toggling={togglingAvailability} onToggle={() => void handleToggleAvailability()} />
          </div>

          {hasPartialError && <PartialDataError retrying={retryingPartial} onRetry={() => void retryPartial()} />}

          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="contents lg:col-start-1 lg:block lg:space-y-5">
              <div className="order-1 min-w-0"><UrgentRequestCard booking={pendingBookings[0]} /></div>
              <div className="order-3 min-w-0"><UpcomingJobs jobs={upcomingJobs} /></div>
              <div className="order-6 min-w-0">
                <ReviewsSection reviews={reviews} total={reviewsQuery.data?.caregiverReviews.pagination.total ?? reviews.length} loading={reviewsQuery.loading && !reviewsQuery.data} error={Boolean(reviewsQuery.error)} onRetry={() => void reviewsQuery.refetch()} />
              </div>
            </div>

            <aside className="contents lg:col-start-2 lg:block lg:space-y-5" aria-label="ข้อมูลสรุปของผู้ดูแล">
              <div className="order-2"><WorkSummary pending={pendingCount} accepted={acceptedCount} confirmed={confirmedCount} unread={unreadCount} /></div>
              <div className="order-4"><ProfileCard profile={profile} /></div>
              <div className="order-5"><QuickActions /></div>
            </aside>
          </div>
        </main>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" variant="admin-toast" />
    </>
  );
}
