import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { NetworkStatus } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useBooking } from '../../context/BookingContext';
import { useMatchingBooking } from '../../hooks/useMatchingBooking';
import { formatDisplayPrice, NO_PRICE_LABEL } from '../../lib/displayPrice';
import { ELIGIBLE_CAREGIVERS } from '../../graphql/queries';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import CaregiverPhoto from '../../components/ui/CaregiverPhoto';
import BookingConfirmModal from '../../components/ui/BookingConfirmModal';
import { useSignedUrlRefresh } from '../../hooks/useSignedPhoto';
import { BOOKING_REVIEW_STEP } from '../../lib/assessmentNav';
import ThailandAddressSimple from 'thailand-address-simple';
import { displaySkills } from '../../lib/skillLabels';
import ProfessionBadge from '../../components/ui/ProfessionBadge';
import CareLevelBadge from '../../components/ui/CareLevelBadge';
import { toCareLevel } from '../../lib/careLevels';
import {
  BookingNotMatchableState,
  NoEligibleCaregiverState,
  NotEligibleNotice,
} from '../../components/booking/CaregiverMatchStates';
import { isBookingNotMatchableError, type AdminContact } from '../../lib/caregiverMatch';
import { useCaregiverMatchStrings } from '../../lib/caregiverMatchStrings';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CaregiverSummary {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  hourlyRate: number;
  avgRating?: number | null;
  reviewCount: number;
  skills: string[];
  /** PYG-655: ทักษะอื่นๆ (BE otherSkills) */
  customSkills?: string[];
  province: string;
  district: string;
  // ── Newly surfaced to match the Patient page CGRow card. ──
  // All optional: the card renders each only when the backend supplies it.
  bio?: string | null;
  experience?: number | null;       // years
  // BE เก็บเป็น 'male' | 'female' | 'other' (null = caregiver ยังไม่ได้กรอกตอน KYC)
  gender?: string | null;
  distance?: number | null;         // km
  verified?: boolean;
  /** PYG-556: general_caregiver | nurse | physiotherapist — CaregiverSummary.profession (PYG-575) */
  profession?: string | null;
  /** PYG-648 · S18: BASIC | INTERMEDIATE | ADVANCED — ทุกคนใน eligibleCaregivers มีระดับเสมอ */
  careLevel?: string | null;
}

interface EligibleResult {
  eligibleCaregivers: {
    caregivers: CaregiverSummary[];
    emptyMessage: string | null;
    adminContact: AdminContact | null;
  };
}

interface FilterState {
  province: string;
  district: string;
  minPrice: number;
  maxPrice: number;
  minRating: number | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

// ค่าที่ไม่รู้จัก (หรือยังไม่ได้กรอก) → ไม่แสดงทั้งไอคอนและบรรทัดเพศ ดีกว่าเดาเป็นชาย/หญิง
// ไอคอนมี title/aria-label กำกับเสมอ — สีอย่างเดียวสื่อความหมายไม่ได้สำหรับคนตาบอดสี
const GENDER_DISPLAY: Record<string, { label: string; icon: string; color: string }> = {
  male:   { label: 'ชาย',    icon: 'male',        color: '#2563EB' },
  female: { label: 'หญิง',   icon: 'female',      color: '#DB2777' },
  other:  { label: 'อื่น ๆ', icon: 'transgender', color: '#7C3AED' },
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

function CaregiverCard({ cg, onSelect, onViewProfile, onPhotoExpired }: { cg: CaregiverSummary; onSelect?: (cg: CaregiverSummary) => void; onViewProfile?: (cg: CaregiverSummary) => void; onPhotoExpired?: () => void }) {
  const fullName = cg.fullName;
  const hasRating = cg.avgRating != null && cg.reviewCount > 0;
  const translatedSkills = displaySkills(cg.skills, cg.customSkills);
  const visibleSkills = translatedSkills.slice(0, 3);
  const extraSkills = translatedSkills.length - 3;
  const gender = GENDER_DISPLAY[cg.gender ?? ''] ?? null;
  const hasMeta = gender != null || cg.experience != null;
  const profession = cg.profession;
  const hasCareLevel = toCareLevel(cg.careLevel) != null;

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
          <CaregiverPhoto
            src={cg.avatarUrl}
            size={120}
            onExpired={onPhotoExpired}
            frameStyle={{ border: '3px solid #FFFFFF', boxShadow: '0 4px 16px rgba(82,182,154,0.2)' }}
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
            {gender && (
              <span
                className="material-icons shrink-0"
                style={{ fontSize: 18, color: gender.color }}
                title={`เพศ: ${gender.label}`}
                aria-label={`เพศ: ${gender.label}`}
                role="img"
              >
                {gender.icon}
              </span>
            )}
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

          {/* วิชาชีพ (PYG-556 · S01-AC3) + ระดับ (PYG-648 · S18) — บรรทัดของตัวเอง ไม่เบียดชื่อกับดาวรีวิว
              ลำดับ วิชาชีพ → ระดับ เสมอ · flex-wrap กัน "นักกายภาพบำบัด" + ป้ายระดับล้นที่จอแคบ */}
          {(profession || hasCareLevel) && (
            <div className="flex flex-wrap gap-1.5 mt-0.5 mb-0.5">
              <ProfessionBadge profession={profession} />
              <CareLevelBadge level={cg.careLevel} />
            </div>
          )}

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
              {gender && <span>เพศ: {gender.label}</span>}
              {gender && cg.experience != null && <span className="text-[#E0E2E5]">·</span>}
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
          {translatedSkills.length > 0 && (
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
          {formatDisplayPrice(cg.hourlyRate) ? (
            <div className="num text-[24px] font-bold text-[#1A1A1A] leading-none mb-1">
              {formatDisplayPrice(cg.hourlyRate)}
              <span className="text-[13px] text-[#8A8C8E] font-medium">/ชม.</span>
            </div>
          ) : (
            <div className="text-[13px] text-[#8A8C8E] font-medium leading-none mb-1">{NO_PRICE_LABEL}</div>
          )}
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
          {/* ที่ของป้ายวิชาชีพ (แคปซูล) + ป้ายระดับ (เหลี่ยม) */}
          <div className="flex gap-1.5">
            <Skeleton width={112} height={24} borderRadius="9999px" />
            <Skeleton width={84} height={24} borderRadius="6px" />
          </div>
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
  // PYG-648: รายชื่อกรองตาม booking ที่สร้างตอนกด "เริ่มต้นค้นหาผู้ดูแล" — ยังไม่มี (เช่น draft จากก่อนอัปเดต)
  // → กลับไปหน้าการจองโดยไม่ล้าง draft (resume state) ให้กดค้นหาใหม่
  if (!bookingDraft.matchingBooking?.id) {
    return <Navigate to="/booking/new" replace state={{ resumeStep: BOOKING_REVIEW_STEP }} />;
  }

  return <SearchPageContent bookingId={bookingDraft.matchingBooking.id} />;
};

// Separate inner component so hooks always run after the guard check
function SearchPageContent({ bookingId }: { bookingId: string }) {
  const { bookingDraft } = useBooking();
  const navigate = useNavigate();
  const location = useLocation();
  const matchText = useCaregiverMatchStrings();

  // S18 · E9: BE ตอบ CAREGIVER_NOT_ELIGIBLE ตอนกดยืนยัน → modal ปิดปุ่มยืนยัน ให้กด "เลือกผู้ดูแลคนอื่น"
  const [notEligible, setNotEligible] = useState(false);
  // ชื่อผู้ดูแลที่รับงานไม่ได้แล้ว สำหรับแถบแจ้งเหนือรายชื่อ · มาจาก modal หน้านี้ หรือจาก CaregiverProfilePage (location.state)
  const [notEligibleName, setNotEligibleName] = useState<string | null>(
    () => (location.state as { notEligibleName?: string } | null)?.notEligibleName ?? null,
  );
  useEffect(() => {
    // ล้าง state ออกจาก history ไม่ให้แถบแจ้งกลับมาเมื่อรีเฟรช / กดย้อนกลับ
    if ((location.state as { notEligibleName?: string } | null)?.notEligibleName) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const [bookingCaregiver, setBookingCaregiver] = useState<CaregiverSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  // S08 / แบบประเมิน / ความยินยอม / เวลา ถูกตรวจตอนสร้าง booking ที่ขั้นตรวจสอบแล้ว — หน้านี้เหลือแค่การเลือกผู้ดูแล
  const { select } = useMatchingBooking();

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
    minPrice: PRICE_MIN,
    maxPrice: PRICE_MAX,
    minRating: null,
  }), [bookingDraft]);

  const [pendingFilters, setPendingFilters] = useState<FilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters);
  const [sortBy, setSortBy] = useState<string>('RATING_DESC');
  const [page, setPage] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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
  // PYG-648 · S18: BE คืนผู้ดูแลที่ผ่านเงื่อนไขของ booking ทั้งหมดในครั้งเดียว (ไม่มีตัวกรอง/แบ่งหน้า)
  // network-only: ผลขึ้นกับข้อมูลล่าสุดของผู้ดูแล — E9 ต้องได้รายชื่อใหม่จริงหลังเลือกคนที่ไม่ผ่าน
  const { data, loading: gqlLoading, error: gqlError, refetch, networkStatus } = useQuery<EligibleResult>(ELIGIBLE_CAREGIVERS, {
    variables: { bookingId },
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  // PYG-512: รูปผู้ดูแลเป็น signed URL อายุ 1 ชม. — โหลดไม่ขึ้นเมื่อไหร่ค่อยขอผลค้นหาชุดใหม่
  const refreshPhotos = useSignedUrlRefresh(refetch);

  const eligible = data?.eligibleCaregivers;
  const allEligible = useMemo(() => eligible?.caregivers ?? [], [eligible]);

  // ตัวกรอง/เรียงลำดับเดิมของหน้า List ทำฝั่ง FE บนรายชื่อที่ผ่านแล้ว — กติกาเดียวกับ SearchService
  const filtered = useMemo(() => {
    const f = appliedFilters;
    // ไม่มีราคา (0) = ไม่ผ่านตัวกรองราคา เหมือน SQL ที่ NULL เทียบแล้วเป็นเท็จ
    const priceOf = (cg: CaregiverSummary) => (cg.hourlyRate > 0 ? cg.hourlyRate : null);
    const list = allEligible.filter((cg) => {
      if (f.province && cg.province !== f.province) return false;
      // service_area_district เก็บได้หลายเขตคั่นด้วย ","
      if (f.district && cg.district !== f.district && !(cg.district ?? '').split(',').includes(f.district)) return false;
      const price = priceOf(cg);
      if (f.minPrice > PRICE_MIN && (price == null || price < f.minPrice)) return false;
      if (f.maxPrice < PRICE_MAX && (price == null || price > f.maxPrice)) return false;
      if (f.minRating != null && (cg.avgRating ?? 0) < f.minRating) return false;
      return true;
    });
    // sort ของ JS เป็น stable → คะแนนเท่ากันคงลำดับจาก BE (List เดิม + id เป็นตัวตัดสิน)
    if (sortBy === 'PRICE_ASC' || sortBy === 'PRICE_DESC') {
      const dir = sortBy === 'PRICE_ASC' ? 1 : -1;
      return [...list].sort((a, b) => {
        const pa = priceOf(a);
        const pb = priceOf(b);
        if (pa == null || pb == null) return pa == null ? (pb == null ? 0 : 1) : -1; // NULLS LAST
        return (pa - pb) * dir;
      });
    }
    return [...list].sort((a, b) => {
      if (a.avgRating == null || b.avgRating == null) {
        return a.avgRating == null ? (b.avgRating == null ? 0 : 1) : -1; // NULLS LAST
      }
      return b.avgRating - a.avgRating;
    });
  }, [allEligible, appliedFilters, sortBy]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_LIMIT));
  // รายชื่อหดหลังโหลดใหม่ (E9) → หน้าที่อยู่อาจเกินจำนวนหน้า ไม่ให้เห็นหน้าว่าง
  const currentPage = Math.min(page, totalPages);
  const caregivers = filtered.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT);
  // refetch เพื่อเอารูปใบใหม่ต้องเกิดเงียบ ๆ ข้างหลัง ไม่สลับทั้งรายการเป็น skeleton
  const loading = gqlLoading && networkStatus !== NetworkStatus.refetch;
  const error = gqlError;
  // S18 · E2: booking ยังกรองไม่ได้ — ไม่ใช่ "โหลดไม่สำเร็จ" ขั้นถัดไปคือกลับไปแก้การจอง
  const notMatchable = !!error && isBookingNotMatchableError(error);

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  const handleSelect = useCallback((cg: CaregiverSummary) => {
    setBookingCaregiver(cg);
  }, []);

  // PYG-648 · S18: booking ถูกสร้างไว้แล้วตอนกดค้นหา (ทั้งจองเอง และ PYG-385 จองแทนในกลุ่ม)
  // ตรงนี้แค่ผูกผู้ดูแล — BE ตรวจเงื่อนไข + ตารางว่างซ้ำ ไม่ผ่าน = E9
  const handleConfirmBooking = useCallback(async () => {
    if (!bookingCaregiver || !bookingDraft) return;
    setIsSubmitting(true);
    setBookingError(null);
    setNotEligible(false);
    try {
      const result = await select(bookingDraft, bookingCaregiver.id);
      if (!result.ok) {
        setNotEligible(result.notEligible);
        setBookingError(result.message);
        return;
      }
      setBookingCaregiver(null);
      navigate('/booking/success', {
        state: {
          ref: result.bookingId,
          caregiverName: bookingCaregiver.fullName,
          ...(bookingDraft.onBehalf ? { onBehalfOf: bookingDraft.onBehalf.recipientName } : {}),
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [bookingCaregiver, bookingDraft, navigate, select]);

  // S18 · E9: ปิด modal → โหลดรายชื่อใหม่ (คนเดิมหายเมื่อ BE กรอง) → แถบแจ้งเหนือรายชื่อ
  // รายชื่อใหม่ว่าง → ตกไปที่สถานะ AC7 เอง
  const handleChooseAnother = useCallback(() => {
    if (bookingCaregiver) setNotEligibleName(bookingCaregiver.fullName);
    setBookingCaregiver(null);
    setBookingError(null);
    setNotEligible(false);
    // ล้มเหลว → hook ตั้ง error ให้หน้าแสดงกล่องโหลดไม่สำเร็จเอง ไม่ต้องจับซ้ำ
    refetch().catch(() => undefined);
  }, [bookingCaregiver, refetch]);

  const handleViewProfile = useCallback((cg: CaregiverSummary) => {
    navigate(`/caregivers/${cg.id}`, { state: { caregiver: cg } });
  }, [navigate]);

  // กลับไปขั้นตรวจสอบโดยไม่ล้าง draft — แก้แล้วกดค้นหาใหม่ ขั้นนั้นยกเลิก booking ใบเดิมให้เอง
  // history.back() หลุดออกนอกแอปไปหน้าว่างได้ ถ้า /search เป็น entry แรกของ tab → สั่ง router ตรง ๆ
  const backToBooking = useCallback(() => {
    navigate('/booking/new', { state: { resumeStep: BOOKING_REVIEW_STEP } });
  }, [navigate]);

  // Active filter count badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.province) count++;
    if (appliedFilters.district) count++;
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
              onClick={backToBooking}
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
                   
                    {/* S18: จำนวน + เหตุผลที่รายชื่อสั้น · ว่าง → ซ่อนจำนวน เหลือเหตุผล (ไม่บอกจำนวนคนที่ถูกตัด R9) */}
                    <span className="text-[#575859]">
                      {totalResults > 0 && (
                        <>
                          <b className="font-semibold text-[#1A1A1A]">{matchText.count(totalResults)}</b>
                          {' · '}
                        </>
                      )}
                      {matchText.scoped}
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

            {/* S18 · มือถือไม่มีหัวเรื่อง → หัวรายชื่อ 2 บรรทัด (จำนวน + เหตุผล) */}
            {!error && (
              <div className="lg:hidden mb-3 px-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {!loading && totalResults > 0 && (
                  <p className="text-[16px] font-bold text-[#1A1A1A]">{matchText.count(totalResults)}</p>
                )}
                <p className="text-[13px] text-[#575859] mt-0.5">{matchText.scoped}</p>
              </div>
            )}

            {/* S18 · E9: ผู้ดูแลที่เลือกรับงานนี้ไม่ได้แล้ว — แจ้งหลังโหลดรายชื่อใหม่ */}
            {notEligibleName && (
              <div className="mb-3">
                <NotEligibleNotice name={notEligibleName} onDismiss={() => setNotEligibleName(null)} />
              </div>
            )}

            {/* S18 · E2: booking ยังกรองไม่ได้ */}
            {notMatchable && !loading && (
              <BookingNotMatchableState onBack={backToBooking} />
            )}

            {/* Error state — แยกจากรายชื่อว่าง (AC7): สีแดง แนวนอน มีปุ่มลองอีกครั้ง ไม่มีช่องติดต่อแอดมิน */}
            {error && !loading && !notMatchable && (
              <div className="bg-[#FEF2F2] border border-red-200 rounded-2xl p-5 mb-4 flex items-start gap-3">
                <span className="material-icons text-red-400 text-[20px]">error_outline</span>
                <div>
                  <p className="text-[13px] font-bold text-[#DC2626]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                    {matchText.errorTitle}
                  </p>
                  <p className="text-[12px] text-[#8A8C8E] mt-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                    {matchText.errorBody}
                  </p>
                  <button
                    type="button"
                    onClick={() => { refetch().catch(() => undefined); }}
                    className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white border border-red-300 text-[#DC2626] text-[13px] font-bold hover:bg-red-50 transition-colors cursor-pointer"
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                  >
                    <span className="material-icons text-[16px]" aria-hidden="true">refresh</span>
                    {matchText.retry}
                  </button>
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
                    <CaregiverCard key={cg.id} cg={cg} onSelect={handleSelect} onViewProfile={handleViewProfile} onPhotoExpired={refreshPhotos} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center">
                    <Pagination
                      page={currentPage}
                      totalPages={totalPages}
                      onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    />
                  </div>
                )}

                {/* Result summary — หน้าเดียวไม่ต้องบอก "แสดง 1–1 จาก 1" (รายชื่อ 1 คนต้องดูปกติ ไม่เหมือนโหลดไม่ครบ) */}
                {totalPages > 1 && (
                  <p className="text-center text-[12px] text-[#C6C8CB] mt-3"
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                    แสดง {Math.min((currentPage - 1) * PAGE_LIMIT + 1, totalResults)}–{Math.min(currentPage * PAGE_LIMIT, totalResults)} จาก {totalResults.toLocaleString()} รายการ
                  </p>
                )}
              </>
            )}

            {/* Empty state */}
            {!loading && !error && caregivers.length === 0 && (
              // AC7: ไม่มีใครผ่านเงื่อนไขของ booking เลย ≠ ตัวกรองที่ญาติปรับเองตัดจนหมด (รีเซ็ตตัวกรอง)
              allEligible.length === 0 ? (
                <NoEligibleCaregiverState contact={eligible?.adminContact} onEditBooking={backToBooking} />
              ) : (
                <EmptyState onReset={resetFilters} />
              )
            )}
          </div>
        </div>
      </div>
    </div>

    <BookingConfirmModal
      isOpen={bookingCaregiver !== null}
      // E9: ปิด modal เฉย ๆ ก็ต้องได้รายชื่อชุดใหม่ ไม่ค้างคนเดิมไว้โดยไม่มีคำอธิบาย
      onClose={notEligible ? handleChooseAnother : () => { setBookingCaregiver(null); setBookingError(null); }}
      onConfirm={handleConfirmBooking}
      caregiver={bookingCaregiver ?? undefined}
      bookingDraft={bookingDraft}
      isSubmitting={isSubmitting}
      errorMessage={bookingError ?? undefined}
      confirmDisabled={notEligible}
      errorAction={notEligible ? { label: matchText.notEligibleAction, onClick: handleChooseAnother } : undefined}
      onPhotoExpired={refreshPhotos}
    />
    </>
  );
}

export default SearchPage;
