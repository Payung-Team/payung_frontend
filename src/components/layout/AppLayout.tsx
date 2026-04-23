import React, { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '../../context/AuthContext';
import { useToast, type ToastMessage } from '../../hooks/useToast';
import { GET_USER } from '../../graphql/queries';
import Header from './Header';
import ProfileDropdown from './ProfileDropdown';
import MobileNavigation, { type NavItem } from './Navigation';
import ViewProfileModal from './ViewProfileModal';
import EditProfileModal from './EditProfileModal';
import { ToastContainer } from '../ui/Toast';

interface AppLayoutProps {
  readonly children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, userRole } = useAuth();
  const { toasts, removeToast } = useToast();
  const { data: userData } = useQuery(GET_USER);
  
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const getNavItems = (): NavItem[] => {
    const currentRole = userData?.me?.role || Number(userRole);

    if (currentRole === 2) {
      // ผู้ดูแล (Caregiver)
      return [
        { path: '/', label: 'หน้าแรก', icon: 'home' },
        { path: '/search-jobs', label: 'ค้นหางาน', icon: 'work' },
        { path: '/my-jobs', label: 'งานของฉัน', icon: 'calendar_today' },
        { path: '/profile', label: 'โปรไฟล์', icon: 'person' },
      ];
    }
    
    // ผู้ใช้ทั่วไป (Patient / Guest)
    return [
      { path: '/', label: 'หน้าแรก', icon: 'home' },
      { path: '/search', label: 'ค้นหาผู้ดูแล', icon: 'search' },
      { path: '/bookings', label: 'นัดหมาย', icon: 'calendar_today' },
      { path: '/messages', label: 'ข้อความ', icon: 'chat' },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-[#F6FAF9] flex flex-col" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      {/* Header */}
      <Header
        navItems={navItems}
        profileDropdown={
          <ProfileDropdown
            onViewProfileClick={() => setIsViewProfileOpen(true)}
            onEditProfileClick={() => setIsEditProfileOpen(true)}
            avatarFallbackColor="#52B69A"
            displayName={userData?.me?.displayName || ''}
          />
        }
        brandColor="#52B69A"
      />

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation navItems={navItems} />

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
