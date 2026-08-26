import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavLeaf {
  to: string;
  label: string;
  icon: string;
  end: boolean;
  badgeKey?: 'kyc' | 'dispute';
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return (entry as NavGroup).children !== undefined;
}

const NAV_MENU: NavEntry[] = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/kyc', label: 'KYC Review', icon: 'fact_check', end: false, badgeKey: 'kyc' },
  { to: '/admin/users', label: 'จัดการผู้ใช้', icon: 'admin_panel_settings', end: false },
  {
    id: 'payment',
    label: 'Payment',
    icon: 'account_balance_wallet',
    children: [
      { to: '/admin/payments', label: 'Transaction', icon: 'receipt_long', end: false },
      { to: '/admin/disputes', label: 'Dispute', icon: 'gavel', end: false, badgeKey: 'dispute' },
    ],
  },
];

interface AdminSidebarProps {
  pendingKyc: number;
  pendingDisputes?: number;
  displayName: string;
  onLogout: () => void;
  onClose?: () => void;
  collapsed?: boolean;
}

export default function AdminSidebar({
  pendingKyc,
  pendingDisputes = 0,
  displayName,
  onLogout,
  onClose,
  collapsed = false,
}: Readonly<AdminSidebarProps>) {
  const { pathname } = useLocation();
  const initial = displayName.charAt(0).toUpperCase() || 'A';

  const badgeFor = (key?: NavLeaf['badgeKey']): number | null => {
    if (key === 'kyc') return pendingKyc > 0 ? pendingKyc : null;
    if (key === 'dispute') return pendingDisputes > 0 ? pendingDisputes : null;
    return null;
  };

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        background: '#064E3B',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '20px 8px 16px' : '20px 16px 16px',
        gap: 4,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        flexShrink: 0,
        transition: 'width 0.2s ease, min-width 0.2s ease, padding 0.2s ease',
      }}
    >
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 10,
        height: 44,
        marginBottom: 4,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 34, height: 34,
          background: '#10B981',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 15, fontFamily: 'Inter,sans-serif' }}>P</span>
        </div>
        {!collapsed && (
          <>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 15, fontFamily: 'Inter,sans-serif', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
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
          </>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

      {/* Section label */}
      {collapsed
        ? <div style={{ height: 8 }} />
        : (
          <>
            <div style={{ height: 8 }} />
            <span style={{ color: 'white', opacity: 0.4, fontSize: 10, fontWeight: 500, letterSpacing: 1, fontFamily: 'Inter,sans-serif', paddingLeft: 4 }}>
              เมนูหลัก
            </span>
            <div style={{ height: 4 }} />
          </>
        )
      }

      {/* Nav items */}
      {NAV_MENU.map((entry) =>
        isGroup(entry) ? (
          <NavGroupItem
            key={entry.id}
            group={entry}
            collapsed={collapsed}
            activePath={pathname}
            badgeFor={badgeFor}
          />
        ) : (
          <NavLeafItem key={entry.to} leaf={entry} collapsed={collapsed} badge={badgeFor(entry.badgeKey)} />
        ),
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

      {/* User info */}
      {collapsed ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }} title={displayName || 'Admin'}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{initial}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{initial}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontSize: 12, fontWeight: 500, fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName || 'Admin'}
            </div>
            <div style={{ color: 'white', opacity: 0.5, fontSize: 10, fontFamily: 'Inter,sans-serif' }}>Admin</div>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        type="button"
        onClick={onLogout}
        title={collapsed ? 'ออกจากระบบ' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 8,
          padding: collapsed ? '8px 0' : '8px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(239,68,68,0.6)', flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ color: 'white', opacity: 0.6, fontSize: 12, fontWeight: 500, fontFamily: 'Inter,sans-serif' }}>
            ออกจากระบบ
          </span>
        )}
      </button>
    </aside>
  );
}

// ─── Orange/gray badge pill ──────────────────────────────────────────────────
function Badge({ value, active }: { value: number; active: boolean }) {
  return (
    <span style={{
      background: active ? 'rgba(255,255,255,0.25)' : '#F59E0B',
      color: 'white',
      fontSize: 10,
      fontWeight: 700,
      borderRadius: 99,
      padding: '1px 6px',
      fontFamily: 'Inter,sans-serif',
      flexShrink: 0,
    }}>
      {value > 99 ? '99+' : value}
    </span>
  );
}

// ─── Top-level leaf (icon + label + badge) ───────────────────────────────────
function NavLeafItem({ leaf, collapsed, badge }: { leaf: NavLeaf; collapsed: boolean; badge: number | null }) {
  return (
    <NavLink
      to={leaf.to}
      end={leaf.end}
      title={collapsed ? leaf.label : undefined}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 10,
        padding: collapsed ? '10px 0' : '10px 12px',
        borderRadius: 8,
        textDecoration: 'none',
        background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
        transition: 'background 0.15s',
        position: 'relative',
      })}
    >
      {({ isActive }) => (
        <>
          <span className="material-icons" style={{ fontSize: 18, color: 'white', opacity: isActive ? 1 : 0.5, flexShrink: 0 }}>
            {leaf.icon}
          </span>
          {!collapsed && (
            <>
              <span style={{
                color: 'white',
                opacity: isActive ? 1 : 0.7,
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                fontFamily: 'Inter,sans-serif',
                flex: 1,
                whiteSpace: 'nowrap',
              }}>
                {leaf.label}
              </span>
              {badge !== null && <Badge value={badge} active={isActive} />}
            </>
          )}
          {collapsed && badge !== null && (
            <div style={{
              position: 'absolute', top: 5, right: 10,
              width: 7, height: 7, borderRadius: '50%',
              background: '#F59E0B',
              border: '1.5px solid #064E3B',
            }} />
          )}
        </>
      )}
    </NavLink>
  );
}

// ─── Sub-nav child (dot + label + badge, green pill when active) ─────────────
function NavChildItem({ child, badge }: { child: NavLeaf; badge: number | null }) {
  return (
    <NavLink
      to={child.to}
      end={child.end}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 38,
        padding: '0 12px',
        borderRadius: 8,
        textDecoration: 'none',
        background: isActive ? '#1C6B4B' : 'transparent',
        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
        transition: 'background 0.15s',
      })}
    >
      {({ isActive }) => (
        <>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isActive ? 'white' : 'rgba(255,255,255,0.3)',
            flexShrink: 0,
          }} />
          <span style={{
            color: 'white',
            opacity: isActive ? 1 : 0.7,
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            fontFamily: 'Inter,sans-serif',
            flex: 1,
            whiteSpace: 'nowrap',
          }}>
            {child.label}
          </span>
          {badge !== null && <Badge value={badge} active={isActive} />}
        </>
      )}
    </NavLink>
  );
}

// ─── Collapsible group ───────────────────────────────────────────────────────
function NavGroupItem({
  group,
  collapsed,
  activePath,
  badgeFor,
}: {
  group: NavGroup;
  collapsed: boolean;
  activePath: string;
  badgeFor: (key?: NavLeaf['badgeKey']) => number | null;
}) {
  const hasActiveChild = group.children.some((c) => activePath === c.to || activePath.startsWith(`${c.to}/`));
  const [open, setOpen] = useState(hasActiveChild);

  // Collapsed rail: render children as icon-only leaves (no group header)
  if (collapsed) {
    return (
      <>
        {group.children.map((child) => (
          <NavLeafItem key={child.to} leaf={child} collapsed badge={badgeFor(child.badgeKey)} />
        ))}
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Group header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 40,
          padding: '0 12px',
          borderRadius: 8,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        <span className="material-icons" style={{ fontSize: 18, color: 'white', opacity: hasActiveChild ? 1 : 0.6, flexShrink: 0 }}>
          {group.icon}
        </span>
        <span style={{
          color: 'white',
          opacity: hasActiveChild ? 1 : 0.85,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'Inter,sans-serif',
          flex: 1,
          textAlign: 'left',
          whiteSpace: 'nowrap',
        }}>
          {group.label}
        </span>
        <span className="material-icons" style={{
          fontSize: 18,
          color: 'white',
          opacity: 0.5,
          flexShrink: 0,
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.15s',
        }}>
          keyboard_arrow_down
        </span>
      </button>

      {/* Children */}
      {open && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          paddingLeft: 16,
          marginLeft: 12,
          marginTop: 2,
          borderLeft: '1px solid rgba(255,255,255,0.1)',
        }}>
          {group.children.map((child) => (
            <NavChildItem key={child.to} child={child} badge={badgeFor(child.badgeKey)} />
          ))}
        </div>
      )}
    </div>
  );
}
