import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './ui/Spinner';

interface GuestRouteProps {
  children: ReactNode;
}

/**
 * GuestRoute — ป้องกันไม่ให้ user ที่ login แล้วเข้า /login หรือ /register
 *
 * ขั้นตอน:
 * 1. ถ้า loading → แสดง Spinner
 * 2. ถ้า session มี → redirect ไป /
 * 3. ถ้า !session → render children ตามปกติ
 */
const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default GuestRoute;
