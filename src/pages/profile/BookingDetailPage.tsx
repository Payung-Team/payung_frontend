import { useState, useRef, useMemo, useEffect, type ReactNode } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import { CompleteServiceModal } from '../../components/ui/CompleteServiceModal';
import { BookingReviewForm, type BookingReviewData } from '../../components/booking/BookingReviewForm';
import { SubmittedReviewCard } from '../../components/booking/SubmittedReviewCard';
import { getBookingReview, saveStoredReview } from '../../utils/bookingReview';
import type { ConfirmedBooking, BookingRequest } from '../../context/BookingContext';
import { GET_MY_BOOKING, COMPLETE_BOOKING, CREATE_REVIEW, FLAG_BOOKING_DISPUTE } from '../../graphql/queries';
import { mapGqlStatus, ACTIVE_JOB_STATUSES } from '../../utils/bookingStatus';
import { PaymentInfoSection } from '../../components/payment/PaymentInfoSection';
import type { PaymentInfo } from '../../components/payment/PaymentInfoSection';
import { BookingTrackingView, CaregiverAvatar, CaregiverStats } from '../../components/booking/BookingTrackingView';
import { hasAnyProfileData, type PatientProfile } from '../../lib/patientProfile';
import { serviceTypeLabel } from '../../lib/serviceTypeLabels';
import { googleMapsUrl } from '../../lib/googleMaps';
import { formatBookingTimeRange, formatDurationHours } from '../../lib/bookingTime';
import { GROUP_BOOKING_DETAIL } from '../../graphql/familyGroup';
import { useSignedUrlRefresh } from '../../hooks/useSignedPhoto';
import BookingActivitiesList from '../../components/booking/BookingActivitiesList';
import { useBookingActivities } from '../../hooks/useBookingActivities';
import { useCareActivityStrings } from '../../lib/careActivityStrings';

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

/** ข้อความยาวที่ผู้ใช้พิมพ์เอง (ยา / คำแนะนำการดูแล) — InfoRow ชิดขวาอ่านยากเมื่อยาวหลายบรรทัด */
function NoteBlock({ label, text }: Readonly<{ label: string; text: string }>) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', margin: '0 0 4px', lineHeight: '20px' }}>{label}</p>
      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#1A1A1A', margin: 0, lineHeight: '20px', background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {text}
      </p>
    </div>
  );
}

// การ์ดชุดเดียวกับ BookingTrackingView (IN_PROGRESS_CARD) ให้ก่อน/ระหว่าง/หลังงานหน้าตาเป็นชุดเดียวกัน
const CARD_SHELL = 'bg-white border-[0.8px] border-[#F3F4F6] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]';
const CARD = `${CARD_SHELL} rounded-xl p-5 md:p-6`;

function CardTitle({ aside, children }: Readonly<{ aside?: string; children: ReactNode }>) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <h3 className="m-0 text-[17px] font-bold leading-[26px] text-[#1A1A1A]">{children}</h3>
      {aside && <span className="text-[13px] leading-5 text-[#8A8C8E]">{aside}</span>}
    </div>
  );
}

/** ป้ายอยู่บน ค่าอยู่ล่าง — แบบเดียวกับ DetailField ในแผงรายละเอียดของ BookingTrackingView */
function DetailField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] leading-4 text-[#8A8C8E]">{label}</dt>
      <dd className="m-0 mt-0.5 text-sm font-semibold leading-[21px] text-[#1A1A1A] break-words">{value || '—'}</dd>
    </div>
  );
}

/** ตัวเลขบนการ์ดบนช่วงรอวันนัด — แบบ Stat ใน PreShiftCard ฝั่งผู้ดูแล */
function HeroStat({ label, value, money = false }: Readonly<{ label: string; value: string; money?: boolean }>) {
  return (
    <div className="min-w-[88px]">
      <p className="m-0 text-[11px] text-[#8A8C8E]">{label}</p>
      <p className={`m-0 mt-0.5 font-['Inter'] text-lg font-bold ${money ? 'text-[#009265]' : 'text-[#1A1A1A]'}`}>{value}</p>
    </div>
  );
}

/** วันที่ / เวลา ในแถวผู้ดูแลของการ์ดบน (แบบ FinishedTime ของหน้าติดตามงาน) */
function HeadStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="text-right">
      <p className="m-0 text-[11px] leading-4 text-[#8A8C8E]">{label}</p>
      <p className="m-0 text-[15px] font-bold leading-[19px] text-[#1A1A1A] whitespace-nowrap">{value}</p>
    </div>
  );
}

// Statuses in which the patient may still write their review.
const REVIEWABLE_STATUSES = new Set<ConfirmedBooking['status']>([
  'completed',
]);

const STATUS_BANNER: Record<ConfirmedBooking['status'], { icon: string; iconColor: string; bg: string; border: string; textColor: string; message: (name: string) => string }> = {
  pending: { icon: 'info', iconColor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1E40AF', message: (n) => `ส่งคำขอของคุณไปยัง ${n} เรียบร้อยแล้ว ขณะนี้รอการตอบรับ` },
  accepted: { icon: 'credit_card', iconColor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1D4ED8', message: (n: string) => `${n} ได้ตอบรับคำขอของคุณแล้ว – กรุณาชำระเงินเพื่อยืนยันการจอง` },
  confirmed: { icon: 'check_circle', iconColor: '#059669', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', message: (n: string) => `${n} ยืนยันการจองของคุณแล้ว พบกันในวันนัดหมาย` },
  in_progress: { icon: 'schedule', iconColor: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1D4ED8', message: (n: string) => `${n} กำลังให้บริการอยู่ในขณะนี้` },
  rejected: { icon: 'cancel', iconColor: '#DC2626', bg: '#FEF2F2', border: '#FECACA', textColor: '#991B1B', message: (n) => `${n} ไม่สามารถรับงานนี้ได้ คุณสามารถค้นหาผู้ดูแลท่านอื่น` },
  cancelled: { icon: 'do_not_disturb_on', iconColor: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', textColor: '#374151', message: () => `การจองนี้ถูกยกเลิกแล้ว` },
  completed: { icon: 'task_alt', iconColor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', textColor: '#1E40AF', message: () => `การนัดหมายเสร็จสิ้นเรียบร้อยแล้ว` },
};

const STATUS_TITLE: Record<ConfirmedBooking['status'], string> = {
  pending: 'รอผู้ดูแลตอบรับ',
  accepted: 'รอชำระเงิน',
  confirmed: 'ยืนยันการจองแล้ว',
  in_progress: 'กำลังให้บริการ',
  rejected: 'ผู้ดูแลไม่สามารถรับงานได้',
  cancelled: 'การจองถูกยกเลิก',
  completed: 'การดูแลเสร็จสิ้น',
};

// Must match BookingService.cancelBooking: paid/confirmed jobs are no longer cancellable.
const CANCELLABLE_STATUSES = new Set<ConfirmedBooking['status']>(['pending', 'accepted']);

// ── GQL → ConfirmedBooking mapper (mirrors BookingsPage.mapGqlBooking) ─────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGqlBooking(api: any): ConfirmedBooking {
  const idSuffix = String(api.id).toUpperCase().replaceAll('-', '').slice(-6);
  const startTime: string = api.startTime ?? '';
  const durationHours: number = api.durationHours ?? 0;
  // PYG-526: เวลาสิ้นสุดมาจาก BE (startTime + durationHours) — เลิกคำนวณเองฝั่ง FE
  const endTime: string = api.endTime ?? '';
  const serviceLocations: ('at_home' | 'accompany_outside')[] = (api.serviceLocations ?? []).filter(
    (l: string) => l === 'at_home' || l === 'accompany_outside',
  );
  const tasks: { id: string; name: string }[] = (api.tasks ?? []).map((name: string) => ({ id: name, name }));

  const resolvedPatientName: string | undefined = api.patientName || api.careRecipientName || undefined;
  const profile: PatientProfile = api.patientProfile ?? {};

  const draft: BookingRequest = {
    serviceTypes: api.serviceType ? [api.serviceType] : [],
    serviceLocation: serviceLocations,
    dateTime: { date: api.bookingDate ?? '', startTime, endTime, duration: durationHours },
    locationDetails: { at_home: { address: api.locationAddress ?? '', lat: 0, lng: 0 } },
    jobDetails: { tasks, notes: api.notes ?? '' },
    estimatedCost: (() => {
      const base = api.estimatedCost ?? 0;
      const fee = Math.round(base * 0.1);
      return { hourlyRate: api.caregiver?.hourlyRate ?? 0, hours: durationHours, platformFee: fee, total: base + fee };
    })(),
    // null จาก GraphQL → undefined เพื่อให้ "ไม่ได้กรอก" แยกจากค่าจริง (เช่น อายุ 0)
    recipient: resolvedPatientName || hasAnyProfileData(api.patientProfile)
      ? {
        type: 'member',
        patientDetails: {
          name: resolvedPatientName ?? '',
          age: profile.age ?? undefined,
          gender: profile.gender ?? undefined,
          weight: profile.weight ?? undefined,
          height: profile.height ?? undefined,
          supportLevel: profile.supportLevel ?? undefined,
          bloodGroup: profile.bloodGroup ?? undefined,
          conditions: profile.conditions ?? undefined,
          medicines: profile.medicines ?? undefined,
          allergies: profile.allergies ?? undefined,
          careInstructions: profile.careInstructions ?? undefined,
          regularHospital: profile.regularHospital ?? undefined,
        },
      }
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
    caregiverRating: api.caregiver?.averageRating ?? null,
    caregiverReviewCount: api.caregiver?.reviewCount ?? null,
    caregiverCompletedJobs: api.caregiver?.completedJobs ?? null,
    caregiverExperienceYears: api.caregiver?.experienceYears ?? null,
    caregiverPhone: api.caregiver?.phone ?? null,
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
  const { userRole } = useAuth();
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const familyGroupId = new URLSearchParams(location.search).get('group');
  const isFamilyView = Boolean(familyGroupId);

  // Navigation state used as instant initial data while query loads
  const stateBooking = location.state?.booking as ConfirmedBooking | undefined;

  const { data, loading, refetch } = useQuery(
    isFamilyView ? GROUP_BOOKING_DETAIL : GET_MY_BOOKING,
    {
      variables: isFamilyView ? { groupId: familyGroupId, bookingId: id } : { id },
      skip: !id,
      fetchPolicy: 'cache-and-network',
    },
  );

  // PYG-635: มุมมองกลุ่มครอบครัวไม่มี myBooking ของคนดู (เป็นการจองของสมาชิกอื่น) → ไม่ดึง
  const activities = useBookingActivities(id, 'patient', isFamilyView);
  const cas = useCareActivityStrings();

  const queryData = data as {
    myBooking?: Record<string, unknown>;
    groupBooking?: Record<string, unknown>;
  } | undefined;
  const apiBooking = isFamilyView ? queryData?.groupBooking : queryData?.myBooking;
  const gqlData = useMemo(
    () => apiBooking ? { myBooking: apiBooking } : undefined,
    [apiBooking],
  );
  const canManageBooking = !isFamilyView
    || (apiBooking?.bookedByMe as boolean | undefined) === true;
  const backTarget = isFamilyView && familyGroupId
    ? `/family-group?group=${encodeURIComponent(familyGroupId)}`
    : '/bookings';

  const booking = useMemo<ConfirmedBooking | undefined>(() => {
    if (gqlData?.myBooking) return mapGqlBooking(gqlData.myBooking);
    return stateBooking;
  }, [gqlData, stateBooking]);

  const payment = (gqlData?.myBooking?.payment ?? undefined) as PaymentInfo | undefined;

  // PYG-512: รูปผู้ดูแลเป็น signed URL อายุ 1 ชม. — หน้างานเปิดค้างได้เป็นชั่วโมง
  // รูปโหลดไม่ขึ้นเมื่อไหร่ค่อยขอใบจองใหม่ให้ได้ URL ใบใหม่ (ระหว่างนั้นเป็น placeholder)
  const refreshPhotos = useSignedUrlRefresh(refetch);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('ยกเลิกคำขอจองสำเร็จ');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  // Complete Service state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeBooking] = useMutation(COMPLETE_BOOKING);
  const [flagDispute] = useMutation(FLAG_BOOKING_DISPUTE);

  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [existingReview, setExistingReview] = useState<BookingReviewData | null>(() =>
    getBookingReview(id || 'unknown'),
  );
  const [createReview] = useMutation(CREATE_REVIEW);

  useEffect(() => {
    setExistingReview(getBookingReview(id || 'unknown'));
    setShowReviewForm(false);
  }, [id]);

  const isPatient = userRole === 1;
  const isCaregiver = userRole === 2;

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
            onClick={() => navigate(backTarget)}
            style={{ marginTop: 16, padding: '8px 20px', background: '#52B69A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            กลับไปยังนัดหมาย
          </button>
        </div>
      </div>
    );
  }

  const banner = STATUS_BANNER[booking.status];
  const dt = booking.draft.dateTime;
  const est = booking.draft.estimatedCost;
  const svcTypes = booking.draft.serviceTypes ?? [];
  const svcTypeLabel = svcTypes.map((t) => serviceTypeLabel(t)).join(', ') || '—';
  const dateStr = dt?.date ? formatThaiDate(dt.date) : '—';
  // PYG-526: "09:00 – 13:00" — มีแถว "ระยะเวลาบริการ" แยกอยู่ข้าง ๆ จึงไม่ใส่ (N ชม.) ซ้ำ
  //   เดิม fallback เป็นชื่อ slot ("morning") ตอนไม่มีเวลาสิ้นสุด → ตอนนี้แสดงเวลาเริ่มหรือ "—"
  const timeStr = formatBookingTimeRange({ startTime: dt?.startTime, endTime: dt?.endTime }, { withDuration: false }) || '—';
  const durationStr = formatDurationHours(dt?.duration) || '—';
  const locationStr = booking.draft.locationDetails?.at_home?.address
    || booking.draft.locationDetails?.accompany_outside?.hospitalName
    || '—';
  // พิกัดไม่ได้อยู่ใน ConfirmedBooking (mapper ตั้ง lat/lng เป็น 0) — อ่านตรงจากผล query
  const mapsUrl = googleMapsUrl({
    locationLat: (apiBooking?.locationLat as number | null | undefined) ?? null,
    locationLng: (apiBooking?.locationLng as number | null | undefined) ?? null,
    locationName: locationStr === '—' ? null : locationStr,
  });
  const patient = booking.draft.recipient?.patientDetails;
  const recipientName = patient?.name || 'ตัวเอง';
  // อายุ 0 = "ไม่ได้กรอก" — ขาส่ง (toPatientProfilePayload) ตัด 0 ทิ้งอยู่แล้ว จึงไม่มีทางเป็นค่าจริง
  // และ mapper ของ BookingsPage ที่ส่งมาทาง location.state ใส่ age: 0 เป็นค่าตั้งต้น
  const patientAgeStr = patient?.age ? `${patient.age} ปี` : '';
  const patientWeightStr = patient?.weight != null ? `${patient.weight} กก.` : '';
  const patientHeightStr = patient?.height != null ? `${patient.height} ซม.` : '';
  const contactPerson = booking.draft.contactPerson;
  const total = est?.total ?? 0;
  const tasks = booking.draft.jobDetails?.tasks ?? [];
  const notes = booking.draft.jobDetails?.notes?.trim() ?? '';
  const isCancellable = CANCELLABLE_STATUSES.has(booking.status);
  const caregiverDisplayName = booking.caregiverName === '(รอจับคู่)' ? 'ผู้ดูแล' : booking.caregiverName;
  const recipientBrief = [patient?.gender, patientAgeStr].filter(Boolean).join(' · ');
  const bodyFacts = [
    { label: 'น้ำหนัก', value: patientWeightStr },
    { label: 'ส่วนสูง', value: patientHeightStr },
    { label: 'กรุ๊ปเลือด', value: patient?.bloodGroup ?? '' },
  ].filter((f) => f.value);
  const healthFacts = [
    { label: 'ระดับการช่วยเหลือตนเอง', value: patient?.supportLevel ?? '' },
    { label: 'โรคประจำตัว', value: patient?.conditions?.join(', ') ?? '' },
    { label: 'โรงพยาบาลประจำ', value: patient?.regularHospital ?? '' },
  ].filter((f) => f.value);
  const hasRecipientDetails = bodyFacts.length > 0 || healthFacts.length > 0
    || !!patient?.allergies || !!patient?.medicines || !!patient?.careInstructions;
  const platformFee = est?.platformFee ?? 0;
  const serviceCost = Math.max(total - platformFee, 0);
  const showPayBar = canManageBooking && booking.status === 'accepted';
  // ชำระแล้ว รอถึงวันนัด — ถึงวันนัดเมื่อไหร่ isTrackingDue จะสลับไปหน้าติดตามงานเอง
  const isAwaitingDay = booking.status === 'confirmed';
  const paidTotal = payment?.amount ?? total;
  const daysUntilText = (() => {
    if (!dt?.date) return `วันที่ ${dateStr}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(dt.date);
    day.setHours(0, 0, 0, 0);
    const days = Math.round((day.getTime() - today.getTime()) / 86_400_000);
    if (days <= 0) return 'วันนี้';
    if (days === 1) return 'พรุ่งนี้';
    return `อีก ${days} วัน`;
  })();
  const disputeStatus = (gqlData?.myBooking?.disputeStatus ?? 'none') as string;
  const isDisputed = disputeStatus === 'flagged' || disputeStatus === 'resolved' || disputeSubmitted;

  const showToast = (msg: string, opts?: { navigateAway?: boolean }) => {
    const navigateAway = opts?.navigateAway ?? true;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => {
      setToastVisible(false);
      if (navigateAway) setTimeout(() => navigate(backTarget), 300);
    }, 2500);
  };

  const hasHeldPayment = payment?.paymentStatus === 'held';

  const isServiceDatePassed = (() => {
    if (!dt?.date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const serviceDate = new Date(dt.date);
    serviceDate.setHours(0, 0, 0, 0);
    return serviceDate <= today;
  })();

  // ชำระแล้วและถึงวันนัดเท่านั้น — ก่อนวันนัดยังไม่มีเหตุให้โทร (ผู้รับบริการถึงวันนัดจะอยู่หน้าติดตามงานซึ่งมีปุ่มโทรของตัวเอง)
  const canCallCaregiver = canManageBooking && booking.status === 'confirmed' && isServiceDatePassed && !!booking.caregiverPhone;

  const canComplete = canManageBooking && booking.status === 'confirmed' && hasHeldPayment && isServiceDatePassed && (isPatient || isCaregiver);

  // Patients see the Tracking Service view instead of the static summary (PYG-361).
  // Once the job has actually started the date no longer matters.
  // สมาชิกกลุ่มครอบครัว (ไม่จำกัด role — ผู้ดูแลก็เป็นสมาชิกกลุ่มได้) เห็นหน้านี้เหมือนผู้จอง
  // แต่อ่านอย่างเดียวถ้าไม่ได้จองเอง (trackingReadOnly)
  // งานที่เสร็จแล้วก็ใช้หน้าเดียวกัน (สิ่งที่ผู้ดูแลทำ + บันทึก) แล้วต่อท้ายด้วยข้อมูลการชำระเงิน
  const isTrackingDue = (isFamilyView || (canManageBooking && isPatient)) && (
    ACTIVE_JOB_STATUSES.has(booking.status) ||
    booking.status === 'completed' ||
    (booking.status === 'confirmed' && isServiceDatePassed)
  );

  const handleCompleteService = async () => {
    setIsCompleting(true);
    try {
      await completeBooking({ variables: { bookingId: booking.id } });
      await refetch();
      setShowCompleteModal(false);
      showSuccess('บริการเสร็จสิ้น ขอบคุณ', 4000);
    } catch {
      showError('ไม่สามารถยืนยันบริการเสร็จสิ้นได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsCompleting(false);
    }
  };

  // The tracking view shows "ให้คะแนนรีวิว" as soon as the live proofOfWork has a
  // check-out, which can land before this page's booking.status leaves in_progress.
  // Refetch first in that case — otherwise the form's status gate below silently
  // swallows the click.
  const handleReview = async () => {
    if (!REVIEWABLE_STATUSES.has(booking.status)) {
      try {
        const result = await refetch();
        const freshData = result.data as {
          myBooking?: Record<string, unknown>;
          groupBooking?: Record<string, unknown>;
        } | undefined;
        const fresh = isFamilyView ? freshData?.groupBooking : freshData?.myBooking;
        if (!fresh || !REVIEWABLE_STATUSES.has(mapGqlBooking(fresh).status)) {
          showError('ยังรีวิวไม่ได้ในตอนนี้ กรุณาลองใหม่อีกครั้งในอีกสักครู่');
          return;
        }
      } catch {
        showError('โหลดข้อมูลการจองไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
    }
    setShowReviewForm(true);
  };

  const handleSubmitReview = async (review: BookingReviewData) => {
    if (!id) return;
    setIsSubmittingReview(true);
    try {
      await createReview({
        variables: {
          input: {
            bookingId: id,
            rating: review.rating,
            comment: review.text || undefined,
            isAnonymous: false,
          },
        },
      });
      saveStoredReview(id, review);
      setExistingReview(review);
      setShowReviewForm(false);
      showSuccess('ขอบคุณสำหรับรีวิว!', 4000);
    } catch {
      showError('ไม่สามารถส่งรีวิวได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Reviewing opens after the booking is completed.
  const showReviewSection = canManageBooking && REVIEWABLE_STATUSES.has(booking.status) && isPatient;
  const canShowReviewPrompt = showReviewSection && !existingReview && !showReviewForm;
  const canShowSubmittedReview = showReviewSection && !!existingReview && !showReviewForm;

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
      await flagDispute({ variables: { bookingId: booking.id, reason: disputeReason.trim() } });
      await refetch();
      setShowDisputeModal(false);
      setDisputeReason('');
      setDisputeSubmitted(true);
      showToast('ทีมงานจะตรวจสอบภายใน 24 ชม.', { navigateAway: false });
    } catch {
      showToast('ส่งเรื่องไม่สำเร็จ กรุณาลองใหม่', { navigateAway: false });
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  if (showReviewForm && showReviewSection) {
    return (
      <>
        <BookingReviewForm
          caregiverName={booking.caregiverName}
          caregiverAvatarUrl={booking.caregiverAvatarUrl ?? undefined}
          onPhotoExpired={refreshPhotos}
          onBack={() => setShowReviewForm(false)}
          onSubmit={handleSubmitReview}
          isSubmitting={isSubmittingReview}
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
      </>
    );
  }

  // Shared dispute modal — mounted from either the normal detail view or the
  // Tracking Service view (via "แจ้งปัญหา").
  const disputeModal = showDisputeModal && (
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
  );

  if (isTrackingDue) {
    const isFinished = booking.status === 'completed';
    const trackingFooter = isFinished && (
      <>
        {/* แจ้งปัญหาไปแล้ว → ปุ่มแจ้งปัญหาด้านหัวหน้าถูกซ่อน แสดงสถานะการตรวจสอบแทน */}
        {canManageBooking && isDisputed && (
          disputeStatus === 'resolved' ? (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#F0FDF4] border-[0.8px] border-[#86EFAC] font-['Bai_Jamjuree']">
              <span className="material-icons" style={{ fontSize: 18, color: '#16A34A' }}>check_circle</span>
              <p className="m-0 text-[13px] font-semibold text-[#15803D]">ตรวจสอบปัญหาเสร็จสิ้นแล้ว</p>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FFFBEB] border-[0.8px] border-[#FCD34D] font-['Bai_Jamjuree']">
              <span className="material-icons" style={{ fontSize: 18, color: '#F08C00' }}>hourglass_top</span>
              <p className="m-0 text-[13px] font-semibold text-[#B45309]">แจ้งปัญหาแล้ว — ทีมงานกำลังตรวจสอบภายใน 24 ชม.</p>
            </div>
          )
        )}

        {canShowSubmittedReview && existingReview && (
          <div className="mt-4">
            <SubmittedReviewCard
              caregiverName={booking.caregiverName}
              caregiverAvatarUrl={booking.caregiverAvatarUrl ?? undefined}
              onPhotoExpired={refreshPhotos}
              review={existingReview}
            />
          </div>
        )}

        {payment && <PaymentInfoSection payment={payment} />}
      </>
    );

    return (
      <>
        <BookingTrackingView
          booking={booking}
          onBack={() => navigate(backTarget)}
          onReportProblem={() => setShowDisputeModal(true)}
          onWriteReview={handleReview}
          onRebook={() => {
            if (booking.caregiverId) navigate(`/caregivers/${booking.caregiverId}`);
          }}
          hasReviewed={!!existingReview}
          readOnly={!canManageBooking}
          familyGroupId={familyGroupId}
          backLabel={isFamilyView ? 'กลับไปยังกลุ่มครอบครัว' : undefined}
          canReportProblem={!(isFinished && isDisputed)}
          footer={trackingFooter || undefined}
          onPhotoExpired={refreshPhotos}
        />
        {disputeModal}
        <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
      </>
    );
  }

  // การ์ดผู้รับบริการ — วันรอนัดอยู่คอลัมน์ซ้าย (ขวาเป็นขั้นตอนในวันนัด) สถานะอื่นอยู่คอลัมน์ขวา
  const recipientCard = (
    <section className={CARD}>
      <CardTitle>ผู้รับบริการ</CardTitle>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
          <span className="material-icons" style={{ fontSize: 24, color: '#52B69A' }}>person</span>
        </div>
        <div className="min-w-0">
          <p className="m-0 text-base font-bold leading-6 text-[#1A1A1A] break-words">{recipientName}</p>
          {recipientBrief && <p className="m-0 text-[13px] leading-5 text-[#8A8C8E]">{recipientBrief}</p>}
        </div>
      </div>

      {/* ประวัติแพ้ยาขึ้นก่อนและเด่นที่สุด — ข้อมูลที่ผิดแล้วอันตรายถึงชีวิต
          (ลำดับเดียวกับ PatientFullProfile ฝั่งผู้ดูแล) */}
      {patient?.allergies && (
        <div className="flex items-start gap-2.5 p-3 rounded-[10px] bg-[#FEF2F2] border-[0.8px] border-[#FCA5A5] mb-4">
          <span className="material-icons flex-shrink-0" style={{ fontSize: 18, color: '#DC2626' }}>warning</span>
          <div className="min-w-0">
            <p className="m-0 text-xs font-bold leading-[18px] text-[#DC2626]">ประวัติแพ้ยา / แพ้อาหาร</p>
            <p className="m-0 mt-0.5 text-[13px] font-semibold leading-5 text-[#991B1B] break-words whitespace-pre-wrap">{patient.allergies}</p>
          </div>
        </div>
      )}

      {/* ค่าสั้น (น้ำหนัก/ส่วนสูง/กรุ๊ปเลือด) เรียงสามช่องในแถวเดียว · ค่ายาว (ระดับช่วยเหลือ/โรค/โรงพยาบาล)
          เต็มแถวทีละรายการ — ไม่มีช่องเศษค้างครึ่งแถว */}
      {bodyFacts.length > 0 && (
        <dl className="m-0 grid grid-cols-3 gap-x-4 pb-4 mb-4 border-b-[0.8px] border-[#F0F1F3]">
          {bodyFacts.map((f) => (
            <DetailField key={f.label} label={f.label} value={f.value} />
          ))}
        </dl>
      )}
      {healthFacts.length > 0 && (
        <dl className="m-0 mb-1 flex flex-col gap-y-4">
          {healthFacts.map((f) => (
            <DetailField key={f.label} label={f.label} value={f.value} />
          ))}
        </dl>
      )}

      {patient?.medicines && <div className="mt-4"><NoteBlock label="ยาที่ใช้ประจำ" text={patient.medicines} /></div>}
      {patient?.careInstructions && <NoteBlock label="คำแนะนำการดูแล" text={patient.careInstructions} />}

      {!hasRecipientDetails && (
        <p className="m-0 text-sm text-[#8A8C8E]">ไม่ได้ระบุข้อมูลสุขภาพเพิ่มเติม</p>
      )}

      {contactPerson?.name && (
        <div className="mt-5 pt-4 border-t-[0.8px] border-[#F0F1F3]">
          <p className="m-0 mb-3 text-[15px] font-bold leading-[22px] text-[#1A1A1A]">ผู้ติดต่อในวันนัดหมาย</p>
          <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4">
            <DetailField
              label="ชื่อ"
              value={contactPerson.relationship ? `${contactPerson.name} (${contactPerson.relationship})` : contactPerson.name}
            />
            <DetailField label="เบอร์โทรศัพท์" value={contactPerson.phone} />
          </dl>
        </div>
      )}
    </section>
  );

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
      {disputeModal}

      {/* Page — ดีไซน์ชุดเดียวกับ BookingTrackingView (หัวเป็นเลขอ้างอิง · การ์ดบนรวมสถานะ + ผู้ดูแล) */}
      <div className="min-h-screen bg-[#F6FAF9] font-['Bai_Jamjuree']">
        <div className={`max-w-[1200px] mx-auto px-4 md:px-6 pt-6 ${showPayBar ? 'pb-[140px] md:pb-[100px]' : 'pb-[100px]'}`}>

          {/* Back link */}
          <button
            type="button"
            onClick={() => navigate(backTarget)}
            className="inline-flex items-center gap-1.5 bg-transparent border-none p-0 pb-3 cursor-pointer"
          >
            <span className="material-icons" style={{ fontSize: 18, color: '#8A8C8E' }}>arrow_back</span>
            <span className="text-[13px] font-medium leading-5 text-[#8A8C8E]">
              {isFamilyView ? 'กลับไปยังกลุ่มครอบครัว' : 'กลับไปนัดหมายของฉัน'}
            </span>
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="m-0 text-[28px] font-bold leading-[42px] tracking-[-0.7px] text-[#1A1A1A]">{booking.ref}</h1>
              <p className="m-0 mt-0.5 text-sm leading-[21px] text-[#8A8C8E]">รายละเอียดการจอง</p>
            </div>
            {canManageBooking && isCancellable && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white border-[0.8px] border-[#FCA5A5] cursor-pointer flex-shrink-0"
              >
                <span className="material-icons" style={{ fontSize: 17, color: '#DC2626' }}>cancel</span>
                <span className="text-[13px] font-semibold leading-5 text-[#DC2626]">ยกเลิกการจอง</span>
              </button>
            )}
            {canManageBooking && booking.status === 'completed' && !isDisputed && (
              <button
                type="button"
                onClick={() => setShowDisputeModal(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white border-[0.8px] border-[#FCA5A5] cursor-pointer flex-shrink-0"
              >
                <span className="material-icons" style={{ fontSize: 17, color: '#DC2626' }}>flag</span>
                <span className="text-[13px] font-semibold leading-5 text-[#DC2626]">แจ้งปัญหา</span>
              </button>
            )}
          </div>

          {isFamilyView && !canManageBooking && (
            <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-[#F0F9FF] border-[0.8px] border-[#BAE6FD]">
              <span className="material-icons flex-shrink-0 mt-px" style={{ fontSize: 18, color: '#0284C7' }}>visibility</span>
              <p className="m-0 text-[13px] font-semibold leading-5 text-[#075985]">
                คุณกำลังดูนัดหมายของสมาชิกในครอบครัว การชำระเงินและการจัดการคำจองทำได้โดยผู้จองเท่านั้น
              </p>
            </div>
          )}

          {/* ไม่แสดงการ์ด QR ที่นี่ (PYG-437) — หน้านี้คือมุมมอง "ยังไม่ถึงวันนัด"
              ของผู้รับบริการ พอถึงวันนัด (isTrackingDue) จะสลับไป BookingTrackingView
              ซึ่งมี JobQrCard อยู่แล้ว การโชว์ล่วงหน้าได้แค่สถานะ "ยังไม่ถึงเวลาใช้ QR" */}

          {/* การ์ดบน: สถานะ (+ สิ่งที่ต้องทำต่อ) แล้วตามด้วยผู้ดูแล */}
          <div className={`${CARD_SHELL} mt-5 rounded-2xl`}>
            {isAwaitingDay ? (
              /* ยืนยันแล้ว รอถึงวันนัด — โครงเดียวกับ PreShiftCard ฝั่งผู้ดูแล: เวลาเด่นสุด + วันที่/ระยะเวลา/ยอดชำระ */
              <div className="px-5 md:px-6 py-5 border-b-[0.8px] border-[#F3F4F6]">
                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" aria-hidden="true" />
                      ยืนยันแล้ว · รอถึงวันนัดหมาย
                    </span>
                    <p className="m-0 mt-2 font-['Inter'] text-[30px] font-bold leading-none text-[#1A1A1A]">{timeStr}</p>
                    <p className="m-0 mt-1.5 text-xs text-[#8A8C8E]">
                      {svcTypeLabel} · {daysUntilText}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                    <HeroStat label="วันที่" value={dateStr} />
                    <span aria-hidden="true" className="h-8 w-px bg-[#F0F1F3]" />
                    <HeroStat label="ระยะเวลา" value={durationStr} />
                    {paidTotal > 0 && (
                      <>
                        <span aria-hidden="true" className="h-8 w-px bg-[#F0F1F3]" />
                        <HeroStat label="ชำระแล้ว" value={`฿${paidTotal.toLocaleString()}`} money />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
            <div className="flex items-center gap-4 px-5 md:px-6 py-5 border-b-[0.8px] border-[#F3F4F6] flex-wrap">
              <span className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: banner.bg }}>
                <span className="material-icons" style={{ fontSize: 22, color: banner.iconColor }}>{banner.icon}</span>
              </span>
              <div className="flex-[1_1_220px] min-w-0">
                <p className="m-0 text-[17px] font-bold leading-[26px] text-[#1A1A1A]">{STATUS_TITLE[booking.status]}</p>
                <p className="m-0 mt-0.5 text-[13px] leading-5 text-[#8A8C8E]">{banner.message(caregiverDisplayName)}</p>
              </div>
              {showPayBar && (
                <button
                  type="button"
                  onClick={() => navigate(`/bookings/${booking.id}/payment`, { state: { booking } })}
                  className="hidden md:inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#3B82F6] border-none text-sm font-bold text-white cursor-pointer flex-shrink-0"
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>credit_card</span>
                  ชำระเงิน {total > 0 ? `฿${total.toLocaleString()}` : ''}
                </button>
              )}
              {canShowReviewPrompt && (
                <button
                  type="button"
                  onClick={handleReview}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#F59E0B] border-none text-sm font-bold text-white cursor-pointer flex-shrink-0"
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>star</span>
                  ให้คะแนนรีวิว
                </button>
              )}
              {canShowSubmittedReview && (
                <span className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#ECFDF5] border-[0.8px] border-[rgba(16,185,129,0.3)] flex-shrink-0">
                  <span className="material-icons" style={{ fontSize: 18, color: '#047857' }}>check_circle</span>
                  <span className="text-sm font-bold text-[#047857]">คุณรีวิวแล้ว</span>
                </span>
              )}
            </div>
            )}

            <div className="flex items-center gap-3 px-5 md:px-6 py-4 flex-wrap">
              <CaregiverAvatar
                avatarUrl={booking.caregiverAvatarUrl}
                size={46}
                shadow="0px 4px 16px rgba(245,158,11,0.25)"
                onPhotoExpired={refreshPhotos}
              />
              <div className="flex-[1_1_240px] min-w-0">
                <p className="m-0 text-[11px] font-semibold leading-4 tracking-[0.4px] text-[#8A8C8E]">ผู้ดูแล</p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[17px] font-bold leading-[26px] text-[#1A1A1A]">{booking.caregiverName}</span>
                  <span className="material-icons" style={{ fontSize: 18, color: '#009265' }}>verified</span>
                </div>
                <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                  <CaregiverStats booking={booking} />
                </div>
              </div>
              {!isAwaitingDay && (
                <div className="flex items-center gap-5 flex-shrink-0">
                  <HeadStat label="วันที่" value={dateStr} />
                  <span aria-hidden className="w-px h-8 bg-[#F3F4F6]" />
                  <HeadStat label="เวลา" value={timeStr} />
                </div>
              )}
              {booking.caregiverId && booking.caregiverName !== '(รอจับคู่)' && (
                <button
                  type="button"
                  onClick={() => navigate(`/caregivers/${booking.caregiverId}`, {
                    state: {
                      caregiver: {
                        id: booking.caregiverId,
                        fullName: booking.caregiverName,
                        avatarUrl: booking.caregiverAvatarUrl,
                        hourlyRate: booking.caregiverHourlyRate,
                        reviewCount: 0,
                        skills: [],
                        province: '',
                        district: '',
                      },
                    },
                  })}
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-xl bg-white border-[0.8px] border-[#E5E7EB] text-sm font-semibold text-[#1A1A1A] cursor-pointer flex-shrink-0"
                >
                  ดูโปรไฟล์
                  <span className="material-icons" style={{ fontSize: 18 }}>chevron_right</span>
                </button>
              )}
              {canCallCaregiver && (
                <a
                  href={`tel:${booking.caregiverPhone}`}
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-xl bg-[#009265] text-sm font-bold text-white no-underline flex-shrink-0"
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>call</span>
                  โทรหาผู้ดูแล
                </a>
              )}
            </div>
          </div>

          {/* แจ้งปัญหาไปแล้ว → แสดงสถานะการตรวจสอบแทนปุ่ม */}
          {canManageBooking && booking.status === 'completed' && isDisputed && (
            disputeStatus === 'resolved' ? (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#F0FDF4] border-[0.8px] border-[#86EFAC]">
                <span className="material-icons" style={{ fontSize: 18, color: '#16A34A' }}>check_circle</span>
                <p className="m-0 text-[13px] font-semibold text-[#15803D]">ตรวจสอบปัญหาเสร็จสิ้นแล้ว</p>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FFFBEB] border-[0.8px] border-[#FCD34D]">
                <span className="material-icons" style={{ fontSize: 18, color: '#F08C00' }}>hourglass_top</span>
                <p className="m-0 text-[13px] font-semibold text-[#B45309]">แจ้งปัญหาแล้ว — ทีมงานกำลังตรวจสอบภายใน 24 ชม.</p>
              </div>
            )
          )}

          {/* จอกว้าง: นัดหมาย + งาน + ผู้รับบริการซ้าย · ค่าบริการ + การชำระเงินขวา (สั้น จึง sticky ได้) */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
            <div className="flex flex-col gap-4 min-w-0">
              {/* ── นัดหมาย ── */}
              <section className={CARD}>
                <CardTitle>รายละเอียดนัดหมาย</CardTitle>
                <dl className="m-0 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                  <DetailField label="ประเภทบริการ" value={svcTypeLabel} />
                  <DetailField label="ระยะเวลา" value={durationStr} />
                  <DetailField label="วันที่" value={dateStr} />
                  <DetailField label="เวลา" value={timeStr} />
                  <div className="col-span-2 sm:col-span-4 flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <DetailField label="สถานที่" value={locationStr} />
                    </div>
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-white border-[0.8px] border-[#52B69A] text-[13px] font-semibold text-[#2F8F75] no-underline flex-shrink-0"
                      >
                        <span className="material-icons" style={{ fontSize: 18 }}>map</span>
                        ดูใน Google Maps
                      </a>
                    )}
                  </div>
                </dl>
              </section>

              {/* ── ภารกิจ ── */}
              <section className={CARD}>
                <CardTitle aside={tasks.length > 0 ? `${tasks.length} รายการ` : undefined}>สิ่งที่ผู้ดูแลจะทำ</CardTitle>

                {/* PYG-635: กิจกรรมจากรายการกลาง (snapshot ณ วันจอง) */}
                {activities.length > 0 && (
                  <div className="rounded-xl bg-[#F9FAFB] p-3.5 mb-3">
                    <p className="m-0 mb-2 text-[13px] font-bold text-[#575859]">{cas.detailTitle}</p>
                    <BookingActivitiesList activities={activities} />
                    <p className="mt-3 mb-0 text-[11px] text-[#8A8C8E]">{cas.detailNote}</p>
                  </div>
                )}

                {tasks.length > 0 ? (
                  <ol className="m-0 p-0 list-none flex flex-col">
                    {tasks.map((t, i) => (
                      <li key={t.id} className="flex items-start gap-3 py-2.5 border-b border-[#F0F1F3] last:border-b-0">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#ECFDF5] font-['Inter'] text-xs font-bold text-[#2F8F75] flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-6 text-[#1A1A1A] break-words min-w-0">{t.name}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  activities.length === 0 && <p className="m-0 text-sm text-[#8A8C8E]">การจองนี้ไม่ได้ระบุรายการงาน</p>
                )}

                {notes && (
                  <div className="mt-4 rounded-lg bg-[#FFFBEB] border-[0.8px] border-[rgba(245,158,11,0.3)] px-4 py-3">
                    <p className="m-0 text-[13px] font-bold leading-5 text-[#B45309]">ข้อควรระวัง / หมายเหตุที่คุณแจ้งไว้</p>
                    <p className="m-0 mt-1 text-sm leading-[21px] text-[#1A1A1A] whitespace-pre-wrap break-words">{notes}</p>
                  </div>
                )}
              </section>

              {recipientCard}
            </div>

            <div className="flex flex-col gap-4 lg:sticky lg:top-[90px]">
              {/* ── ค่าบริการ ── */}
              <section className={CARD}>
                <CardTitle>ค่าบริการ</CardTitle>
                {total > 0 ? (
                  <>
                    <div className="flex justify-between gap-3 py-1.5 text-sm text-[#575859]">
                      <span>ค่าบริการ{durationStr !== '—' ? ` (${durationStr})` : ''}</span>
                      <span className="font-['Inter'] font-semibold text-[#1A1A1A]">฿{serviceCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-3 py-1.5 text-sm text-[#575859]">
                      <span>ค่าธรรมเนียมแพลตฟอร์ม</span>
                      <span className="font-['Inter'] font-semibold text-[#1A1A1A]">฿{platformFee.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-2 pt-3 border-t-[0.8px] border-[#F0F1F3]">
                      <span className="text-[15px] font-bold text-[#1A1A1A]">รวมทั้งสิ้น</span>
                      <span className="font-['Inter'] text-[22px] font-bold leading-8 text-[#009265]">฿{total.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <p className="m-0 text-sm text-[#8A8C8E]">—</p>
                )}
              </section>

              {/* Payment info card */}
              {/* PaymentInfoSection มี marginTop ในตัว — หักออกให้ระยะเท่าการ์ดอื่น */}
              {payment && (
                <div className="-mt-4">
                  <PaymentInfoSection
                    payment={payment}
                    onRetry={canManageBooking
                      ? () => navigate(`/bookings/${booking.id}/payment`, { state: { booking } })
                      : undefined}
                  />
                </div>
              )}

              {canShowSubmittedReview && existingReview && (
                <SubmittedReviewCard
                  caregiverName={booking.caregiverName}
                  caregiverAvatarUrl={booking.caregiverAvatarUrl ?? undefined}
                  onPhotoExpired={refreshPhotos}
                  review={existingReview}
                />
              )}

              {/* Complete Service button */}
              {canComplete && (
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(true)}
                  className="inline-flex items-center justify-center gap-2 w-full h-[50px] rounded-xl bg-[#009265] border-none shadow-[0px_4px_12px_rgba(0,146,101,0.25)] text-[15px] font-bold text-white cursor-pointer"
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>task_alt</span>
                  ยืนยันบริการเสร็จสิ้น
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pay button — backend 'accepted' = caregiver said yes, payment still due
          ลอยไว้ล่างจอให้กดได้ตลอด · บนมือถือวางเหนือแถบเมนูล่างของแอป (--mobile-nav-h จาก MobileNavigation) */}
      {showPayBar && (
        <div className="md:hidden fixed bottom-[var(--mobile-nav-h,0px)] left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-[#E0E2E5] shadow-[0px_-4px_16px_rgba(0,0,0,0.04)] font-['Bai_Jamjuree']">
          <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="m-0 text-xs leading-4 text-[#575859]">ยอดที่ต้องชำระ</p>
              <p className="m-0 font-['Inter'] text-2xl font-bold leading-8 text-[#1A1A1A]">
                {total > 0 ? `฿${total.toLocaleString()}` : '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/bookings/${booking.id}/payment`, { state: { booking } })}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 md:px-10 rounded-xl bg-[#3B82F6] border-none text-[15px] font-bold text-white cursor-pointer shadow-[0px_4px_14px_rgba(26,86,219,0.35)] flex-shrink-0"
            >
              <span className="material-icons" style={{ fontSize: 18 }}>credit_card</span>
              ชำระเงิน
            </button>
          </div>
        </div>
      )}

      {/* Complete Service Confirm Modal */}
      <CompleteServiceModal
        isOpen={showCompleteModal}
        isLoading={isCompleting}
        amount={total}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={handleCompleteService}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
    </>
  );
}
