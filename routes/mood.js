const router = require('express').Router();
const { recommend } = require('../services/recommend');

router.post('/recommend', async (req, res, next) => {
  try {
    const out = await recommend(req.body || {});
    res.json(out);
  } catch (e) { next(e); }
});

router.get('/cards', (req, res) => {
  res.json(require('../data/moodCards.json'));
});

module.exports = router;
