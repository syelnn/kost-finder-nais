import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, roleHomePath } from '../context/AuthContext';
import { Spinner } from './Ui';

export function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Memeriksa sesi login..." />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }
  return children;
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Memuat..." />;
  if (user) return <Navigate to={roleHomePath(user.role)} replace />;
  return children;
}
