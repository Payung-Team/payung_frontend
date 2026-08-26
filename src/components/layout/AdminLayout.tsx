import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '../../context/AuthContext';
import { GET_USER, ADMIN_PENDING_COUNT, ADMIN_DISPUTE_PENDING_COUNT } from '../../graphql/queries';
import AdminSidebar from './AdminSidebar';

interface UserData {
  me: { displayName?: string };
}

interface PendingCountData {
  pendingCount: { total: number };
}

interface DisputeCountData {
  flaggedCount: { totalCount: number };
}

function formatThaiDate(date: Date): string {
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getPageInfo(pathname: string): { title: string; breadcrumb: string } {
  if (pathname === '/admin') return { title: 'Dashboard', breadcrumb: 'หน้าหลัก / Dashboard' };
  if (pathname === '/admin/kyc') return { title: 'KYC Review', breadcrumb: 'หน้าหลัก / KYC Review' };
  if (pathname.startsWith('/admin/kyc/')) return { title: 'ตรวจสอบ KYC', breadcrumb: 'หน้าหลัก / KYC Review / ตรวจสอบ' };
  if (pathname === '/admin/users') return { title: 'จัดการผู้ใช้', breadcrumb: 'หน้าหลัก / จัดการผู้ใช้' };
  if (pathname.startsWith('/admin/users/')) return { title: 'รายละเอียดผู้ดูแล', breadcrumb: 'หน้าหลัก / จัดการผู้ใช้ / รายละเอียดผู้ดูแล' };
  if (pathname === '/admin/payments') return { title: 'Payments', breadcrumb: 'หน้าหลัก / Payments' };
  if (pathname === '/admin/disputes') return { title: 'จัดการคำร้อง', breadcrumb: 'หน้าหลัก / จัดการคำร้อง' };
  if (pathname.startsWith('/admin/disputes/')) return { title: 'ตรวจสอบคำร้อง', breadcrumb: 'หน้าหลัก / จัดการคำร้อง / รายละเอียด' };
  return { title: 'Admin', breadcrumb: 'หน้าหลัก / Admin' };
}

const BOTTOM_NAV_ITEMS = [
  { to: '/admin',       label: 'Dashboard',    icon: 'dashboard',            end: true  },
  { to: '/admin/kyc',   label: 'KYC Review',   icon: 'fact_check',           end: false },
  { to: '/admin/users', label: 'จัดการผู้ใช้',  icon: 'admin_panel_settings', end: false },
  { to: '/admin/payments', label: 'Payments',  icon: 'payments',             end: false },
  { to: '/admin/disputes', label: 'คำร้อง',     icon: 'gavel',                end: false },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('admin-sidebar-collapsed') === 'true',
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    function handleOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [profileOpen]);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('admin-sidebar-collapsed', String(next));
      return next;
    });
  };

  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { data: userData } = useQuery<UserData>(GET_USER);
  const { data: countData } = useQuery<PendingCountData>(ADMIN_PENDING_COUNT, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  });
  const { data: disputeCountData } = useQuery<DisputeCountData>(ADMIN_DISPUTE_PENDING_COUNT, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  });

  const displayName = userData?.me?.displayName || 'Admin';
  const pendingKyc = countData?.pendingCount?.total ?? 0;
  const pendingDisputes = disputeCountData?.flaggedCount?.totalCount ?? 0;
  const { title, breadcrumb } = getPageInfo(pathname);
  const initial = displayName.charAt(0).toUpperCase() || 'A';
  const today = formatThaiDate(new Date());

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#F9FAFB',
        fontFamily: 'Inter,sans-serif',
      }}
    >
      {/* Sidebar — desktop only */}
      <div className="hidden lg:flex lg:flex-col lg:shrink-0">
        <AdminSidebar
          pendingKyc={pendingKyc}
          pendingDisputes={pendingDisputes}
          displayName={displayName}
          onLogout={handleLogout}
          collapsed={collapsed}
        />
      </div>

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* TopBar */}
        <header
          style={{
            height: 64,
            background: 'white',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Desktop hamburger — toggles sidebar collapse */}
            <button
              type="button"
              className="hidden lg:flex"
              onClick={toggleCollapse}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, alignItems: 'center', color: '#6B7280' }}
            >
              <span className="material-icons" style={{ fontSize: 22 }}>menu</span>
            </button>
            <div>
              <div className="hidden sm:block" style={{ color: '#9CA3AF', fontSize: 11, fontFamily: 'Inter,sans-serif' }}>
                {breadcrumb}
              </div>
              <div style={{ color: '#064E3B', fontWeight: 700, fontSize: 20, fontFamily: 'Inter,sans-serif', lineHeight: 1.2 }}>
                {title}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="hidden sm:inline" style={{ color: '#9CA3AF', fontSize: 12, fontFamily: 'Inter,sans-serif' }}>
              {today}
            </span>

            {/* Bell */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 36, height: 36,
                background: '#F3F4F6', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-icons" style={{ fontSize: 16, color: '#9CA3AF' }}>notifications</span>
              </div>
              <div style={{
                position: 'absolute', top: -2, right: -2,
                width: 8, height: 8, borderRadius: '50%',
                background: '#EF4444',
              }} />
            </div>

            {/* Avatar + profile dropdown */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setProfileOpen(prev => !prev)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#A7F3D0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                <span style={{ color: '#064E3B', fontWeight: 700, fontSize: 14 }}>{initial}</span>
              </button>

              {profileOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'white', borderRadius: 10,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  border: '1px solid #E5E7EB',
                  minWidth: 200, zIndex: 100,
                  overflow: 'hidden',
                }}>
                  {/* Profile info */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Administrator</div>
                  </div>

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '10px 16px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      color: '#DC2626', fontSize: 13,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span className="material-icons" style={{ fontSize: 16 }}>logout</span>{' '}
                    ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable page content — pb-16 on mobile to clear bottom nav */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#F9FAFB' }} className="pb-16 lg:pb-0">
          <Outlet />
        </div>

      </div>

      {/* Mobile bottom nav — lg:hidden */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200">
        <div className="flex items-stretch">
          {BOTTOM_NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-2 px-1 gap-0.5 transition-colors ${
                  isActive ? 'text-[#059669]' : 'text-gray-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <span className="material-icons" style={{ fontSize: 22 }}>{item.icon}</span>
                    {item.to === '/admin/kyc' && pendingKyc > 0 && (
                      <span style={{
                        position: 'absolute', top: -4, right: -6,
                        background: '#F59E0B', color: 'white',
                        fontSize: 9, fontWeight: 700,
                        borderRadius: 99, padding: '0 4px',
                        minWidth: 14, textAlign: 'center',
                        lineHeight: '14px',
                      }}>
                        {pendingKyc > 99 ? '99+' : pendingKyc}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${isActive ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
