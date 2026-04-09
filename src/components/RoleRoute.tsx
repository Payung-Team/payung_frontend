import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './ui/Spinner';

interface RoleRouteProps {
  children: ReactNode;
  requiredRole: number; // 1 = patient, 2 = caregiver, 3 = admin
}

const ROLE_NAMES: Record<number, string> = {
  1: 'patient',
  2: 'caregiver',
  3: 'admin',
};

/**
 * RoleRoute — ป้องกันการเข้า route ตาม role ของ user
 * 
 * extends ProtectedRoute functionality:
 * 1. ตรวจสอบ auth เหมือน ProtectedRoute
 * 2. ตรวจสอบ user.role ว่าตรงกับ requiredRole หรือไม่
 * 3. ถ้าไม่ตรง → redirect ไป home page "/"
 * 4. ถ้าตรง → render children
 */
const RoleRoute: React.FC<RoleRouteProps> = ({ children, requiredRole }) => {
  const { session, loading, userRole } = useAuth();

  // กำลังตรวจสอบ auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // ไม่มี session → redirect ไป login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // ถ้าไม่มี userRole ก็ redirect ไป /
  if (!userRole) {
    console.warn('User role not found, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // ตรวจสอบ role ว่าตรงกับ requiredRole หรือไม่
  if (userRole !== requiredRole) {
    console.warn(
      `User role mismatch: expected ${ROLE_NAMES[requiredRole]} (${requiredRole}), got ${ROLE_NAMES[userRole] || 'unknown'} (${userRole})`
    );
    return <Navigate to="/" replace />;
  }

  // role ตรงกัน → render children
  return <>{children}</>;
};

export default RoleRoute;
