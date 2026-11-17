import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ExternalLink, LogOut, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { SIDEBAR_MENUS } from './Sidebar';
import '../styles/admin/command-palette.css';

// Kata kunci tambahan supaya pencarian lebih mudah menemukan halaman.
const KEYWORDS = {
  '/admin/dashboard': 'beranda ringkasan statistik grafik',
  '/admin/owner': 'pemilik akun verifikasi persetujuan',
  '/admin/fasilitas': 'master fasilitas wifi ac kamar mandi',
  '/admin/laporan': 'laporan backup ekspor database sql unduh',
};

/**
 * Command palette (Ctrl + K) untuk panel Admin.
 * Props:
 *  - open     : boolean, tampil / tidak
 *  - onClose  : fungsi menutup palette
 *  - onLogout : fungsi logout (dipakai oleh aksi "Keluar")
 */
export default function CommandPalette({ open, onClose, onLogout }) {
  if (!open) return null;
  return <PaletteDialog onClose={onClose} onLogout={onLogout} />;
}

function PaletteDialog({ onClose, onLogout }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  // Daftar semua item: halaman diambil dari menu sidebar (satu sumber data).
  const items = useMemo(() => {
    const pages = (SIDEBAR_MENUS.Admin || []).map((m) => ({
      id: m.to,
      group: 'Halaman',
      label: m.label,
      icon: m.icon,
      hint: 'Buka',
      keywords: KEYWORDS[m.to] || '',
      run: () => navigate(m.to),
    }));
    const actions = [
      {
        id: 'aksi-website',
        group: 'Aksi',
        label: 'Lihat Website',
        icon: ExternalLink,
        hint: 'Buka',
        keywords: 'situs landing beranda publik',
        run: () => navigate('/'),
      },
      {
        id: 'aksi-keluar',
        group: 'Aksi',
        label: 'Keluar',
        icon: LogOut,
        hint: 'Jalankan',
        keywords: 'logout sign out akun',
        run: () => onLogout(),
      },
    ];
    return [...pages, ...actions];
  }, [navigate, onLogout]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => `${it.label} ${it.keywords}`.toLowerCase().includes(q));
  }, [items, query]);

  // Kelompokkan hasil tetapi tetap simpan nomor urut global untuk navigasi keyboard.
  const groups = useMemo(() => {
    const map = [];
    results.forEach((it, index) => {
      let g = map.find((x) => x.name === it.group);
      if (!g) {
        g = { name: it.group, rows: [] };
        map.push(g);
      }
      g.rows.push({ ...it, index });
    });
    return map;
  }, [results]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Kunci scroll halaman selama palette terbuka.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Jaga item aktif tetap terlihat saat memakai panah atas/bawah.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (item) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length) setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length) setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div
        className="cmdk-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian cepat"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="cmdk-search">
          <Search className="cmdk-search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Cari halaman, pengaturan, atau aksi…"
            aria-label="Cari halaman, pengaturan, atau aksi"
            aria-controls="cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-item-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="cmdk-esc" onClick={onClose}>
            esc
          </button>
        </div>

        <div className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef}>
          {results.length === 0 && (
            <div className="cmdk-empty">Tidak ada hasil untuk “{query}”.</div>
          )}
          {groups.map((g) => (
            <div key={g.name} className="cmdk-group">
              <div className="cmdk-group-title">{g.name}</div>
              {g.rows.map((row) => {
                const Icon = row.icon;
                const isActive = row.index === active;
                return (
                  <button
                    type="button"
                    key={row.id}
                    id={`cmdk-item-${row.index}`}
                    data-index={row.index}
                    role="option"
                    aria-selected={isActive}
                    className={`cmdk-item ${isActive ? 'active' : ''}`}
                    onMouseMove={() => setActive(row.index)}
                    onClick={() => choose(row)}
                  >
                    <span className="cmdk-item-icon">
                      <Icon />
                    </span>
                    <span className="cmdk-item-label">{row.label}</span>
                    {isActive && (
                      <span className="cmdk-item-hint">
                        {row.hint} <CornerDownLeft />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="cmdk-footer">
          <span className="cmdk-footer-keys">
            <span className="cmdk-footer-item">
              <kbd><ArrowUp /></kbd>
              <kbd><ArrowDown /></kbd>
              Pilih
            </span>
            <span className="cmdk-footer-item">
              <kbd><CornerDownLeft /></kbd>
              Buka
            </span>
            <span className="cmdk-footer-item">
              <kbd>esc</kbd>
              Tutup
            </span>
          </span>
          <span className="cmdk-count">{results.length} hasil</span>
        </div>
      </div>
    </div>
  );
}
