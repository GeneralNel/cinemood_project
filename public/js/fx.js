export function trackingFlash(ms = 320) {
  const el = document.getElementById('tracking');
  if (!el) return;
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), ms);
}

export function wireInternalLinkGlitch() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || a.target === '_blank') return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    if (a.dataset.noFx === 'true') return;
    trackingFlash(220);
  });
}

export function csrf() {
  return document.querySelector('meta[name=csrf-token]')?.content || '';
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function randId() {
  return Math.random().toString(36).slice(2, 10);
}
