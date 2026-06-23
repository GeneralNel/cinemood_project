# Cinemood

A late-night zine for cinema. Build mood boards of films you'd watch when you're snowed in, heartbroken, hungover, or chasing a summer fever dream. Drop posters on a freeform canvas, hand-letter a label, share the URL.

Dressed in 80s VHS / neon-noir. Magenta, cyan, deep purple, scanlines.

## Run it

```
cp .env.example .env       # fill in MONGO_URI, SESSION_SECRET, TMDB_KEY
npm install
npm run dev
```

App boots on `http://localhost:3000`. SASS watches `public/styles/main.scss`.

Without `TMDB_KEY` the film catalog falls back to a small seeded set so you can still poke at the UI.

## Seed sample boards

```
npm run seed
```

Creates a `curator` user with four public boards so the Tonight feed isn't empty on a fresh DB.

## Stack

Node 20 · Express · EJS · vanilla JS · SASS · MongoDB / Mongoose · Atlas-friendly · sessions via `connect-mongo` · Jest + supertest.

## Tests

```
npm test
```

39 tests across models, auth, boards, mood, feed, slug.

## Deploy (Render)

1. Push to GitHub.
2. New Web Service on render.com → connect repo.
3. Build command: `npm install && npm run build:css`
4. Start command: `npm start`
5. Env vars: `MONGO_URI`, `SESSION_SECRET`, `TMDB_KEY`, `NODE_ENV=production`.
6. Render gives you HTTPS automatically. The server sets `trust proxy` and secure cookies when `NODE_ENV=production`.

For MongoDB, use a free Atlas cluster — copy the connection string into `MONGO_URI`. Allow Render's outbound IP (or `0.0.0.0/0` for simplicity).

For TMDB, register at themoviedb.org → settings → API → request a v3 key.

## Layout

```
server.js               app entry + middleware
config/db.js            Mongo connect
middleware/             csrf, requireAuth, rateLimit, validate
models/                 User, Board, FilmCache
routes/                 auth, pages, boards, films, mood, feed
services/               tmdb, recommend, moodToTags, tonight, slug
views/                  EJS templates
public/styles/          SASS source (compiles to main.css)
public/js/              vanilla ES modules
data/                   moodCards, moodTagMap, stickers, fallbackFilms
tests/                  Jest + supertest
scripts/seed.js         demo data
```
