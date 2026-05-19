import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '../../context/AuthContext';
import { GET_USER, ADMIN_KYC_LIST } from '../../graphql/queries';
import StatusBadge from '../../components/ui/StatusBadge';
import type { StatusBadgeMeta } from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';

const statusMeta: Record<string, StatusBadgeMeta> = {
  pending:  { label: 'รอตรวจสอบ', badgeClass: 'bg-[#FFF1E8] text-[#B4532A]', dotClass: 'bg-[#C65A3A]' },
  verified: { label: 'อนุมัติแล้ว', badgeClass: 'bg-[#ECFDF5] text-[#0D9488]', dotClass: 'bg-[#0D9488]' },
  rejected: { label: 'ปฏิเสธ',     badgeClass: 'bg-[#FEF2F2] text-[#DC2626]', dotClass: 'bg-[#DC2626]' },
  none:     { label: 'ยังไม่ส่ง',   badgeClass: 'bg-gray-100 text-gray-500',   dotClass: 'bg-gray-400' },
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ---- Sidebar Nav Items ----
const navItems = [
  {
    label: 'Dashboard',
    path: '/admin',
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'KYC Review',
    path: '/admin/kyc',
    exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
];

// ---- Stat Card ----
interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  loading: boolean;
}

function StatCard({ label, value, icon, iconBg, iconColor, loading }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 flex-1">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <p className="text-sm text-[#8A8C8E] font-medium" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>{label}</p>
        {loading ? (
          <Skeleton height={28} width={48} borderRadius="6px" style={{ marginTop: 4 }} />
        ) : (
          <p className="text-2xl font-bold text-[#1A1A1A] mt-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>{value ?? 0}</p>
        )}
      </div>
    </div>
  );
}

// ---- Main Component ----
export default function Admin() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: userData } = useQuery<{ me: { displayName?: string; email?: string } }>(GET_USER);
  const { data: kycData, loading: kycLoading } = useQuery(ADMIN_KYC_LIST, {
    variables: { status: 'all', page: 1, limit: 5 },
  });

  const displayName = userData?.me?.displayName || user?.email?.split('@')[0] || 'Admin';
  const allCount     = kycData?.allCount?.total     ?? 0;
  const pendingCount = kycData?.pendingCount?.total  ?? 0;
  const verifiedCount= kycData?.verifiedCount?.total ?? 0;
  const rejectedCount= kycData?.rejectedCount?.total ?? 0;
  const recentItems  = kycData?.list?.items ?? [];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className="w-[240px] fixed top-0 left-0 h-screen bg-white border-r border-gray-100 flex flex-col z-40">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#52B69A] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C7 2 3 6.5 3 12h2c0-3.87 3.13-7 7-7s7 3.13 7 7h2C21 6.5 17 2 12 2z"/>
                <path d="M11 12h2v8a1 1 0 0 1-2 0v-8z"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-[#1A1A1A]">Payung</span>
            <span className="text-[10px] font-semibold bg-[#E6F5ED] text-[#52B69A] px-1.5 py-0.5 rounded-md">Admin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#E6F5ED] text-[#52B69A]'
                    : 'text-[#575859] hover:bg-gray-50 hover:text-[#1A1A1A]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-[#52B69A]' : 'text-[#8A8C8E]'}>{item.icon}</span>
                  {item.label}
                  {item.path === '/admin/kyc' && pendingCount > 0 && (
                    <span className="ml-auto bg-[#F59E0B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {pendingCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-[#575859] hover:bg-red-50 hover:text-red-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {isLoggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">

        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Dashboard</h1>
            <p className="text-xs text-[#8A8C8E] mt-0.5">ภาพรวมระบบ Payung</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-[#1A1A1A]">{displayName}</p>
              <p className="text-xs text-[#8A8C8E]">{user?.email || ''}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#52B69A] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {getInitials(displayName)}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-8 py-8">

          {/* Stat Cards */}
          <div className="flex gap-5 mb-8">
            <StatCard
              label="KYC ทั้งหมด"
              value={allCount}
              loading={kycLoading}
              iconBg="bg-[#E6F5ED]"
              iconColor="text-[#52B69A]"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              }
            />
            <StatCard
              label="รอตรวจสอบ"
              value={pendingCount}
              loading={kycLoading}
              iconBg="bg-[#FFF7ED]"
              iconColor="text-[#F59E0B]"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              }
            />
            <StatCard
              label="อนุมัติแล้ว"
              value={verifiedCount}
              loading={kycLoading}
              iconBg="bg-[#ECFDF5]"
              iconColor="text-[#10B981]"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              }
            />
            <StatCard
              label="ปฏิเสธ"
              value={rejectedCount}
              loading={kycLoading}
              iconBg="bg-[#FEF2F2]"
              iconColor="text-[#EF4444]"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              }
            />
          </div>

          {/* Recent KYC Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1A1A1A]">KYC ล่าสุด</h2>
                <p className="text-xs text-[#8A8C8E] mt-0.5">รายการที่ส่งล่าสุด 5 รายการ</p>
              </div>
              <button
                onClick={() => navigate('/admin/kyc')}
                className="text-sm font-semibold text-[#52B69A] hover:underline transition"
              >
                ดูทั้งหมด →
              </button>
            </div>

            {kycLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} height={44} borderRadius="10px" />
                ))}
              </div>
            ) : recentItems.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[#8A8C8E] text-sm">ยังไม่มีรายการ KYC</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#8A8C8E] w-[130px]">รหัส</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#8A8C8E]">ชื่อผู้ดูแล</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#8A8C8E]">อีเมล</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#8A8C8E] w-[140px]">สถานะ</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#8A8C8E] w-[120px]">วันที่ส่ง</th>
                    <th className="px-6 py-3 w-[80px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-100">
                      <td className="px-6 py-3.5 text-[#8A8C8E] text-xs font-mono">
                        {item.caregiverNumber || '-'}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-[#1A1A1A]">{item.fullName}</td>
                      <td className="px-6 py-3.5 text-[#575859]">{item.email}</td>
                      <td className="px-6 py-3.5">
                        <StatusBadge meta={statusMeta[item.kycStatus] ?? statusMeta.none} />
                      </td>
                      <td className="px-6 py-3.5 text-[#8A8C8E] text-xs">{formatDate(item.submittedAt)}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => navigate(`/admin/kyc/${item.id}`)}
                          className="text-xs font-semibold text-[#52B69A] hover:underline"
                        >
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
