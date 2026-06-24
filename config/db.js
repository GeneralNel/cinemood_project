const mongoose = require('mongoose');

async function connectDb(uri) {
  const target = uri || process.env.MONGO_URI;
  if (!target) {
    console.warn('no MONGO_URI set — running without persistence');
    return null;
  }
  await mongoose.connect(target, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
