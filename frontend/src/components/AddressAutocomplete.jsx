import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Komponen Autocomplete Alamat menggunakan Nominatim OpenStreetMap.
 * Mengikuti batasan:
 * - Debounce 700ms
 * - Minimal 4 karakter
 * - Pembatalan request lama (AbortController)
 * - Rate limiting maks 1 request/detik
 * - Fallback penyederhanaan alamat bila hasil pencarian awal kosong
 */
export default function AddressAutocomplete({
  id = 'kos-alamat',
  value = '',
  onChange,
  onSelectLocation,
  error,
  placeholder = 'Contoh: Jl. Dipati Ukur No. 21, Kecamatan Coblong, Kota Bandung',
  required = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [lastSelected, setLastSelected] = useState(null);

  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastRequestTimeRef = useRef(0);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup abort controller saat unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const searchNominatim = async (queryText) => {
    // Pastikan jeda minimal 1000ms antar request ke Nominatim (kebijakan OSM)
    const now = Date.now();
    const timeSinceLast = now - lastRequestTimeRef.current;
    if (timeSinceLast < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
    }
    lastRequestTimeRef.current = Date.now();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      queryText
    )}&countrycodes=id&limit=5&addressdetails=1&accept-language=id`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error('Gagal menghubungi geocoder');
    }
    return await res.json();
  };

  const executeSearch = async (queryText, autoPickFirst = false) => {
    const q = (queryText || '').trim();
    if (q.length < 4) {
      setSuggestions([]);
      setIsOpen(false);
      setStatusMessage(null);
      return;
    }

    setLoading(true);
    setStatusMessage('Mencari alamat di peta...');
    setIsOpen(true);

    try {
      let results = await searchNominatim(q);

      // Jika pencarian penuh kosong, coba sederhanakan alamat (buang segmen paling depan)
      if ((!results || results.length === 0) && q.includes(',')) {
        const segments = q.split(',').map((s) => s.trim()).filter(Boolean);
        if (segments.length > 1) {
          const simplifiedQ = segments.slice(1).join(', ');
          try {
            const fallbackResults = await searchNominatim(simplifiedQ);
            if (fallbackResults && fallbackResults.length > 0) {
              results = fallbackResults.map((item) => ({
                ...item,
                _simplified: true,
                _searchedQuery: simplifiedQ,
              }));
            }
          } catch {
            // abaikan error fallback
          }
        }
      }

      if (!results || results.length === 0) {
        setSuggestions([]);
        setStatusMessage('Alamat tidak ditemukan, geser marker manual.');
        setIsOpen(true);
        return;
      }

      setSuggestions(results);
      setStatusMessage(null);
      setIsOpen(true);

      if (autoPickFirst && results.length > 0) {
        handleSelectSuggestion(results[0]);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setSuggestions([]);
      setStatusMessage('Gagal mencari alamat, silakan coba lagi atau geser marker.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (val.trim().length >= 4) {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(val, false);
      }, 700);
    } else {
      setIsOpen(false);
      setSuggestions([]);
      setStatusMessage(null);
    }
  };

  const handleSelectSuggestion = (item) => {
    const lat = Number(parseFloat(item.lat).toFixed(7));
    const lng = Number(parseFloat(item.lon).toFixed(7));

    if (onSelectLocation) {
      onSelectLocation({
        lat,
        lng,
        displayName: item.display_name,
        raw: item,
      });
    }

    setLastSelected({
      name: item.display_name,
      lat,
      lng,
      isSimplified: item._simplified,
    });
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
      } else {
        executeSearch(value, true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleManualSearchClick = (e) => {
    e.preventDefault();
    executeSearch(value, suggestions.length === 0);
  };

  return (
    <div className="address-autocomplete-wrap" ref={containerRef}>
      <div className="address-input-bar">
        <textarea
          id={id}
          className={`form-control ${error ? 'is-invalid' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          required={required}
          rows={3}
          style={{ resize: 'vertical' }}
        />
        <button
          type="button"
          className="btn btn-secondary btn-search-address"
          onClick={handleManualSearchClick}
          disabled={loading || value.trim().length < 4}
          title="Cari lokasi alamat ini pada peta"
          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {loading ? <Loader2 size={16} className="spin-animate" /> : <Search size={16} />}
          <span>Cari di Peta</span>
        </button>
      </div>

      {isOpen && (
        <div className="address-autocomplete-dropdown" role="listbox">
          {loading && (
            <div className="autocomplete-status-item">
              <Loader2 size={16} className="spin-animate" />
              <span>Mencari koordinat alamat di peta...</span>
            </div>
          )}

          {!loading && statusMessage && (
            <div className="autocomplete-status-item error">
              <AlertCircle size={16} style={{ color: '#eab308' }} />
              <span>{statusMessage}</span>
            </div>
          )}

          {!loading &&
            suggestions.map((item, idx) => (
              <div
                key={`${item.place_id || idx}`}
                className="autocomplete-item"
                onClick={() => handleSelectSuggestion(item)}
                role="option"
                aria-selected="false"
              >
                <MapPin size={18} className="autocomplete-item-icon" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="autocomplete-item-name">
                    {item.name || item.display_name.split(',')[0]}
                    {item._simplified && (
                      <span className="autocomplete-badge">Kecamatan/Wilayah</span>
                    )}
                  </div>
                  <div className="autocomplete-item-desc">{item.display_name}</div>
                </div>
              </div>
            ))}
        </div>
      )}

      {lastSelected && (
        <div className="address-selected-feedback">
          <CheckCircle size={15} color="#16a34a" />
          <span>
            Titik ditemukan: <strong>[{lastSelected.lat}, {lastSelected.lng}]</strong>
            {lastSelected.isSimplified ? ' (berdasarkan wilayah terdekat)' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
