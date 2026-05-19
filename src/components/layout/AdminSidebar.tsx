import { NavLink } from 'react-router-dom';

interface AdminSidebarProps {
  pendingKyc: number;
  displayName: string;
  onLogout: () => void;
  onClose?: () => void;
}

export default function AdminSidebar({ pendingKyc, displayName, onLogout, onClose }: Readonly<AdminSidebarProps>) {
  const initial = displayName.charAt(0).toUpperCase() || 'A';

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true, badge: null as number | null },
    { to: '/admin/kyc', label: 'KYC Review', icon: 'fact_check', end: false, badge: pendingKyc > 0 ? pendingKyc : null },
    { to: '/admin/users', label: 'จัดการ Admin', icon: 'admin_panel_settings', end: false, badge: null },
  ];

  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        background: '#064E3B',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px 16px',
        gap: 4,
        height: '100vh',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44, marginBottom: 4 }}>
        <div style={{
          width: 34, height: 34,
          background: '#10B981',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 15, fontFamily: 'Inter,sans-serif' }}>P</span>
        </div>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 15, fontFamily: 'Inter,sans-serif', flex: 1 }}>
          Payung Admin
        </span>
        {onClose && (
          <button
            type="button"
            className="lg:hidden"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', opacity: 0.7, padding: 4, lineHeight: 1, fontSize: 18, flexShrink: 0 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

      {/* Section label */}
      <div style={{ height: 8 }} />
      <span style={{
        color: 'white', opacity: 0.4,
        fontSize: 10, fontWeight: 500, letterSpacing: 1,
        fontFamily: 'Inter,sans-serif',
        paddingLeft: 4,
      }}>
        เมนูหลัก
      </span>
      <div style={{ height: 4 }} />

      {/* Nav items */}
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 8,
            textDecoration: 'none',
            background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
            transition: 'background 0.15s',
          })}
        >
          {({ isActive }) => (
            <>
              <span
                className="material-icons"
                style={{ fontSize: 16, color: 'white', opacity: isActive ? 1 : 0.5, flexShrink: 0 }}
              >
                {item.icon}
              </span>
              <span style={{
                color: 'white',
                opacity: isActive ? 1 : 0.7,
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                fontFamily: 'Inter,sans-serif',
                flex: 1,
              }}>
                {item.label}
              </span>
              {item.badge !== null && (
                <span style={{
                  background: '#F59E0B',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 99,
                  padding: '1px 6px',
                  fontFamily: 'Inter,sans-serif',
                }}>
                  {item.badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: '#34D399',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{initial}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 500, fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayName || 'Admin'}
          </div>
          <div style={{ color: 'white', opacity: 0.5, fontSize: 10, fontFamily: 'Inter,sans-serif' }}>
            Admin
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          border: 'none', cursor: 'pointer',
          width: '100%',
        }}
      >
        <div style={{
          width: 14, height: 14, borderRadius: 3,
          background: 'rgba(239,68,68,0.6)',
          flexShrink: 0,
        }} />
        <span style={{ color: 'white', opacity: 0.6, fontSize: 12, fontWeight: 500, fontFamily: 'Inter,sans-serif' }}>
          ออกจากระบบ
        </span>
      </button>
    </aside>
  );
}
