import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { GET_CAREGIVER_PROFILE } from './graphql/queries';
import PageSkeleton from './components/ui/PageSkeleton';
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
import CaregiverSettings from './pages/caregiver/CaregiverSettings';
import CaregiverEditProfile from './pages/caregiver/CaregiverEditProfile';
import BookingsPage from './pages/profile/BookingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import GuestRoute from './components/GuestRoute';
import MustChangePasswordGuard from './components/MustChangePasswordGuard';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import MessagePage from './pages/profile/MessagePage';
import NotificationsPage from './pages/notifications/NotificationsPage';

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

function App() {
  return (
    <Routes>
      {/* Auth pages — redirect to / if already logged in */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Change password — session required แต่ไม่ผ่าน MustChangePasswordGuard */}
      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

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

        {/* Caregiver home */}
        <Route 
          path="/caregiver-home" 
          element={
            <RoleRoute requiredRole={2}>
              <CaregiverHome />
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
              <CaregiverSettings />
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

        {/* Caregiver availability */}
        <Route
          path="/caregiver/availability"
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
  );
}

export default App;
