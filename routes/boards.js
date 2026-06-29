const router = require('express').Router();
const { body } = require('express-validator');
const crypto = require('crypto');

const Board = require('../models/Board');
const tmdb = require('../services/tmdb');
const { unique } = require('../services/slug');
const { requireAuth, jsonGuard } = require('../middleware');

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const boards = await Board.find({ owner: req.session.user.id }).sort('-updatedAt').lean();
    res.json({ boards });
  } catch (e) { next(e); }
});

router.get('/by-slug/:slug', async (req, res, next) => {
  try {
    const b = await Board.findOne({ slug: req.params.slug }).populate('owner', 'username displayName').lean();
    if (!b) return res.status(404).json({ error: 'not found' });
    if (b.visibility === 'private' && (!req.session.user || String(b.owner._id) !== req.session.user.id)) {
      return res.status(404).json({ error: 'not found' });
    }
    res.json({ board: b });
  } catch (e) { next(e); }
});

router.post('/',
  requireAuth,
  body('title').optional({ checkFalsy: true }).isLength({ max: 80 }),
  body('tmdbIds').optional().isArray({ max: 24 }),
  body('moodTags').optional().isArray({ max: 6 }),
  jsonGuard(),
  async (req, res, next) => {
    try {
      const { title, tmdbIds = [], moodTags = [] } = req.body || {};
      const seed = title || (moodTags[0] || 'untitled tape');
      const slug = await unique(seed, async (s) => Boolean(await Board.exists({ slug: s })));

      const elements = [];
      let z = 0;
      for (const id of tmdbIds.slice(0, 12)) {
        const film = await tmdb.detail(Number(id));
        if (!film) continue;
        elements.push({
          id: crypto.randomBytes(6).toString('hex'),
          type: 'poster',
          x: 80 + (z % 4) * 180,
          y: 80 + Math.floor(z / 4) * 260,
          rotation: (z % 2 === 0 ? -2 : 2) + (Math.random() * 4 - 2),
          scale: 1,
          zIndex: z++,
          payload: {
            tmdbId: film.tmdbId,
            poster: film.poster,
            title: film.title,
            year: film.year
          }
        });
      }

      const board = new Board({
        owner: req.session.user.id,
        title: title || 'untitled tape',
        slug,
        moodTags: moodTags.slice(0, 6),
        elements,
        visibility: 'private'
      });
      board.refreshCover();
      await board.save();
      res.status(201).json({ board });
    } catch (e) { next(e); }
  }
);

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const board = await Board.findOne({ _id: req.params.id, owner: req.session.user.id });
    if (!board) return res.status(404).json({ error: 'not found' });

    const { title, description, moodTags, visibility, elements } = req.body || {};
    if (typeof title === 'string') board.title = title.slice(0, 80);
    if (typeof description === 'string') board.description = description.slice(0, 600);
    if (Array.isArray(moodTags)) board.moodTags = moodTags.slice(0, 6).map(s => String(s).toLowerCase().slice(0, 40));
    if (visibility === 'public' || visibility === 'private') board.visibility = visibility;
    if (Array.isArray(elements)) board.elements = elements.slice(0, 80);
    board.refreshCover();
    await board.save();
    res.json({ board });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await Board.deleteOne({ _id: req.params.id, owner: req.session.user.id });
    if (!result.deletedCount) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
