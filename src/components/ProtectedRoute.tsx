import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './ui/Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute — ป้องกันการเข้า route ที่ต้อง authentication
 * 
 * ขั้นตอน:
 * 1. ถ้า loading → แสดง Spinner
 * 2. ถ้า !session → redirect ไป /login
 * 3. ถ้า session มี → render children ตามปกติ
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();

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

  // มี session → render children
  return <>{children}</>;
};

export default ProtectedRoute;
