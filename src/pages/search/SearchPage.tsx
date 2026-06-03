import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useBooking } from '../../context/BookingContext';
import { SEARCH_CAREGIVERS } from '../../graphql/queries';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
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
  { id: 'general_care',          label: 'ดูแลทั่วไป' },
  { id: 'physical_therapy',      label: 'กายภาพบำบัด' },
  { id: 'bedridden_care',        label: 'ดูแลผู้ป่วยติดเตียง' },
  { id: 'medication_management', label: 'ช่วยจัดการยา' },
  { id: 'companion',             label: 'เป็นเพื่อน/พูดคุย' },
];

const SORT_OPTIONS = [
  { value: 'RATING_DESC', label: 'Rating สูงสุด' },
  { value: 'PRICE_ASC',   label: 'ราคา: ต่ำ → สูง' },
  { value: 'PRICE_DESC',  label: 'ราคา: สูง → ต่ำ' },
];

const RATING_OPTIONS = [
  { value: null,  label: 'ทั้งหมด' },
  { value: 3,     label: '3★ ขึ้นไป' },
  { value: 4,     label: '4★ ขึ้นไป' },
  { value: 4.5,   label: '4.5★ ขึ้นไป' },
];

const PRICE_MIN = 0;
const PRICE_MAX = 1000;
const PAGE_LIMIT = 9;

const db = new ThailandAddressSimple();

// ── Helpers ────────────────────────────────────────────────────────────────────

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = rating >= s;
        const half   = !filled && rating >= s - 0.5;
        return (
          <span key={s} className={filled ? 'text-[#FFA92C]' : half ? 'text-[#FFA92C]' : 'text-[#E0E2E5]'}>
            {half ? '½' : '★'}
          </span>
        );
      })}
    </span>
  );
}

// ── Caregiver Card ─────────────────────────────────────────────────────────────

function CaregiverCard({ cg }: { cg: CaregiverSummary }) {
  const fullName    = cg.fullName;
  const hasRating   = cg.avgRating != null && cg.reviewCount > 0;
  const visibleSkills = cg.skills.slice(0, 3);
  const extraSkills   = cg.skills.length - 3;

  return (
    <div
      className="group bg-white border border-[#E0E2E5] rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 cursor-pointer"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {/* ── Top row: avatar + name + rate ── */}
      <div className="flex items-start gap-3">
        <Avatar
          src={cg.avatar_url ?? undefined}
          name={fullName}
          size={56}
          fallbackColor="#52B69A"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[15px] text-[#1A1A1A] leading-tight truncate"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              {fullName}
            </h3>
          </div>

          {/* Rating row */}
          {hasRating ? (
            <div className="flex items-center gap-1.5 mt-1">
              <StarRating rating={cg.avgRating!} size={13} />
              <span className="text-[12px] font-bold text-[#FFA92C] num">{cg.avgRating!.toFixed(1)}</span>
              <span className="text-[11px] text-[#8A8C8E] num">({cg.reviewCount})</span>
            </div>
          ) : (
            <div className="mt-1">
              <span className="text-[11px] text-[#C6C8CB] italic">ยังไม่มีรีวิว</span>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[#8A8C8E]">
            <span className="material-icons text-[12px] text-[#52B69A]">place</span>
            <span>{cg.district}, {cg.province}</span>
          </div>
        </div>

        {/* Hourly rate badge */}
        <div className="flex-shrink-0 text-right">
          <div className="bg-[#F0FAF4] border border-[#A7D8C2] rounded-xl px-3 py-1.5 inline-block">
            <div className="text-[15px] font-bold text-[#1B5C48] num leading-tight">฿{cg.hourlyRate.toLocaleString()}</div>
            <div className="text-[10px] text-[#52B69A] font-semibold">/ ชั่วโมง</div>
          </div>
        </div>
      </div>

      {/* ── Skills ── */}
      {cg.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <span
              key={skill}
              className="px-2.5 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] text-[11px] font-semibold rounded-full border border-[#BFDBFE]"
            >
              {skill}
            </span>
          ))}
          {extraSkills > 0 && (
            <span className="px-2.5 py-0.5 bg-[#F0F1F3] text-[#8A8C8E] text-[11px] font-semibold rounded-full">
              +{extraSkills}
            </span>
          )}
        </div>
      )}

      {/* ── CTA button ── */}
      <button
        type="button"
        className="w-full py-2.5 bg-[#52B69A] hover:bg-[#469e85] active:bg-[#3A9A7E] text-white text-[13px] font-bold rounded-xl transition-colors duration-150 cursor-pointer"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif", boxShadow: '0 2px 8px rgba(82,182,154,0.25)' }}
      >
        เลือกผู้ดูแลนี้
      </button>
    </div>
  );
}

// ── Skeleton Card ──────────────────────────────────────────────────────────────

function CaregiverCardSkeleton() {
  return (
    <div className="bg-white border border-[#E0E2E5] rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Skeleton circle width={56} height={56} />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton height={16} width="60%" borderRadius="6px" />
          <Skeleton height={12} width="40%" borderRadius="6px" />
          <Skeleton height={11} width="50%" borderRadius="6px" />
        </div>
        <Skeleton width={72} height={48} borderRadius="12px" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton width={80} height={22} borderRadius="9999px" />
        <Skeleton width={90} height={22} borderRadius="9999px" />
        <Skeleton width={70} height={22} borderRadius="9999px" />
      </div>
      <Skeleton height={38} borderRadius="12px" />
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
  const initialFilters: FilterState = useMemo(() => ({
    province: bookingDraft?.locationDetails?.province ?? '',
    district: bookingDraft?.locationDetails?.district ?? '',
    jobTypes: [],
    minPrice: PRICE_MIN,
    maxPrice: PRICE_MAX,
    minRating: null,
  }), []);

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
    province:  appliedFilters.province  || undefined,
    district:  appliedFilters.district  || undefined,
    jobType:   appliedFilters.jobTypes.length > 0 ? appliedFilters.jobTypes.join(',') : undefined,
    minPrice:  appliedFilters.minPrice  > PRICE_MIN ? appliedFilters.minPrice  : undefined,
    maxPrice:  appliedFilters.maxPrice  < PRICE_MAX ? appliedFilters.maxPrice  : undefined,
    minRating: appliedFilters.minRating ?? undefined,
    sortBy,
    page,
    limit: PAGE_LIMIT,
  }), [appliedFilters, sortBy, page]);

  const { data, loading, error } = useQuery<SearchResult>(SEARCH_CAREGIVERS, {
    variables: { input: queryInput },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const caregivers   = data?.searchCaregivers.data ?? [];
  const pagination   = data?.searchCaregivers.pagination;
  const totalPages   = pagination?.totalPages ?? 1;
  const totalResults = pagination?.total ?? 0;

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  // Active filter count badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.province)            count++;
    if (appliedFilters.district)            count++;
    if (appliedFilters.jobTypes.length > 0) count++;
    if (appliedFilters.minPrice > PRICE_MIN) count++;
    if (appliedFilters.maxPrice < PRICE_MAX) count++;
    if (appliedFilters.minRating != null)   count++;
    return count;
  }, [appliedFilters]);

  return (
    <div className="min-h-screen bg-[#F6FAF9] px-4 md:px-8 py-6">
      <div className="max-w-[1280px] mx-auto">

        {/* ── Page Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
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
          <h1 className="text-[22px] font-bold text-[#1A1A1A] leading-tight"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ค้นหาผู้ดูแล
          </h1>
          {(appliedFilters.province || appliedFilters.district) && (
            <p className="text-[13px] text-[#8A8C8E] mt-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              <span className="material-icons text-[13px] text-[#52B69A] align-middle mr-0.5">place</span>
              {[appliedFilters.district, appliedFilters.province].filter(Boolean).join(', ')}
            </p>
          )}
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
                  <span>
                    พบ <span className="font-bold text-[#1A1A1A] num">{totalResults.toLocaleString()}</span> ผู้ดูแล
                  </span>
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

            {/* Loading skeleton grid */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: PAGE_LIMIT }).map((_, i) => (
                  <CaregiverCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Results grid */}
            {!loading && !error && caregivers.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {caregivers.map((cg) => (
                    <CaregiverCard key={cg.id} cg={cg} />
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
  );
}

export default SearchPage;
