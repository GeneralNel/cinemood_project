const router = require('express').Router();
const tmdb = require('../services/tmdb');
const FilmCache = require('../models/FilmCache');

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    if (!q) return res.json({ results: [] });
    const results = await tmdb.search(q);
    await tmdb.cacheMany(results).catch(() => null);
    res.json({ results });
  } catch (e) { next(e); }
});

router.get('/:tmdbId', async (req, res, next) => {
  try {
    const id = parseInt(req.params.tmdbId, 10);
    if (!id) return res.status(400).json({ error: 'bad id' });
    const film = await tmdb.detail(id);
    if (!film) return res.status(404).json({ error: 'not found' });
    res.json({ film });
  } catch (e) { next(e); }
});

module.exports = router;
