import { api } from './api.js';
import { csrf, escapeHtml as esc, randId } from './fx.js';

const chipsRail = document.getElementById('moodChips');
if (chipsRail) {
  document.getElementById('chipPrev')?.addEventListener('click', () => chipsRail.scrollBy({ left: -240, behavior: 'smooth' }));
  document.getElementById('chipNext')?.addEventListener('click', () => chipsRail.scrollBy({ left: 240, behavior: 'smooth' }));
}

const overlay = document.getElementById('filmModal');
const bodyEl = document.getElementById('filmModalBody');

function closeModal() {
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('filmModalClose')?.addEventListener('click', closeModal);
overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function openModal(html) {
  bodyEl.innerHTML = html;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

document.addEventListener('click', async (e) => {
  const card = e.target.closest('[data-film-id]');
  if (!card) return;

  const tmdbId = card.dataset.filmId;
  const fromBoard = card.dataset.filmFromBoard || '';
  openModal('<div class="fm-loading">Loading…</div>');

  let film;
  try {
    ({ film } = await api.get(`/api/films/${tmdbId}`));
  } catch {
    openModal('<div class="fm-loading">Could not load film details.</div>');
    return;
  }

  const rawGenres = (film.genres || []).filter(g => isNaN(g));
  const genres = rawGenres.join(', ');
  const runtime = film.runtime ? `${film.runtime} min` : '';
  const vote = film.voteAverage ? `★ ${Number(film.voteAverage).toFixed(1)}` : '';
  const isLoggedIn = !!csrf();

  openModal(`
    <div class="fm-poster">
      ${film.poster
        ? `<img src="${esc(film.poster)}" alt="${esc(film.title)}">`
        : '<div class="fm-no-poster"></div>'}
    </div>
    <div class="fm-info">
      <h2 class="fm-title">${esc(film.title)}</h2>
      <div class="fm-meta">
        ${film.year ? `<span>${film.year}</span>` : ''}
        ${film.kind === 'tv' ? '<span>Series</span>' : ''}
        ${runtime ? `<span>${runtime}</span>` : ''}
        ${vote ? `<span>${vote}</span>` : ''}
      </div>
      ${genres ? `<div class="fm-genres">${esc(genres)}</div>` : ''}
      ${film.overview ? `<p class="fm-overview">${esc(film.overview)}</p>` : ''}
      <div class="fm-actions">
        ${isLoggedIn ? `
          <button class="btn btn-sm btn-mag" id="fmWatchBtn"
            data-watch-add="${film.tmdbId}"
            data-title="${esc(film.title)}"
            data-year="${film.year || ''}"
            data-poster="${esc(film.poster || '')}"
            data-from-board="${esc(fromBoard)}">
            ♡ Save to watchlist
          </button>
          <div class="fm-board-row">
            <select class="fm-select" id="fmBoardSel">
              <option value="">Loading boards…</option>
            </select>
            <button class="btn btn-sm btn-outline" id="fmAddBoardBtn">Add to board</button>
          </div>
        ` : '<p style="font-size:.8rem;opacity:.6">Log in to save or add to boards.</p>'}
      </div>
      <div class="fm-feedback" id="fmFeedback"></div>
    </div>
  `);

  if (!isLoggedIn) return;

  try {
    const { boards } = await api.get('/api/boards');
    const sel = document.getElementById('fmBoardSel');
    if (!sel) return;
    if (boards && boards.length) {
      sel.innerHTML = boards.map(b =>
        `<option value="${esc(b._id)}" data-slug="${esc(b.slug)}">${esc(b.title)}</option>`
      ).join('');
    } else {
      sel.innerHTML = '<option value="">No boards yet</option>';
    }

    document.getElementById('fmAddBoardBtn')?.addEventListener('click', async () => {
      const sel = document.getElementById('fmBoardSel');
      const fb = document.getElementById('fmFeedback');
      const boardId = sel?.value;
      const boardSlug = sel?.selectedOptions[0]?.dataset.slug;
      if (!boardId || !boardSlug) return;

      fb.textContent = 'Adding…';
      try {
        const { board } = await api.get(`/api/boards/by-slug/${boardSlug}`);
        const newEl = {
          id: randId(),
          type: 'poster',
          x: 80 + (board.elements.length % 4) * 180,
          y: 80 + Math.floor(board.elements.length / 4) * 260,
          rotation: board.elements.length % 2 === 0 ? -2 : 2,
          scale: 1,
          zIndex: board.elements.length,
          payload: { tmdbId: film.tmdbId, poster: film.poster, title: film.title, year: film.year }
        };
        await api.patch(`/api/boards/${boardId}`, { elements: [...board.elements, newEl] });
        fb.textContent = `Added to "${board.title}" ✓`;
      } catch {
        fb.textContent = 'Could not add to board.';
      }
    });
  } catch {
    const row = document.querySelector('.fm-board-row');
    if (row) row.hidden = true;
  }

  document.getElementById('fmWatchBtn')?.addEventListener('click', () => {
    setTimeout(() => {
      const fb = document.getElementById('fmFeedback');
      if (fb && !fb.textContent) fb.textContent = 'Saved to watchlist ✓';
    }, 400);
  });
});
