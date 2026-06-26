const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

async function startTestDb() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.SESSION_SECRET = 'test-secret';
  await mongoose.connect(process.env.MONGO_URI);
}

async function stopTestDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function reset() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map(c => c.deleteMany({})));
}

module.exports = { startTestDb, stopTestDb, reset };
