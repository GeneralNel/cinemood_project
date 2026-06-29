const tmdb = require('./tmdb');
const { toTmdbParams, deriveTags } = require('./moodToTags');

async function recommend(input) {
  const params = toTmdbParams(input);
  const films = await tmdb.discover(params);
  await tmdb.cacheMany(films);
  return {
    results: films,
    tags: deriveTags(input),
    params
  };
}

module.exports = { recommend };
