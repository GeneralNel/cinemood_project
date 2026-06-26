const router = require('express').Router();
const { tonightFeed } = require('../services/tonight');

router.get('/tonight', async (req, res, next) => {
  try {
    const out = await tonightFeed();
    res.json(out);
  } catch (e) { next(e); }
});

module.exports = router;
