import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './Ui';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import { Search, ExternalLink, Menu, PanelLeft } from 'lucide-react';
import '../styles/admin/layout.css';
import '../styles/owner/layout.css';
import '../styles/user/layout.css';

// Menu top navbar untuk role User. Menu sidebar Admin/Owner ada di Sidebar.jsx
const USER_MENUS = [
  { to: '/peta', label: 'Cari Kos di Peta' },
  { to: '/booking-saya', label: 'Booking Saya' },
  { to: '/review-saya', label: 'Review Saya' },
];

// Kunci localStorage untuk mengingat sidebar Admin terakhir dibuka/ditutup.
const SIDEBAR_COLLAPSED_KEY = 'kosfinder.admin.sidebarCollapsed';
// Di atas lebar ini sidebar tampil permanen (bisa diciut jadi ikon). Di bawahnya jadi drawer.
const DESKTOP_QUERY = '(min-width: 1025px)';

export default function AppLayout({ children, fullHeight = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isAdmin = user?.role === 'Admin';

  // Shortcut Ctrl + K (atau Cmd + K di Mac) membuka/menutup pencarian cepat Admin.
  useEffect(() => {
    if (!isAdmin) return undefined;
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAdmin]);

  // Simpan pilihan sidebar (diciutkan / dibentangkan) supaya tidak reset saat pindah halaman.
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* localStorage tidak tersedia: abaikan */
    }
  }, [collapsed]);

  // Tombol Esc menutup drawer sidebar (tampilan tablet/mobile).
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  // Satu tombol, dua perilaku: desktop = ciutkan/bentangkan sidebar, mobile = buka/tutup drawer.
  const handleToggleSidebar = () => {
    if (isAdmin && window.matchMedia(DESKTOP_QUERY).matches) {
      setCollapsed((c) => !c);
    } else {
      setDrawerOpen((o) => !o);
    }
  };

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
              <span>Kos Nais</span>
            </NavLink>
            <nav className="top-nav-links" aria-label="Menu Pencari Kos">
              {USER_MENUS.map((m) => (
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

  return (
    <div className={`dashboard-shell ${user.role === 'Admin' ? 'admin-shell' : 'owner-shell'}`}>
      <Sidebar
        user={user}
        open={drawerOpen}
        collapsed={isAdmin && collapsed}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
      />

      <div className="dashboard-content">
        <header className="topbar">
          <button
            type="button"
            className="btn btn-secondary btn-sm topbar-toggle"
            onClick={handleToggleSidebar}
            aria-label="Buka atau tutup menu navigasi"
            aria-expanded={isAdmin ? !collapsed || drawerOpen : drawerOpen}
          >
            {isAdmin ? <PanelLeft className="icon" /> : <Menu className="icon" />}
          </button>
          {user.role === 'Admin' ? (
            <>
              <button
                type="button"
                className="topbar-search"
                onClick={() => setPaletteOpen(true)}
                aria-label="Buka pencarian cepat (Ctrl K)"
              >
                <Search className="icon" />
                <span className="topbar-search-text">Pencarian Cepat…</span>
                <span className="topbar-search-keys" aria-hidden="true">
                  <kbd>Ctrl</kbd>
                  <kbd>K</kbd>
                </span>
              </button>
              <Link to="/" className="btn btn-secondary topbar-site">
                <ExternalLink className="icon" />
                <span>Lihat Website</span>
              </Link>
            </>
          ) : (
            <span className="brand-title">Kos Finder</span>
          )}
          <button type="button" className="btn btn-ghost btn-sm topbar-logout" onClick={handleLogout}>
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

      {isAdmin && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}