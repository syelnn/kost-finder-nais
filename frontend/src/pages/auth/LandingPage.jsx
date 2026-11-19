import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/client';
import LandingNavbar from '../../components/landing/LandingNavbar';
import HeroCarousel from '../../components/landing/HeroCarousel';
import KosSection from '../../components/landing/KosSection';
import AboutSection from '../../components/landing/AboutSection';
import LandingFooter from '../../components/landing/LandingFooter';
import '../../styles/auth/auth.css';
import '../../styles/auth/landing.css';

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

  return (
    <div className="landing-page">
      <LandingNavbar />
      <main>
        <HeroCarousel kosList={kos.data} loading={kos.loading} />
        <KosSection
          kosList={kos.data}
          loading={kos.loading}
          error={kos.error}
          onRetry={() => setAttempt((n) => n + 1)}
        />
        <AboutSection />
      </main>
      <LandingFooter />
    </div>
  );
}
