import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@apollo/client/react';
import { GET_USER } from '../graphql/queries';
import PageSkeleton from './ui/PageSkeleton';

interface RoleRouteProps {
  children: ReactNode;
  requiredRole: number | number[]; // 1 = patient, 2 = caregiver, 3 = admin, 4 = super_admin
}

const ROLE_NAMES: Record<number, string> = {
  1: 'patient',
  2: 'caregiver',
  3: 'admin',
  4: 'super_admin',
};

const ROLE_HOME: Record<number, string> = {
  1: '/patient-home',
  2: '/caregiver-home',
  3: '/admin',
  4: '/admin',
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
  const { session, loading: authLoading, userRole } = useAuth();
  const { data: userData, loading: queryLoading, error: queryError } = useQuery(GET_USER, {
    skip: !session, // ไม่โหลดถ้ายังไม่มี session
  });

  const isLoading = authLoading || (session && queryLoading);

  if (isLoading) {
    return <PageSkeleton />;
  }

  // ไม่มี session → redirect ไป login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Query errored — don't fall back to localStorage to prevent tampered-role bypass
  if (queryError) {
    console.warn('Failed to fetch user role, denying access:', queryError.message);
    return <Navigate to="/" replace />;
  }

  // GraphQL role is authoritative; localStorage is only a fallback for initial render
  const currentRole = userData?.me?.role || (userRole ? Number(userRole) : null);

  // ถ้าไม่มี userRole ก็ redirect ไป /
  if (!currentRole) {
    console.warn('User role not found, redirecting to home');
    return <Navigate to="/" replace />;
  }

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  // ตรวจสอบ role ว่าตรงกับ requiredRole หรือไม่
  if (!allowedRoles.includes(currentRole)) {
    const redirectTo = ROLE_HOME[currentRole] ?? '/';
    console.warn(
      `User role mismatch: expected [${allowedRoles.map(r => ROLE_NAMES[r] || r).join(', ')}], got ${ROLE_NAMES[currentRole] || 'unknown'} (${currentRole}) — redirecting to ${redirectTo}`
    );
    return <Navigate to={redirectTo} replace />;
  }

  // role ตรงกัน → render children
  return <>{children}</>;
};

export default RoleRoute;
