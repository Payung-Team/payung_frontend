import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '../../context/AuthContext';
import { useToast, type ToastMessage } from '../../hooks/useToast';
import { useFilteredMenu } from '../../hooks/useFilteredMenu';
import { GET_USER, GET_CAREGIVER_PROFILE } from '../../graphql/queries';
import Header from './Header';
import ProfileDropdown from './ProfileDropdown';
import CaregiverProfileDropdown from './CaregiverProfileDropdown';
import MobileNavigation from './Navigation';
import ViewProfileModal from './ViewProfileModal';
import EditProfileModal from './EditProfileModal';
import { ToastContainer } from '../ui/Toast';

interface AppLayoutProps {
  readonly children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, userRole } = useAuth();
  const { toasts, removeToast } = useToast();
  const { navItems, isLoading: menuLoading, error: menuError } = useFilteredMenu('mainMenu', userRole);
  const { data: userData } = useQuery<{ me: { id: string; role: number; displayName?: string; phone?: string; address?: string; bio?: string } } | undefined>(GET_USER);
  
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const currentRole = userData?.me?.role ?? userRole;

  const { data: caregiverData } = useQuery<{ myCaregiverProfile?: { kycStatus: string } } | undefined>(GET_CAREGIVER_PROFILE, {
    skip: currentRole !== 2,
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentRole === 2 && caregiverData?.myCaregiverProfile) {
      const kycStatus = caregiverData.myCaregiverProfile.kycStatus;
      // บังคับ caregiver ที่ยังเป็น none ให้ไปหน้า /kyc เสมอ
      if (kycStatus === 'none' && location.pathname !== '/kyc') {
        navigate('/kyc', { replace: true });
      }
    }
  }, [currentRole, caregiverData, location.pathname, navigate]);

  // Log menu errors if any
  useEffect(() => {
    if (menuError) {
      console.warn('Menu loading warning:', menuError);
    }
  }, [menuError]);

  return (
    <div className="min-h-screen bg-[#F6FAF9] flex flex-col" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <Header
          navItems={navItems}
          isLoading={menuLoading}
          currentUserId={userData?.me?.id}
          profileDropdown={
            currentRole === 2 ? (
              <CaregiverProfileDropdown
                avatarFallbackColor="#52B69A"
                displayName={userData?.me?.displayName || ''}
              />
            ) : (
              <ProfileDropdown
                onViewProfileClick={() => setIsViewProfileOpen(true)}
                onEditProfileClick={() => setIsEditProfileOpen(true)}
                avatarFallbackColor="#52B69A"
                displayName={userData?.me?.displayName || ''}
              />
            )
          }
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-[70px] pb-20 md:pb-0">
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
