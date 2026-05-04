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

  const { data: caregiverData, loading: caregiverLoading, error: caregiverError } = useQuery<{ myCaregiverProfile?: { kycStatus: string; fullName?: string } } | undefined>(GET_CAREGIVER_PROFILE, {
    skip: currentRole !== 2,
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });

  const location = useLocation();
  const navigate = useNavigate();

  // Redirect immediately when caregiver data is available
  useEffect(() => {
    console.log('AppLayout: Checking KYC redirect', {
      currentRole,
      caregiverLoading,
      caregiverError: caregiverError?.message,
      hasData: !!caregiverData?.myCaregiverProfile,
      kycStatus: caregiverData?.myCaregiverProfile?.kycStatus,
      currentPath: location.pathname,
    });

    if (currentRole === 2 && !caregiverLoading) {
      // If error occurred or no data, skip redirect (user might not have profile yet)
      if (caregiverError || !caregiverData?.myCaregiverProfile) {
        console.warn('Caregiver profile not found or error:', caregiverError);
        return;
      }

      const kycStatus = caregiverData.myCaregiverProfile.kycStatus;
      
      // Allow access to KYC-related pages and settings
      const allowedUnverifiedPaths = [
        '/kyc',
        '/kyc/status',
        '/caregiver/settings',
        '/caregiver/settings/account',
        '/caregiver/settings/job-reception',
        '/caregiver/settings/notifications',
        '/caregiver/settings/language',
        '/caregiver/settings/billing',
        '/caregiver/availability'
      ];
      
      const isAllowedPath = allowedUnverifiedPaths.some(path => location.pathname.startsWith(path));
      
      // Redirect based on KYC status
      if (kycStatus === 'none' && !isAllowedPath) {
        // Not started - go to KYC form
        console.log('Redirecting caregiver to /kyc (KYC not started)');
        navigate('/kyc', { replace: true });
      } else if (kycStatus === 'pending' && !isAllowedPath) {
        // Pending verification - go to KYC status page
        console.log('Redirecting caregiver to /kyc/status (KYC pending)');
        navigate('/kyc/status', { replace: true });
      }
    }
  }, [currentRole, caregiverData, caregiverLoading, caregiverError, location.pathname, navigate]);

  // Compute filtered nav items based on KYC status
  const filteredNavItems = (() => {
    if (currentRole === 2 && caregiverData?.myCaregiverProfile) {
      const kycStatus = caregiverData.myCaregiverProfile.kycStatus;
      const isKycUnverified = kycStatus === 'none' || kycStatus === 'pending';
      
      if (isKycUnverified) {
        // Only show KYC-related and settings menu items for unverified caregivers
        return navItems.filter(item => 
          item.path === '/kyc' || 
          item.path.includes('/settings') ||
          item.path === '/caregiver/availability'
        );
      }
    }
    return navItems;
  })();

  // Log menu errors if any
  useEffect(() => {
    if (menuError) {
      console.warn('Menu loading warning:', menuError);
    }
  }, [menuError]);

  return (
    <div className="min-h-screen bg-[#F6FAF9] flex flex-col" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header
          navItems={filteredNavItems}
          isLoading={menuLoading}
          currentUserId={userData?.me?.id}
          profileDropdown={
            currentRole === 2 ? (
              <CaregiverProfileDropdown
                avatarFallbackColor="#52B69A"
                displayName={caregiverData?.myCaregiverProfile?.fullName || userData?.me?.displayName || ''}
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
      <MobileNavigation navItems={filteredNavItems} />

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
