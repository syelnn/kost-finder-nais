import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  User,
  X,
} from 'lucide-react';
import { useAuth, roleHomePath } from '../../context/AuthContext';
import { handleAnchorClick } from './scrollToSection';

const NAV_LINKS = [
  { id: 'kost-tersedia', label: 'Kost Tersedia' },
  { id: 'tentang-kami', label: 'Tentang Kami' },
  { id: 'kontak', label: 'Hubungi Kami' },
];

/** Dropdown "Profile Saya" untuk user yang sudah login. */
function ProfileMenu({ user, onLogout, onNavigate }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // Tutup saat klik di luar atau tekan Escape. Listener dipasang hanya saat menu terbuka.
  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        if (buttonRef.current) buttonRef.current.focus();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Panah atas/bawah memindahkan fokus antar item menu.
  const handleMenuKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]'));
    const current = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next].focus();
  };

  const close = () => {
    setOpen(false);
    if (onNavigate) onNavigate();
  };

  const isUser = user.role === 'User';

  return (
    <div className="lp-profile" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-secondary lp-profile-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="lp-profile-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <User size={18} aria-hidden="true" />
        <span>Profile Saya</span>
        <ChevronDown size={16} aria-hidden="true" className={`lp-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div
          id="lp-profile-menu"
          className="lp-dropdown"
          role="menu"
          aria-label="Menu profil"
          ref={menuRef}
          onKeyDown={handleMenuKeyDown}
        >
          <div className="lp-dropdown-head">
            <strong>{user.nama}</strong>
            <span>{isUser ? 'Pencari Kos' : user.role === 'Owner' ? 'Pemilik Kos' : 'Administrator'}</span>
          </div>
          {isUser ? (
            <>
              <Link to="/booking-saya" role="menuitem" className="lp-dropdown-item" onClick={close}>
                <ClipboardList size={16} aria-hidden="true" /> Booking Saya
              </Link>
              <Link to="/review-saya" role="menuitem" className="lp-dropdown-item" onClick={close}>
                <MessageSquare size={16} aria-hidden="true" /> Review Saya
              </Link>
            </>
          ) : (
            <Link to={roleHomePath(user.role)} role="menuitem" className="lp-dropdown-item" onClick={close}>
              <LayoutDashboard size={16} aria-hidden="true" /> Dashboard
            </Link>
          )}
          <div className="lp-dropdown-divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="lp-dropdown-item lp-dropdown-danger"
            onClick={() => {
              onLogout(); // hapus token; tetap berada di halaman "/"
              close();
            }}
          >
            <LogOut size={16} aria-hidden="true" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}

export default function LandingNavbar() {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Escape menutup menu hamburger (mobile).
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleBrandClick = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMenu();
  };

  return (
    <header className="lp-navbar">
      <div className="container lp-navbar-inner">
        <Link to="/" className="brand-logo" onClick={handleBrandClick} aria-label="Kos Nais - ke atas halaman">
          <span className="brand-mark" aria-hidden="true">⌂</span>
          <span>Kos Nais</span>
        </Link>

        <button
          type="button"
          className="lp-burger"
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={menuOpen}
          aria-controls="lp-nav-panel"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>

        <div id="lp-nav-panel" className={`lp-nav-panel ${menuOpen ? 'open' : ''}`}>
          <nav className="lp-nav-links" aria-label="Menu utama">
            {NAV_LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                className="lp-nav-link"
                onClick={(e) => handleAnchorClick(e, l.id, closeMenu)}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="lp-nav-actions">
            {loading ? (
              // Penahan ukuran agar tombol tidak "berkedip" saat status login masih diperiksa.
              <span className="lp-auth-placeholder" aria-hidden="true" />
            ) : user ? (
              <ProfileMenu user={user} onLogout={logout} onNavigate={closeMenu} />
            ) : (
              <Link to="/login" className="btn btn-primary" onClick={closeMenu}>
                Masuk
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
