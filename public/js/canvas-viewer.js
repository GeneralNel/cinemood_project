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

render();
