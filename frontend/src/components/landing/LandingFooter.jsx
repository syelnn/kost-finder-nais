import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { handleAnchorClick } from './scrollToSection';

// DATA DUMMY — ganti dengan kontak asli. Cukup ubah di sini, footer ikut berubah.
const CONTACT = {
  alamat: 'Jl. Contoh No. 123, Kota Bandung, Jawa Barat (alamat dummy)',
  email: 'halo@kosfinder.example',
  telepon: '0812-3456-7890',
  teleponHref: '+6281234567890',
};

export default function LandingFooter() {
  return (
    <footer id="kontak" className="lp-footer">
      <div className="container">
        <div className="lp-footer-grid">
          <div>
            <div className="lp-footer-brand">
              <span className="brand-mark" aria-hidden="true">⌂</span>
              <span>Kos Nais</span>
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
