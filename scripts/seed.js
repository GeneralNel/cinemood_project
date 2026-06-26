require('dotenv').config();
const crypto = require('crypto');

const { connectDb, disconnectDb } = require('../config/db');
const User = require('../models/User');
const Board = require('../models/Board');
const tmdb = require('../services/tmdb');

const BOARDS = [
  {
    title: 'rainy sunday',
    tags: ['rainy-sunday', 'slow', 'red-wine-rain'],
    picks: [13, 11216, 426, 19404, 372058],
    stickers: ['tape', 'palm']
  },
  {
    title: 'neon noir, 1987',
    tags: ['neon-noir', '3am', 'lonely-apt'],
    picks: [78, 218, 603, 562, 562],
    stickers: ['neon-grid', 'lightning']
  },
  {
    title: 'snowed in with the dog',
    tags: ['snowed-in', 'need-cry', 'red-wine-rain'],
    picks: [8587, 11216, 137, 12],
    stickers: ['vhs', 'star-chrome']
  },
  {
    title: 'first-date jitters',
    tags: ['first-date', 'need-laugh', 'glow-up'],
    picks: [161, 19404, 372058, 9377],
    stickers: ['kiss', 'halftone']
  },
  {
    title: 'hungover at 3am',
    tags: ['3am', 'need-laugh', 'lonely-apt'],
    picks: [62, 105, 680, 27205],
    stickers: ['vhs', 'tape']
  },
  {
    title: 'autumn dread',
    tags: ['autumn-dread', 'existential', 'need-cry'],
    picks: [346, 372058, 11216, 14],
    stickers: ['halftone', 'lightning']
  }
];

async function elementsFor(spec) {
  const els = [];
  let z = 0;
  for (let i = 0; i < spec.picks.length; i++) {
    const id = spec.picks[i];
    const film = await tmdb.detail(id).catch(() => null);
    if (!film || !film.poster) continue;
    els.push({
      id: crypto.randomBytes(4).toString('hex'),
      type: 'poster',
      x: 60 + (i % 3) * 200,
      y: 60 + Math.floor(i / 3) * 300,
      rotation: (i % 2 ? -3 : 3) + (Math.random() * 4 - 2),
      scale: 1,
      zIndex: z++,
      payload: { tmdbId: film.tmdbId, poster: film.poster, title: film.title, year: film.year }
    });
  }
  (spec.stickers || []).forEach((sid, i) => {
    els.push({
      id: crypto.randomBytes(4).toString('hex'),
      type: 'sticker',
      x: 80 + i * 220,
      y: 380,
      rotation: -8 + Math.random() * 16,
      scale: 1.2,
      zIndex: z++,
      payload: { stickerId: sid }
    });
  });
  return els;
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('set MONGO_URI in .env first');
    process.exit(1);
  }
  await connectDb();

  let curator = await User.findOne({ username: 'curator' });
  if (!curator) {
    curator = await User.signup({
      username: 'curator',
      email: 'curator@cinemood.app',
      password: 'lateNightTape!',
      displayName: 'Curator'
    });
    console.log('created curator');
  }

  await Board.deleteMany({ owner: curator._id });

  for (const spec of BOARDS) {
    const slug = spec.title.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const elements = await elementsFor(spec);
    const b = new Board({
      owner: curator._id,
      title: spec.title,
      slug,
      visibility: 'public',
      moodTags: spec.tags,
      elements
    });
    b.refreshCover();
    await b.save();
    console.log('  +', slug, b.cover.length, 'covers');
  }

  await disconnectDb();
  console.log('done');
}

main().catch(err => { console.error(err); process.exit(1); });
