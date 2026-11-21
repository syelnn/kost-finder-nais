/* =====================================================================
   LANDING PAGE — SATU FILE
   Gabungan dari: LandingNavbar, HeroCarousel, KosSection, AboutSection,
   LandingFooter, dan scrollToSection.

   Urutan isi file ini:
     1. Import
     2. Helper kecil (scroll mulus, reduced motion)
     3. Navbar        (+ AccountMenu)
     4. Hero          (judul, pencarian -> filter "Kost Tersedia", carousel)
     5. Kost Tersedia (kartu kos)
     6. Tentang Kami  (4 fitur)
     7. Footer        (kontak: edit di objek CONTACT)
     8. LandingPage   (komponen utama + fetch data)

   Gaya: src/styles/landing/landing.css (satu file, tinggal ubah warna di sana)
   ===================================================================== */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, KosImage } from '../../components/Ui';
import AccountMenu from '../../components/AccountMenu';
import BrandLogo from '../../components/BrandLogo';
import { formatRating, formatRupiah } from '../../utils/format';
import '../../styles/landing/landing.css';

/* =====================================================================
   2. HELPER
   ===================================================================== */

// Pindah mulus ke section berdasarkan id. scroll-margin-top di CSS menjaga judul
// section tidak tertutup navbar sticky. Hormati preferensi "kurangi gerakan".
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

// Handler untuk <a href="#id">: cegah lompatan bawaan, pakai smooth scroll.
function handleAnchorClick(e, id, after) {
  e.preventDefault();
  scrollToSection(id);
  if (after) after();
}

// true bila pengguna meminta "kurangi gerakan" di sistem operasinya.
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/* =====================================================================
   3. NAVBAR
   ===================================================================== */

const NAV_LINKS = [
  { id: 'kost-tersedia', label: 'Kost Tersedia' },
  { id: 'tentang-kami', label: 'Tentang Kami' },
  { id: 'kontak', label: 'Hubungi Kami' },
];

/** Menu akun untuk user yang sudah login: lihat src/components/AccountMenu.jsx */

function LandingNavbar() {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Hanya visual: beri bayangan pada navbar setelah halaman di-scroll (class "is-scrolled").
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <header className={`lp-navbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container lp-navbar-inner">
        <Link to="/" className="brand-logo" onClick={handleBrandClick} aria-label="Kos Nais - ke atas halaman">
          <BrandLogo />
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
              <div className="lp-nav-user">
                {user.role === 'User' && (
                  <Link to="/peta" className="btn btn-primary lp-nav-map-btn" onClick={closeMenu}>
                    <MapPin size={16} aria-hidden="true" />
                    Cari di Peta
                  </Link>
                )}
                {/* logout: hapus token, tetap di halaman "/" */}
                <AccountMenu user={user} onLogout={logout} onNavigate={closeMenu} />
              </div>
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

/* =====================================================================
   4. HERO (judul + pencarian + carousel foto)
   ===================================================================== */

const MAX_SLIDES = 5;
const AUTOPLAY_MS = 1500;
const SWIPE_THRESHOLD = 50;

const PLACEHOLDER_SLIDE = {
  kos_id: 'placeholder',
  nama_kos: 'Temukan kos impianmu',
  wilayah: 'Kos Nais',
  foto: null,
};

function HeroCarousel({ kosList, loading, kata, onKataChange, onSearchSubmit }) {
  const reducedMotion = usePrefersReducedMotion();

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  // Maksimal 5 kos yang punya foto; bila tidak ada, satu slide placeholder.
  const slides = useMemo(() => {
    const withPhoto = kosList.filter((k) => k.foto).slice(0, MAX_SLIDES);
    return withPhoto.length ? withPhoto : [PLACEHOLDER_SLIDE];
  }, [kosList]);
  const count = slides.length;

  const goTo = (i) => setIndex(((i % count) + count) % count);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Jaga index tetap valid bila jumlah slide berubah.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Auto-slide: interval dibersihkan saat unmount / pause / reduced motion / index berubah
  // (index di dependency membuat timer mulai ulang setelah navigasi manual).
  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, paused, reducedMotion, index]);

  // Pencarian tidak pindah halaman: memfilter "Kost Tersedia" lalu scroll ke sana.
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearchSubmit();
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) next();
    else prev();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  };

  const autoplaying = count > 1 && !paused && !reducedMotion;

  return (
    <section className="lp-hero" aria-labelledby="lp-hero-title">
      <div className="container">
        <div className="lp-hero-grid">
          <div className="lp-hero-left">
            <h1 id="lp-hero-title">
              Bingung nyari kost?{' '}
              <span className="lp-hero-accent">Nais-Kost</span> solusinya
            </h1>
            <p>Cari kos aktif langsung di peta, bandingkan harga dan fasilitas, lalu booking online.</p>

            <form className="lp-search" role="search" onSubmit={handleSubmit}>
              <label htmlFor="lp-search-input" className="lp-sr-only">
                Cari nama kos, alamat, atau wilayah
              </label>
              <div className="lp-search-field">
                <Search size={18} aria-hidden="true" />
                <input
                  id="lp-search-input"
                  type="search"
                  value={kata}
                  onChange={(e) => onKataChange(e.target.value)}
                  placeholder="Cari"
                  autoComplete="off"
                  aria-controls="kost-tersedia"
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Cari Kos
              </button>
            </form>
          </div>

          <div className="lp-hero-right">
            {loading ? (
              <div className="lp-carousel lp-skeleton" role="status" aria-label="Memuat foto kos" />
            ) : (
              <div
                className="lp-carousel"
                role="region"
                aria-roledescription="carousel"
                aria-label="Foto kos pilihan"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onFocus={() => setPaused(true)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onKeyDown={handleKeyDown}
              >
                <div
                  className="lp-carousel-track"
                  style={{ transform: `translateX(-${index * 100}%)` }}
                  aria-live={autoplaying ? 'off' : 'polite'}
                >
                  {slides.map((k, i) => (
                    <div
                      key={k.kos_id}
                      className="lp-slide"
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${i + 1} dari ${count}`}
                      aria-hidden={i !== index}
                    >
                      <KosImage path={k.foto} alt={`Foto ${k.nama_kos}`} className="lp-slide-img" />
                      <div className="lp-slide-caption">
                        <strong>{k.nama_kos}</strong>
                        <span>
                          <MapPin size={14} aria-hidden="true" /> {k.wilayah}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {count > 1 && (
                  <>
                    <button type="button" className="lp-carousel-btn lp-prev" onClick={prev} aria-label="Foto sebelumnya">
                      <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button type="button" className="lp-carousel-btn lp-next" onClick={next} aria-label="Foto berikutnya">
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                    <div className="lp-dots">
                      {slides.map((k, i) => (
                        <button
                          key={k.kos_id}
                          type="button"
                          className={`lp-dot ${i === index ? 'active' : ''}`}
                          onClick={() => goTo(i)}
                          aria-label={`Ke foto ${i + 1}`}
                          aria-current={i === index}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   5. KOST TERSEDIA
   ===================================================================== */

const MAX_CARDS = 6;
const SEARCH_PAGE = 12; // jumlah kartu per "Tampilkan lebih banyak" saat mencari
const SEARCH_DEBOUNCE_MS = 250;
const SKELETON_COUNT = 3;

function KosCard({ kos, detailTo }) {
  const hasRating = kos.rata_rating !== null && kos.rata_rating !== undefined;
  return (
    <article className="lp-kos-card">
      <div className="lp-kos-media">
        <KosImage path={kos.foto} alt={`Foto ${kos.nama_kos}`} className="lp-kos-img" />
        <span className="lp-chip lp-chip-success lp-kos-avail">{kos.kamar_kosong} kamar kosong</span>
      </div>
      <div className="lp-kos-body">
        <div className="lp-kos-meta">
          <span className="lp-chip">{kos.tipe_kos}</span>
          <span className="lp-kos-rating" title="Rating rata-rata">
            <Star size={14} aria-hidden="true" />
            {hasRating ? `${formatRating(kos.rata_rating)} (${kos.jumlah_review})` : 'Belum ada ulasan'}
          </span>
        </div>
        <h3>{kos.nama_kos}</h3>
        <p className="lp-kos-loc">
          <MapPin size={14} aria-hidden="true" /> {kos.wilayah}
        </p>
        <p className="lp-kos-price">
          <small className="lp-kos-from">Mulai</small>
          {formatRupiah(kos.harga_mulai)}
          <span>/bulan</span>
        </p>
        <Link to={detailTo} className="btn btn-primary btn-block">
          Lihat Detail
        </Link>
      </div>
    </article>
  );
}

function KosSection({ kosList, loading, error, onRetry, query, onClearSearch }) {
  const { user } = useAuth();
  // Owner yang login: tombol detail langsung menuju halaman Kelola Kos.
  const isOwner = user?.role === 'Owner';
  // Hanya kos yang masih punya kamar kosong.
  const available = useMemo(() => kosList.filter((k) => Number(k.kamar_kosong) > 0), [kosList]);

  // Filter client-side (tidak peka huruf besar/kecil) ke nama_kos, alamat, wilayah.
  const q = query.toLocaleLowerCase('id');
  const results = useMemo(() => {
    if (!q) return available;
    return available.filter((k) =>
      [k.nama_kos, k.alamat, k.wilayah].some((v) => String(v || '').toLocaleLowerCase('id').includes(q))
    );
  }, [available, q]);

  // Saat mencari: tampilkan bertahap (SEARCH_PAGE per klik), bukan dibatasi MAX_CARDS.
  const [limit, setLimit] = useState(SEARCH_PAGE);
  useEffect(() => setLimit(SEARCH_PAGE), [q]);
  const visible = q ? results.slice(0, limit) : results.slice(0, MAX_CARDS);

  return (
    <section id="kost-tersedia" className="lp-section" aria-labelledby="lp-kost-title">
      <div className="container">
        <div className="lp-section-head">
          <h2 id="lp-kost-title">Kost Tersedia</h2>
          <p>Pilihan kos dengan kamar kosong yang siap kamu booking sekarang.</p>
        </div>

        {q && !loading && !error && (
          <div className="lp-search-summary" role="status" aria-live="polite">
            <span>
              <strong>{results.length}</strong> hasil untuk &lsquo;<strong>{query}</strong>&rsquo;
            </span>
            <button type="button" className="btn btn-secondary lp-search-clear" onClick={onClearSearch}>
              <X size={16} aria-hidden="true" />
              Hapus pencarian
            </button>
          </div>
        )}

        {loading ? (
          <div className="lp-kos-grid" aria-busy="true">
            <p className="lp-sr-only" role="status">
              Memuat daftar kost tersedia…
            </p>
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <div key={i} className="lp-kos-card" aria-hidden="true">
                <div className="lp-kos-media lp-skeleton" />
                <div className="lp-kos-body">
                  <div className="lp-skeleton lp-skel-line" style={{ width: '40%' }} />
                  <div className="lp-skeleton lp-skel-line" style={{ width: '80%', height: 20 }} />
                  <div className="lp-skeleton lp-skel-line" style={{ width: '55%' }} />
                  <div className="lp-skeleton lp-skel-line" style={{ width: '100%', height: 44 }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="lp-error" role="alert">
            <p>{error}</p>
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              Coba Lagi
            </button>
          </div>
        ) : q && results.length === 0 ? (
          <EmptyState
            title="Tidak ada kost yang cocok"
            description={`Belum ada kost tersedia untuk "${query}". Coba kata kunci lain seperti nama kos, jalan, atau kecamatan.`}
            actionLabel="Hapus pencarian"
            onAction={onClearSearch}
          />
        ) : available.length === 0 ? (
          <EmptyState
            title="Belum ada kost tersedia"
            description="Saat ini belum ada kos dengan kamar kosong. Coba lihat peta atau kembali lagi nanti."
          />
        ) : (
          <>
            <div className="lp-kos-grid">
              {visible.map((k) => (
                <KosCard key={k.kos_id} kos={k} detailTo={isOwner ? '/owner/kos' : `/kos/${k.kos_id}`} />
              ))}
            </div>
            {q && results.length > visible.length && (
              <div className="lp-section-cta lp-more">
                <button type="button" className="btn btn-secondary" onClick={() => setLimit((n) => n + SEARCH_PAGE)}>
                  Tampilkan lebih banyak ({results.length - visible.length} lagi)
                </button>
              </div>
            )}
          </>
        )}

        <div className="lp-section-cta">
          <Link to="/peta" className="btn btn-primary btn-lg">
            Lihat Kost Berdasarkan Peta
          </Link>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   6. TENTANG KAMI
   ===================================================================== */

// Semua poin di bawah adalah fitur nyata aplikasi ini.
const FEATURES = [
  {
    icon: MapPin,
    title: 'Cari Lewat Peta Interaktif',
    text: 'Atur titik acuan (misalnya kampus), pilih radius jarak, lalu lihat kos terdekat langsung di peta dengan marker hijau untuk yang masih ada kamar kosong.',
  },
  {
    icon: ShieldCheck,
    title: 'Kos Aktif & Pemilik Terverifikasi',
    text: 'Hanya kos berstatus aktif yang tampil di peta, dan hanya pemilik yang sudah diverifikasi admin yang dapat mempublikasikan kosnya.',
  },
  {
    icon: FileDown,
    title: 'Booking Online dengan Bukti',
    text: 'Ajukan booking survey atau sewa kamar secara online, dan unduh bukti konfirmasi booking (PDF) setelah pemilik menyetujui.',
  },
  {
    icon: MessageSquare,
    title: 'Review dari Penghuni Asli',
    text: 'Rating dan ulasan hanya bisa ditulis oleh pengguna yang benar-benar sudah menyelesaikan booking, jadi penilaiannya bisa dipercaya.',
  },
];

function AboutSection() {
  return (
    <section id="tentang-kami" className="lp-section lp-section-alt" aria-labelledby="lp-about-title">
      <div className="container">
        <div className="lp-section-head">
          <h2 id="lp-about-title">Kenapa Pilih Kost Kami?</h2>
          <p>Mencari kos jadi lebih cepat, jelas, dan aman.</p>
        </div>
        <div className="lp-about-grid">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="lp-about-card">
              <span className="lp-about-icon" aria-hidden="true">
                <Icon size={24} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   7. FOOTER
   ===================================================================== */

// DATA DUMMY — ganti dengan kontak asli. Cukup ubah di sini, footer ikut berubah.
const CONTACT = {
  alamat: 'Jl. Contoh No. 123, Kota Bandung, Jawa Barat (alamat dummy)',
  email: 'halo@kosfinder.example',
  telepon: '0812-3456-7890',
  teleponHref: '+6281234567890',
};

function LandingFooter() {
  return (
    <footer id="kontak" className="lp-footer">
      <div className="container">
        <div className="lp-footer-grid">
          <div>
            <div className="lp-footer-brand">
              <BrandLogo />
            </div>
            <p className="lp-footer-about">
              Platform pencarian dan pemesanan kos berbasis peta untuk mahasiswa dan perantau.
            </p>
          </div>

          <div>
            <h3>Hubungi Kontak</h3>
            <ul className="lp-footer-list">
              <li>
                <MapPin size={16} aria-hidden="true" />
                <span>{CONTACT.alamat}</span>
              </li>
              <li>
                <Mail size={16} aria-hidden="true" />
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </li>
              <li>
                <Phone size={16} aria-hidden="true" />
                <a href={`tel:${CONTACT.teleponHref}`}>{CONTACT.telepon}</a>
              </li>
            </ul>
          </div>

          <div>
            <h3>Tautan Cepat</h3>
            <ul className="lp-footer-list lp-footer-links">
              <li>
                <a href="#kost-tersedia" onClick={(e) => handleAnchorClick(e, 'kost-tersedia')}>
                  Kost Tersedia
                </a>
              </li>
              <li>
                <a href="#tentang-kami" onClick={(e) => handleAnchorClick(e, 'tentang-kami')}>
                  Tentang Kami
                </a>
              </li>
              <li>
                <Link to="/peta">Lihat Peta</Link>
              </li>
              <li>
                <Link to="/login">Masuk</Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="lp-footer-copy">© {new Date().getFullYear()} Kos Finder. Hak cipta dilindungi.</p>
      </div>
    </footer>
  );
}

/* =====================================================================
   8. HALAMAN UTAMA
   ===================================================================== */

export default function LandingPage() {
  // Satu kali fetch, dibagi ke carousel dan grid lewat props.
  const [kos, setKos] = useState({ data: [], loading: true, error: '' });
  const [attempt, setAttempt] = useState(0); // naik 1 saat "Coba Lagi" ditekan

  useEffect(() => {
    const controller = new AbortController();
    setKos((s) => ({ ...s, loading: true, error: '' }));

    // Endpoint publik (tanpa login): GET /api/kos/publik -> daftar kos Aktif.
    api
      .get('/kos/publik', { signal: controller.signal })
      .then((res) => setKos({ data: res.data.data || [], loading: false, error: '' }))
      .catch((err) => {
        const message = getErrorMessage(err, 'Gagal memuat daftar kos.');
        if (message === null) return; // request dibatalkan (unmount / retry)
        setKos({ data: [], loading: false, error: message });
      });

    return () => controller.abort();
  }, [attempt]);

  // Pencarian beranda: input langsung (kata) + nilai ter-debounce (query) untuk filter live.
  const [kata, setKata] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQuery(kata.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [kata]);

  const handleSearchSubmit = () => {
    setQuery(kata.trim());
    scrollToSection('kost-tersedia');
  };
  const clearSearch = () => {
    setKata('');
    setQuery('');
  };

  return (
    <div className="landing-page">
      <LandingNavbar />
      <main>
        <HeroCarousel
          kosList={kos.data}
          loading={kos.loading}
          kata={kata}
          onKataChange={setKata}
          onSearchSubmit={handleSearchSubmit}
        />
        <KosSection
          kosList={kos.data}
          loading={kos.loading}
          error={kos.error}
          onRetry={() => setAttempt((n) => n + 1)}
          query={query}
          onClearSearch={clearSearch}
        />
        <AboutSection />
      </main>
      <LandingFooter />
    </div>
  );
}
