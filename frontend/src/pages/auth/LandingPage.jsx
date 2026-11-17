import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth, roleHomePath } from '../../context/AuthContext';
import '../../styles/auth/auth.css';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="container landing-header-inner">
          <div className="brand-logo">
            <span className="brand-mark">⌂</span>
            <span>Kos Finder</span>
          </div>
          <div className="landing-nav-actions">
            {user ? (
              <Link to={roleHomePath(user.role)} className="btn btn-primary">
                Buka Dashboard ({user.nama})
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">
                  Masuk
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Daftar Sekarang
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container landing-hero">
        <div className="landing-hero-text">
          <span className="badge badge-teal">UKK PPLG 2026/2027 · Berbasis Peta Interaktif</span>
          <h1>Temukan & Pesan Kos Impian di Sekitar Kampus Lebih Cepat</h1>
          <p>
            Kos Finder membantu mahasiswa dan perantau mencari kos aktif langsung di peta OpenStreetMap, mengatur titik acuan kampus dan radius jarak (km), memfilter harga serta fasilitas, mengajukan booking survey/kamar, dan mengunduh bukti konfirmasi resmi.
          </p>
          <div className="landing-cta-row">
            {user ? (
              <Link to={roleHomePath(user.role)} className="btn btn-primary btn-lg">
                Lanjutkan ke Aplikasi
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary btn-lg">
                  Masuk ke Akun
                </Link>
                <Link to="/register" className="btn btn-secondary btn-lg">
                  Daftar Pencari / Pemilik Kos
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="landing-feature-grid">
          <div className="card feature-card">
            <div className="feature-badge">Pencari Kos (User)</div>
            <h3>Peta Interaktif & Radius Kampus</h3>
            <p>
              Lihat marker kos berwarna (hijau tersedia, abu-abu penuh), tentukan titik acuan via klik peta, GPS, atau preset kampus, lalu ajukan booking kamar kosong.
            </p>
          </div>
          <div className="card feature-card">
            <div className="feature-badge">Pemilik Kos (Owner)</div>
            <h3>Kelola Kos, Kamar & Approval</h3>
            <p>
              Tentukan koordinat kos cukup dengan klik peta, unggah foto, atur fasilitas, setujui/tolak booking otomatis sinkron status kamar, dan pantau grafik pendapatan.
            </p>
          </div>
          <div className="card feature-card">
            <div className="feature-badge">Administrator (Admin)</div>
            <h3>Verifikasi Owner & Master Data</h3>
            <p>
              Verifikasi akun pemilik kos sebelum publikasi, kelola master fasilitas, pantau pertumbuhan booking, serta ekspor laporan PDF/Excel dan backup database.
            </p>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <span>© 2026/2027 Kos Finder — Aplikasi Pencarian dan Pemesanan Kos Berbasis Peta (UKK SMK PPLG).</span>
        </div>
      </footer>
    </div>
  );
}
