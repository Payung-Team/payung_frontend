import { Routes, Route, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_CAREGIVER_PROFILE, GET_USER } from './graphql/queries';
import PageSkeleton from './components/ui/PageSkeleton';
import { useAuth } from './context/AuthContext';
import { getPostLoginRedirect } from './utils/getRedirectPath';
import AppLayout from './components/layout/AppLayout';
import CaregiverSearchWrapper from './components/CaregiverSearchWrapper';
import { KycProvider } from './context/KycContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import KYC from './pages/kyc/KYC';
import KycSuccess from './pages/kyc/status/SuccessSubmit';
import KycStatus from './pages/kyc/status/KycStatusPage';
import KycResubmit from './pages/kyc/status/KycResubmitPage';
import Admin from './pages/admin/Admin';
import KycReviewListPage from './pages/admin/KycReviewListPage';
import KycReviewDetailPage from './pages/admin/KycReviewDetailPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminCaregiverDetailPage from './pages/admin/AdminCaregiverDetailPage';
import AdminLayout from './components/layout/AdminLayout';
import NotFound from './pages/error/NotFound';
import PayungHome from './pages/home/HomePage';
import CaregiverHome from './pages/caregiver/CaregiverHome';
import CaregiverBookings from './pages/caregiver/CaregiverBookings';
import CaregiverSettings from './pages/caregiver/CaregiverSettings';
import CaregiverEditProfile from './pages/caregiver/CaregiverEditProfile';
import BookingsPage from './pages/profile/BookingsPage';
import BookingRequestPage from './pages/booking/BookingRequestPage';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import GuestRoute from './components/GuestRoute';
import MustChangePasswordGuard from './components/MustChangePasswordGuard';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AuthCallback from './pages/auth/AuthCallback';
import MessagePage from './pages/profile/MessagePage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import OnboardingPage from './pages/auth/OnboardingPage';

function KycFormGuard({ children }: { children: React.ReactNode }) {
  const { data, loading } = useQuery<{ myCaregiverProfile?: { kycStatus: string } }>(GET_CAREGIVER_PROFILE);

  if (loading) return <PageSkeleton />;

  const status = data?.myCaregiverProfile?.kycStatus;

  if (status === 'pending' || status === 'rejected') {
    return <Navigate to="/kyc/status" replace />;
  }
  if (status === 'verified') {
    return <Navigate to="/caregiver-home" replace />;
  }

  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { data, loading } = useQuery<{ me?: { phone: string | null } }>(GET_USER);

  if (loading) return <PageSkeleton />;

  if (data?.me?.phone) {
    return <Navigate to="/patient-home" replace />;
  }

  return <>{children}</>;
}

function CaregiverAvailabilityGuard() {
  const { data, loading } = useQuery<{
    myCaregiverProfile?: { kycStatus: string };
  }>(GET_CAREGIVER_PROFILE);

  if (loading) return <PageSkeleton />;

  const status = data?.myCaregiverProfile?.kycStatus;

  if (status !== 'verified') {
    return <Navigate to="/kyc" replace />;
  }

  return <CaregiverSettings />;
}

function HomeRedirect() {
  const { userRole, mustChangePassword, loading } = useAuth();
  if (loading || userRole === null) return <PageSkeleton />;
  return <Navigate to={getPostLoginRedirect({ role: userRole, mustChangePassword: mustChangePassword ?? false })} replace />;
}

function AuthEffects() {
  const navigate = useNavigate();
  const { passwordRecoveryPending, clearPasswordRecovery } = useAuth();

  useEffect(() => {
    if (!passwordRecoveryPending) return;
    clearPasswordRecovery();
    navigate('/reset-password', { replace: true });
  }, [passwordRecoveryPending, clearPasswordRecovery, navigate]);

  return null;
}

function App() {
  return (
    <>
      <AuthEffects />
      <Routes>
        {/* Auth pages — redirect to / if already logged in */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Change password — session required แต่ไม่ผ่าน MustChangePasswordGuard */}
        <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

        {/* Onboarding — patient only, after register/first OAuth login */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRole={1}>
                <OnboardingGuard>
                  <OnboardingPage />
                </OnboardingGuard>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

      {/* Protected pages — wrapped in ProtectedRoute, MustChangePasswordGuard and AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MustChangePasswordGuard>
              <AppLayout>
                <Outlet />
              </AppLayout>
            </MustChangePasswordGuard>
          </ProtectedRoute>
        }
      >
        {/* Patient home */}
        <Route 
          path="/patient-home" 
          element={
            <RoleRoute requiredRole={1}>
              <PayungHome />
            </RoleRoute>
          } 
        />

        {/* Booking Request */}
        <Route
          path="/booking/new"
          element={
            <RoleRoute requiredRole={1}>
              <BookingRequestPage />
            </RoleRoute>
          }
        />

        {/* Caregiver home */}
        <Route 
          path="/caregiver-home" 
          element={
            <RoleRoute requiredRole={2}>
              <CaregiverHome />
            </RoleRoute>
          } 
        />

        {/* Caregiver Bookings */}
        <Route
          path="/caregiver/bookings"
          element={
            <RoleRoute requiredRole={2}>
              <CaregiverBookings />
            </RoleRoute>
          }
        />

        {/* Admin home */}
        <Route
          path="/admin-home"
          element={
            <RoleRoute requiredRole={[3, 4]}>
              <PayungHome />
            </RoleRoute>
          }
        />

        {/* Home - redirect based on role */}
        <Route path="/" element={<HomeRedirect />} />

        <Route path="/search" element={<CaregiverSearchWrapper />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/messages" element={<MessagePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Caregiver settings */}
        <Route
          path="/caregiver/settings"
          element={
            <RoleRoute requiredRole={2}>
              <CaregiverSettings />
            </RoleRoute>
          }
        />

        <Route
          path="/caregiver/settings/account"
          element={
            <RoleRoute requiredRole={2}>
              <CaregiverSettings />
            </RoleRoute>
          }
        />

        <Route
          path="/caregiver/settings/job-reception"
          element={
            <RoleRoute requiredRole={2}>
              <CaregiverAvailabilityGuard />
            </RoleRoute>
          }
        />

        <Route
          path="/caregiver/settings/notifications"
          element={
            <RoleRoute requiredRole={2}>
              <CaregiverSettings />
            </RoleRoute>
          }
        />

        <Route
          path="/caregiver/settings/language"
          element={
            <RoleRoute requiredRole={2}>
              <CaregiverSettings />
            </RoleRoute>
          }
        />

        <Route
          path="/caregiver/settings/billing"
          element={
            <RoleRoute requiredRole={2}>
              <CaregiverSettings />
            </RoleRoute>
          }
        />

        {/* Caregiver edit profile */}
        <Route
          path="/caregiver/edit-profile"
          element={
            <RoleRoute requiredRole={2}>
              <CaregiverEditProfile />
            </RoleRoute>
          }
        />
        
        {/* KYC routes — only for caregiver (role 2) */}
        <Route
          element={
            <RoleRoute requiredRole={2}>
              <KycProvider>
                <Outlet />
              </KycProvider>
            </RoleRoute>
          }
        >
          <Route path="/kyc" element={<KycFormGuard><KYC /></KycFormGuard>} />
          <Route path="/kyc/success" element={<KycSuccess />} />
          <Route path="/kyc/status" element={<KycStatus />} />
          <Route path="/kyc/resubmit" element={<KycResubmit />} />
        </Route>
        
      </Route>
      {/* Admin pages — for admin (role 3) and super_admin (role 4) */}
      <Route
        element={
          <ProtectedRoute>
            <MustChangePasswordGuard>
              <RoleRoute requiredRole={[3, 4]}>
                <AdminLayout />
              </RoleRoute>
            </MustChangePasswordGuard>
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/kyc" element={<KycReviewListPage />} />
        <Route path="/admin/kyc/:caregiverId" element={<KycReviewDetailPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/:caregiverId" element={<AdminCaregiverDetailPage />} />
      </Route>

      {/* 404 - Not Found (must be last) */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

export default App;
