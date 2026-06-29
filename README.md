# Cinemood

A late-night zine for cinema. Build mood boards of films you'd watch when you're snowed in, heartbroken, hungover, or chasing a summer fever dream. Drop posters on a freeform canvas, hand-letter a label, share the URL.

## Run it

```
npm install
cp .env.example .env       # fill in MONGO_URI, SESSION_SECRET, TMDB_KEY
npm run build:css
npm start
```

App boots on `http://localhost:3000`.

Without `TMDB_KEY` the film catalog falls back to a small seeded set so you can still poke at the UI.

## Development

```
npm run dev
```

Runs `nodemon` + `sass --watch` in parallel. No need to manually run `build:css` — SASS recompiles on every change.

## Seed sample boards

```
npm run seed
```

Creates a `curator` user (password `curator123`) with a few public boards so the home page isn't empty on a fresh DB.

## Stack

Node 20 · Express · EJS · vanilla JS · SASS · MongoDB / Mongoose · sessions via `connect-mongo` · Jest + supertest.

## Tests

```
npm test
```

Smoke suite covering auth, CSRF, board CRUD, mood params, and slug helpers. Uses an in-memory MongoDB — no running database needed.

## Deploy (Render)

1. Push to GitHub.
2. New Web Service on render.com → connect repo.
3. Build command: `npm install && npm run build:css`
4. Start command: `npm start`
5. Env vars: `MONGO_URI`, `SESSION_SECRET`, `TMDB_KEY`, `NODE_ENV=production`.
6. Render gives you HTTPS automatically. The server sets `trust proxy` and secure cookies when `NODE_ENV=production`.

For MongoDB, use a free Atlas cluster — copy the connection string into `MONGO_URI`. Allow Render's outbound IP (or `0.0.0.0/0` for simplicity).

For TMDB, register at themoviedb.org → settings → API → request a v3 key.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `SESSION_SECRET` | Yes | `dev-only-change-me` | Long random string for session signing |
| `TMDB_KEY` | No | — | TMDB v3 API key for film search |
| `PORT` | No | `3000` | Port to listen on |
| `NODE_ENV` | No | — | Set to `production` for secure cookies + trust proxy |

## Layout

```
server.js               app entry + middleware
config/db.js            Mongo connect
middleware/             csrf, requireAuth, rateLimit, validate
models/                 User, Board, FilmCache
routes/                 auth, pages, boards, films, mood, watchlist
services/               tmdb, recommend, moodToTags, slug
views/                  EJS templates
public/styles/          SASS source (compiles to main.css)
public/js/              vanilla ES modules
data/                   moodCards, moodTagMap, stickers, fallbackFilms
tests/                  Jest + supertest
scripts/seed.js         demo data
```
