import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useBooking } from '../../context/BookingContext';
import { supabase } from '../../lib/supabase';
import { SEARCH_CAREGIVERS } from '../../graphql/queries';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
import BookingConfirmModal from '../../components/ui/BookingConfirmModal';
import ThailandAddressSimple from 'thailand-address-simple';

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
  // ── Newly surfaced to match the Patient page CGRow card. ──
  // All optional: the card renders each only when the backend supplies it.
  bio?: string | null;
  experience?: number | null;       // years
  gender?: 'male' | 'female' | null;
  distance?: number | null;         // km
  verified?: boolean;
}

interface SearchPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SearchResult {
  searchCaregivers: {
    data: CaregiverSummary[];
    pagination: SearchPagination;
  };
}

interface FilterState {
  province: string;
  district: string;
  jobTypes: string[];
  minPrice: number;
  maxPrice: number;
  minRating: number | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const JOB_TYPES = [
  { id: 'general_care', label: 'ดูแลทั่วไป' },
  { id: 'physiotherapy', label: 'กายภาพบำบัด' },
  { id: 'bedridden_care', label: 'ดูแลผู้ป่วยติดเตียง' },
  { id: 'medication', label: 'ช่วยจัดการยา' },
  { id: 'companion', label: 'เป็นเพื่อน/พูดคุย' },
];

const SERVICE_TYPE_MAP: Record<string, string> = {
  'ดูแลทั่วไป': 'general_care',
  'กายภาพบำบัด': 'physiotherapy',
  'ดูแลผู้ป่วยติดเตียง': 'bedridden_care',
  'ช่วยจัดการยา': 'medication',
  'เป็นเพื่อน/พูดคุย': 'companion',
};

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

const SORT_OPTIONS = [
  { value: 'RATING_DESC', label: 'Rating สูงสุด' },
  { value: 'PRICE_ASC', label: 'ราคา: ต่ำ → สูง' },
  { value: 'PRICE_DESC', label: 'ราคา: สูง → ต่ำ' },
];

const RATING_OPTIONS = [
  { value: null, label: 'ทั้งหมด' },
  { value: 3, label: '3★ ขึ้นไป' },
  { value: 4, label: '4★ ขึ้นไป' },
  { value: 4.5, label: '4.5★ ขึ้นไป' },
];

const PRICE_MIN = 0;
const PRICE_MAX = 1000;
const PAGE_LIMIT = 9;

const db = new ThailandAddressSimple();

// ── Helpers ────────────────────────────────────────────────────────────────────

// Matches the Patient page <Stars/>: single filled star + numeric rating + (count).
function StarRating({ rating, count, size = 16 }: { rating: number; count?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 num" style={{ color: '#F08C00', fontWeight: 700 }}>
      <span className="material-icons" style={{ fontSize: size, color: '#FFA92C' }}>star</span>
      <span style={{ fontSize: Math.max(11, size - 2) }}>{rating.toFixed(1)}</span>
      {count != null && (
        <span style={{ color: '#8A8C8E', fontWeight: 500, fontSize: Math.max(10, size - 3) }}>({count})</span>
      )}
    </span>
  );
}

// ── Caregiver Card (horizontal CGRow layout, mirrors Patient_Information.html) ───

function CaregiverCard({ cg, onSelect, onViewProfile }: { cg: CaregiverSummary; onSelect?: (cg: CaregiverSummary) => void; onViewProfile?: (cg: CaregiverSummary) => void }) {
  const fullName = cg.fullName;
  const hasRating = cg.avgRating != null && cg.reviewCount > 0;
  const translatedSkills = cg.skills.map((skill) => SKILL_TRANSLATIONS[skill] || skill);
  const visibleSkills = translatedSkills.slice(0, 3);
  const extraSkills = translatedSkills.length - 3;
  const hasMeta = cg.gender != null || cg.experience != null;

  return (
    <div
      className="group bg-white rounded-2xl p-5 border border-transparent transition-all duration-200
                 hover:border-[#E6F5ED] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] cursor-pointer"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}
      onClick={() => onSelect?.(cg)}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-[18px] items-start">

        {/* ── Avatar (120px) + verified badge ── */}
        <div className="relative flex-shrink-0 mx-auto sm:mx-0">
          <Avatar
            src={cg.avatarUrl ?? undefined}
            name={fullName}
            size={120}
            fallbackColor="#52B69A"
          />
          {cg.verified && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-[30px] h-[30px] rounded-full bg-[#52B69A]
                         border-2 border-white flex items-center justify-center"
              title="ยืนยันตัวตนแล้ว"
            >
              <span className="material-icons text-white text-[16px]">check</span>
            </span>
          )}
        </div>

        {/* ── Center content ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 w-full">

          {/* Name + inline stars */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[20px] font-bold text-[#1A1A1A] leading-tight"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              {fullName}
            </span>
            {hasRating ? (
              <StarRating rating={cg.avgRating!} count={cg.reviewCount} size={16} />
            ) : (
              <span className="text-[11px] text-[#C6C8CB] italic">ยังไม่มีรีวิว</span>
            )}
          </div>

          {/* Location (blue) + distance */}
          <div className="flex items-center gap-1.5 flex-wrap text-[12px] font-bold text-[#3B82F6]">
            <span className="material-icons text-[14px] text-[#3B82F6]">location_on</span>
            <span>{cg.province} / {cg.district}</span>
            {cg.distance != null && (
              <>
                <span className="text-[#E0E2E5]">·</span>
                <span className="text-[#8A8C8E] font-normal num">ห่างออกไป {cg.distance} กม.</span>
              </>
            )}
          </div>

          {/* Gender · experience */}
          {hasMeta && (
            <div className="flex items-center gap-2 flex-wrap text-[12px] text-[#8A8C8E] mt-0.5">
              {cg.gender != null && <span>เพศ: {cg.gender === 'female' ? 'หญิง' : 'ชาย'}</span>}
              {cg.gender != null && cg.experience != null && <span className="text-[#E0E2E5]">·</span>}
              {cg.experience != null && <span>ประสบการณ์ {cg.experience} ปี</span>}
            </div>
          )}

          {/* Bio (2-line clamp) */}
          {cg.bio && (
            <p
              className="text-[13px] text-[#575859] my-1.5 leading-relaxed overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            >
              {cg.bio}
            </p>
          )}

          {/* Skill chips (teal) */}
          {cg.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center mt-1">
              {visibleSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center h-8 px-3.5 rounded-full bg-[#E6F5ED] text-[#3A9A7E] text-[12px] font-semibold"
                >
                  {skill}
                </span>
              ))}
              {extraSkills > 0 && (
                <span className="inline-flex items-center h-8 px-3.5 rounded-full bg-[#F0F1F3] text-[#575859] text-[12px] font-semibold">
                  +{extraSkills} เพิ่มเติม
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Right: rate + CTA (centered column) ── */}
        <div className="flex-shrink-0 self-stretch sm:self-center w-full sm:w-[120px]
                        flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-3 sm:gap-2 sm:text-center
                        pt-3 sm:pt-0 border-t border-[#F0F1F3] sm:border-t-0">
          <div className="num text-[24px] font-bold text-[#1A1A1A] leading-none mb-1">
            ฿{cg.hourlyRate.toLocaleString()}
            <span className="text-[13px] text-[#8A8C8E] font-medium">/ชม.</span>
          </div>
          <div className="flex flex-row sm:flex-col gap-2 w-full">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect?.(cg); }}
              className="h-9 w-full bg-[#52B69A] hover:bg-[#45A085] active:bg-[#3A9A7E]
                         text-white text-[13px] font-bold rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              จอง
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewProfile?.(cg); }}
              className="h-9 w-full bg-white border border-[#E0E2E5] hover:bg-gray-50 active:bg-gray-100
                         text-[#575859] text-[13px] font-bold rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ดูโปรไฟล์
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton Card (matches horizontal layout) ──────────────────────────────────

function CaregiverCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
      <div className="flex gap-[18px] items-start">
        <Skeleton circle width={120} height={120} />
        <div className="flex-1 flex flex-col gap-2.5 pt-1">
          <Skeleton height={20} width="45%" borderRadius="6px" />
          <Skeleton height={13} width="55%" borderRadius="6px" />
          <Skeleton height={12} width="40%" borderRadius="6px" />
          <Skeleton height={36} width="90%" borderRadius="6px" />
          <div className="flex gap-1.5 mt-1">
            <Skeleton width={90} height={32} borderRadius="9999px" />
            <Skeleton width={80} height={32} borderRadius="9999px" />
            <Skeleton width={70} height={32} borderRadius="9999px" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 self-center">
          <Skeleton width={70} height={26} borderRadius="6px" />
          <Skeleton width={96} height={36} borderRadius="8px" />
        </div>
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#F0FAF4] flex items-center justify-center mb-5">
        <span className="material-icons text-4xl text-[#52B69A]">search_off</span>
      </div>
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-2" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        ไม่พบผู้ดูแลที่ตรงกัน
      </h3>
      <p className="text-[#8A8C8E] text-sm max-w-xs mb-6" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        ลองปรับตัวกรองใหม่ เช่น ขยายช่วงราคา หรือเลือกพื้นที่ที่กว้างขึ้น
      </p>
      <button
        type="button"
        onClick={onReset}
        className="px-6 py-2.5 bg-[#52B69A] text-white text-sm font-bold rounded-xl hover:bg-[#469e85] transition-colors cursor-pointer"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        รีเซ็ตตัวกรอง
      </button>
    </div>
  );
}

// ── Filter Sidebar ─────────────────────────────────────────────────────────────

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onApply: () => void;
  provinces: string[];
  districts: string[];
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

function FilterSidebar({
  filters,
  onChange,
  onApply,
  provinces,
  districts,
  isMobileOpen,
  onMobileClose,
}: FilterSidebarProps) {
  const toggleJobType = (id: string) => {
    const next = filters.jobTypes.includes(id)
      ? filters.jobTypes.filter((j) => j !== id)
      : [...filters.jobTypes, id];
    onChange({ ...filters, jobTypes: next });
  };

  const content = (
    <div className="flex flex-col gap-5">
      {/* Province */}
      <div>
        <label className="text-[13px] font-bold text-[#1A1A1A] mb-2 block"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          จังหวัด
        </label>
        <div className="relative">
          <select
            value={filters.province}
            onChange={(e) => onChange({ ...filters, province: e.target.value, district: '' })}
            className="w-full appearance-none bg-white border border-[#E0E2E5] rounded-lg px-3 py-2 pr-8 text-[13px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#52B69A] cursor-pointer"
          >
            <option value="">— ทุกจังหวัด —</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8C8E] text-xs">▾</span>
        </div>
      </div>

      {/* District */}
      <div>
        <label className="text-[13px] font-bold text-[#1A1A1A] mb-2 block"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          เขต/อำเภอ
        </label>
        <div className="relative">
          <select
            value={filters.district}
            onChange={(e) => onChange({ ...filters, district: e.target.value })}
            disabled={!filters.province}
            className={`w-full appearance-none border border-[#E0E2E5] rounded-lg px-3 py-2 pr-8 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#52B69A] transition-colors
              ${!filters.province ? 'bg-[#F0F1F3] text-[#C6C8CB] cursor-not-allowed' : 'bg-white text-[#1A1A1A] cursor-pointer'}`}
          >
            <option value="">— ทุกเขต/อำเภอ —</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8C8E] text-xs">▾</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#F0F1F3]" />

      {/* Job types */}
      <div>
        <label className="text-[13px] font-bold text-[#1A1A1A] mb-2.5 block"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          ประเภทงาน
        </label>
        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map((jt) => {
            const active = filters.jobTypes.includes(jt.id);
            return (
              <button
                key={jt.id}
                type="button"
                onClick={() => toggleJobType(jt.id)}
                className={`px-3 py-1.5 text-[12px] font-semibold rounded-full border transition-all duration-150 cursor-pointer
                  ${active
                    ? 'bg-[#52B69A] text-white border-[#52B69A] shadow-sm'
                    : 'bg-white text-[#575859] border-[#E0E2E5] hover:border-[#52B69A] hover:text-[#52B69A]'
                  }`}
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                {jt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#F0F1F3]" />

      {/* Price range */}
      <div>
        <label className="text-[13px] font-bold text-[#1A1A1A] mb-2.5 block"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          ช่วงราคา (฿/ชม.)
        </label>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[12px] font-bold text-[#52B69A] num bg-[#F0FAF4] px-2 py-0.5 rounded-lg">
            ฿{filters.minPrice.toLocaleString()}
          </span>
          <span className="text-[#C6C8CB] text-[11px]">—</span>
          <span className="text-[12px] font-bold text-[#52B69A] num bg-[#F0FAF4] px-2 py-0.5 rounded-lg">
            ฿{filters.maxPrice >= PRICE_MAX ? `${PRICE_MAX.toLocaleString()}+` : filters.maxPrice.toLocaleString()}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8A8C8E] w-12 shrink-0">ต่ำสุด</span>
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={50}
              value={filters.minPrice}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ ...filters, minPrice: Math.min(v, filters.maxPrice - 50) });
              }}
              className="flex-1 h-1.5 rounded-full accent-[#52B69A]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8A8C8E] w-12 shrink-0">สูงสุด</span>
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={50}
              value={filters.maxPrice}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ ...filters, maxPrice: Math.max(v, filters.minPrice + 50) });
              }}
              className="flex-1 h-1.5 rounded-full accent-[#52B69A]"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#F0F1F3]" />

      {/* Min rating */}
      <div>
        <label className="text-[13px] font-bold text-[#1A1A1A] mb-2.5 block"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          Rating ขั้นต่ำ
        </label>
        <div className="flex flex-col gap-2">
          {RATING_OPTIONS.map((opt) => {
            const active = filters.minRating === opt.value;
            return (
              <label
                key={String(opt.value)}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <div
                  onClick={() => onChange({ ...filters, minRating: opt.value })}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0
                    ${active ? 'border-[#52B69A] bg-[#52B69A]' : 'border-[#C6C8CB] bg-white group-hover:border-[#52B69A]'}`}
                >
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span
                  className={`text-[13px] transition-colors ${active ? 'text-[#1B5C48] font-bold' : 'text-[#575859]'}`}
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                  onClick={() => onChange({ ...filters, minRating: opt.value })}
                >
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Apply button */}
      <button
        type="button"
        onClick={() => { onApply(); onMobileClose(); }}
        className="w-full py-3 bg-[#52B69A] hover:bg-[#469e85] text-white text-[14px] font-bold rounded-xl transition-colors duration-150 cursor-pointer mt-1"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif", boxShadow: '0 4px 12px rgba(82,182,154,0.25)' }}
      >
        <span className="flex items-center justify-center gap-1.5">
          <span className="material-icons text-[18px]">search</span>
          ค้นหา
        </span>
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[260px] flex-shrink-0">
        <div className="bg-white border border-[#E0E2E5] rounded-2xl p-5 sticky top-[86px]"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[#F0F1F3]">
            <span className="material-icons text-[18px] text-[#52B69A]">tune</span>
            <h2 className="text-[15px] font-bold text-[#1A1A1A]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              ตัวกรอง
            </h2>
          </div>
          {content}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={onMobileClose}
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-[300px] bg-white overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#F0F1F3]">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-[18px] text-[#52B69A]">tune</span>
                  <h2 className="text-[15px] font-bold text-[#1A1A1A]"
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                    ตัวกรอง
                  </h2>
                </div>
                <button type="button" onClick={onMobileClose} className="text-[#8A8C8E] cursor-pointer p-1">
                  <span className="material-icons text-[20px]">close</span>
                </button>
              </div>
              {content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main SearchPage ────────────────────────────────────────────────────────────

const SearchPage: React.FC = () => {
  const { bookingDraft } = useBooking();

  // ── Entry guard: must come from booking flow ──
  if (!bookingDraft) {
    return <Navigate to="/booking/new" replace />;
  }

  return <SearchPageContent />;
};

// Separate inner component so hooks always run after the guard check
function SearchPageContent() {
  const { bookingDraft } = useBooking();
  const navigate = useNavigate();

  const [bookingCaregiver, setBookingCaregiver] = useState<CaregiverSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // ── Address DB ──
  const [dbReady, setDbReady] = useState(false);
  useEffect(() => {
    db.init().then(() => setDbReady(true));
  }, []);

  const provinces = useMemo(() => {
    if (!dbReady) return [];
    return [...new Set(db.address.map((a: { province: string }) => a.province))].sort() as string[];
  }, [dbReady]);

  const getDistricts = useCallback((province: string): string[] => {
    if (!dbReady || !province) return [];
    return [...new Set(
      db.address
        .filter((a: { province: string }) => a.province === province)
        .map((a: { amphoe: string }) => a.amphoe)
    )].sort() as string[];
  }, [dbReady]);

  // ── Initial filters pre-filled from booking draft ──
  const initialFilters: FilterState = useMemo(() => {
    const draftJobTypes = bookingDraft?.serviceTypes
      ? bookingDraft.serviceTypes.map(st => SERVICE_TYPE_MAP[st]).filter(Boolean)
      : [];
    return {
      province: bookingDraft?.locationDetails?.province ?? '',
      district: bookingDraft?.locationDetails?.district ?? '',
      jobTypes: draftJobTypes,
      minPrice: PRICE_MIN,
      maxPrice: PRICE_MAX,
      minRating: null,
    };
  }, [bookingDraft]);

  const [pendingFilters, setPendingFilters] = useState<FilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters);
  const [sortBy, setSortBy] = useState<string>('RATING_DESC');
  const [page, setPage] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const districts = useMemo(
    () => getDistricts(pendingFilters.province),
    [pendingFilters.province, getDistricts]
  );

  const applyFilters = useCallback(() => {
    setAppliedFilters(pendingFilters);
    setPage(1);
  }, [pendingFilters]);

  const resetFilters = useCallback(() => {
    setPendingFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  }, [initialFilters]);

  // ── GraphQL Query ──
  const queryInput = useMemo(() => ({
    province: appliedFilters.province || undefined,
    district: appliedFilters.district || undefined,
    jobType: appliedFilters.jobTypes.length > 0 ? appliedFilters.jobTypes.join(',') : undefined,
    minPrice: appliedFilters.minPrice > PRICE_MIN ? appliedFilters.minPrice : undefined,
    maxPrice: appliedFilters.maxPrice < PRICE_MAX ? appliedFilters.maxPrice : undefined,
    minRating: appliedFilters.minRating ?? undefined,
    sortBy,
    page,
    limit: PAGE_LIMIT,
  }), [appliedFilters, sortBy, page]);

  const { data, loading: gqlLoading, error: gqlError } = useQuery<SearchResult>(SEARCH_CAREGIVERS, {
    variables: { input: queryInput },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const caregivers = data?.searchCaregivers.data ?? [];
  const pagination = data?.searchCaregivers.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const totalResults = pagination?.total ?? 0;
  const loading = gqlLoading;
  const error = gqlError;

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  const handleSelect = useCallback((cg: CaregiverSummary) => {
    setBookingCaregiver(cg);
  }, []);

  const handleConfirmBooking = useCallback(async () => {
    if (!bookingCaregiver || !bookingDraft) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

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
        caregiverId:    bookingCaregiver.id,
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
      const resData = await res.json() as { id: string };
      setBookingError(null);
      setBookingCaregiver(null);
      navigate('/booking/success', {
        state: { ref: resData.id, caregiverName: bookingCaregiver.fullName },
      });
    } catch {
      setBookingCaregiver(null);
      navigate('/booking/success', { state: { caregiverName: bookingCaregiver.fullName } });
    } finally {
      setIsSubmitting(false);
    }
  }, [bookingCaregiver, bookingDraft, navigate]);

  const handleViewProfile = useCallback((cg: CaregiverSummary) => {
    navigate(`/caregivers/${cg.id}`, { state: { caregiver: cg } });
  }, [navigate]);

  // Active filter count badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.province) count++;
    if (appliedFilters.district) count++;
    if (appliedFilters.jobTypes.length > 0) count++;
    if (appliedFilters.minPrice > PRICE_MIN) count++;
    if (appliedFilters.maxPrice < PRICE_MAX) count++;
    if (appliedFilters.minRating != null) count++;
    return count;
  }, [appliedFilters]);

  return (
    <>
    <div className="min-h-screen bg-[#F6FAF9] px-4 md:px-8 py-6">
      <div className="max-w-[1280px] mx-auto">

        {/* ── Page Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="material-icons text-[18px] text-[#52B69A]">arrow_back</span>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="text-[13px] text-[#52B69A] font-semibold hover:text-[#469e85] transition-colors cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              กลับไปที่การจอง
            </button>
          </div>
        </div>

        {/* ── Mobile filter trigger ── */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0E2E5] rounded-full text-[13px] font-semibold text-[#575859] shadow-sm hover:bg-gray-50 transition cursor-pointer"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            <span className="material-icons text-[18px] text-[#52B69A]">tune</span>
            ตัวกรอง
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-[#52B69A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Mobile sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none bg-white border border-[#E0E2E5] rounded-full px-3 py-2 pr-7 text-[13px] font-semibold text-[#575859] focus:outline-none cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8C8E] text-xs">▾</span>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="flex gap-6 items-start">

          {/* Filter sidebar */}
          <FilterSidebar
            filters={pendingFilters}
            onChange={setPendingFilters}
            onApply={applyFilters}
            provinces={provinces}
            districts={getDistricts(pendingFilters.province)}
            isMobileOpen={isMobileFilterOpen}
            onMobileClose={() => setIsMobileFilterOpen(false)}
          />

          {/* Results */}
          <div className="flex-1 min-w-0">

            {/* Sort + count bar (desktop) */}
            <div className="hidden lg:flex items-center justify-between mb-5">
              <div className="text-[13px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {loading ? (
                  <Skeleton width={120} height={16} borderRadius="6px" />
                ) : (
                  <div>
                    <div className="flex items-baseline gap-3 flex-wrap mb-2">
                      <h1 className="text-[22px] font-bold text-[#1A1A1A] leading-tight"
                        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                        ผู้ดูแลที่เหมาะสมกับงานของคุณ
                      </h1>
                      {(appliedFilters.province || appliedFilters.district) && (
                        <span className="text-[13px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                          <span className="material-icons text-[11px] text-[#52B69A] align-middle mr-0.5">place</span>
                          {[appliedFilters.district, appliedFilters.province].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                   
                    <span>
                      {totalResults.toLocaleString()} ผลลัพธ์ที่ตรงกับประเภทงานที่คุณเลือก
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  เรียงตาม:
                </span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="appearance-none bg-white border border-[#E0E2E5] rounded-lg pl-3 pr-7 py-2 text-[13px] font-semibold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#52B69A] cursor-pointer"
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8C8E] text-xs">▾</span>
                </div>
              </div>
            </div>

            {/* Error state */}
            {error && !loading && (
              <div className="bg-[#FEF2F2] border border-red-200 rounded-2xl p-5 mb-4 flex items-center gap-3">
                <span className="material-icons text-red-400 text-[20px]">error_outline</span>
                <div>
                  <p className="text-[13px] font-bold text-[#DC2626]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                    เกิดข้อผิดพลาดในการค้นหา
                  </p>
                  <p className="text-[12px] text-[#8A8C8E] mt-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                    กรุณาลองใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
                  </p>
                </div>
              </div>
            )}

            {/* Loading skeleton list */}
            {loading && (
              <div className="flex flex-col gap-3">
                {Array.from({ length: PAGE_LIMIT }).map((_, i) => (
                  <CaregiverCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Results list (vertical stack — matches Patient page) */}
            {!loading && !error && caregivers.length > 0 && (
              <>
                <div className="flex flex-col gap-3">
                  {caregivers.map((cg) => (
                    <CaregiverCard key={cg.id} cg={cg} onSelect={handleSelect} onViewProfile={handleViewProfile} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center">
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    />
                  </div>
                )}

                {/* Result summary */}
                <p className="text-center text-[12px] text-[#C6C8CB] mt-3"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  แสดง {Math.min((page - 1) * PAGE_LIMIT + 1, totalResults)}–{Math.min(page * PAGE_LIMIT, totalResults)} จาก {totalResults.toLocaleString()} รายการ
                </p>
              </>
            )}

            {/* Empty state */}
            {!loading && !error && caregivers.length === 0 && (
              <EmptyState onReset={resetFilters} />
            )}
          </div>
        </div>
      </div>
    </div>

    <BookingConfirmModal
      isOpen={bookingCaregiver !== null}
      onClose={() => { setBookingCaregiver(null); setBookingError(null); }}
      onConfirm={handleConfirmBooking}
      caregiver={bookingCaregiver ?? undefined}
      bookingDraft={bookingDraft}
      isSubmitting={isSubmitting}
      errorMessage={bookingError ?? undefined}
    />
    </>
  );
}

export default SearchPage;