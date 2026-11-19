import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Search } from 'lucide-react';
import { KosImage } from '../Ui';

const MAX_SLIDES = 5;
const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 50;

const PLACEHOLDER_SLIDE = {
  kos_id: 'placeholder',
  nama_kos: 'Temukan kos impianmu',
  wilayah: 'Kos Nais',
  foto: null,
};

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

export default function HeroCarousel({ kosList, loading }) {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  const [kata, setKata] = useState('');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = kata.trim();
    navigate(q ? `/peta?q=${encodeURIComponent(q)}` : '/peta');
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
        <div className="lp-hero-head">
          <h1 id="lp-hero-title">Temukan Kos Impian di Sekitar Kampus</h1>
          <p>Cari kos aktif langsung di peta, bandingkan harga dan fasilitas, lalu booking online.</p>
        </div>

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
              onChange={(e) => setKata(e.target.value)}
              placeholder="Cari nama kos, alamat, atau wilayah…"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Cari Kos
          </button>
        </form>

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
                  <ChevronLeft size={22} aria-hidden="true" />
                </button>
                <button type="button" className="lp-carousel-btn lp-next" onClick={next} aria-label="Foto berikutnya">
                  <ChevronRight size={22} aria-hidden="true" />
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
    </section>
  );
}
