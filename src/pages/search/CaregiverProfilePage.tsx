import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useBooking } from '../../context/BookingContext';
import { CAREGIVER_REVIEWS } from '../../graphql/queries';
import { RatingDistribution } from '../../components/ui/RatingDistribution';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import BookingConfirmModal from '../../components/ui/BookingConfirmModal';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CaregiverSummary {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  hourlyRate: number;
  avgRating?: number | null;
  reviewCount: number;
  skills: string[];
  province: string;
  district: string;
  bio?: string | null;
  experience?: number | null;
  gender?: 'male' | 'female' | null;
  verified?: boolean;
}

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  timeAgo: string;
  text: string;
  avatarGradient: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SKILL_TRANSLATIONS: Record<string, string> = {
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

const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const TIME_SLOTS = [
  { label: 'เช้า', abbr: 'เช' },
  { label: 'บ่าย', abbr: 'บ่' },
  { label: 'เย็น', abbr: 'เย' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/** DB dayOfWeek (0=Sun…6=Sat) → frontend column index (Mon=0…Sun=6) */
function dbDayToCol(day: number): number {
  return day === 0 ? 6 : day - 1;
}

const TIME_SLOT_ROW: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 };

function buildAvailMatrix(
  apiSlots: { day: number; slots: string[] }[],
): boolean[][] {
  const matrix: boolean[][] = [
    [false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false],
  ];
  for (const { day, slots } of apiSlots) {
    const col = dbDayToCol(day);
    for (const slot of slots) {
      const row = TIME_SLOT_ROW[slot];
      if (row !== undefined) matrix[row][col] = true;
    }
  }
  return matrix;
}

interface BackendReview {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  isAnonymous: boolean;
  isVisible: boolean;
  createdAt: string;
}

interface CaregiverReviewsData {
  caregiverReviews: {
    data: BackendReview[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #E17055 0%, #FAB1A0 100%)',
  'linear-gradient(135deg, #52B69A 0%, #76C893 100%)',
  'linear-gradient(135deg, #3B5BDB 0%, #74C0FC 100%)',
  'linear-gradient(135deg, #F08C00 0%, #FCC419 100%)',
  'linear-gradient(135deg, #7950F2 0%, #DA77F2 100%)',
  'linear-gradient(135deg, #0CA678 0%, #63E6BE 100%)',
];

function toReview(br: BackendReview): Review {
  const code = br.reviewerName.charCodeAt(0) || 0;
  return {
    id: br.id,
    reviewerName: br.reviewerName,
    rating: br.rating,
    timeAgo: formatTimeAgo(br.createdAt),
    text: br.comment ?? '',
    avatarGradient: AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length],
  };
}

const EMPTY_AVAIL: boolean[][] = [
  [false, false, false, false, false, false, false],
  [false, false, false, false, false, false, false],
  [false, false, false, false, false, false, false],
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StarRow({ rating, count, size = 15 }: Readonly<{ rating: number; count?: number; size?: number }>) {
  return (
    <span className="inline-flex items-center gap-[5px]">
      <span className="material-icons" style={{ fontSize: size, color: '#FFC570' }}>star</span>
      <span
        className="font-semibold num"
        style={{ fontFamily: "'Inter', sans-serif", fontSize: size - 1, color: '#FFFFFF', lineHeight: 1.5 }}
      >
        {rating.toFixed(1)}
      </span>
      {count != null && (
        <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: size - 2, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
          ({count} รีวิว)
        </span>
      )}
    </span>
  );
}

function ReviewItem({ review }: Readonly<{ review: Review }>) {
  return (
    <div className="flex items-start gap-3 w-full">
      <div className="flex-shrink-0 relative w-10 h-[45.65px]">
        <div
          className="absolute top-0 left-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: review.avatarGradient }}
        >
          <span className="text-white font-bold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 15.38 }}>
            {review.reviewerName.charAt(0)}
          </span>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-0">
        <div className="flex items-center w-full gap-2.5">
          <span className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, lineHeight: '20px' }}>
            {review.reviewerName}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="material-icons" style={{ fontSize: 12, color: '#FFA92C' }}>star</span>
            <span className="font-bold num" style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#F08C00', lineHeight: '16px' }}>
              {review.rating.toFixed(1)}
            </span>
          </span>
          <span className="flex-1" />
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', lineHeight: '16px' }}>
            {review.timeAgo}
          </span>
        </div>
        <div className="mt-1.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#575859', lineHeight: '20px' }}>
          {review.text}
        </div>
      </div>
    </div>
  );
}

function WeeklySchedule({ avail }: Readonly<{ avail: boolean[][] }>) {
  return (
    <div style={{ width: '100%' }}>
      {/* Day headers */}
      <div className="flex mb-1">
        <div style={{ width: 26, flexShrink: 0 }} />
        {DAYS.map((day) => (
          <div
            key={day}
            className="flex-1 flex items-center justify-center"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', fontWeight: 600, lineHeight: '16px', minHeight: 20 }}
          >
            {day}
          </div>
        ))}
      </div>
      {/* Time rows */}
      {TIME_SLOTS.map(({ label, abbr }, rowIdx) => (
        <div key={label} className="flex items-center mb-[3px]">
          <div style={{ width: 26, fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', lineHeight: '16px', flexShrink: 0 }}>
            {label}
          </div>
          {DAYS.map((_, colIdx) => {
            const available = avail[rowIdx]?.[colIdx] ?? false;
            return (
              <div
                key={DAYS[colIdx]}
                className="flex-1 flex items-center justify-center mx-[1.5px]"
                style={{
                  height: 26,
                  borderRadius: 5,
                  background: available ? '#E6F5ED' : '#F6FAF9',
                  border: available ? '0.8px solid #A7D8C2' : '0.8px solid #F0F1F3',
                }}
              >
                {available ? (
                  <span className="font-bold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 9, color: '#3A9A7E', lineHeight: '14px' }}>
                    {abbr}
                  </span>
                ) : (
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 9, color: '#D1D5DB' }}>—</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const CaregiverProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: caregiverId } = useParams<{ id: string }>();
  const { bookingDraft, toggleSaveCaregiver, isCaregiverSaved } = useBooking();
  const { toasts, removeToast, success: toastSuccess } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [avail, setAvail] = useState<boolean[][]>(EMPTY_AVAIL);
  const [completedBookingCount, setCompletedBookingCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [allReviews, setAllReviews] = useState<BackendReview[]>([]);

  const { data: reviewsData, loading: reviewsLoading } = useQuery<CaregiverReviewsData>(
    CAREGIVER_REVIEWS,
    { variables: { input: { caregiverId: caregiverId!, limit: 10, page } }, skip: !caregiverId },
  );

  const reviewPagination = reviewsData?.caregiverReviews?.pagination;
  const reviewTotal = reviewPagination?.total ?? 0;
  const totalPages = reviewPagination?.totalPages ?? 1;
  const visibleReviews = allReviews.filter(r => r.isVisible);

  useEffect(() => {
    if (!caregiverId) return;
    const apiBase = import.meta.env.VITE_GRAPHQL_URL?.replace('/graphql', '') ?? '';
    fetch(`${apiBase}/api/v1/caregivers/${caregiverId}/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { availability?: { day: number; slots: string[] }[]; completed_booking_count?: number } | null) => {
        if (data?.availability) setAvail(buildAvailMatrix(data.availability));
        if (data?.completed_booking_count !== undefined) setCompletedBookingCount(data.completed_booking_count);
      })
      .catch(() => undefined);
  }, [caregiverId]);

  useEffect(() => {
    if (reviewsData?.caregiverReviews?.data) {
      const newReviews = reviewsData.caregiverReviews.data;
      setAllReviews(prev => (page === 1 ? newReviews : [...prev, ...newReviews]));
    }
  }, [reviewsData, page]);

  // TODO: fetch caregiver summary by ID when location.state is absent
  const cg = location.state?.caregiver as CaregiverSummary | undefined;

  const fullName = cg?.fullName ?? '—';
  const hourlyRate = cg?.hourlyRate ?? 0;
  const avgRating = cg?.avgRating ?? 0;
  const reviewCount = cg?.reviewCount ?? 0;
  const skills = cg?.skills ?? [];
  const province = cg?.province ?? '';
  const bio = cg?.bio ?? '';
  const experience = cg?.experience ?? null;
  const verified = cg?.verified ?? false;
  const avatarUrl = cg?.avatarUrl ?? null;
  const initial = fullName.charAt(0);

  const translatedSkills = skills.map((s) => SKILL_TRANSLATIONS[s] || s);

  const handleConfirmBooking = async () => {
    if (!cg || !bookingDraft) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Build payload — เหมือน BookingRequestPage + caregiverId
      const tasksList = [
        ...(bookingDraft.jobDetails?.tasks?.map(t => t.name) ?? []),
        ...(bookingDraft.jobDetails?.customTasks?.map(t => t.name) ?? []),
      ];
      const serviceLocs = bookingDraft.serviceLocation ?? [];
      const atHomeAddress = bookingDraft.locationDetails?.at_home?.address ?? '';
      const hospitalName  = bookingDraft.locationDetails?.accompany_outside?.hospitalName ?? '';
      const meetingPoint  = bookingDraft.locationDetails?.accompany_outside?.meetingPoint ?? '';
      const addrParts: string[] = [];
      if (serviceLocs.includes('at_home') && atHomeAddress) addrParts.push(atHomeAddress);
      if (serviceLocs.includes('accompany_outside') && hospitalName) {
        const meetingSuffix = meetingPoint ? ` (จุดนัดพบ: ${meetingPoint})` : '';
        addrParts.push(`ปลายทาง: ${hospitalName}${meetingSuffix}`);
      }

      const SERVICE_TYPE_MAP: Record<string, string> = {
        'ดูแลทั่วไป': 'general_care',
        'ดูแลผู้ป่วยติดเตียง': 'bedridden_care',
        'กายภาพบำบัด': 'physiotherapy',
        'ช่วยจัดการยา': 'medication',
        'เป็นเพื่อน/พูดคุย': 'companion',
      };

      const payload = {
        caregiverId:    cg.id,
        tasks:          tasksList.length > 0 ? tasksList : ['ดูแลทั่วไป'],
        serviceLocations: serviceLocs.length > 0 ? serviceLocs : ['at_home'],
        serviceType:    SERVICE_TYPE_MAP[bookingDraft.serviceTypes?.[0] ?? ''] ?? 'general_care',
        timeSlot:       bookingDraft.dateTime?.slot ?? 'morning',
        startTime:      bookingDraft.dateTime?.startTime ? `${bookingDraft.dateTime.startTime}:00` : '09:00:00',
        durationHours:  bookingDraft.dateTime?.duration ?? 4,
        locationAddress: addrParts.length > 0 ? addrParts.join(' / ') : '-',
        bookingDate:    bookingDraft.dateTime?.date ?? new Date().toISOString().slice(0, 10),
        notes:          bookingDraft.jobDetails?.notes || undefined,
        dayOfContactName:         bookingDraft.contactPerson?.name         ?? undefined,
        dayOfContactPhone:        bookingDraft.contactPerson?.phone        ?? undefined,
        dayOfContactRelationship: bookingDraft.contactPerson?.relationship ?? undefined,
        patientName:              bookingDraft.recipient?.patientDetails?.name ?? undefined,
        careRecipientId: bookingDraft.recipient?.type === 'member'
          ? bookingDraft.recipient.selectedMemberId
          : undefined,
      };

      const apiBase = import.meta.env.VITE_GRAPHQL_URL?.replace('/graphql', '') ?? '';
      const res = await fetch(`${apiBase}/api/v1/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { message?: string };
        if (res.status === 409) {
          setBookingError(errData.message ?? 'คุณมีนัดหมายในช่วงเวลาเดียวกันอยู่แล้ว กรุณาเลือกเวลาอื่น');
          return;
        }
        throw new Error(errData.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { id: string };
      setBookingError(null);
      setShowModal(false);
      navigate('/booking/success', { state: { ref: data.id, caregiverName: cg.fullName } });
    } catch (err) {
      console.error('Failed to create booking:', err);
      setShowModal(false);
      navigate('/booking/success', { state: { caregiverName: cg.fullName } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (globalThis.history.length > 1) navigate(-1);
    else navigate('/search');
  };

  return (
    <div className="min-h-screen" style={{ background: '#F6FAF9' }}>
      <div className="mx-auto px-4 sm:px-6 py-7" style={{ maxWidth: 1040 }}>
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-7 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-3.5 w-full lg:w-[664px] lg:flex-shrink-0">

            {/* Back link */}
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 hover:opacity-75 transition-opacity cursor-pointer w-fit"
            >
              <span className="material-icons" style={{ fontSize: 16, color: '#52B69A' }}>arrow_back</span>
              <span className="font-semibold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#52B69A', lineHeight: '20px' }}>
                กลับไปยังผลการค้นหา
              </span>
            </button>

            {/* Profile Card */}
            <div className="flex flex-col overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0px 1px 4px rgba(0,0,0,0.04)', borderRadius: 20 }}>

              {/* Banner */}
              <div
                className="relative overflow-hidden flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #3A9A7E 0%, #52B69A 60%, #76C893 100%)', height: 152 }}
              >
                <div className="absolute" style={{ width: 180, height: 180, right: -20, top: -40, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                <div className="absolute flex items-center gap-[22px]" style={{ left: 28, top: 32, right: 28, height: 91 }}>
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.2)', border: '2.4px solid rgba(255,255,255,0.5)', borderRadius: '50%' }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-white font-bold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 28, lineHeight: '42px' }}>
                        {initial}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 22, lineHeight: '33px' }}>
                        {fullName}
                      </span>
                      {verified && (
                        <span
                          className="inline-flex items-center gap-[5px] px-[10px] py-[3px]"
                          style={{ background: 'rgba(255,255,255,0.2)', border: '0.8px solid rgba(255,255,255,0.35)', borderRadius: 9999, height: 25.6 }}
                        >
                          <span className="material-icons" style={{ fontSize: 14, color: '#FFFFFF' }}>verified</span>
                          <span className="text-white font-semibold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, lineHeight: '18px' }}>
                            ยืนยันตัวตนแล้ว
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap mt-[7px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: '20px' }}>
                      <span>ผู้ดูแลผู้สูงอายุ</span>
                      {province && (<><span style={{ opacity: 0.5 }}>·</span><span>{province}</span></>)}
                      {experience != null && (<><span style={{ opacity: 0.5 }}>·</span><span>ประสบการณ์ {experience} ปี</span></>)}
                    </div>
                    <div className="flex items-center gap-[28px] flex-wrap mt-3">
                      {avgRating > 0 && <StarRow rating={avgRating} count={reviewCount} size={15} />}
                      <span className="inline-flex items-center gap-[5px]">
                        <span className="material-icons" style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>event_available</span>
                        <span className="text-white font-semibold num" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: '20px' }}>
                          จอง {completedBookingCount ?? 0} ครั้ง
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-[5px]">
                        <span className="material-icons" style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>schedule</span>
                        <span className="text-white font-semibold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, lineHeight: '20px' }}>
                          ตอบกลับใน 30 นาที
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="flex flex-col" style={{ padding: '22px 28px', borderBottom: '0.8px solid #F0F1F3' }}>
                <div className="flex items-center gap-2">
                  <span className="material-icons" style={{ fontSize: 17, color: '#52B69A' }}>person</span>
                  <span className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, lineHeight: '21px' }}>เกี่ยวกับฉัน</span>
                </div>
                <p className="mt-2.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, color: '#575859', lineHeight: '23px' }}>
                  {bio || 'ไม่มีข้อมูล'}
                </p>
              </div>

              {/* Skills */}
              <div className="flex flex-col" style={{ padding: '22px 28px', borderBottom: '0.8px solid #F0F1F3' }}>
                <div className="flex items-center gap-2">
                  <span className="material-icons" style={{ fontSize: 17, color: '#52B69A' }}>medical_services</span>
                  <span className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, lineHeight: '21px' }}>ทักษะและบริการ</span>
                </div>
                {translatedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {translatedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center font-semibold"
                        style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#3A9A7E', background: '#E6F5ED', borderRadius: 9999, height: 32, padding: '0 14px', lineHeight: '18px' }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E' }}>ไม่ระบุ</p>
                )}
              </div>

              {/* Reviews */}
              <div className="flex flex-col" style={{ padding: '22px 28px' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-icons" style={{ fontSize: 17, color: '#52B69A' }}>chat</span>
                  <span className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, lineHeight: '21px' }}>
                    รีวิวจากผู้ว่าจ้าง
                    {reviewTotal > 0 && (
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', fontWeight: 400, marginLeft: 6 }}>
                        ({reviewTotal} รีวิว)
                      </span>
                    )}
                  </span>
                </div>
                {reviewsLoading && visibleReviews.length === 0 ? (
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E' }}>กำลังโหลด...</p>
                ) : visibleReviews.length === 0 ? (
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E' }}>ยังไม่มีรีวิว</p>
                ) : (
                  <>
                    <RatingDistribution reviews={visibleReviews} />
                    <div className="flex flex-col gap-[18px] mt-4">
                      {visibleReviews.map((br, idx) => (
                        <React.Fragment key={br.id}>
                          {idx > 0 && <div style={{ height: 1, background: '#F0F1F3', width: '100%' }} />}
                          <ReviewItem review={toReview(br)} />
                        </React.Fragment>
                      ))}
                    </div>
                    {page < totalPages && (
                      <button
                        type="button"
                        onClick={() => setPage(p => p + 1)}
                        disabled={reviewsLoading}
                        className="mt-4 w-full font-semibold hover:opacity-75 transition-opacity cursor-pointer disabled:opacity-50"
                        style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#52B69A', lineHeight: '20px' }}
                      >
                        {reviewsLoading ? 'กำลังโหลด...' : 'โหลดเพิ่ม'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex flex-col gap-3.5 w-full lg:flex-1">

            {/* Booking Card */}
            <div className="flex flex-col" style={{ background: '#FFFFFF', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 16, padding: 20 }}>
              {/* Price */}
              <div className="flex items-end gap-1">
                <span className="font-bold num" style={{ fontFamily: "'Inter', sans-serif", fontSize: 26, color: '#1A1A1A', lineHeight: '39px' }}>
                  ฿{hourlyRate.toLocaleString()}
                </span>
                <span className="mb-[13px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', lineHeight: '20px' }}>
                  /ชม.
                </span>
              </div>
              <p className="mb-3.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '18px' }}>
                ราคาคงที่ ไม่มีค่าใช้จ่ายแอบแฝง
              </p>

              {/* Book button */}
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 font-bold text-white transition-all duration-150 cursor-pointer hover:opacity-90"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, height: 44, background: '#52B69A', boxShadow: '0px 4px 12px rgba(82,182,154,0.2)', borderRadius: 8, lineHeight: '21px' }}
              >
                <span className="material-icons" style={{ fontSize: 16 }}>event_available</span>
                จองบริการ
              </button>

              {/* Secondary buttons — แชท + บันทึก side-by-side */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer hover:bg-gray-50"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, height: 40, background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 8, color: '#575859' }}
                >
                  <span className="material-icons" style={{ fontSize: 16, color: '#575859' }}>chat</span>{' '}แชท
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (cg) {
                      const wasSaved = isCaregiverSaved(cg.id);
                      toggleSaveCaregiver({
                        id: cg.id,
                        fullName: cg.fullName,
                        avatarUrl: cg.avatarUrl,
                        hourlyRate: cg.hourlyRate,
                        avgRating: cg.avgRating,
                        skills: cg.skills,
                        province: cg.province,
                        district: cg.district,
                      });
                      toastSuccess(
                        wasSaved ? 'นำผู้ดูแลออกจากรายการบันทึกแล้ว' : 'บันทึกผู้ดูแลสำเร็จแล้ว',
                        3000,
                        'booking-toast',
                      );
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer hover:bg-gray-50"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, height: 40, background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 8, color: isCaregiverSaved(cg?.id ?? '') ? '#52B69A' : '#575859' }}
                >
                  <span className="material-icons" style={{ fontSize: 16, color: isCaregiverSaved(cg?.id ?? '') ? '#52B69A' : '#575859' }}>
                    {isCaregiverSaved(cg?.id ?? '') ? 'favorite' : 'favorite_border'}
                  </span>{' '}บันทึก
                </button>
              </div>

              {/* Stats */}
              <div className="flex flex-col gap-[9px] mt-4 pt-3.5" style={{ borderTop: '0.8px solid #F0F1F3' }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '18px' }}>ตอบรับโดยเฉลี่ย</span>
                  <span className="font-semibold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#1A1A1A', lineHeight: '18px' }}>ภายใน 30 นาที</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '18px' }}>ยกเลิกได้</span>
                  <span className="font-semibold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#1A1A1A', lineHeight: '18px' }}>ก่อน 24 ชม.</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '18px' }}>งานที่รับ</span>
                  <span className="font-semibold num" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#1A1A1A', lineHeight: '18px' }}>
                    {completedBookingCount !== null ? completedBookingCount : '—'} ครั้ง
                  </span>
                </div>
              </div>
            </div>

            {/* Availability Card */}
            <div className="flex flex-col" style={{ background: '#FFFFFF', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 16, padding: 18 }}>
              <div className="flex items-center gap-[7px]">
                <span className="material-icons" style={{ fontSize: 15, color: '#52B69A' }}>calendar_today</span>
                <span className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, lineHeight: '20px' }}>
                  ตารางว่าง (สัปดาห์นี้)
                </span>
              </div>
              <div className="mt-3">
                <WeeklySchedule avail={avail} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Confirm Modal */}
      <BookingConfirmModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setBookingError(null); }}
        onConfirm={handleConfirmBooking}
        caregiver={cg}
        bookingDraft={bookingDraft}
        isSubmitting={isSubmitting}
        errorMessage={bookingError ?? undefined}
      />
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position="top-right"
        variant="booking-toast"
      />
    </div>
  );
};

export default CaregiverProfilePage;
