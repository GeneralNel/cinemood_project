const boardData = JSON.parse(document.getElementById('board-data').textContent);
const stickerLib = JSON.parse(document.getElementById('stickers-data').textContent || '[]');

const copyBtn = document.getElementById('copyShareBtn');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      const old = copyBtn.textContent;
      copyBtn.textContent = 'copied';
      setTimeout(() => { copyBtn.textContent = old; }, 1200);
    } catch (e) { /* no clipboard */ }
  });
}
const stickerMap = Object.fromEntries(stickerLib.map(s => [s.id, s.svg]));

const shell = document.getElementById('viewerShell');
const canvas = document.getElementById('viewerCanvas');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function render() {
  canvas.innerHTML = '';
  for (const el of boardData.elements || []) {
    const node = document.createElement('div');
    node.className = `el ${el.type}`;
    node.style.left = `${el.x}px`;
    node.style.top  = `${el.y}px`;
    node.style.transform = `rotate(${el.rotation || 0}deg) scale(${el.scale || 1})`;
    node.style.zIndex = el.zIndex || 0;
    if (el.type === 'poster') {
      node.innerHTML = el.payload?.poster ? `<img src="${el.payload.poster}" alt="${escapeHtml(el.payload.title || '')}">` : '';
    } else if (el.type === 'sticker') {
      node.innerHTML = stickerMap[el.payload?.stickerId] || '';
    } else if (el.type === 'swatch') {
      node.style.background = el.payload?.color || '#ff006e';
    } else if (el.type === 'note') {
      node.style.color = el.payload?.markerColor || '#1a0033';
      node.textContent = el.payload?.text || '';
    }
    canvas.appendChild(node);
  }
}

let scale = 1, tx = 0, ty = 0;
function applyTransform() {
  canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
}

function fitToShell() {
  if (!boardData.elements || !boardData.elements.length) return;
  let maxX = 0, maxY = 0;
  for (const el of boardData.elements) {
    const w = el.type === 'poster' ? 140 : el.type === 'note' ? 260 : 100;
    const h = el.type === 'poster' ? 210 : el.type === 'note' ? 120 : 100;
    maxX = Math.max(maxX, el.x + w * (el.scale || 1));
    maxY = Math.max(maxY, el.y + h * (el.scale || 1));
  }
  if (maxX === 0 || maxY === 0) return;
  const pad = 40;
  const sx = (shell.clientWidth - pad) / maxX;
  const sy = (shell.clientHeight - pad) / maxY;
  scale = Math.min(1, Math.min(sx, sy));
  tx = ty = 20;
  applyTransform();
}

let pinch = null;
shell.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  shell.setPointerCapture(e.pointerId);
  pinch = pinch || { pointers: new Map() };
  pinch.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
shell.addEventListener('pointermove', (e) => {
  if (!pinch || !pinch.pointers.has(e.pointerId)) return;
  const prev = pinch.pointers.get(e.pointerId);
  if (pinch.pointers.size === 1) {
    tx += e.clientX - prev.x;
    ty += e.clientY - prev.y;
    applyTransform();
  }
  pinch.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
const end = (e) => {
  if (pinch) pinch.pointers.delete(e.pointerId);
};
shell.addEventListener('pointerup', end);
shell.addEventListener('pointercancel', end);

shell.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = shell.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  const newScale = Math.max(0.2, Math.min(3, scale * factor));
  tx = mx - (mx - tx) * (newScale / scale);
  ty = my - (my - ty) * (newScale / scale);
  scale = newScale;
  applyTransform();
}, { passive: false });

render();
fitToShell();
window.addEventListener('resize', fitToShell);
