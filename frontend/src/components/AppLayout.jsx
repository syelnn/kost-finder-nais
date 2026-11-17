import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './Ui';

const MENUS = {
  Admin: [
    { to: '/admin/dashboard', label: 'Dashboard Admin' },
    { to: '/admin/owner', label: 'Verifikasi Owner' },
    { to: '/admin/fasilitas', label: 'Master Fasilitas' },
    { to: '/admin/laporan', label: 'Laporan & Backup' },
  ],
  Owner: [
    { to: '/owner/dashboard', label: 'Dashboard Owner' },
    { to: '/owner/kos', label: 'Kelola Kos & Kamar' },
    { to: '/owner/kos/baru', label: 'Tambah Kos Baru' },
    { to: '/owner/booking', label: 'Approval Booking' },
    { to: '/owner/laporan', label: 'Laporan & Backup' },
  ],
  User: [
    { to: '/peta', label: 'Cari Kos di Peta' },
    { to: '/booking-saya', label: 'Booking Saya' },
  ],
};

export default function AppLayout({ children, fullHeight = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return children;

  const isPendingOwner = user.role === 'Owner' && user.status_verifikasi === 'Menunggu';

  if (user.role === 'User') {
    return (
      <div className="user-shell">
        <header className="top-navbar">
          <div className="top-navbar-inner">
            <NavLink to="/peta" className="brand-logo">
              <span className="brand-mark">⌂</span>
              <span>Kos Finder</span>
            </NavLink>
            <nav className="top-nav-links" aria-label="Menu Pencari Kos">
              {MENUS.User.map((m) => (
                <NavLink
                  key={m.to}
                  to={m.to}
                  className={({ isActive }) => `top-nav-link ${isActive ? 'active' : ''}`}
                >
                  {m.label}
                </NavLink>
              ))}
            </nav>
            <div className="top-nav-user">
              <span className="user-pill">
                <strong>{user.nama}</strong>
                <StatusBadge status={user.role}>Pencari Kos</StatusBadge>
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Keluar
              </button>
            </div>
          </div>
        </header>
        <main className={fullHeight ? 'user-main-full' : 'user-main'}>{children}</main>
      </div>
    );
  }

  const menus = MENUS[user.role] || [];

  return (
    <div className="dashboard-shell">
      {drawerOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`} aria-label="Navigasi samping">
        <div className="sidebar-brand">
          <span className="brand-mark">⌂</span>
          <div>
            <div className="brand-title">Kos Finder</div>
            <div className="brand-subtitle">Panel {user.role === 'Admin' ? 'Administrator' : 'Pemilik Kos'}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {menus.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/owner/kos'}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user.nama}</div>
            <div className="sidebar-user-email">{user.email}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <StatusBadge status={user.role} />
              {user.role === 'Owner' && <StatusBadge status={user.status_verifikasi} />}
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-block" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="mobile-topbar">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu navigasi"
          >
            ☰ Menu
          </button>
          <span className="brand-title">Kos Finder</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Keluar
          </button>
        </header>

        {isPendingOwner && (
          <div className="owner-pending-banner" role="alert">
            <strong>Status Akun: Menunggu Verifikasi Admin.</strong> Anda sudah dapat menambah dan mengelola data kos serta kamar, namun kos belum dapat dipublikasikan (diaktifkan ke peta) sampai Admin memverifikasi akun Anda.
          </div>
        )}

        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
