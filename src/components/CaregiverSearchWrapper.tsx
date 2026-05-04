import React from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_CAREGIVER_PROFILE } from '../graphql/queries';
import SearchPage from '../pages/search/SearchPage';
import UnverifiedCaregiverPage from '../pages/caregiver/UnverifiedCaregiverPage';
import { useAuth } from '../context/AuthContext';
import Skeleton from './ui/Skeleton';

export default function CaregiverSearchWrapper() {
  const { userRole } = useAuth();
  const { data: caregiverData, loading } = useQuery<{ myCaregiverProfile?: { kycStatus: string } } | undefined>(GET_CAREGIVER_PROFILE, {
    skip: userRole !== 2,
  });

  if (loading) {
    return (
      <div className="px-4 py-8 max-w-[1280px] mx-auto space-y-4">
        <Skeleton height={56} borderRadius="12px" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height={200} borderRadius="14px" />
          ))}
        </div>
      </div>
    );
  }

  // For non-caregivers, show the search page
  if (userRole !== 2) {
    return <SearchPage />;
  }

  // For caregivers, check KYC status
  const kycStatus = caregiverData?.myCaregiverProfile?.kycStatus;
  const isKycVerified = kycStatus === 'verified';

  if (isKycVerified) {
    return <SearchPage />;
  }

  // Show unverified page for caregivers with pending or no KYC status
  return <UnverifiedCaregiverPage />;
}
