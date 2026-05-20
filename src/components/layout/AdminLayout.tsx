import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '../../context/AuthContext';
import { GET_USER, ADMIN_PENDING_COUNT } from '../../graphql/queries';
import AdminSidebar from './AdminSidebar';

interface UserData {
  me: { displayName?: string };
}

interface PendingCountData {
  pendingCount: { total: number };
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
  return { title: 'Admin', breadcrumb: 'หน้าหลัก / Admin' };
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('admin-sidebar-collapsed') === 'true',
  );

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

  const displayName = userData?.me?.displayName || 'Admin';
  const pendingKyc = countData?.pendingCount?.total ?? 0;
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
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 w-full bg-black/40 lg:hidden"
          style={{ border: 'none', cursor: 'default', padding: 0 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AdminSidebar
          pendingKyc={pendingKyc}
          displayName={displayName}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
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
            {/* Hamburger — opens drawer on mobile, toggles collapse on desktop */}
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

            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#A7F3D0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#064E3B', fontWeight: 700, fontSize: 14 }}>{initial}</span>
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#F9FAFB' }}>
          <Outlet />
        </div>

      </div>
    </div>
  );
}
