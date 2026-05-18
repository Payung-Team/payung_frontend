import React, { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: ReactNode;
}

const MustChangePasswordGuard: React.FC<Props> = ({ children }) => {
  const { mustChangePassword } = useAuth();

  if (mustChangePassword === true) {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};

export default MustChangePasswordGuard;
