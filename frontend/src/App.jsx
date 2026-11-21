import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import LandingPage from './pages/auth/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import NotFoundPage from './pages/auth/NotFoundPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminOwnersPage from './pages/admin/AdminOwnersPage';
import AdminFasilitasPage from './pages/admin/AdminFasilitasPage';
import OwnerDashboardPage from './pages/owner/OwnerDashboardPage';
import OwnerKosListPage from './pages/owner/OwnerKosListPage';
import OwnerKosFormPage from './pages/owner/OwnerKosFormPage';
import OwnerKamarPage from './pages/owner/OwnerKamarPage';
import OwnerBookingPage from './pages/owner/OwnerBookingPage';
import UserMapPage from './pages/user/UserMapPage';
import UserKosDetailPage from './pages/user/UserKosDetailPage';
import UserBookingsPage from './pages/user/UserBookingsPage';
import UserReviewsPage from './pages/user/UserReviewsPage';
import LaporanPage from './pages/LaporanPage';


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />

      {/* User routes */}
      <Route
        path="/peta"
        element={
          <ProtectedRoute roles={['User']}>
            <UserMapPage />
          </ProtectedRoute>
        }
      />
      {/* Detail kos publik: tamu boleh melihat; aksi booking meminta login di dalam halaman. */}
      <Route path="/kos/:id" element={<UserKosDetailPage />} />
      <Route
        path="/booking-saya"
        element={
          <ProtectedRoute roles={['User']}>
            <UserBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review-saya"
        element={
          <ProtectedRoute roles={['User']}>
            <UserReviewsPage />
          </ProtectedRoute>
        }
      />

      {/* Owner routes */}
      <Route
        path="/owner/dashboard"
        element={
          <ProtectedRoute roles={['Owner']}>
            <OwnerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/kos"
        element={
          <ProtectedRoute roles={['Owner']}>
            <OwnerKosListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/kos/baru"
        element={
          <ProtectedRoute roles={['Owner']}>
            <OwnerKosFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/kos/:id/edit"
        element={
          <ProtectedRoute roles={['Owner']}>
            <OwnerKosFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/kos/:id/kamar"
        element={
          <ProtectedRoute roles={['Owner']}>
            <OwnerKamarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/booking"
        element={
          <ProtectedRoute roles={['Owner']}>
            <OwnerBookingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/laporan"
        element={
          <ProtectedRoute roles={['Owner']}>
            <LaporanPage />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/owner"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AdminOwnersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/fasilitas"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AdminFasilitasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/laporan"
        element={
          <ProtectedRoute roles={['Admin']}>
            <LaporanPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
