import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import {
  GET_USER,
  GET_CAREGIVER_PROFILE,
  SET_CAREGIVER_SEARCHABLE,
  GET_UNREAD_COUNT,
} from '../../graphql/queries';
import Skeleton from '../../components/ui/Skeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import { Icon } from '../../components/ui/Icon';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';

interface UserData {
  me: {
    id: string;
    email: string;
    displayName?: string;
    role: number;
  };
}

interface CaregiverProfile {
  id: string;
  caregiverNumber?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  bio?: string;
  hourlyRate?: number;
  skills: string[];
  experienceYears?: number;
  kycStatus: string;
  isSearchable: boolean;
  updatedAt?: string;
}

interface CaregiverData {
  myCaregiverProfile: CaregiverProfile;
}

interface UnreadCountData {
  unreadCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function kycBadgeMeta(status: string) {
  switch (status) {
    case 'verified':
      return { label: 'ยืนยันแล้ว', badgeClass: 'bg-green-100 text-green-700', dotClass: 'bg-green-500' };
    case 'pending':
      return { label: 'รอการตรวจสอบ', badgeClass: 'bg-orange-100 text-orange-700', dotClass: 'bg-orange-500' };
    case 'rejected':
      return { label: 'เอกสารไม่ผ่าน', badgeClass: 'bg-red-100 text-red-700', dotClass: 'bg-red-500' };
    default:
      return { label: 'ยังไม่ยืนยัน', badgeClass: 'bg-gray-100 text-gray-600', dotClass: 'bg-gray-400' };
  }
}


function calcCompleteness(profile: CaregiverProfile): number {
  const checks: { weight: number; filled: boolean }[] = [
    { weight: 15, filled: !!profile.fullName },
    { weight: 10, filled: !!profile.bio },
    { weight: 10, filled: !!profile.phone },
    { weight: 10, filled: !!profile.address },
    { weight: 15, filled: !!profile.hourlyRate },
    { weight: 15, filled: (profile.skills?.length ?? 0) > 0 },
    { weight: 15, filled: !!profile.experienceYears },
    { weight: 5,  filled: !!profile.gender },
    { weight: 5,  filled: !!profile.dateOfBirth },
  ];
  return checks.reduce((sum, c) => sum + (c.filled ? c.weight : 0), 0);
}

function formatUpdatedAt(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const day = date.getDate();
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const cardBase =
  'bg-white rounded-2xl p-4 border border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.05)] flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]';

// ─── Sub-components ───────────────────────────────────────────────────────

interface HeroCardProps {
  readonly displayName: string;
  readonly caregiverNumber?: string;
  readonly isSearchable: boolean;
  readonly canToggle: boolean;
  readonly onToggle: () => void;
}

function HeroCard({ displayName, caregiverNumber, isSearchable, canToggle, onToggle }: HeroCardProps) {
  const initials = getInitials(displayName || 'C');

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#52B69A] to-[#168AAD] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl font-bold">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#8A8C8E]">ยินดีต้อนรับกลับ</p>
          <h1 className="text-[18px] font-bold text-[#1A1A1A] leading-tight truncate">{displayName}</h1>
          {caregiverNumber && (
            <p className="text-[11px] text-[#8A8C8E] font-mono mt-0.5">#{caregiverNumber}</p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#1A1A1A]">
            {isSearchable ? 'พร้อมรับงาน' : 'ไม่พร้อมรับงาน'}
          </p>
          <p className="text-[11px] text-[#8A8C8E] mt-0.5">
            {isSearchable
              ? 'ผู้ป่วยสามารถค้นหาและจองคุณได้'
              : canToggle
                ? 'เปิดสวิตช์เพื่อเริ่มรับงาน'
                : 'กรุณายืนยันตัวตนเพื่อเริ่มรับงาน'}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={!canToggle}
          aria-label={isSearchable ? 'ปิดการรับงาน' : 'เปิดการรับงาน'}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#52B69A] focus-visible:ring-offset-2 ${
            isSearchable ? 'bg-[#52B69A]' : 'bg-gray-200'
          } ${canToggle ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              isSearchable ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

interface StatsRowProps {
  readonly profile: CaregiverProfile;
}

function StatsRow({ profile }: StatsRowProps) {
  const skillCount = profile.skills?.length ?? 0;
  const stats = [
    {
      icon: 'payments',
      value: profile.hourlyRate ? `฿${profile.hourlyRate}` : '—',
      label: 'ต่อชั่วโมง',
      iconColor: 'text-[#52B69A]',
      iconBg: 'bg-[#EEF9F5]',
    },
    {
      icon: 'star',
      value: profile.experienceYears ? `${profile.experienceYears} ปี` : '—',
      label: 'ประสบการณ์',
      iconColor: 'text-[#F08C00]',
      iconBg: 'bg-[#FFF3E0]',
    },
    {
      icon: 'medical_services',
      value: skillCount > 0 ? String(skillCount) : '—',
      label: 'ทักษะ',
      iconColor: 'text-[#3B5BDB]',
      iconBg: 'bg-[#F0F4FF]',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white rounded-2xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)] flex flex-col items-center gap-1.5 text-center"
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.iconBg}`}>
            <Icon name={s.icon} size="medium" className={s.iconColor} color="currentColor" />
          </div>
          <span className="text-[15px] font-bold text-[#1A1A1A]">{s.value}</span>
          <span className="text-[10px] text-[#8A8C8E]">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

interface ProfileStatusCardProps {
  readonly profile: CaregiverProfile;
  readonly completeness: number;
}

function ProfileStatusCard({ profile, completeness }: ProfileStatusCardProps) {
  const kyc = kycBadgeMeta(profile.kycStatus);
  const barColor =
    completeness >= 80
      ? 'from-[#52B69A] to-[#76C893]'
      : completeness >= 50
        ? 'from-[#F08C00] to-[#FCC419]'
        : 'from-[#FA5252] to-[#FF8787]';
  const pctColor =
    completeness >= 80
      ? 'text-[#52B69A]'
      : completeness >= 50
        ? 'text-[#F08C00]'
        : 'text-[#FA5252]';

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[13px] font-semibold text-[#1A1A1A]">ความสมบูรณ์ของโปรไฟล์</span>
        <span className={`text-[13px] font-bold ${pctColor}`}>{completeness}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
          style={{ width: `${completeness}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusBadge {...kyc} />
          {profile.kycStatus !== 'verified' && profile.kycStatus !== 'pending' && (
            <Link
              to="/kyc"
              className="text-[13px] font-bold text-[#0D9488] hover:text-[#0b7f74] flex items-center gap-0.5 group"
            >
              <span className="underline">เริ่มยืนยันตัวตน</span>
              <Icon name="arrow_forward" size="small" className="text-[#0D9488] transition-transform duration-200 group-hover:translate-x-1" color="currentColor" />
            </Link>
          )}
        </div>
        <p className="text-[11px] text-[#8A8C8E]">อัปเดตเมื่อ {formatUpdatedAt(profile.updatedAt)}</p>
      </div>
    </div>
  );
}

interface QuickActionsProps {
  readonly unreadCount: number;
  readonly kycStatus: string;
}

function QuickActionsGrid({ unreadCount, kycStatus }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link to="/caregiver/bookings" className={`${cardBase} no-underline text-[#1A1A1A]`}>
        <div className="w-10 h-10 rounded-xl bg-[#F0F4FF] text-[#3B5BDB] flex items-center justify-center relative">
          <Icon name="work" size="large" color="currentColor" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
            3
          </span>
        </div>
        <div>
          <div className="text-[13px] font-semibold leading-tight">งานของฉัน</div>
          <div className="text-[11px] text-[#8A8C8E] mt-0.5">3 คำขอใหม่</div>
        </div>
      </Link>

      <Link to="/caregiver/settings/job-reception" className={`${cardBase} no-underline text-[#1A1A1A]`}>
        <div className="w-10 h-10 rounded-xl bg-[#EEF9F5] text-[#3A9A7E] flex items-center justify-center">
          <Icon name="tune" size="large" color="currentColor" />
        </div>
        <div>
          <div className="text-[13px] font-semibold leading-tight">ตั้งค่างาน</div>
          <div className="text-[11px] text-[#8A8C8E] mt-0.5">ตั้งเวลาว่างและอัตราค่าจ้าง</div>
        </div>
      </Link>

      <Link to="/caregiver/edit-profile" className={`${cardBase} no-underline text-[#1A1A1A]`}>
        <div className="w-10 h-10 rounded-xl bg-[#EEF9F5] text-[#3A9A7E] flex items-center justify-center">
          <Icon name="manage_accounts" size="large" color="currentColor" />
        </div>
        <div>
          <div className="text-[13px] font-semibold leading-tight">แก้ไขโปรไฟล์</div>
          <div className="text-[11px] text-[#8A8C8E] mt-0.5">แก้ไขข้อมูลส่วนตัว</div>
        </div>
      </Link>

      <Link to="/notifications" className={`${cardBase} no-underline text-[#1A1A1A]`}>
        <div className="w-10 h-10 rounded-xl bg-[#FFF3E0] text-[#F08C00] flex items-center justify-center relative">
          <Icon name="notifications" size="large" color="currentColor" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div>
          <div className="text-[13px] font-semibold leading-tight">การแจ้งเตือน</div>
          <div className="text-[11px] text-[#8A8C8E] mt-0.5">
            {unreadCount > 0 ? `${unreadCount} ยังไม่อ่าน` : 'ไม่มีการแจ้งเตือนใหม่'}
          </div>
        </div>
      </Link>
    </div>
  );
}

interface HintsProps {
  readonly kycStatus: string;
  readonly isVerified: boolean;
  readonly isSearchable: boolean;
  readonly completeness: number;
  readonly canToggle: boolean;
  readonly onToggle: () => void;
}

function ContextualHints({ kycStatus, isVerified, isSearchable, completeness, canToggle, onToggle }: HintsProps) {
  const hints: React.ReactNode[] = [];

  if (kycStatus === 'none') {
    hints.push(
      <div key="kyc-none" className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 flex gap-3 items-start">
        <Icon name="warning" size="large" color="#d97706" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            เริ่มต้นยืนยันตัวตนเพื่อเริ่มรับงาน
          </p>
          <Link
            to="/kyc"
            className="inline-block mt-1 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors no-underline"
          >
            เริ่มยืนยันตัวตน
          </Link>
        </div>
      </div>
    );
  }

  if (kycStatus === 'pending') {
    hints.push(
      <div key="kyc-pending" className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4 flex gap-3 items-start">
        <Icon name="schedule" size="large" color="#1d4ed8" />
        <p className="text-sm text-blue-800">
          กำลังตรวจสอบความถูกต้องของการยืนยันตัวตน โปรดรอประมาณ 1-3 วันทำการ
        </p>
      </div>
    );
  }

  if (isVerified && !isSearchable) {
    hints.push(
      <div key="enable-avail" className="bg-[#EEF9F5] border border-[#A7D8C2] rounded-2xl px-4 py-4 flex gap-3 items-start">
        <Icon name="info" size="large" color="#228B55" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1A5C3A] mb-1">
            เปิดสถานะพร้อมรับงานเพื่อให้ผู้ป่วยค้นหาคุณพบ
          </p>
          <button
            type="button"
            onClick={onToggle}
            disabled={!canToggle}
            className="mt-1 px-3 py-1.5 bg-[#52B69A] text-white text-xs font-semibold rounded-lg hover:bg-[#3A9A7E] transition-colors disabled:opacity-60"
          >
            เปิดใช้งานทันที
          </button>
        </div>
      </div>
    );
  }

  if (isVerified && isSearchable) {
    hints.push(
      <div key="ready" className="bg-[#EEF9F5] border border-[#A7D8C2] rounded-2xl px-4 py-4 flex gap-3 items-center">
        <Icon name="check_circle" size="large" color="#228B55" />
        <p className="text-sm font-semibold text-[#1A5C3A]">คุณพร้อมรับงานแล้ว ✓</p>
      </div>
    );
  }

  if (completeness < 80) {
    hints.push(
      <div key="complete-profile" className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-4 flex gap-3 items-start">
        <Icon name="person_add" size="large" color="#7c3aed" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-purple-800 mb-1">
            กรอกข้อมูลโปรไฟล์ให้สมบูรณ์เพื่อเพิ่มโอกาสในการได้งาน
          </p>
          <Link
            to="/caregiver/edit-profile"
            className="inline-block mt-1 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors no-underline"
          >
            แก้ไขโปรไฟล์
          </Link>
        </div>
      </div>
    );
  }

  if (hints.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-bold text-[#1A1A1A]">คำแนะนำ</h2>
      {hints}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

const CaregiverHome: React.FC = () => {
  const { data, loading } = useQuery<UserData>(GET_USER);
  const { data: caregiverData, loading: caregiverLoading } = useQuery<CaregiverData>(GET_CAREGIVER_PROFILE);
  const { data: unreadData } = useQuery<UnreadCountData>(GET_UNREAD_COUNT, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  });
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();

  const [optimisticSearchable, setOptimisticSearchable] = useState<boolean | null>(null);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [setCaregiverSearchable] = useMutation(SET_CAREGIVER_SEARCHABLE);

  const profile = caregiverData?.myCaregiverProfile;
  const isSearchable = optimisticSearchable ?? profile?.isSearchable ?? false;
  const kycStatus = profile?.kycStatus ?? 'none';
  const isVerified = kycStatus === 'verified';
  const completeness = profile ? calcCompleteness(profile) : 0;
  const unreadCount = unreadData?.unreadCount ?? 0;
  const canToggle = isVerified && !togglingAvail;
  const displayName = profile?.fullName || data?.me?.displayName || 'ผู้ดูแล';
  const isLoading = loading || caregiverLoading;

  const handleToggleAvailability = async () => {
    if (!canToggle) return;
    const prev = isSearchable;
    const next = !prev;
    setOptimisticSearchable(next);
    setTogglingAvail(true);
    try {
      await setCaregiverSearchable({
        variables: { isSearchable: next },
        refetchQueries: [{ query: GET_CAREGIVER_PROFILE }],
        awaitRefetchQueries: true,
      });
      setOptimisticSearchable(null);
      showSuccess(next ? 'เปิดสถานะพร้อมรับงานแล้ว' : 'ปิดสถานะพร้อมรับงานแล้ว');
    } catch {
      setOptimisticSearchable(prev);
      showError('ไม่สามารถอัปเดตสถานะการรับงานได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setTogglingAvail(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#F6FAF9] text-[#1A1A1A] antialiased" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        <main className="max-w-2xl mx-auto px-4 pt-6 pb-24 flex flex-col gap-4">

          {/* Hero card */}
          {isLoading ? (
            <Skeleton height={148} borderRadius={20} />
          ) : (
            <HeroCard
              displayName={displayName}
              caregiverNumber={profile?.caregiverNumber}
              isSearchable={isSearchable}
              canToggle={canToggle}
              onToggle={handleToggleAvailability}
            />
          )}

          {/* Stats row */}
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} height={96} borderRadius={16} />)}
            </div>
          ) : profile && (
            <StatsRow profile={profile} />
          )}

          {/* Profile completeness + KYC status */}
          {isLoading ? (
            <Skeleton height={90} borderRadius={20} />
          ) : profile && (
            <ProfileStatusCard profile={profile} completeness={completeness} />
          )}

          {/* Quick actions */}
          <section>
            <h2 className="text-[15px] font-bold text-[#1A1A1A] mb-3">ทางลัด</h2>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={110} borderRadius={16} />)}
              </div>
            ) : (
              <QuickActionsGrid unreadCount={unreadCount} kycStatus={kycStatus} />
            )}
          </section>

          {/* Contextual hints */}
          {!isLoading && profile && (
            <ContextualHints
              kycStatus={kycStatus}
              isVerified={isVerified}
              isSearchable={isSearchable}
              completeness={completeness}
              canToggle={canToggle}
              onToggle={handleToggleAvailability}
            />
          )}

        </main>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default CaregiverHome;
