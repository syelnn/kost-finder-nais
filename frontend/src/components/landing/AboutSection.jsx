import React from 'react';
import { FileDown, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';

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

export default function AboutSection() {
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
