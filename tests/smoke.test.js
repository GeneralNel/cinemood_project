const request = require('supertest');
const { startTestDb, stopTestDb, reset } = require('./setup');
const { toTmdbParams } = require('../services/moodToTags');
const { bucketFor } = require('../services/tonight');
const { kebab } = require('../services/slug');

let app, User;
beforeAll(async () => {
  await startTestDb();
  app = require('../server');
  User = require('../models/User');
});
afterAll(stopTestDb);
beforeEach(reset);

async function csrf(agent, path = '/signup') {
  const res = await agent.get(path);
  return res.text.match(/name="_csrf"\s+value="([^"]+)"/)[1];
}

test('user signup hashes password', async () => {
  const u = await User.signup({ username: 'rey', email: 'rey@cm.io', password: 'tatooinedays' });
  expect(u.passwordHash).not.toBe('tatooinedays');
  expect(await u.verifyPassword('tatooinedays')).toBe(true);
});

test('signup → dashboard, then board create + visibility toggle', async () => {
  const agent = request.agent(app);
  const t = await csrf(agent);
  const signup = await agent.post('/signup').type('form')
    .send({ _csrf: t, username: 'finn', email: 'finn@cm.io', password: 'firstorder1' });
  expect(signup.status).toBe(302);

  const csrfMeta = (await agent.get('/')).text.match(/name="csrf-token" content="([^"]+)"/)[1];
  const created = await agent.post('/api/boards').set('x-csrf-token', csrfMeta)
    .send({ title: 'Rainy Sunday', moodTags: ['rainy-sunday'] });
  expect(created.status).toBe(201);
  expect(created.body.board.slug).toMatch(/^rainy-sunday/);
  expect(created.body.board.visibility).toBe('private');

  const id = created.body.board._id;
  const slug = created.body.board.slug;

  const anonPrivate = await request(app).get(`/board/${slug}`);
  expect(anonPrivate.status).toBe(404);

  await agent.patch(`/api/boards/${id}`).set('x-csrf-token', csrfMeta).send({ visibility: 'public' });
  const anonPublic = await request(app).get(`/board/${slug}`);
  expect(anonPublic.status).toBe(200);
});

test('CSRF blocks POSTs without a token', async () => {
  const res = await request(app).post('/signup').type('form')
    .send({ username: 'noTok', email: 'n@cm.io', password: 'whatever123' });
  expect(res.status).toBe(403);
});

test('moodToTags maps cards + dials to TMDB params', () => {
  const p = toTmdbParams({ cards: ['rainy-sunday'], dials: { energy: 90, warmth: 10 } });
  expect(p.with_genres.split(',')).toEqual(expect.arrayContaining(['18', '28', '27']));
});

test('tonight bucket + slug helpers', () => {
  expect(bucketFor(20)).toBe('evening');
  expect(bucketFor(3)).toBe('night');
  expect(kebab('Rainy Sunday!')).toBe('rainy-sunday');
});
