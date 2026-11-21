import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ClipboardList, LayoutDashboard, LogOut, MapPin, MessageSquare } from 'lucide-react';
import { roleHomePath } from '../context/AuthContext';
import '../styles/account-menu.css';

const ROLE_LABEL = { User: 'Pencari Kos', Owner: 'Pemilik Kos', Admin: 'Administrator' };

const USER_ITEMS = [
  { to: '/peta', label: 'Cari Kos di Peta', icon: MapPin },
  { to: '/booking-saya', label: 'Booking Saya', icon: ClipboardList },
  { to: '/review-saya', label: 'Review Saya', icon: MessageSquare },
];

function initialsOf(nama) {
  const parts = String(nama || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * Menu akun (avatar + dropdown kartu). Dipakai di navbar Landing & AppLayout (role User).
 *  - user       : objek user dari AuthContext
 *  - onLogout   : fungsi keluar
 *  - onNavigate : opsional, dipanggil setelah item dipilih (mis. menutup drawer mobile)
 */
export default function AccountMenu({ user, onLogout, onNavigate }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const focusFirstRef = useRef(false);
  const menuId = useId();

  // Klik di luar & tombol Esc menutup menu. Listener hanya aktif saat menu terbuka.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Saat dibuka lewat keyboard (panah bawah), fokus ke item pertama.
  useEffect(() => {
    if (open && focusFirstRef.current) {
      focusFirstRef.current = false;
      menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    }
  }, [open]);

  if (!user) return null;

  const isUser = user.role === 'User';
  const initials = initialsOf(user.nama);

  const close = () => {
    setOpen(false);
    if (onNavigate) onNavigate();
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusFirstRef.current = true;
      if (open) menuRef.current?.querySelector('[role="menuitem"]')?.focus();
      else setOpen(true);
    }
  };

  const handleMenuKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]'));
    const cur = items.indexOf(document.activeElement);
    let next = 0;
    if (e.key === 'ArrowDown') next = (cur + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (cur - 1 + items.length) % items.length;
    else if (e.key === 'End') next = items.length - 1;
    items[next].focus();
  };

  // Tab keluar dari menu -> tutup.
  const handleBlur = (e) => {
    if (open && wrapRef.current && !wrapRef.current.contains(e.relatedTarget)) setOpen(false);
  };

  return (
    <div className={`acct ${open ? 'is-open' : ''}`} ref={wrapRef} onBlur={handleBlur}>
      <button
        ref={triggerRef}
        type="button"
        className="acct-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Menu akun ${user.nama || ''}`.trim()}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="acct-avatar" aria-hidden="true">{initials}</span>
        <span className="acct-name">{user.nama}</span>
        <ChevronDown size={16} aria-hidden="true" className="acct-chevron" />
      </button>

      {open && (
        <div id={menuId} className="acct-menu" role="menu" ref={menuRef} onKeyDown={handleMenuKeyDown}>
          <div className="acct-head">
            <span className="acct-avatar acct-avatar-lg" aria-hidden="true">{initials}</span>
            <div className="acct-head-info">
              <strong className="acct-head-name">{user.nama}</strong>
              {user.email && <span className="acct-head-email">{user.email}</span>}
              <span className="acct-badge">{ROLE_LABEL[user.role] || user.role}</span>
            </div>
          </div>

          {isUser ? (
            USER_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} role="menuitem" className="acct-item" onClick={close}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ))
          ) : (
            <Link to={roleHomePath(user.role)} role="menuitem" className="acct-item" onClick={close}>
              <LayoutDashboard size={18} aria-hidden="true" />
              <span>Dashboard</span>
            </Link>
          )}

          <div className="acct-divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="acct-item acct-danger"
            onClick={() => {
              close();
              onLogout();
            }}
          >
            <LogOut size={18} aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      )}
    </div>
  );
}
