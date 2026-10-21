import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useBooking } from '../../context/BookingContext';
import { CAREGIVER_REVIEWS } from '../../graphql/queries';
import { RatingDistribution } from '../../components/ui/RatingDistribution';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import BookingConfirmModal from '../../components/ui/BookingConfirmModal';
import CaregiverPhoto from '../../components/ui/CaregiverPhoto';
import { useSignedUrlRefresh } from '../../hooks/useSignedPhoto';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { useMatchingBooking } from '../../hooks/useMatchingBooking';
import { formatDisplayPrice, hasDisplayPrice, NO_PRICE_LABEL } from '../../lib/displayPrice';
import { skillLabel } from '../../lib/skillLabels';
import { PROFESSIONS, isProfession } from '../../lib/professions';
import ProfessionBadge from '../../components/ui/ProfessionBadge';
import { useCaregiverMatchStrings } from '../../lib/caregiverMatchStrings';
import { useDrivingLicenseStrings } from '../../lib/drivingLicenseStrings';

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
  profession?: string | null;
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

const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const TIME_SLOTS = [
  { label: 'เช้า' },
  { label: 'บ่าย' },
  { label: 'เย็น' },
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
      {TIME_SLOTS.map(({ label }, rowIdx) => (
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
                  background: available ? '#E6F5ED' : '#FDECEC',
                  border: available ? '0.8px solid #A7D8C2' : '0.8px solid #F5C2C2',
                }}
                title={available ? 'ว่าง' : 'ไม่ว่าง'}
              >
                <span
                  className="material-icons"
                  style={{ fontSize: 14, fontWeight: 700, color: available ? '#3A9A7E' : '#E05252' }}
                >
                  {available ? 'check' : 'close'}
                </span>
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
  const dl = useDrivingLicenseStrings();
  const location = useLocation();
  const { id: caregiverId } = useParams<{ id: string }>();
  const { bookingDraft, toggleSaveCaregiver, isCaregiverSaved } = useBooking();
  const { toasts, removeToast, success: toastSuccess } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  // S18 · E9: ผู้ดูแลคนนี้ไม่ผ่านเงื่อนไขของ booking แล้ว → ปิดปุ่มยืนยัน พากลับไปเลือกจากรายชื่อใหม่
  const [notEligible, setNotEligible] = useState(false);
  const matchText = useCaregiverMatchStrings();
  // PYG-648: booking (รวม PYG-385 จองแทนในกลุ่ม) ถูกสร้างตอนกดค้นหาแล้ว — หน้านี้แค่เลือกผู้ดูแล เหมือน SearchPage
  const { select } = useMatchingBooking();
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

  // PYG-512: รูปจาก endpoint นี้คือค่าล่าสุด — ใช้แทนรูปที่ติดมากับ location.state
  // (state อยู่ใน history ของเบราว์เซอร์ กด back กลับมาอีกวัน signed URL ในนั้นหมดอายุไปแล้ว)
  // undefined = ยังโหลดไม่เสร็จ → ระหว่างนั้นใช้รูปจาก state ไปก่อน
  const [publicAvatarUrl, setPublicAvatarUrl] = useState<string | null | undefined>(undefined);
  // ราคาจาก BE (/public → hourly_rate, ราคา catalog) — undefined = ยังโหลดไม่เสร็จ ใช้ค่าจาก location.state ไปก่อน
  const [publicHourlyRate, setPublicHourlyRate] = useState<number | null | undefined>(undefined);
  // PYG-556: วิชาชีพจาก /public (PYG-575) · PYG-659: ทักษะอื่นๆ จาก /public → other_skills
  const [publicProfession, setPublicProfession] = useState<string | null | undefined>(undefined);
  const [publicCustomSkills, setPublicCustomSkills] = useState<string[] | null>(null);
  // PYG-598 AC6: /public → driving_license_verified (BE คำนวณตาม R5 ณ เวลาที่เรียก) · BE เก่าไม่มี field = ไม่แสดงป้าย
  const [drivingLicenseVerified, setDrivingLicenseVerified] = useState(false);
  const [publicReloadKey, setPublicReloadKey] = useState(0);
  const reloadPublicProfile = useCallback(() => setPublicReloadKey((k) => k + 1), []);
  const refreshPhoto = useSignedUrlRefresh(reloadPublicProfile);

  useEffect(() => {
    if (!caregiverId) return;
    const apiBase = import.meta.env.VITE_GRAPHQL_URL?.replace('/graphql', '') ?? '';
    fetch(`${apiBase}/api/v1/caregivers/${caregiverId}/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { availability?: { day: number; slots: string[] }[]; completed_booking_count?: number; avatar_url?: string | null; hourly_rate?: number | null; profession?: string | null; other_skills?: string[] | null; driving_license_verified?: boolean } | null) => {
        if (data?.availability) setAvail(buildAvailMatrix(data.availability));
        if (data && data.hourly_rate !== undefined) setPublicHourlyRate(data.hourly_rate);
        if (data?.completed_booking_count !== undefined) setCompletedBookingCount(data.completed_booking_count);
        if (data && data.avatar_url !== undefined) setPublicAvatarUrl(data.avatar_url);
        if (data && data.profession !== undefined) setPublicProfession(data.profession);
        if (Array.isArray(data?.other_skills)) setPublicCustomSkills(data.other_skills);
        setDrivingLicenseVerified(data?.driving_license_verified === true);
      })
      .catch(() => undefined);
  }, [caregiverId, publicReloadKey]);

  useEffect(() => {
    if (reviewsData?.caregiverReviews?.data) {
      const newReviews = reviewsData.caregiverReviews.data;
      setAllReviews(prev => (page === 1 ? newReviews : [...prev, ...newReviews]));
    }
  }, [reviewsData, page]);

  // TODO: fetch caregiver summary by ID when location.state is absent
  const cg = location.state?.caregiver as CaregiverSummary | undefined;

  const fullName = cg?.fullName ?? '—';
  const hourlyRate = publicHourlyRate !== undefined ? publicHourlyRate : cg?.hourlyRate;
  const priceText = formatDisplayPrice(hourlyRate);
  const avgRating = cg?.avgRating ?? 0;
  const reviewCount = cg?.reviewCount ?? 0;
  const skills = cg?.skills ?? [];
  const province = cg?.province ?? '';
  const bio = cg?.bio ?? '';
  const experience = cg?.experience ?? null;
  const verified = cg?.verified ?? false;
  const avatarUrl = publicAvatarUrl !== undefined ? publicAvatarUrl : (cg?.avatarUrl ?? null);

  const translatedSkills = skills.map((s) => skillLabel(s));
  const profession = publicProfession !== undefined ? publicProfession : (cg?.profession ?? null);
  const customSkills = publicCustomSkills ?? [];

  const handleConfirmBooking = async () => {
    if (!cg || !bookingDraft) return;
    setIsSubmitting(true);
    setBookingError(null);
    setNotEligible(false);
    try {
      const result = await select(bookingDraft, cg.id);
      if (!result.ok) {
        setNotEligible(result.notEligible);
        setBookingError(result.message);
        return;
      }
      setShowModal(false);
      navigate('/booking/success', {
        state: {
          ref: result.bookingId,
          caregiverName: cg.fullName,
          ...(bookingDraft.onBehalf ? { onBehalfOf: bookingDraft.onBehalf.recipientName } : {}),
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // S18 · E9: กลับไปรายชื่อ (โหลดใหม่ตอนเข้า) พร้อมชื่อผู้ดูแลสำหรับแถบแจ้ง — ไม่ใช้ navigate(-1) เพราะต้องส่ง state
  const backToListAfterNotEligible = () => {
    setShowModal(false);
    setBookingError(null);
    setNotEligible(false);
    navigate('/search', { state: { notEligibleName: fullName } });
  };

  const handleBack = () => {
    if (globalThis.history.length > 1) navigate(-1);
    else navigate('/search');
  };

  return (
    <div className="min-h-screen" style={{ background: '#F6FAF9' }}>
      <div className="mx-auto px-4 sm:px-6 py-7" style={{ maxWidth: 1040 }}>
        {/* Back link — อยู่เหนือทั้งสองคอลัมน์ เพื่อให้การ์ดซ้าย/ขวาเริ่มที่ระดับเดียวกัน */}
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 hover:opacity-75 transition-opacity cursor-pointer w-fit mb-3.5"
        >
          <span className="material-icons" style={{ fontSize: 16, color: '#52B69A' }}>arrow_back</span>
          <span className="font-semibold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#52B69A', lineHeight: '20px' }}>
            กลับไปยังผลการค้นหา
          </span>
        </button>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-7 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-3.5 w-full lg:w-[664px] lg:flex-shrink-0">

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
                  <CaregiverPhoto
                    src={avatarUrl}
                    size={80}
                    onExpired={refreshPhoto}
                    frameStyle={{ border: '2.4px solid rgba(255,255,255,0.5)' }}
                  />
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
                      {drivingLicenseVerified && (
                        <span
                          className="inline-flex items-center gap-[5px] px-[10px] py-[3px]"
                          style={{ background: 'rgba(255,255,255,0.2)', border: '0.8px solid rgba(255,255,255,0.35)', borderRadius: 9999, height: 25.6 }}
                          title={dl.elderBadgeHint}
                        >
                          <span className="material-icons" style={{ fontSize: 14, color: '#FFFFFF' }} aria-hidden="true">directions_car</span>
                          <span className="text-white font-semibold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, lineHeight: '18px' }}>
                            {dl.elderBadge}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap mt-[7px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: '20px' }}>
                      {profession ? <ProfessionBadge profession={profession} /> : <span>ผู้ดูแลผู้สูงอายุ</span>}
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

              {/* วิชาชีพ (PYG-556 · S01-AC4) */}
              {profession && (
                <div className="flex flex-col" style={{ padding: '22px 28px', borderBottom: '0.8px solid #F0F1F3' }}>
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined" style={{ fontSize: 17, color: '#52B69A' }}>badge</span>
                    <span className="font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, lineHeight: '21px' }}>วิชาชีพ</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 mt-3">
                    <ProfessionBadge profession={profession} size="md" />
                    {isProfession(profession) && (
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#575859', lineHeight: '20px' }}>
                        {PROFESSIONS[profession].fullDescription}
                      </span>
                    )}
                  </div>
                </div>
              )}

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
                {/* ทักษะที่ผู้ดูแลพิมพ์เอง — ไม่ใช้จับคู่งาน · เส้นปะให้ต่างจากทักษะกลาง · ไม่มี = ซ่อนทั้งส่วน */}
                {customSkills.length > 0 && (
                  <div className="flex flex-col gap-2 mt-4 pt-3" style={{ borderTop: '0.8px dashed #E0E2E5' }}>
                    <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '18px' }}>
                      <span className="font-semibold">ทักษะอื่นๆ</span> · ผู้ดูแลระบุเอง
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {customSkills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center font-medium"
                          style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#575859', background: '#FFFFFF', border: '1px dashed #C6C8CB', borderRadius: 9999, height: 30, padding: '0 12px' }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
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
              {priceText ? (
                <div className="flex items-end gap-1">
                  <span className="font-bold num" style={{ fontFamily: "'Inter', sans-serif", fontSize: 26, color: '#1A1A1A', lineHeight: '39px' }}>
                    {priceText}
                  </span>
                  <span className="mb-[13px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', lineHeight: '20px' }}>
                    /ชม.
                  </span>
                </div>
              ) : (
                <span className="font-bold" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 18, color: '#8A8C8E', lineHeight: '39px' }}>
                  {NO_PRICE_LABEL}
                </span>
              )}
              <p className="mb-3.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', lineHeight: '18px' }}>
                {priceText ? 'ราคาเริ่มต้นตามประเภทงาน ไม่มีค่าใช้จ่ายแอบแฝง' : 'ราคาจะแสดงเมื่อเลือกประเภทงานตอนจอง'}
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

              {/* Secondary button — บันทึก */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (cg) {
                      const wasSaved = isCaregiverSaved(cg.id);
                      toggleSaveCaregiver({
                        id: cg.id,
                        fullName: cg.fullName,
                        avatarUrl: cg.avatarUrl,
                        hourlyRate: hasDisplayPrice(hourlyRate) ? hourlyRate : 0,
                        avgRating: cg.avgRating,
                        skills: cg.skills,
                        customSkills,
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
        onClose={notEligible ? backToListAfterNotEligible : () => { setShowModal(false); setBookingError(null); }}
        onConfirm={handleConfirmBooking}
        caregiver={cg ? { ...cg, avatarUrl, hourlyRate: hasDisplayPrice(hourlyRate) ? hourlyRate : 0, customSkills } : undefined}
        bookingDraft={bookingDraft}
        isSubmitting={isSubmitting}
        errorMessage={bookingError ?? undefined}
        confirmDisabled={notEligible}
        errorAction={notEligible ? { label: matchText.notEligibleAction, onClick: backToListAfterNotEligible } : undefined}
        onPhotoExpired={refreshPhoto}
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
