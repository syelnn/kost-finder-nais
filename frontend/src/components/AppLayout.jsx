import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import BrandLogo from './BrandLogo';
import AccountMenu from './AccountMenu';
import CommandPalette from './CommandPalette';
import { Search, ExternalLink, PanelLeft } from 'lucide-react';
// Kerangka & komponen tampilan panel (dipakai Admin DAN Owner, lihat catatan di bawah).
import '../styles/admin/layout.css';
import '../styles/admin/dashboard.css';
// Tambahan khusus Owner (banner status, penyesuaian halaman peta). Harus setelah admin.
import '../styles/owner/layout.css';
import '../styles/user/layout.css';

// Menu top navbar untuk role User. Menu sidebar Admin/Owner ada di Sidebar.jsx
const USER_MENUS = [
  { to: '/peta', label: 'Cari Kos di Peta' },
  { to: '/booking-saya', label: 'Booking Saya' },
  { to: '/review-saya', label: 'Review Saya' },
];

// Kunci localStorage untuk mengingat sidebar terakhir dibuka/ditutup (Admin & Owner).
const SIDEBAR_COLLAPSED_KEY = 'kosfinder.admin.sidebarCollapsed';
// Di atas lebar ini sidebar tampil permanen (bisa diciut jadi ikon). Di bawahnya jadi drawer.
const DESKTOP_QUERY = '(min-width: 1025px)';

export default function AppLayout({ children, fullHeight = false }) {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Admin & Owner memakai kerangka panel yang sama (sidebar ciut + topbar + pencarian cepat).
  // Yang berbeda hanya daftar menunya (lihat SIDEBAR_MENUS di Sidebar.jsx).
  const hasPanel = user?.role === 'Admin' || user?.role === 'Owner';

  // Shortcut Ctrl + K (atau Cmd + K di Mac) membuka/menutup pencarian cepat.
  useEffect(() => {
    if (!hasPanel) return undefined;
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasPanel]);

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

  // Layar dilebarkan ke ukuran desktop saat drawer masih terbuka: tutup drawer otomatis.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => {
      if (e.matches) setDrawerOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Satu tombol, dua perilaku: desktop = ciutkan/bentangkan sidebar, mobile = buka/tutup drawer.
  const handleToggleSidebar = () => {
    if (hasPanel && window.matchMedia(DESKTOP_QUERY).matches) {
      setCollapsed((c) => !c);
    } else {
      setDrawerOpen((o) => !o);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    // Kerangka ringan untuk tamu (mis. detail kos publik /kos/:id).
    const from = `${location.pathname}${location.search}`;
    return (
      <div className="user-shell">
        <header className="top-navbar">
          <div className="top-navbar-inner">
            <Link to="/" className="brand-logo">
              <BrandLogo />
            </Link>
            <div className="top-nav-user">
              {authLoading ? null : (
                <>
                  <Link to="/login" state={{ from }} className="btn btn-primary btn-sm">
                    Masuk
                  </Link>
                  <Link to="/register" state={{ from }} className="btn btn-secondary btn-sm guest-register-btn">
                    Daftar
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className={fullHeight ? 'user-main-full' : 'user-main'}>{children}</main>
      </div>
    );
  }

  const isPendingOwner = user.role === 'Owner' && user.status_verifikasi === 'Menunggu';

  if (user.role === 'User') {
    return (
      <div className="user-shell">
        <header className="top-navbar">
          <div className="top-navbar-inner">
            <NavLink to="/peta" className="brand-logo">
              <BrandLogo />
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
              <AccountMenu user={user} onLogout={handleLogout} />
            </div>
          </div>
        </header>
        <main className={fullHeight ? 'user-main-full' : 'user-main'}>{children}</main>
      </div>
    );
  }

  return (
    <div className={`dashboard-shell admin-shell ${user.role === 'Owner' ? 'owner-shell' : ''}`}>
      <Sidebar
        user={user}
        open={drawerOpen}
        collapsed={hasPanel && collapsed}
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
            aria-expanded={!collapsed || drawerOpen}
          >
            <PanelLeft className="icon" />
          </button>
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

      {hasPanel && (
        <CommandPalette
          role={user.role}
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}