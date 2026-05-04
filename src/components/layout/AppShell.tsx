import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ProfileDropdown from './ProfileDropdown';
import MobileNavigation, { type NavItem } from './Navigation';

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/kyc', label: 'KYC', icon: 'description' },
  { path: '/admin', label: 'Admin', icon: 'admin_panel_settings' },
];

export default function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        navItems={navItems}
        profileDropdown={<ProfileDropdown avatarFallbackColor="#4F46E5" />}
      />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <MobileNavigation navItems={navItems} />
    </div>
  );
}
