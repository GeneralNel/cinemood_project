const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin'
  });
  if (res.status === 401) {
    throw new Error('auth');
  }
  if (!res.ok) throw new Error('api ' + res.status);
  return res.json();
}

function updateCount(delta) {
  const el = document.querySelector('[data-watch-count]');
  if (!el) return;
  const cur = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;
  const next = Math.max(0, cur + delta);
  el.textContent = next + ' saved';
}

function renderCard(item) {
  const a = document.createElement('article');
  a.className = 'watch-card';
  a.dataset.tmdbId = item.tmdbId;
  a.innerHTML = `
    <div class="poster">${item.poster ? `<img src="${item.poster}" alt="" loading="lazy">` : ''}</div>
    <div class="info">
      <div class="t">${escapeHtml(item.title || 'Untitled')}</div>
      ${item.year ? `<div class="y">${item.year}</div>` : ''}
    </div>
    <button type="button" class="remove" data-watch-remove="${item.tmdbId}" aria-label="Remove from watchlist">×</button>
  `;
  return a;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

document.addEventListener('click', async (e) => {
  const rm = e.target.closest('[data-watch-remove]');
  if (rm) {
    const id = Number(rm.dataset.watchRemove);
    const card = rm.closest('.watch-card');
    if (card) card.style.opacity = '.4';
    try {
      await api('DELETE', `/api/watchlist/${id}`);
      card?.remove();
      updateCount(-1);
      const rail = document.querySelector('[data-watch-rail]');
      const empty = document.querySelector('[data-watch-empty]');
      if (rail && !rail.children.length && !empty) {
        const note = document.createElement('div');
        note.className = 'watch-empty';
        note.dataset.watchEmpty = '';
        note.innerHTML = 'nothing on the watchlist yet — tap the <strong style="color:#ff006e">+</strong> on any poster to save it for later.';
        rail.replaceWith(note);
      }
      const btn = document.querySelector(`[data-watch-add="${id}"]`);
      if (btn) btn.classList.remove('on');
    } catch (err) {
      if (card) card.style.opacity = '1';
    }
    return;
  }

  const add = e.target.closest('[data-watch-add]');
  if (add) {
    e.preventDefault();
    const id = Number(add.dataset.watchAdd);
    const payload = {
      tmdbId: id,
      title: add.dataset.title || '',
      year: add.dataset.year ? Number(add.dataset.year) : null,
      poster: add.dataset.poster || '',
      fromBoardSlug: add.dataset.fromBoard || ''
    };
    add.classList.add('on');
    try {
      const r = await api('POST', '/api/watchlist', payload);
      if (r.already) return;
      const rail = document.querySelector('[data-watch-rail]');
      const empty = document.querySelector('[data-watch-empty]');
      const item = r.item || payload;
      if (rail) {
        rail.prepend(renderCard(item));
      } else if (empty) {
        const newRail = document.createElement('div');
        newRail.className = 'rail';
        newRail.dataset.watchRail = '';
        newRail.appendChild(renderCard(item));
        empty.replaceWith(newRail);
      }
      updateCount(1);
    } catch (err) {
      add.classList.remove('on');
    }
  }
});
