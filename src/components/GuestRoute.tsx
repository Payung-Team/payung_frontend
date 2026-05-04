import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Skeleton from './ui/Skeleton';

interface GuestRouteProps {
  children: ReactNode;
}

const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();

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
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default GuestRoute;
