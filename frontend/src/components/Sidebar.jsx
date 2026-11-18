import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { StatusBadge } from './Ui';
import {
  LayoutDashboard, UserCheck, Layers, FileText, Building2, CirclePlus,
  CalendarCheck, LogOut, ChevronsUpDown,
} from 'lucide-react';
import logoKosFinder from '../assets/logo.png';

// Menu sidebar per role (Admin & Owner). Role User memakai top navbar di AppLayout.
export const SIDEBAR_MENUS = {
  Admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard Admin' },
    { to: '/admin/owner', icon: UserCheck, label: 'Verifikasi Owner' },
    { to: '/admin/fasilitas', icon: Layers, label: 'Master Fasilitas' },
    { to: '/admin/laporan', icon: FileText, label: 'Laporan & Backup' },
  ],
  Owner: [
    { to: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard Owner' },
    { to: '/owner/kos', icon: Building2, label: 'Kelola Kos & Kamar' },
    { to: '/owner/kos/baru', icon: CirclePlus, label: 'Tambah Kos Baru' },
    { to: '/owner/booking', icon: CalendarCheck, label: 'Approval Booking' },
    { to: '/owner/laporan', icon: FileText, label: 'Laporan & Backup' },
  ],
};

/**
 * Sidebar untuk role Admin dan Owner.
 * Props:
 *  - user     : objek user dari useAuth()
 *  - open     : boolean, drawer terbuka (mobile)
 *  - collapsed: boolean, sidebar diciutkan jadi ikon saja (desktop, khusus Admin)
 *  - onClose  : fungsi untuk menutup drawer
 *  - onLogout : fungsi logout
 */
export default function Sidebar({ user, open, collapsed = false, onClose, onLogout }) {
  const menus = SIDEBAR_MENUS[user.role] || [];
  const [menuOpen, setMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Menu akun ditutup saat klik di luar area menu atau menekan Esc.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  // Drawer (mobile) ditutup/dibuka ulang: menu akun ikut direset.
  useEffect(() => {
    setMenuOpen(false);
  }, [open]);

  const handleLogoutClick = () => {
    setMenuOpen(false);
    onLogout();
  };

  return (
    <>
      {open && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`} aria-label="Navigasi samping">
        <div className="sidebar-brand">
          <img
            src={logoKosFinder}
            alt="Logo Kos Finder"
            style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }}
          />
          <div>
            <div className="brand-title">Kos Nais</div>
            <div className="brand-subtitle">Panel {user.role === 'Admin' ? 'Administrator' : 'Pemilik Kos'}</div>
          </div>
        </div>
        <div className="sidebar-label">Menu Utama</div>
        <nav className="sidebar-nav">
          {menus.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/owner/kos'}
              onClick={onClose}
              title={collapsed ? m.label : undefined}
              aria-label={m.label}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <m.icon className="icon" />
              <span className="sidebar-text">{m.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-account" ref={userMenuRef}>
            {menuOpen && (
              <div className="sidebar-account-menu" role="menu" aria-label="Menu akun">
                <div className="sidebar-account-head">
                  <span className="sidebar-avatar">{user.nama?.[0]}</span>
                  <div className="sidebar-account-info">
                    <div className="sidebar-user-name">{user.nama}</div>
                    <div className="sidebar-user-email">{user.email}</div>
                    <div className="sidebar-badges">
                      <StatusBadge status={user.role} />
                      {user.role === 'Owner' && <StatusBadge status={user.status_verifikasi} />}
                    </div>
                  </div>
                </div>
                <div className="sidebar-account-divider" />
                <button
                  type="button"
                  role="menuitem"
                  className="sidebar-account-item sidebar-account-logout"
                  onClick={handleLogoutClick}
                  aria-label="Keluar"
                >
                  <LogOut className="icon" />
                  <span>Log out</span>
                </button>
              </div>
            )}
            <button
              type="button"
              className={`sidebar-account-trigger ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={collapsed ? user.nama : undefined}
            >
              <span className="sidebar-avatar">{user.nama?.[0]}</span>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.nama}</div>
                <div className="sidebar-user-email">{user.email}</div>
              </div>
              <ChevronsUpDown className="icon sidebar-account-chevron" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}