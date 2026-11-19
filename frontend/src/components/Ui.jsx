import React, { useState } from 'react';
import { Building2, X } from 'lucide-react';
import { fotoUrl, placeholderSvgDataUri } from '../utils/format';

const BADGE_MAP = {
  Menunggu: 'badge-warning',
  Disetujui: 'badge-success',
  Aktif: 'badge-success',
  Terverifikasi: 'badge-success',
  Kosong: 'badge-success',
  Ditolak: 'badge-danger',
  Nonaktif: 'badge-danger',
  'Dalam Booking': 'badge-info',
  Terisi: 'badge-neutral',
  Selesai: 'badge-teal',
  Putra: 'badge-info',
  Putri: 'badge-pink',
  Campur: 'badge-teal',
  Admin: 'badge-teal',
  Owner: 'badge-info',
  User: 'badge-success',
};

export function StatusBadge({ status, children }) {
  const cls = BADGE_MAP[status] || 'badge-neutral';
  return <span className={`badge ${cls}`}>{children || status}</span>;
}

export function Spinner({ label = 'Memuat data...' }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title = 'Belum ada data', description, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">
        <Building2 size={32} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  danger = false,
  loading = false,
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <h3 id="modal-title">{title}</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Tutup dialog">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {onConfirm && (
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Memproses...' : confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function StarRating({ value = 0, onChange, readOnly = false, size = 'md' }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <div className={`star-rating star-${size}`} role={readOnly ? 'img' : 'radiogroup'} aria-label={`Rating ${value} dari 5`}>
      {[1, 2, 3, 4, 5].map((star) =>
        readOnly ? (
          <span key={star} className={star <= rounded ? 'star-on' : 'star-off'} aria-hidden="true">
            ★
          </span>
        ) : (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= value ? 'star-on' : 'star-off'}`}
            onClick={() => onChange && onChange(star)}
            aria-label={`Pilih ${star} bintang`}
          >
            ★
          </button>
        )
      )}
    </div>
  );
}

export function KosImage({ path, alt = 'Foto kos', className = '' }) {
  const [failed, setFailed] = useState(false);
  const src = !path || failed ? placeholderSvgDataUri(alt) : fotoUrl(path);
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function Pagination({ page, totalItems, pageSize = 10, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;
  return (
    <div className="pagination">
      <span className="pagination-info">
        Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} dari {totalItems} data
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Sebelumnya
        </button>
        <span className="pagination-page">
          Hal. {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
