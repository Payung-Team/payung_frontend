import { Routes, Route, Outlet } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { KycProvider } from './context/KycContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import KYC from './pages/kyc/KYC';
import KycSuccess from './pages/kyc/status/SuccessSubmit';
import KycStatus from './pages/kyc/status/KycStatusPage';
import KycResubmit from './pages/kyc/status/KycResubmitPage';
import Admin from './pages/admin/Admin';
import NotFound from './pages/error/NotFound';
import PayungHome from './pages/home/HomePage';
import SearchPage from './pages/search/SearchPage';
import BookingsPage from './pages/profile/BookingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import GuestRoute from './components/GuestRoute';
import MessagePage from './pages/profile/MessagePage';

function App() {
  return (
    <Routes>
      {/* Auth pages — redirect to / if already logged in */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Protected pages — wrapped in ProtectedRoute and AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout>
              <Outlet />
            </AppLayout>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<PayungHome />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/messages" element={<MessagePage />} />
        
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
          <Route path="/kyc" element={<KYC />} />
          <Route path="/kyc/success" element={<KycSuccess />} />
          <Route path="/kyc/status" element={<KycStatus />} />
          <Route path="/kyc/resubmit" element={<KycResubmit />} />
        </Route>
        
        {/* Admin page — only for admin (role 3) */}
        <Route
          path="/admin"
          element={
            <RoleRoute requiredRole={3}>
              <Admin />
            </RoleRoute>
          }
        />
      </Route>

      {/* 404 - Not Found (must be last) */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
