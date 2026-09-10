import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageSkeleton from './ui/PageSkeleton';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  // ไม่มี session → กลับหน้าหลักแบบ guest (ไม่ใช่ /login)
  // logout เคลียร์ session ก่อนที่ handler จะ navigate ทัน guard ตัวนี้จึงชิงพาไป
  // ก่อนเสมอ — ปลายทางที่ถูกต้องต้องอยู่ตรงนี้ ไม่ใช่แค่ในปุ่ม logout
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // มี session → render children
  return <>{children}</>;
};

export default ProtectedRoute;
