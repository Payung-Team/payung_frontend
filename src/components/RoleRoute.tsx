import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@apollo/client/react';
import { GET_USER } from '../graphql/queries';
import PageSkeleton from './ui/PageSkeleton';
import { isConnectionError } from '../lib/apolloErrors';

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
  const { session, loading: authLoading, userRole, logout } = useAuth();
  const { data: userData, loading: queryLoading, error: queryError, refetch } = useQuery(GET_USER, {
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
  // PYG-717: เดิม redirect ไป "/" → HomeRedirect เห็นว่ามี session ก็พากลับมาหน้านี้ → ขอ role ใหม่ → ล้มอีก
  //   วนไม่จบ ยิง API รัว ๆ ตอน API ล่ม (25 ต.ค. ซ้ำเติม Worker จน 1102) — ตอนนี้หยุดที่หน้านี้ ไม่ render children
  //   (ยังปฏิเสธการเข้าถึงเหมือนเดิม) ให้ผู้ใช้กดลองใหม่เอง
  if (queryError) {
    if (import.meta.env.DEV) console.warn('Failed to fetch user role, denying access:', queryError.message);
    return (
      <RoleCheckFailed
        connection={isConnectionError(queryError)}
        onRetry={() => void refetch()}
        onLogout={() => void logout()}
      />
    );
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

/** ขอ role ไม่สำเร็จ — แสดงสถานะ + ให้ผู้ใช้เลือกเอง (ห้าม redirect อัตโนมัติ: วนยิง API) */
function RoleCheckFailed({
  connection,
  onRetry,
  onLogout,
}: {
  connection: boolean;
  onRetry: () => void;
  onLogout: () => void;
}) {
  return (
    <div role="alert" className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-[#E3EFEA] bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-bold text-[#1A1A1A]">
          {connection ? 'เชื่อมต่อระบบไม่ได้' : 'ตรวจสอบสิทธิ์การใช้งานไม่สำเร็จ'}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#6B7773]">
          {connection
            ? 'ระบบอาจขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งในอีกสักครู่'
            : 'กรุณาลองใหม่ หรือออกจากระบบแล้วเข้าสู่ระบบอีกครั้ง'}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="h-11 w-full rounded-xl bg-[#009265] text-sm font-semibold text-white hover:bg-[#007A55]"
          >
            ลองใหม่
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="h-11 w-full rounded-xl border border-[#E3EFEA] text-sm font-semibold text-[#1A1A1A] hover:bg-[#F6FAF9]"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleRoute;
