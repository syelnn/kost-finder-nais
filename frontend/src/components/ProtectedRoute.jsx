import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, roleHomePath } from '../context/AuthContext';
import { Spinner } from './Ui';

/**
 * Ambil tujuan asal (location.state.from) yang aman: hanya path internal ("/..."),
 * bukan "//host" (open redirect) dan bukan halaman login/register itu sendiri.
 */
export function safeFrom(location) {
  const from = location?.state?.from;
  if (typeof from !== 'string') return null;
  if (!from.startsWith('/') || from.startsWith('//')) return null;
  if (from === '/login' || from === '/register') return null;
  return from;
}

export function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Memeriksa sesi login..." />;
  if (!user) {
    // Simpan alamat lengkap + query (mis. /peta?q=dago) supaya ikut terbawa setelah login.
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" state={{ from }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }
  return children;
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Memuat..." />;
  if (user) return <Navigate to={safeFrom(location) || roleHomePath(user.role)} replace />;
  return children;
}
