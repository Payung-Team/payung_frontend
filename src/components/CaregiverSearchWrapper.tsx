import React from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_CAREGIVER_PROFILE } from '../graphql/queries';
import SearchPage from '../pages/search/SearchPage';
import UnverifiedCaregiverPage from '../pages/caregiver/UnverifiedCaregiverPage';
import { useAuth } from '../context/AuthContext';

/**
 * Wrapper component that determines whether to show SearchPage or UnverifiedCaregiverPage
 * based on caregiver's KYC verification status
 */
export default function CaregiverSearchWrapper() {
  const { userRole } = useAuth();
  const { data: caregiverData, loading } = useQuery<{ myCaregiverProfile?: { kycStatus: string } } | undefined>(GET_CAREGIVER_PROFILE, {
    skip: userRole !== 2,
  });

  if (loading) {
    return <div>Loading...</div>;
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
