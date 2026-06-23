const path = require('path');
const fs = require('fs');
const FilmCache = require('../models/FilmCache');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p/w500';

const fallback = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'fallbackFilms.json'), 'utf8')
);

function key() { return process.env.TMDB_KEY; }
function configured() { return Boolean(key()); }

function shape(raw) {
  const kind = raw.media_type === 'tv' || raw.first_air_date ? 'tv' : 'movie';
  return {
    tmdbId: raw.id,
    kind,
    title: raw.title || raw.name || 'Untitled',
    year: parseInt((raw.release_date || raw.first_air_date || '').slice(0, 4), 10) || null,
    overview: raw.overview || '',
    poster: raw.poster_path ? IMG_BASE + raw.poster_path : null,
    backdrop: raw.backdrop_path ? 'https://image.tmdb.org/t/p/w780' + raw.backdrop_path : null,
    genres: raw.genre_ids || (raw.genres || []).map(g => g.id),
    runtime: raw.runtime || null,
    voteAvg: raw.vote_average || null
  };
}

function shapeFallback(f) {
  return {
    ...f,
    kind: 'movie',
    poster: f.poster ? IMG_BASE + f.poster : null,
    backdrop: null
  };
}

async function call(pathName, params = {}) {
  if (!configured()) return null;
  const url = new URL(TMDB_BASE + pathName);
  url.searchParams.set('api_key', key());
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`tmdb ${res.status}: ${text.slice(0, 120)}`);
  }
  return res.json();
}

async function search(q) {
  if (!q || !q.trim()) return [];
  if (!configured()) {
    const needle = q.toLowerCase();
    return fallback
      .filter(f => f.title.toLowerCase().includes(needle))
      .slice(0, 20)
      .map(shapeFallback);
  }
  const data = await call('/search/multi', { query: q, include_adult: false });
  return (data.results || [])
    .filter(r => r.media_type !== 'person' && r.poster_path)
    .map(shape)
    .slice(0, 24);
}

async function discover(params) {
  if (!configured()) {
    const wanted = new Set(params.with_genres ? String(params.with_genres).split(',').map(Number) : []);
    const items = fallback
      .filter(f => wanted.size === 0 || f.genres.some(g => wanted.has(g)))
      .slice(0, 20)
      .map(shapeFallback);
    return items;
  }
  const data = await call('/discover/movie', {
    sort_by: 'popularity.desc',
    include_adult: false,
    'vote_count.gte': 100,
    ...params
  });
  return (data.results || []).map(shape).slice(0, 30);
}

async function detail(tmdbId) {
  const cached = await FilmCache.findOne({ tmdbId }).lean().catch(() => null);
  const fresh = cached && (Date.now() - new Date(cached.fetchedAt).getTime() < 1000 * 60 * 60 * 24);
  if (cached && fresh) return cached;

  if (!configured()) {
    const f = fallback.find(x => x.tmdbId === Number(tmdbId));
    return f ? shapeFallback(f) : cached || null;
  }

  try {
    const data = await call(`/movie/${tmdbId}`);
    const shaped = shape(data);
    await FilmCache.findOneAndUpdate(
      { tmdbId: shaped.tmdbId },
      { ...shaped, fetchedAt: new Date() },
      { upsert: true, new: true }
    ).catch(() => null);
    return shaped;
  } catch (e) {
    return cached || null;
  }
}

async function cacheMany(items) {
  if (!items || !items.length) return;
  const ops = items.map(s => ({
    updateOne: {
      filter: { tmdbId: s.tmdbId },
      update: { $set: { ...s, fetchedAt: new Date() } },
      upsert: true
    }
  }));
  await FilmCache.bulkWrite(ops, { ordered: false }).catch(() => null);
}

module.exports = { search, discover, detail, cacheMany, configured };
