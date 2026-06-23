const map = require('../data/moodTagMap.json');
const cards = require('../data/moodCards.json');

const cardIds = new Set(cards.map(c => c.id));

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function paramsFromCards(picked) {
  const genres = new Set();
  let decadeMin = null, decadeMax = null, runtimeLte = null, runtimeGte = null, voteAvgGte = null;

  for (const id of picked) {
    const m = map[id];
    if (!m) continue;
    (m.genres || []).forEach(g => genres.add(g));
    if (m.decadeMin) decadeMin = decadeMin ? Math.min(decadeMin, m.decadeMin) : m.decadeMin;
    if (m.decadeMax) decadeMax = decadeMax ? Math.max(decadeMax, m.decadeMax) : m.decadeMax;
    if (m.runtimeLte) runtimeLte = runtimeLte ? Math.min(runtimeLte, m.runtimeLte) : m.runtimeLte;
    if (m.runtimeGte) runtimeGte = runtimeGte ? Math.max(runtimeGte, m.runtimeGte) : m.runtimeGte;
    if (m.voteAvgGte) voteAvgGte = voteAvgGte ? Math.max(voteAvgGte, m.voteAvgGte) : m.voteAvgGte;
  }
  return { genres, decadeMin, decadeMax, runtimeLte, runtimeGte, voteAvgGte };
}

function applyDials(dials, base) {
  const energy = clamp(Number(dials.energy ?? 50), 0, 100);
  const warmth = clamp(Number(dials.warmth ?? 50), 0, 100);
  const familiarity = clamp(Number(dials.familiarity ?? 50), 0, 100);

  if (energy >= 70) { base.genres.add(28); base.genres.add(53); }
  else if (energy <= 30) { base.genres.add(18); base.runtimeLte = Math.min(base.runtimeLte || 999, 140); }

  if (warmth >= 70) { base.genres.add(10751); base.genres.add(10749); base.genres.add(35); }
  else if (warmth <= 30) { base.genres.add(27); base.genres.add(53); }

  if (familiarity <= 30) base.voteAvgGte = Math.max(base.voteAvgGte || 0, 7.4);

  return base;
}

function toTmdbParams({ dials = {}, cards: picked = [] }) {
  const safe = picked.filter(id => cardIds.has(id)).slice(0, 3);
  const base = paramsFromCards(safe);
  applyDials(dials, base);

  const params = {};
  if (base.genres.size) params.with_genres = [...base.genres].join(',');
  if (base.decadeMin) params['primary_release_date.gte'] = `${base.decadeMin}-01-01`;
  if (base.decadeMax) params['primary_release_date.lte'] = `${base.decadeMax}-12-31`;
  if (base.runtimeLte) params['with_runtime.lte'] = base.runtimeLte;
  if (base.runtimeGte) params['with_runtime.gte'] = base.runtimeGte;
  if (base.voteAvgGte) params['vote_average.gte'] = base.voteAvgGte;
  return params;
}

function deriveTags({ cards: picked = [] }) {
  return picked.filter(id => cardIds.has(id)).slice(0, 3);
}

module.exports = { toTmdbParams, deriveTags };
