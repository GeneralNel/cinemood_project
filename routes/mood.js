const router = require('express').Router();
const tmdb = require('../services/tmdb');
const { toTmdbParams, deriveTags } = require('../services/moodToTags');

router.post('/recommend', async (req, res, next) => {
  try {
    const input = req.body || {};
    const params = toTmdbParams(input);
    const films = await tmdb.discover(params);
    await tmdb.cacheMany(films);
    res.json({ results: films, tags: deriveTags(input), params });
  } catch (e) { next(e); }
});

router.get('/cards', (req, res) => {
  res.json(require('../data/moodCards.json'));
});

module.exports = router;
