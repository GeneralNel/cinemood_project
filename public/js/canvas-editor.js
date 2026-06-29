import { api } from './api.js';
import { escapeHtml, randId } from './fx.js';

const boardData = JSON.parse(document.getElementById('board-data').textContent);

const canvas = document.getElementById('canvas');
const titleInput = document.getElementById('boardTitle');
const tagsInput = document.getElementById('boardTags');
const visibilityBtn = document.getElementById('visibilityBtn');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const layerUpBtn = document.getElementById('layerUp');
const layerDownBtn = document.getElementById('layerDown');
const dropBtn = document.getElementById('deleteSelBtn');
const filmSearch = document.getElementById('filmSearch');
const filmSearchResults = document.getElementById('filmSearchResults');
const swatchTray = document.getElementById('swatchTray');
const addNoteBtn = document.getElementById('addNote');
const status = document.getElementById('saveStatus');

const SWATCHES = ['#ff006e', '#00f5ff', '#fff8e1', '#ffb800', '#b6ff00', '#ff2a2a', '#3a1268', '#1a0033'];

let state = {
  title: boardData.title,
  description: boardData.description || '',
  moodTags: boardData.moodTags || [],
  visibility: boardData.visibility,
  elements: boardData.elements || []
};
let selectedId = null;
let dirty = false;

function nextZ() {
  return (state.elements.reduce((m, e) => Math.max(m, e.zIndex || 0), 0) || 0) + 1;
}
function mark() { dirty = true; status.textContent = 'unsaved'; status.classList.add('on'); }

function render() {
  canvas.innerHTML = '';
  for (const el of state.elements) {
    const node = document.createElement('div');
    node.className = `el ${el.type}`;
    node.dataset.id = el.id;
    node.style.left = `${el.x}px`;
    node.style.top  = `${el.y}px`;
    node.style.transform = `rotate(${el.rotation || 0}deg) scale(${el.scale || 1})`;
    node.style.zIndex = el.zIndex || 0;

    if (el.type === 'poster') {
      node.innerHTML = `${el.payload.poster ? `<img src="${el.payload.poster}" alt="" draggable="false">` : ''}`;
    } else if (el.type === 'swatch') {
      node.style.background = el.payload.color || '#ff006e';
    } else if (el.type === 'note') {
      node.style.color = el.payload.markerColor || '#1a0033';
      node.textContent = el.payload.text || '';
    }

    if (el.id === selectedId) {
      node.classList.add('selected');
      const handles = document.createElement('div');
      handles.className = 'handles';
      handles.innerHTML = '<span class="h rotate" data-h="rotate"></span><span class="h scale" data-h="scale"></span>';
      node.appendChild(handles);
    }

    node.addEventListener('pointerdown', (e) => startDrag(e, el, node));
    canvas.appendChild(node);
  }
}

function select(id) { selectedId = id; render(); }

function startDrag(e, el, node) {
  if (e.target.matches('[data-h="rotate"]')) return startRotate(e, el);
  if (e.target.matches('[data-h="scale"]'))  return startScale(e, el);
  e.preventDefault();
  select(el.id);
  el.zIndex = nextZ();
  node.classList.add('dragging');
  node.setPointerCapture(e.pointerId);
  const startX = e.clientX, startY = e.clientY;
  const ox = el.x, oy = el.y;
  const move = (ev) => {
    el.x = ox + (ev.clientX - startX);
    el.y = oy + (ev.clientY - startY);
    node.style.left = `${el.x}px`;
    node.style.top  = `${el.y}px`;
  };
  const up = () => {
    node.classList.remove('dragging');
    node.removeEventListener('pointermove', move);
    node.removeEventListener('pointerup', up);
    mark();
  };
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
}

function startRotate(e, el) {
  e.preventDefault(); e.stopPropagation();
  select(el.id);
  const node = canvas.querySelector(`.el[data-id="${el.id}"]`);
  const rect = node.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const startAng = Math.atan2(e.clientY - cy, e.clientX - cx);
  const startRot = el.rotation || 0;
  const move = (ev) => {
    const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
    el.rotation = startRot + (a - startAng) * 180 / Math.PI;
    node.style.transform = `rotate(${el.rotation}deg) scale(${el.scale || 1})`;
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    mark();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function startScale(e, el) {
  e.preventDefault(); e.stopPropagation();
  select(el.id);
  const node = canvas.querySelector(`.el[data-id="${el.id}"]`);
  const startX = e.clientX, startY = e.clientY;
  const baseScale = el.scale || 1;
  const move = (ev) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    const delta = (dx + dy) / 200;
    el.scale = Math.max(0.3, Math.min(3, baseScale + delta));
    node.style.transform = `rotate(${el.rotation || 0}deg) scale(${el.scale})`;
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    mark();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function addElement(el) {
  el.id = el.id || randId();
  el.zIndex = nextZ();
  el.x = el.x ?? (canvas.clientWidth / 2 - 60);
  el.y = el.y ?? (canvas.clientHeight / 2 - 80);
  el.rotation = el.rotation ?? (Math.random() * 8 - 4);
  el.scale = el.scale ?? 1;
  state.elements.push(el);
  select(el.id);
  mark();
}

function buildSwatchTray() {
  swatchTray.innerHTML = '';
  SWATCHES.forEach(c => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'swatch-chip';
    chip.style.background = c;
    chip.addEventListener('click', () => addElement({ type: 'swatch', payload: { color: c } }));
    swatchTray.appendChild(chip);
  });
}

async function searchFilms() {
  const q = filmSearch.value.trim();
  if (!q) { filmSearchResults.innerHTML = ''; return; }
  const out = await api.get(`/api/films/search?q=${encodeURIComponent(q)}`).catch(() => ({ results: [] }));
  filmSearchResults.innerHTML = '';
  (out.results || []).slice(0, 12).forEach(f => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'search-row';
    row.innerHTML = `
      <span class="thumb">${f.poster ? `<img src="${f.poster}" alt="">` : ''}</span>
      <span class="body"><span class="title">${escapeHtml(f.title)}</span><span class="sub">${f.year || ''}</span></span>
    `;
    row.addEventListener('click', () => {
      addElement({
        type: 'poster',
        payload: { tmdbId: f.tmdbId, poster: f.poster, title: f.title, year: f.year }
      });
    });
    filmSearchResults.appendChild(row);
  });
}

let searchTimer = null;
filmSearch.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(searchFilms, 200);
});

addNoteBtn.addEventListener('click', () => {
  const text = prompt('what does the tape say?');
  if (!text) return;
  addElement({ type: 'note', payload: { text: text.slice(0, 120), markerColor: '#1a0033' } });
});

titleInput.addEventListener('input', () => { state.title = titleInput.value.slice(0, 80); mark(); });
tagsInput.addEventListener('change', () => {
  state.moodTags = tagsInput.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 6);
  mark();
});

visibilityBtn.addEventListener('click', () => {
  state.visibility = state.visibility === 'public' ? 'private' : 'public';
  visibilityBtn.textContent = state.visibility === 'public' ? 'Public' : 'Private';
  visibilityBtn.classList.toggle('btn-solid', state.visibility === 'public');
  mark();
});

layerUpBtn.addEventListener('click', () => {
  if (!selectedId) return;
  const el = state.elements.find(e => e.id === selectedId);
  if (el) { el.zIndex = nextZ(); mark(); render(); }
});
layerDownBtn.addEventListener('click', () => {
  if (!selectedId) return;
  const min = state.elements.reduce((m, e) => Math.min(m, e.zIndex || 0), 0);
  const el = state.elements.find(e => e.id === selectedId);
  if (el) { el.zIndex = min - 1; mark(); render(); }
});
dropBtn.addEventListener('click', () => {
  if (!selectedId) return;
  state.elements = state.elements.filter(e => e.id !== selectedId);
  selectedId = null;
  mark();
  render();
});

saveBtn.addEventListener('click', async () => {
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  try {
    await api.patch(`/api/boards/${boardData._id}`, state);
    dirty = false;
    status.textContent = 'saved';
    status.classList.remove('on');
  } catch (e) {
    status.textContent = 'save failed';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
});

deleteBtn?.addEventListener('click', async () => {
  if (!confirm('eject this tape forever?')) return;
  await api.del(`/api/boards/${boardData._id}`);
  location.href = '/dashboard';
});

canvas.addEventListener('pointerdown', (e) => {
  if (e.target === canvas) { selectedId = null; render(); }
});

buildSwatchTray();
render();
