// Pindah mulus ke section berdasarkan id. scroll-margin-top di CSS menjaga judul
// section tidak tertutup navbar sticky. Hormati preferensi "kurangi gerakan".
export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

// Handler untuk <a href="#id">: cegah lompatan bawaan, pakai smooth scroll.
export function handleAnchorClick(e, id, after) {
  e.preventDefault();
  scrollToSection(id);
  if (after) after();
}
