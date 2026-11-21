import React, { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Banknote,
  BedDouble,
  Check,
  ChevronDown,
  Crosshair,
  LocateFixed,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { EmptyState, KosImage, Spinner, StatusBadge } from '../../components/Ui';
import { useToast } from '../../context/ToastContext';
import '../../styles/user/map.css';
import {
  formatJarak,
  formatRating,
  formatRupiah,
  fotoUrl,
  placeholderSvgDataUri,
} from '../../utils/format';
import { LEAFLET_MARKER_ICON_URL, makeMarkerIcon } from '../../lib/leafletIcons';
import { QUICK_LOCATION_PRESETS } from '../../constants/quickLocations';

const BANDUNG_CENTER = [-6.9039, 107.6186];

const TIPE_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'Putra', label: 'Putra' },
  { value: 'Putri', label: 'Putri' },
  { value: 'Campur', label: 'Campur' },
];

const PRICE_PRESETS = [
  { id: 'u1', label: '< 1 Jt', min: '', max: '1000000' },
  { id: '1-1.5', label: '1–1,5 Jt', min: '1000000', max: '1500000' },
  { id: '1.5-2.5', label: '1,5–2,5 Jt', min: '1500000', max: '2500000' },
  { id: 'a2.5', label: '> 2,5 Jt', min: '2500000', max: '' },
];

const POPUP_ICON_PIN = renderToStaticMarkup(
  <MapPin size={14} strokeWidth={2} className="popup-icon popup-icon-pin" aria-hidden="true" />
);
const POPUP_ICON_STAR = renderToStaticMarkup(
  <Star size={14} strokeWidth={2} fill="currentColor" className="popup-icon popup-icon-star" aria-hidden="true" />
);
const POPUP_ICON_BED = renderToStaticMarkup(
  <BedDouble size={14} strokeWidth={2} className="popup-icon popup-icon-bed" aria-hidden="true" />
);

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function FilterAccordion({ icon: Icon, title, badge, open, onToggle, children }) {
  return (
    <section className={`map-acc ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="map-acc-head"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="map-acc-title">
          <Icon size={16} aria-hidden="true" className="map-acc-icon" />
          <span>{title}</span>
          {badge ? <span className="map-acc-badge">{badge}</span> : null}
        </span>
        <ChevronDown size={16} aria-hidden="true" className="map-acc-chevron" />
      </button>
      <div className="map-acc-collapse">
        <div className="map-acc-body">{children}</div>
      </div>
    </section>
  );
}

export default function UserMapPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  // Kata kunci awal dibaca dari URL (?q=...), mis. dari search bar landing page.
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(() => searchParams.get('q') || '');

  const [masterFasilitas, setMasterFasilitas] = useState([]);
  const [kosList, setKosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKosId, setSelectedKosId] = useState(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    lokasi: true,
    tipe: true,
    harga: true,
    fasilitas: true,
  });

  const [refPoint, setRefPoint] = useState(null); // { lat, lng, label }
  const [pickingRef, setPickingRef] = useState(false);
  const [radius, setRadius] = useState(5);
  const [hargaMin, setHargaMin] = useState('');
  const [hargaMax, setHargaMax] = useState('');
  const [selectedFasilitas, setSelectedFasilitas] = useState([]);
  const [tipeKos, setTipeKos] = useState('');

  const mapElRef = useRef(null);
  const mapStageRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markersByIdRef = useRef({});
  const refMarkerRef = useRef(null);
  const refCircleRef = useRef(null);
  const pickingRefState = useRef(pickingRef);
  pickingRefState.current = pickingRef;

  const activeFilterCount =
    (refPoint ? 1 : 0) +
    (tipeKos ? 1 : 0) +
    (hargaMin !== '' || hargaMax !== '' ? 1 : 0) +
    selectedFasilitas.length;
  const hasAnyFilter = activeFilterCount > 0 || keyword.trim() !== '';

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    api
      .get('/fasilitas')
      .then((res) => setMasterFasilitas(res.data.data || []))
      .catch(() => { });
  }, []);

  // Tutup bottom sheet filter mobile dengan Esc dan kunci scroll belakangnya.
  useEffect(() => {
    if (!mobileSheetOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileSheetOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileSheetOpen]);

  // Tutup bottom sheet otomatis jika layar dilebarkan kembali ke desktop (>1024px).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)');
    const onChange = (e) => {
      if (e.matches) setMobileSheetOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Init Leaflet map
  useEffect(() => {
    const L = window.L;
    if (!L || !mapElRef.current || mapRef.current) return undefined;

    const map = L.map(mapElRef.current).setView(BANDUNG_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;

    map.on('click', (e) => {
      if (!pickingRefState.current) return;
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      setRefPoint({ lat, lng, label: 'Titik pilihan di peta' });
      setPickingRef(false);
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      markersByIdRef.current = {};
      refMarkerRef.current = null;
      refCircleRef.current = null;
    };
  }, []);

  // Update reference marker + radius circle
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (!refPoint) {
      if (refMarkerRef.current) {
        map.removeLayer(refMarkerRef.current);
        refMarkerRef.current = null;
      }
      if (refCircleRef.current) {
        map.removeLayer(refCircleRef.current);
        refCircleRef.current = null;
      }
      return;
    }

    const pos = [refPoint.lat, refPoint.lng];
    const blueIcon = makeMarkerIcon('reference');

    if (!refMarkerRef.current) {
      const m = L.marker(pos, { draggable: true, icon: blueIcon, zIndexOffset: 1000 }).addTo(map);
      m.on('dragend', () => {
        const ll = m.getLatLng();
        setRefPoint({
          lat: Number(ll.lat.toFixed(6)),
          lng: Number(ll.lng.toFixed(6)),
          label: 'Titik acuan digeser',
        });
      });
      refMarkerRef.current = m;
    } else {
      refMarkerRef.current.setLatLng(pos);
    }

    if (!refCircleRef.current) {
      refCircleRef.current = L.circle(pos, {
        radius: Number(radius) * 1000,
        color: '#2563eb',
        fillColor: '#60a5fa',
        fillOpacity: 0.14,
        weight: 2,
      }).addTo(map);
    } else {
      refCircleRef.current.setLatLng(pos);
      refCircleRef.current.setRadius(Number(radius) * 1000);
    }
  }, [refPoint, radius]);

  // Debounced search (300ms) + AbortController
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = {};
        if (refPoint) {
          params.lat = refPoint.lat;
          params.lng = refPoint.lng;
          params.radius = radius;
        }
        if (hargaMin !== '') params.hargaMin = hargaMin;
        if (hargaMax !== '') params.hargaMax = hargaMax;
        if (selectedFasilitas.length) params.fasilitas = selectedFasilitas.join(',');
        if (tipeKos) params.tipe = tipeKos;
        if (keyword.trim()) params.q = keyword.trim();

        const { data } = await api.get('/kos', {
          params,
          signal: controller.signal,
        });
        setKosList(data.data || []);
      } catch (err) {
        const msg = getErrorMessage(err);
        if (msg) showToast(msg, 'error');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [refPoint, radius, hargaMin, hargaMax, selectedFasilitas, tipeKos, keyword, showToast]);

  // Render kos markers on map
  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();
    markersByIdRef.current = {};

    kosList.forEach((k) => {
      const hasEmpty = Number(k.kamar_kosong) > 0;
      const icon = makeMarkerIcon(hasEmpty ? 'available' : 'full');

      const imgSrc = k.foto ? fotoUrl(k.foto) : placeholderSvgDataUri(k.nama_kos);
      const fallbackImg = placeholderSvgDataUri(k.nama_kos);
      const jarakText =
        k.jarak_km !== null && k.jarak_km !== undefined
          ? `${formatJarak(k.jarak_km)} dari titik acuan`
          : 'Atur titik acuan untuk melihat jarak';
      const hargaText =
        k.harga_mulai !== null && k.harga_mulai !== undefined
          ? `Mulai ${formatRupiah(k.harga_mulai)}/bulan`
          : 'Harga belum ditentukan';

      const popupNode = document.createElement('div');
      popupNode.className = 'kos-map-popup';
      popupNode.innerHTML = `
        <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(k.nama_kos)}"
             onerror="this.onerror=null;this.src='${fallbackImg}'"
             class="kos-map-popup-img" />
        <div class="kos-map-popup-title">${escapeHtml(k.nama_kos)}</div>
        <div class="kos-map-popup-price">${escapeHtml(hargaText)}</div>
        <div class="kos-map-popup-meta kos-map-popup-row">${POPUP_ICON_PIN}<span>${escapeHtml(jarakText)}</span></div>
        <div class="kos-map-popup-meta kos-map-popup-stats">
          <span class="kos-map-popup-row">${POPUP_ICON_STAR}<span>${escapeHtml(formatRating(k.rata_rating))} (${Number(k.jumlah_review || 0)})</span></span>
          <span class="kos-map-popup-row">${POPUP_ICON_BED}<strong>${Number(k.kamar_kosong)} kamar kosong</strong></span>
        </div>
        <button type="button" class="btn btn-primary btn-sm btn-block popup-detail-btn">Lihat Detail</button>
      `;
      const btn = popupNode.querySelector('.popup-detail-btn');
      if (btn) {
        btn.addEventListener('click', () => navigate(`/kos/${k.kos_id}`));
      }

      const marker = L.marker([Number(k.latitude), Number(k.longitude)], { icon });
      marker.bindPopup(popupNode, { maxWidth: 250 });
      marker.on('click', () => setSelectedKosId(k.kos_id));
      marker.addTo(layer);
      markersByIdRef.current[k.kos_id] = marker;
    });
  }, [kosList, navigate]);

  const handleCardClick = (kos) => {
    setSelectedKosId(kos.kos_id);
    const map = mapRef.current;
    const marker = markersByIdRef.current[kos.kos_id];
    if (map && marker) {
      map.flyTo([Number(kos.latitude), Number(kos.longitude)], 16, { duration: 0.7 });
      marker.openPopup();
    }
    if (window.innerWidth <= 1024 && mapStageRef.current) {
      mapStageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('Browser Anda tidak mendukung Geolocation API.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setRefPoint({ lat, lng, label: 'Lokasi saya (GPS)' });
        if (mapRef.current) mapRef.current.flyTo([lat, lng], 14);
        showToast('Titik acuan diatur ke lokasi Anda.', 'success');
      },
      (err) => {
        if (err.code === 1) {
          showToast('Izin lokasi ditolak. Gunakan klik peta atau pilihan cepat kampus.', 'error');
        } else {
          showToast('Gagal mendapatkan lokasi GPS (timeout/tidak tersedia).', 'error');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePresetLokasi = (e) => {
    const val = e.target.value;
    if (!val) return;
    const found = QUICK_LOCATION_PRESETS.find((k) => k.id === val);
    if (found) {
      setRefPoint({ id: found.id, lat: found.lat, lng: found.lng, label: found.label });
      if (mapRef.current) mapRef.current.flyTo([found.lat, found.lng], 16);
    }
  };

  const toggleFasilitasFilter = (id) => {
    setSelectedFasilitas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleKeywordChange = (e) => {
    const value = e.target.value;
    setKeyword(value);
    // Jaga URL tetap sinkron (bisa di-refresh / dibagikan) tanpa menambah riwayat browser.
    setSearchParams(value.trim() ? { q: value } : {}, { replace: true });
  };

  const handleResetFilter = () => {
    setKeyword('');
    setSearchParams({}, { replace: true });
    setRefPoint(null);
    setPickingRef(false);
    setRadius(5);
    setHargaMin('');
    setHargaMax('');
    setSelectedFasilitas([]);
    setTipeKos('');
    if (mapRef.current) mapRef.current.setView(BANDUNG_CENTER, 12);
  };

  const handleStartPickOnMap = () => {
    setPickingRef((p) => {
      const next = !p;
      if (next) setMobileSheetOpen(false);
      return next;
    });
  };

  const handlePricePreset = (preset) => {
    const active = String(hargaMin) === preset.min && String(hargaMax) === preset.max;
    if (active) {
      setHargaMin('');
      setHargaMax('');
    } else {
      setHargaMin(preset.min);
      setHargaMax(preset.max);
    }
  };

  const handleClearKeyword = () => {
    setKeyword('');
    setSearchParams({}, { replace: true });
  };

  const renderFilterSections = (idPrefix) => (
    <div className="map-filter-sections">
      {/* 1. Titik Acuan & Radius */}
      <FilterAccordion
        icon={MapPin}
        title="Titik Acuan & Radius"
        badge={refPoint ? `${String(radius).replace('.', ',')} km` : null}
        open={openSections.lokasi}
        onToggle={() => toggleSection('lokasi')}
      >
        <div className="map-ref-actions">
          <button
            type="button"
            className={`btn btn-sm map-ref-btn ${pickingRef ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleStartPickOnMap}
          >
            <Crosshair size={15} aria-hidden="true" />
            <span>{pickingRef ? 'Klik Peta Sekarang…' : 'Pilih di Peta'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm map-ref-btn"
            onClick={handleUseMyLocation}
          >
            <LocateFixed size={15} aria-hidden="true" />
            <span>Lokasi Saya</span>
          </button>
        </div>

        <select
          className="form-control map-select"
          value={refPoint?.id && QUICK_LOCATION_PRESETS.some((k) => k.id === refPoint.id) ? refPoint.id : ''}
          onChange={handlePresetLokasi}
          aria-label="Pilihan cepat titik acuan"
        >
          <option value="">-- Pilihan Cepat --</option>
          {QUICK_LOCATION_PRESETS.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.label}
            </option>
          ))}
        </select>

        {refPoint ? (
          <div className="map-ref-active">
            <div className="map-ref-summary">
              <span className="map-ref-label" title={refPoint.label}>
                Titik: <strong>{refPoint.label}</strong>
              </span>
              <button
                type="button"
                className="map-ref-clear"
                onClick={() => setRefPoint(null)}
              >
                Hapus
              </button>
            </div>
            <div className="map-radius-head">
              <label htmlFor={`${idPrefix}-radius`}>Radius Pencarian</label>
              <span className="map-radius-val">{String(radius).replace('.', ',')} km</span>
            </div>
            <input
              id={`${idPrefix}-radius`}
              type="range"
              min="0.5"
              max="20"
              step="0.5"
              className="map-range"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
            <div className="map-radius-scale" aria-hidden="true">
              <span>0,5 km</span>
              <span>10 km</span>
              <span>20 km</span>
            </div>
          </div>
        ) : (
          <p className="map-filter-hint">
            Atur titik acuan untuk menyaring kos berdasarkan jarak dan mengaktifkan slider radius.
          </p>
        )}
      </FilterAccordion>

      {/* 2. Tipe Kos (Segmented Chips) */}
      <FilterAccordion
        icon={Users}
        title="Tipe Kos"
        badge={tipeKos || null}
        open={openSections.tipe}
        onToggle={() => toggleSection('tipe')}
      >
        <div className="map-segmented" role="radiogroup" aria-label="Filter tipe kos">
          {TIPE_OPTIONS.map((opt) => {
            const active = tipeKos === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={active}
                className={`map-seg-btn ${active ? 'active' : ''}`}
                onClick={() => setTipeKos(opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </FilterAccordion>

      {/* 3. Harga Min / Max + Preset Chips */}
      <FilterAccordion
        icon={Banknote}
        title="Harga per Bulan"
        badge={hargaMin !== '' || hargaMax !== '' ? 'Aktif' : null}
        open={openSections.harga}
        onToggle={() => toggleSection('harga')}
      >
        <div className="map-price-grid">
          <div className="map-price-col">
            <label htmlFor={`${idPrefix}-min`}>Minimum</label>
            <div className="map-rp-field">
              <span className="map-rp-prefix" aria-hidden="true">Rp</span>
              <input
                id={`${idPrefix}-min`}
                type="number"
                min="0"
                step="100000"
                className="map-rp-input"
                placeholder="0"
                value={hargaMin}
                onChange={(e) => setHargaMin(e.target.value)}
              />
            </div>
          </div>
          <div className="map-price-col">
            <label htmlFor={`${idPrefix}-max`}>Maksimum</label>
            <div className="map-rp-field">
              <span className="map-rp-prefix" aria-hidden="true">Rp</span>
              <input
                id={`${idPrefix}-max`}
                type="number"
                min="0"
                step="100000"
                className="map-rp-input"
                placeholder="1500000"
                value={hargaMax}
                onChange={(e) => setHargaMax(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="filter-chip-group" role="group" aria-label="Pilihan cepat rentang harga">
          {PRICE_PRESETS.map((preset) => {
            const active = String(hargaMin) === preset.min && String(hargaMax) === preset.max;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                className={`filter-chip-btn ${active ? 'active' : ''}`}
                onClick={() => handlePricePreset(preset)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </FilterAccordion>

      {/* 4. Fasilitas (filter yang sudah ada) */}
      <FilterAccordion
        icon={Sparkles}
        title="Fasilitas"
        badge={selectedFasilitas.length ? `${selectedFasilitas.length} dipilih` : null}
        open={openSections.fasilitas}
        onToggle={() => toggleSection('fasilitas')}
      >
        <p className="map-filter-hint" style={{ marginTop: 0, marginBottom: 8 }}>
          Wajib memiliki semua fasilitas yang dipilih.
        </p>
        <div className="filter-chip-group">
          {masterFasilitas.map((f) => {
            const active = selectedFasilitas.includes(f.fasilitas_id);
            return (
              <button
                key={f.fasilitas_id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleFasilitasFilter(f.fasilitas_id)}
                className={`filter-chip-btn ${active ? 'active' : ''}`}
              >
                {active && <Check size={13} aria-hidden="true" />}
                <span>{f.nama_fasilitas}</span>
              </button>
            );
          })}
        </div>
      </FilterAccordion>
    </div>
  );

  return (
    <AppLayout fullHeight>
      <div className="map-workspace">
        <aside className="map-sidebar" aria-label="Panel Filter dan Daftar Kos">
          <div className="map-sidebar-header">
            <div className="map-sidebar-top">
              <div className="map-title-group">
                <h2>Cari Kos</h2>
                <span className="map-count-pill">{kosList.length} kos</span>
              </div>
              <div className="map-header-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm map-toggle-filter-desktop"
                  aria-expanded={filterDrawerOpen}
                  onClick={() => setFilterDrawerOpen((p) => !p)}
                >
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  <span>{filterDrawerOpen ? 'Sembunyikan Filter' : 'Tampilkan Filter'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleResetFilter}
                  disabled={!hasAnyFilter}
                  title="Reset semua filter"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            <div className="map-search-box">
              <Search size={17} className="map-search-icon" aria-hidden="true" />
              <input
                id="map-q"
                type="search"
                className="map-search-input"
                placeholder="Cari"
                aria-label="Cari"
                value={keyword}
                onChange={handleKeywordChange}
              />
              {keyword && (
                <button
                  type="button"
                  className="map-search-clear"
                  aria-label="Hapus kata kunci pencarian"
                  onClick={handleClearKeyword}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="map-sidebar-body">
            {/* Panel filter desktop (collapse halus) */}
            <div className={`map-filter-collapse ${filterDrawerOpen ? 'is-open' : ''}`}>
              <div className="map-filter-collapse-inner">
                {renderFilterSections('desk')}
              </div>
            </div>

            {/* Daftar Hasil Kos */}
            {loading ? (
              <Spinner label="Memperbarui daftar kos..." />
            ) : kosList.length === 0 ? (
              <EmptyState
                title="Tidak ada kos yang cocok"
                description="Coba perbesar radius pencarian atau kurangi filter harga/fasilitas."
                actionLabel="Reset Filter"
                onAction={handleResetFilter}
              />
            ) : (
              <div className="kos-list-cards">
                {kosList.map((k) => (
                  <div
                    key={k.kos_id}
                    className={`kos-card-item ${selectedKosId === k.kos_id ? 'active' : ''}`}
                    onClick={() => handleCardClick(k)}
                  >
                    <KosImage path={k.foto} alt={k.nama_kos} className="kos-card-thumb" />
                    <div className="kos-card-info">
                      <div className="kos-card-head">
                        <strong className="kos-card-name">{k.nama_kos}</strong>
                        <StatusBadge status={k.tipe_kos} />
                      </div>
                      <div className="kos-card-loc">
                        {k.wilayah}
                        {k.jarak_km !== null && k.jarak_km !== undefined && (
                          <> · <strong>{formatJarak(k.jarak_km)}</strong></>
                        )}
                      </div>
                      <div className="kos-card-price">
                        {k.harga_mulai !== null ? `Mulai ${formatRupiah(k.harga_mulai)}/bln` : 'Harga belum ada'}
                      </div>
                      <div className="kos-card-foot">
                        <span className="kos-card-metrics">
                          <span className="kos-card-metric">
                            <Star size={14} strokeWidth={2} fill="currentColor" className="icon-star-inline" aria-hidden="true" />
                            <span>{formatRating(k.rata_rating)}</span>
                          </span>
                          <span className="kos-card-metric">
                            <BedDouble
                              size={14}
                              strokeWidth={2}
                              style={{ color: k.kamar_kosong > 0 ? 'var(--primary)' : 'var(--text-muted)' }}
                              aria-hidden="true"
                            />
                            <strong style={{ color: k.kamar_kosong > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                              {k.kamar_kosong > 0 ? `${k.kamar_kosong} kosong` : 'Penuh'}
                            </strong>
                          </span>
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm kos-card-detail-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/kos/${k.kos_id}`);
                          }}
                        >
                          Detail →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="map-stage" ref={mapStageRef} aria-label="Peta Kos Interaktif">
          <div ref={mapElRef} className="leaflet-container-full" />

          {pickingRef && (
            <div className="map-pick-banner" role="status" aria-live="polite">
              <span>Ketuk lokasi pada peta untuk mengatur titik acuan</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPickingRef(false)}
              >
                Batal
              </button>
            </div>
          )}

          {/* Tombol Filter mengambang (hanya tampil di tablet & HP <= 1024px) */}
          <button
            type="button"
            className="map-fab-filter"
            onClick={() => setMobileSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={mobileSheetOpen}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="map-fab-badge">{activeFilterCount}</span>
            )}
          </button>

          <div className="map-legend">
            <strong>Legenda Marker</strong>
            <div className="legend-row">
              <img
                src={LEAFLET_MARKER_ICON_URL}
                alt=""
                aria-hidden="true"
                width={14}
                height={23}
                className="legend-marker-img marker-available"
              />
              <span>Hijau: Ada kamar kosong</span>
            </div>
            <div className="legend-row">
              <img
                src={LEAFLET_MARKER_ICON_URL}
                alt=""
                aria-hidden="true"
                width={14}
                height={23}
                className="legend-marker-img marker-full"
              />
              <span>Abu-abu: Kamar penuh</span>
            </div>
            <div className="legend-row">
              <img
                src={LEAFLET_MARKER_ICON_URL}
                alt=""
                aria-hidden="true"
                width={14}
                height={23}
                className="legend-marker-img marker-reference"
              />
              <span>Biru: Titik acuan &amp; radius</span>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Sheet Filter untuk Tablet & HP (<= 1024px) */}
      {mobileSheetOpen && (
        <div
          className="map-sheet-backdrop"
          role="presentation"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="map-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Filter Pencarian Kos"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="map-sheet-handle" aria-hidden="true" />
            <div className="map-sheet-head">
              <div>
                <h3>Filter Pencarian</h3>
                <span>{kosList.length} kos ditemukan</span>
              </div>
              <div className="map-sheet-head-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleResetFilter}
                  disabled={!hasAnyFilter}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  className="map-sheet-close"
                  aria-label="Tutup panel filter"
                  onClick={() => setMobileSheetOpen(false)}
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="map-sheet-body">{renderFilterSections('mob')}</div>
            <div className="map-sheet-foot">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => setMobileSheetOpen(false)}
              >
                Tampilkan {kosList.length} Kos
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
