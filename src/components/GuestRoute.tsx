import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPostLoginRedirect } from '../utils/getRedirectPath';
import Skeleton from './ui/Skeleton';

interface GuestRouteProps {
  children: ReactNode;
}

const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { session, loading, userRole, mustChangePassword } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6FAF9] flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] bg-white rounded-2xl p-8 shadow-sm space-y-5">
          <Skeleton height={36} width={140} borderRadius="6px" style={{ margin: '0 auto' }} />
          <Skeleton height={16} borderRadius="6px" />
          <Skeleton height={48} borderRadius="10px" />
          <Skeleton height={48} borderRadius="10px" />
          <Skeleton height={48} borderRadius="10px" />
        </div>
      </div>
    );
  }

  if (session) {
    const savedRole = localStorage.getItem('userRole');
    const savedMustChange = localStorage.getItem('mustChangePassword');
    const role = savedRole ? parseInt(savedRole, 10) : 1;
    const mustChangePassword = savedMustChange === 'true';
    return <Navigate to={getPostLoginRedirect({ role, mustChangePassword })} replace />;
  }

  return <>{children}</>;
};

export default GuestRoute;
