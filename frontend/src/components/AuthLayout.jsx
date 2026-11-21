import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileCheck2, MapPin, ShieldCheck } from 'lucide-react';
import BrandLogo from './BrandLogo';

const HIGHLIGHTS = [
  {
    icon: MapPin,
    title: 'Cari Kos di Peta Interaktif',
    desc: 'Atur titik acuan dan radius jarak untuk menemukan kos terdekat.',
  },
  {
    icon: ShieldCheck,
    title: 'Pemilik & Kos Terverifikasi',
    desc: 'Hanya kos aktif dari pemilik terverifikasi yang tampil di pencarian.',
  },
  {
    icon: FileCheck2,
    title: 'Booking Online & Bukti PDF',
    desc: 'Ajukan jadwal survey online dan unduh bukti booking resmi.',
  },
];

/**
 * Tata letak 2 panel modern untuk halaman Login & Register:
 *  - Kiri (desktop): panel brand gradient teal + logo + tagline + 3 keunggulan
 *  - Kanan (desktop): panel formulir
 *  - Mobile/tablet: 1 kolom dengan panel brand ringkas di atas
 *  - Bawah kartu: tautan "Kembali ke Beranda"
 */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-split">
          <aside className="auth-brand-panel" aria-label="Tentang Kos Nais">
            <div className="auth-brand-top">
              <Link to="/" className="auth-brand-logo" aria-label="Kos Nais - Beranda">
                <BrandLogo />
              </Link>
              <h2 className="auth-brand-tagline">
                Bingung nyari kost? <span>Nais-Kost</span> solusinya
              </h2>
              <p className="auth-brand-sub">
                Temukan kos nyaman dekat kampus atau tempat kerjamu dengan cepat, jelas, dan aman.
              </p>
            </div>

            <ul className="auth-highlights">
              {HIGHLIGHTS.map(({ icon: Icon, title: itemTitle, desc }) => (
                <li key={itemTitle} className="auth-highlight-item">
                  <span className="auth-highlight-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <div>
                    <strong>{itemTitle}</strong>
                    <p>{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          <section className="auth-form-panel" aria-labelledby="auth-form-title">
            <div className="auth-form-header">
              <h1 id="auth-form-title">{title}</h1>
              <p>{subtitle}</p>
            </div>
            {children}
          </section>
        </div>

        <div className="auth-back-wrap">
          <Link to="/" className="auth-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
