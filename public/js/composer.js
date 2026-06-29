import { api } from './api.js';
import { escapeHtml } from './fx.js';

const PICK_MAX = 3;
const picked = new Set();
const dialState = { energy: 50, warmth: 50, familiarity: 50 };
let latestResults = [];
let pickedFilms = new Set();

function wireDial(el) {
  const slider = el.querySelector('input[type=range]');
  const name = el.dataset.dial;
  const update = () => { dialState[name] = Number(slider.value); };
  slider.addEventListener('input', update);
  update();
}

async function loadCards(host) {
  const cards = await api.get('/api/mood/cards');
  host.innerHTML = '';
  cards.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mood-card';
    b.textContent = c.label;
    b.dataset.id = c.id;
    b.addEventListener('click', () => togglePick(b, c.id));
    host.appendChild(b);
  });
}

function togglePick(btn, id) {
  if (picked.has(id)) {
    picked.delete(id);
    btn.classList.remove('picked');
  } else if (picked.size < PICK_MAX) {
    picked.add(id);
    btn.classList.add('picked');
  }
  document.getElementById('cardCount').textContent = `${picked.size} / ${PICK_MAX}`;
  document.querySelectorAll('.mood-card').forEach(el => {
    if (picked.size >= PICK_MAX && !picked.has(el.dataset.id)) el.classList.add('disabled');
    else el.classList.remove('disabled');
  });
}

function renderFilmStrip(host, films) {
  host.innerHTML = '';
  if (!films.length) {
    host.innerHTML = '<p class="handwritten" style="padding:1rem">nothing found — try different cards</p>';
    return;
  }
  films.forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'film';
    wrap.dataset.tmdbId = f.tmdbId;
    wrap.innerHTML = `
      <div class="poster">${f.poster ? `<img src="${f.poster}" alt="" loading="lazy">` : ''}</div>
      <div class="meta">
        <span class="title">${escapeHtml(f.title)}</span>
        <span class="year">${f.year || ''}</span>
      </div>
      <button class="add" type="button" aria-label="add to board">+</button>
      <button class="save" type="button"
        data-watch-add="${f.tmdbId}"
        data-title="${escapeHtml(f.title || '')}"
        data-year="${f.year || ''}"
        data-poster="${f.poster || ''}"
        aria-label="save to watchlist">♡</button>
    `;
    wrap.querySelector('.add').addEventListener('click', (e) => {
      e.stopPropagation();
      if (pickedFilms.has(f.tmdbId)) {
        pickedFilms.delete(f.tmdbId);
        wrap.classList.remove('added');
      } else {
        pickedFilms.add(f.tmdbId);
        wrap.classList.add('added');
      }
    });
    host.appendChild(wrap);
  });
}

async function run() {
  const btn = document.getElementById('composerRun');
  btn.disabled = true; btn.textContent = 'Loading…';
  try {
    const out = await api.post('/api/mood/recommend', {
      dials: dialState,
      cards: [...picked]
    });
    latestResults = out.results || [];
    document.getElementById('results').classList.add('on');
    renderFilmStrip(document.getElementById('filmStrip'), latestResults);
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    alert('the tape jammed — try again');
  } finally {
    btn.disabled = false; btn.textContent = 'Pull films';
  }
}

function reset() {
  document.querySelectorAll('.dial input[type=range]').forEach(s => { s.value = 50; s.dispatchEvent(new Event('input')); });
  document.querySelectorAll('.mood-card.picked').forEach(el => el.classList.remove('picked'));
  document.querySelectorAll('.mood-card.disabled').forEach(el => el.classList.remove('disabled'));
  picked.clear();
  pickedFilms.clear();
  document.getElementById('cardCount').textContent = `0 / ${PICK_MAX}`;
  document.getElementById('results').classList.remove('on');
}

async function startBoard() {
  const tmdbIds = [...pickedFilms];
  const tags = [...picked];
  try {
    const out = await api.post('/api/boards', { tmdbIds, moodTags: tags });
    if (out && out.board && out.board.slug) {
      location.href = `/board/${out.board.slug}/edit`;
    }
  } catch (e) {
    alert('could not start the board — try signing in first');
  }
}

function init() {
  const composer = document.getElementById('composer');
  if (!composer) return;
  composer.querySelectorAll('.dial').forEach(wireDial);
  loadCards(document.getElementById('cards'));
  document.getElementById('composerRun').addEventListener('click', run);
  document.getElementById('composerReset').addEventListener('click', reset);
  document.getElementById('startBoard').addEventListener('click', startBoard);
}

init();
