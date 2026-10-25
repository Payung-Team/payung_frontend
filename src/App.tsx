import { Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_CAREGIVER_PROFILE } from './graphql/queries';
import { GET_ONBOARDING_STATUS, type OnboardingStatusData } from './graphql/onboarding';
import { fetchCareRecipients } from './lib/careRecipientsApi';
import { SELF_RECIPIENT_ALIAS, assessmentPath } from './lib/assessmentNav';
import PageSkeleton from './components/ui/PageSkeleton';
import { adminPageLoaders } from './pages/admin/adminPageChunks';
import { useAuth } from './context/AuthContext';
import { getPostLoginRedirect } from './utils/getRedirectPath';
import AppLayout from './components/layout/AppLayout';
import PublicLayout from './components/layout/PublicLayout';
const CaregiverSearchWrapper = lazy(() => import('./components/CaregiverSearchWrapper'));
import { KycProvider } from './context/KycContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
const KYC = lazy(() => import('./pages/kyc/KYC'));
const KycSuccess = lazy(() => import('./pages/kyc/status/SuccessSubmit'));
const KycStatus = lazy(() => import('./pages/kyc/status/KycStatusPage'));
const KycResubmit = lazy(() => import('./pages/kyc/status/KycResubmitPage'));
// loader ร่วมกับการโหลดล่วงหน้าใน AdminLayout (ดู adminPageChunks.ts)
const Admin = lazy(adminPageLoaders.Admin);
const KycReviewListPage = lazy(adminPageLoaders.KycReviewListPage);
const KycReviewDetailPage = lazy(adminPageLoaders.KycReviewDetailPage);
const ProfilePhotoReviewPage = lazy(adminPageLoaders.ProfilePhotoReviewPage);
const ProfessionChangeRequestsPage = lazy(adminPageLoaders.ProfessionChangeRequestsPage);
const CareActivitiesPage = lazy(adminPageLoaders.CareActivitiesPage);
const AdminUsersPage = lazy(adminPageLoaders.AdminUsersPage);
const AdminCaregiverDetailPage = lazy(adminPageLoaders.AdminCaregiverDetailPage);
const AdminPaymentsPage = lazy(adminPageLoaders.AdminPaymentsPage);
const AdminDisputesPage = lazy(adminPageLoaders.AdminDisputesPage);
const AdminDisputeDetailPage = lazy(adminPageLoaders.AdminDisputeDetailPage);
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
import { ADMIN_NOTIFICATIONS_PATH, adminNotificationLink } from './components/layout/adminNotifications';
const NotFound = lazy(() => import('./pages/error/NotFound'));
import PayungHome from './pages/home/HomePage';
const CaregiverHome = lazy(() => import('./pages/caregiver/CaregiverHome'));
const CaregiverBookings = lazy(() => import('./pages/caregiver/CaregiverBookings'));
const CaregiverBookingDetailPage = lazy(() => import('./pages/caregiver/CaregiverBookingDetailPage'));
const CaregiverSettings = lazy(() => import('./pages/caregiver/CaregiverSettings'));
const CaregiverEditProfile = lazy(() => import('./pages/caregiver/CaregiverEditProfile'));
const BookingsPage = lazy(() => import('./pages/profile/BookingsPage'));
const BookingRequestPage = lazy(() => import('./pages/booking/BookingRequestPage'));
const FamilyGroupPage = lazy(() => import('./pages/family/FamilyGroupPage'));
const MembersPage = lazy(() => import('./pages/family/MembersPage'));
const JoinGroupPage = lazy(() => import('./pages/family/JoinGroupPage'));
const FamilyGroupDemo = lazy(() => import('./pages/family/FamilyGroupDemo'));
const MembersPageDemo = lazy(() => import('./pages/family/FamilyGroupDemo').then((m) => ({ default: m.MembersPageDemo })));
const BookingDetailPage = lazy(() => import('./pages/profile/BookingDetailPage'));
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import GuestRoute from './components/GuestRoute';
import MustChangePasswordGuard from './components/MustChangePasswordGuard';
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
// PYG-540: หน้าความเป็นส่วนตัว (ดู/ถอน/ให้ความยินยอม PDPA)
const PrivacySettingsPage = lazy(() => import('./pages/settings/PrivacySettingsPage'));
const PhoneSettingsPage = lazy(() => import('./pages/settings/PhoneSettingsPage'));
import { PHONE_AUTH_ENABLED } from './lib/phone';
const CaregiverProfilePage = lazy(() => import('./pages/search/CaregiverProfilePage'));
const BookingSuccessPage = lazy(() => import('./pages/booking/BookingSuccessPage'));
const PaymentPage = lazy(() => import('./pages/booking/PaymentPage'));
const OnboardingPage = lazy(() => import('./pages/auth/OnboardingPage'));
const AssessmentPage = lazy(() => import('./pages/assessment/AssessmentPage'));

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
    if (import.meta.env.DEV) console.warn('Failed to fetch onboarding status, skipping redirect:', error.message);
  }

  const me = data?.me;
  return {
    loading,
    needsOnboarding: !!me && me.role === 1 && !me.onboardingCompleted,
    onboarded: !!me && me.role === 1 && me.onboardingCompleted,
  };
}

/**
 * S08 · PYG-610 — ผ่านขั้นข้อมูลส่วนตัวแล้วแต่ยังไม่ได้ทำแบบประเมิน ADL ของตัวเอง = สมัครยังไม่เสร็จ
 * login ครั้งถัดไปก็ต้องกลับมาทำแบบประเมินจนบันทึกสำเร็จ ถึงจะเข้าหน้าในแอปได้
 *
 * ★ กันเฉพาะ hasAssessment === false — ดึงไม่ได้ / ไม่พบโปรไฟล์ is_self / BE ยังไม่ส่งฟิลด์นี้ → ปล่อยผ่าน
 *   เหตุผลเดียวกับ useNeedsOnboarding: ถ้ากันตอน error ผู้ใช้จะวนอยู่หน้าแบบประเมินไม่รู้จบ
 *   ด่านจริงอยู่ที่ BE (ASSESSMENT_REQUIRED ตอนจอง)
 * ★ ดึงใหม่ทุกครั้งที่ guard mount — หลังบันทึกแบบประเมิน หน้า /assessment พาไปหน้าในแอป
 *   ซึ่งเป็น route คนละชุด guard จึง mount ใหม่และเห็น hasAssessment ล่าสุด
 */
function useNeedsSelfAssessment(enabled: boolean) {
  const [needs, setNeeds] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchCareRecipients()
      .then((list) => {
        if (!cancelled) setNeeds(list.find((r) => r.isSelf)?.hasAssessment === false);
      })
      .catch(() => {
        if (!cancelled) setNeeds(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    loading: enabled && needs === null,
    needsAssessment: enabled && needs === true,
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
 *
 * S08 · PYG-610: ทำ Onboarding แล้วแต่ยังไม่ได้ทำแบบประเมินของตัวเอง → ส่งไปหน้าแบบประเมินเสมอ
 *   ยกเว้นตอนอยู่ที่หน้าแบบประเมินเอง (route นั้นก็ผ่าน guard นี้ ไม่งั้นจะเด้งวน)
 */
function PatientOnboardingGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { loading, needsOnboarding, onboarded } = useNeedsOnboarding();
  const isExempt = ONBOARDING_EXEMPT_PATHS.some((path) => pathname.startsWith(path));
  const { loading: assessmentLoading, needsAssessment } = useNeedsSelfAssessment(
    onboarded && !isExempt && !pathname.startsWith('/assessment/'),
  );

  if (loading || assessmentLoading) return <PageSkeleton />;

  if (needsOnboarding && !isExempt) {
    return <Navigate to="/onboarding" replace />;
  }
  if (needsAssessment) {
    return <Navigate to={assessmentPath(SELF_RECIPIENT_ALIAS, 'onboarding')} replace />;
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
      {/* PYG-713: หน้าส่วนใหญ่โหลดแบบ lazy (แยก chunk) — หน้าแรก/เข้าสู่ระบบ/สมัคร import ตรงเพื่อไม่ให้ skeleton กระพริบตอนเปิดเว็บ
          Suspense นี้รับหน้าที่อยู่นอก layout · ใน AppLayout/AdminLayout มี Suspense ของตัวเองรอบ Outlet ให้เมนูค้างอยู่ */}
      <Suspense fallback={<PageSkeleton />}>
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

        {/* Preview only: the dashboard against an in-memory mock backend (no login).
            Dev build only — production falls through to the 404 route. */}
        {import.meta.env.DEV && (
          <>
            <Route path="/family-demo" element={<FamilyGroupDemo />} />
            <Route path="/family-demo/members" element={<MembersPageDemo />} />
          </>
        )}

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

        {/* S08 · PYG-610: แบบประเมิน ADL + เงื่อนไขพิเศษ — ต่อจาก Onboarding / ถูกกันตอนจอง / แก้จากโปรไฟล์
            ไม่อยู่ใน AppLayout เพราะ Design เป็นหน้าเต็มแบบเดียวกับ Onboarding (แถบขั้นตอนด้านซ้าย)
            แต่ยังผ่าน PatientOnboardingGuard: ต้องทำขั้นข้อมูลส่วนตัวก่อนเสมอ */}
        <Route
          path="/assessment/:careRecipientId"
          element={
            <ProtectedRoute>
              <MustChangePasswordGuard>
                <PatientOnboardingGuard>
                  <RoleRoute requiredRole={1}>
                    <AssessmentPage />
                  </RoleRoute>
                </PatientOnboardingGuard>
              </MustChangePasswordGuard>
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
                    <Suspense fallback={<PageSkeleton />}>
                      <Outlet />
                    </Suspense>
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

          {/* PYG-604: ผูกเบอร์โทรศัพท์กับบัญชีเดิม — ผู้รับบริการ + ผู้ดูแล
              แอดมินยังไม่เปิด: story ยังไม่เคาะว่าแอดมินใช้เบอร์ล็อกอินได้หรือไม่ */}
          {PHONE_AUTH_ENABLED && (
            <Route
              path="/settings/phone"
              element={
                <RoleRoute requiredRole={[1, 2]}>
                  <PhoneSettingsPage />
                </RoleRoute>
              }
            />
          )}

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
          <Route path="/admin/kyc/:caregiverId/profile-photo" element={<ProfilePhotoReviewPage />} />
          <Route path="/admin/profession-changes" element={<ProfessionChangeRequestsPage />} />
          <Route path="/admin/care-activities" element={<CareActivitiesPage />} />
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
      </Suspense>
    </>
  );
}

export default App;
