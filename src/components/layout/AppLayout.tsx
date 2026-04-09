import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '../../context/AuthContext';
import { useToast, type ToastMessage } from '../../hooks/useToast';
import { GET_USER } from '../../graphql/queries';
import Avatar from '../ui/Avatar';
import ViewProfileModal from './ViewProfileModal';
import EditProfileModal from './EditProfileModal';
import { ToastContainer } from '../ui/Toast';
import { Icon } from '../ui/Icon';

interface AppLayoutProps {
  readonly children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toasts, removeToast, success: showSuccess } = useToast();
  const { data: userData } = useQuery(GET_USER);
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const handleLogout = async () => {
    const result = await logout();
    if (!result.error) {
      showSuccess('ออกจากระบบสำเร็จ');
      navigate('/login');
    }
  };

  const navItems = [
    { path: '/', label: 'หน้าหลัก', icon: 'home' },
    { path: '/search', label: 'ค้นหาผู้ดูแล', icon: 'search' },
    { path: '/bookings', label: 'นัดหมาย', icon: 'calendar_today' },
    { path: '/messages', label: 'ข้อความ', icon: 'chat' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#F6FAF9] flex flex-col" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white px-4 md:px-6 flex items-center sticky top-0 z-40">
        <Link to="/" className="text-xl font-bold text-[#52B69A]">
          Payung
        </Link>

        {/* Desktop Navigation & Profile */}
        <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm transition-colors ${
                  isActive(item.path)
                    ? 'text-[#52B69A] font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Notification & Profile Dropdown - Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {/* Notification Icon */}
          <button className="relative text-gray-600 hover:text-gray-900 transition-colors">
            <Icon name="notifications" size="medium" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Avatar
                name={user?.email?.split('@')[0] || 'User'}
                size={36}
                fallbackColor="#52B69A"
              />
            </button>

            {/* Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 animate-fadeIn">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">{user?.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      setIsViewProfileOpen(true);
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2 transition-colors"
                  >
                    <Icon name="account_box" size="small" />
                    ดูโปรไฟล์
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-2 transition-colors"
                  >
                    <Icon name="logout" size="small" color="currentColor" />
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Profile Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="relative"
          >
            <Avatar
              name={user?.email?.split('@')[0] || 'User'}
              size={36}
              fallbackColor="#52B69A"
            />
          </button>

          {/* Mobile Dropdown Menu */}
          {isProfileDropdownOpen && (
            <div className="absolute right-4 top-16 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 animate-fadeIn">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-900">{user?.email?.split('@')[0] || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>

              <div className="py-2">
                <button
                  onClick={() => {
                    setIsViewProfileOpen(true);
                    setIsProfileDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2 transition-colors"
                >
                  <Icon name="account_box" size="small" color="currentColor" />
                  ดูโปรไฟล์
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-2 transition-colors"
                >
                  <Icon name="logout" size="small" color="currentColor" />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-3 px-2 text-center transition-colors ${
                isActive(item.path)
                  ? 'text-[#52B69A] border-t-2 border-[#52B69A] font-semibold'
                  : 'text-gray-600'
              }`}
            >
              <Icon name={item.icon} size="large" className="mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* View Profile Modal */}
      <ViewProfileModal
        isOpen={isViewProfileOpen}
        onClose={() => setIsViewProfileOpen(false)}
        onEditClick={() => {
          setIsViewProfileOpen(false);
          setIsEditProfileOpen(true);
        }}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        userEmail={user?.email || ''}
        currentDisplayName={userData?.me?.displayName || user?.email?.split('@')[0] || ''}
        currentPhone={userData?.me?.phone || ''}
        currentAddress={userData?.me?.address || ''}
        currentBio={userData?.me?.bio || ''}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts as (ToastMessage & { id: string })[]} onRemove={removeToast} />
    </div>
  );
}
