import { Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_CAREGIVER_PROFILE } from './graphql/queries';
import { GET_ONBOARDING_STATUS, type OnboardingStatusData } from './graphql/onboarding';
import PageSkeleton from './components/ui/PageSkeleton';
import { useAuth } from './context/AuthContext';
import { getPostLoginRedirect } from './utils/getRedirectPath';
import AppLayout from './components/layout/AppLayout';
import PublicLayout from './components/layout/PublicLayout';
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
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminDisputesPage from './pages/admin/AdminDisputesPage';
import AdminDisputeDetailPage from './pages/admin/AdminDisputeDetailPage';
import AdminLayout from './components/layout/AdminLayout';
import { ADMIN_NOTIFICATIONS_PATH, adminNotificationLink } from './components/layout/adminNotifications';
import NotFound from './pages/error/NotFound';
import PayungHome from './pages/home/HomePage';
import CaregiverHome from './pages/caregiver/CaregiverHome';
import CaregiverBookings from './pages/caregiver/CaregiverBookings';
import CaregiverBookingDetailPage from './pages/caregiver/CaregiverBookingDetailPage';
import CaregiverSettings from './pages/caregiver/CaregiverSettings';
import CaregiverEditProfile from './pages/caregiver/CaregiverEditProfile';
import BookingsPage from './pages/profile/BookingsPage';
import BookingRequestPage from './pages/booking/BookingRequestPage';
import FamilyGroupPage from './pages/family/FamilyGroupPage';
import MembersPage from './pages/family/MembersPage';
import JoinGroupPage from './pages/family/JoinGroupPage';
import FamilyGroupDemo, { MembersPageDemo } from './pages/family/FamilyGroupDemo';
import BookingDetailPage from './pages/profile/BookingDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import GuestRoute from './components/GuestRoute';
import MustChangePasswordGuard from './components/MustChangePasswordGuard';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AuthCallback from './pages/auth/AuthCallback';
import NotificationsPage from './pages/notifications/NotificationsPage';
// PYG-540: หน้าความเป็นส่วนตัว (ดู/ถอน/ให้ความยินยอม PDPA)
import PrivacySettingsPage from './pages/settings/PrivacySettingsPage';
import CaregiverProfilePage from './pages/search/CaregiverProfilePage';
import BookingSuccessPage from './pages/booking/BookingSuccessPage';
import PaymentPage from './pages/booking/PaymentPage';
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

/**
 * PYG-501 — ผู้สูงอายุที่ยังไม่ผ่าน Onboarding หรือไม่ (ตัดสินจาก me.onboardingCompleted ของ BE)
 *
 * ★ ทั้งสอง guard ข้างล่างต้องใช้ hook นี้ตัวเดียว — ถ้าเงื่อนไขไม่ตรงกันจะเด้งกันไปมาไม่รู้จบ
 *   (เดิมใช้ "มีเบอร์โทร = ทำแล้ว" ซึ่งบัญชีเก่าที่มีเบอร์แต่ไม่มีโปรไฟล์ผู้รับบริการหลุดผ่าน)
 *
 * ★ query ล้ม → ถือว่าไม่ต้อง onboard (ปล่อยผ่าน) ไม่ใช่ส่งไป /onboarding
 *   ถ้าส่งไป ผู้ใช้จะวนอยู่ที่หน้า Onboarding ตลอด: กดบันทึกสำเร็จแล้ว guard ก็ยังล้มเหมือนเดิม
 *   ด่านจริงอยู่ที่ BE (completeOnboarding / ONBOARDING_REQUIRED ตอนจอง) ตัวนี้แค่พาไปถูกหน้า
 */
function useNeedsOnboarding() {
  const { data, loading, error } = useQuery<OnboardingStatusData>(GET_ONBOARDING_STATUS);

  if (error) {
    console.warn('Failed to fetch onboarding status, skipping redirect:', error.message);
  }

  const me = data?.me;
  return {
    loading,
    needsOnboarding: !!me && me.role === 1 && !me.onboardingCompleted,
  };
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { loading, needsOnboarding } = useNeedsOnboarding();

  if (loading) return <PageSkeleton />;

  if (!needsOnboarding) {
    return <Navigate to="/patient-home" replace />;
  }

  return <>{children}</>;
}

/**
 * หน้าที่ผู้สูงอายุเข้าได้แม้ยังไม่ผ่าน Onboarding
 * /settings/privacy — PYG-540 สิทธิ์ถอนความยินยอมต้องใช้ได้เสมอ (เหมือนผู้ดูแลที่ KYC ยังไม่ผ่าน
 *   ใน AppLayout) และ BE นับ "ถอนความยินยอมข้อมูลสุขภาพ" ว่ายังไม่ผ่าน Onboarding (PYG-538)
 *   ถ้าไม่ยกเว้น กดถอนแล้วจะโดนพาออกจากหน้านี้ไปหน้า Onboarding ทันที
 */
const ONBOARDING_EXEMPT_PATHS = ['/settings/privacy'];

/**
 * ผู้สูงอายุที่ยังไม่ทำ Onboarding ห้ามเข้าหน้าในแอป — ส่งกลับไป /onboarding เสมอ
 * ครอบทุกช่องทาง login (Email/Password, Google, ?redirect=) เพราะทุกทางต้องผ่าน layout นี้
 * กันทั้งพิมพ์ URL เอง และกด back จากหน้า Onboarding (/register → GuestRoute → /patient-home)
 */
function PatientOnboardingGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { loading, needsOnboarding } = useNeedsOnboarding();

  if (loading) return <PageSkeleton />;

  const isExempt = ONBOARDING_EXEMPT_PATHS.some((path) => pathname.startsWith(path));
  if (needsOnboarding && !isExempt) {
    return <Navigate to="/onboarding" replace />;
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
  const { session, userRole, mustChangePassword, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  // Guests have userRole === null too, so this has to come first.
  if (!session) {
    return (
      <PublicLayout>
        <PayungHome isPublic />
      </PublicLayout>
    );
  }
  if (userRole === null) return <PageSkeleton />;
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
        {/* Landing page for guests; signed-in users are sent to their role's home */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Auth pages — redirect to / if already logged in */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Join a family group via invite link — public: the main audience is a
            not-yet-signed-in invitee. The page handles both signed-in and signed-out. */}
        <Route path="/join" element={<JoinGroupPage />} />

        {/* Preview only: the dashboard against an in-memory mock backend (no login). */}
        <Route path="/family-demo" element={<FamilyGroupDemo />} />
        <Route path="/family-demo/members" element={<MembersPageDemo />} />

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
                <PatientOnboardingGuard>
                  <AppLayout>
                    <Outlet />
                  </AppLayout>
                </PatientOnboardingGuard>
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

          {/* Family Group — any authenticated user can belong to a group (the backend
              intentionally does not gate group membership by system role: caregivers have
              their own relatives to care for too). Not wrapped in RoleRoute. */}
          <Route path="/family-group" element={<FamilyGroupPage />} />
          <Route path="/family-group/members" element={<MembersPage />} />

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

          <Route path="/search" element={<CaregiverSearchWrapper />} />
          <Route path="/caregivers/:id" element={<CaregiverProfilePage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route
            path="/bookings/:id/payment"
            element={
              <RoleRoute requiredRole={1}>
                <PaymentPage />
              </RoleRoute>
            }
          />
          <Route
            path="/booking/success"
            element={
              <RoleRoute requiredRole={1}>
                <BookingSuccessPage />
              </RoleRoute>
            }
          />

          {/* Caregiver Booking Detail */}
          <Route
            path="/caregiver/bookings/:id"
            element={
              <RoleRoute requiredRole={2}>
                <CaregiverBookingDetailPage />
              </RoleRoute>
            }
          />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* PYG-540: ความเป็นส่วนตัว (PDPA) — ผู้รับบริการ + ผู้ดูแล
              ทุกคนที่มีบัญชีต้องเข้าถึงสิทธิ์ถอนความยินยอมได้ แอดมินไม่มีรายการความยินยอมจึงไม่เปิดให้ */}
          <Route
            path="/settings/privacy"
            element={
              <RoleRoute requiredRole={[1, 2]}>
                <PrivacySettingsPage />
              </RoleRoute>
            }
          />

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
          <Route path="/admin/payments" element={<AdminPaymentsPage />} />
          <Route path="/admin/disputes" element={<AdminDisputesPage />} />
          <Route path="/admin/disputes/:id" element={<AdminDisputeDetailPage />} />
          <Route
            path={ADMIN_NOTIFICATIONS_PATH}
            element={<NotificationsPage resolveLink={adminNotificationLink} showEmailPreference={false} />}
          />
        </Route>

        {/* 404 - Not Found (must be last) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
