import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import { EmptyState, KosImage } from '../Ui';
import { formatRating, formatRupiah } from '../../utils/format';

const MAX_CARDS = 6;
const SKELETON_COUNT = 3;

function KosCard({ kos }) {
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
          Mulai {formatRupiah(kos.harga_mulai)}
          <span>/bulan</span>
        </p>
        <Link to={`/kos/${kos.kos_id}`} className="btn btn-primary btn-block">
          Lihat Detail
        </Link>
      </div>
    </article>
  );
}

export default function KosSection({ kosList, loading, error, onRetry }) {
  // Hanya kos yang masih punya kamar kosong, ambil 6 pertama.
  const available = useMemo(
    () => kosList.filter((k) => Number(k.kamar_kosong) > 0).slice(0, MAX_CARDS),
    [kosList]
  );

  return (
    <section id="kost-tersedia" className="lp-section" aria-labelledby="lp-kost-title">
      <div className="container">
        <div className="lp-section-head">
          <h2 id="lp-kost-title">Kost Tersedia</h2>
          <p>Pilihan kos dengan kamar kosong yang siap kamu booking sekarang.</p>
        </div>

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
        ) : available.length === 0 ? (
          <EmptyState
            title="Belum ada kost tersedia"
            description="Saat ini belum ada kos dengan kamar kosong. Coba lihat peta atau kembali lagi nanti."
          />
        ) : (
          <div className="lp-kos-grid">
            {available.map((k) => (
              <KosCard key={k.kos_id} kos={k} />
            ))}
          </div>
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
