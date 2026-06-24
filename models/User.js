const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const watchSchema = new mongoose.Schema({
  tmdbId: { type: Number, required: true },
  title:  { type: String, default: '' },
  year:   { type: Number, default: null },
  poster: { type: String, default: '' },
  fromBoardSlug: { type: String, default: '' },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 2, maxlength: 24 },
  email:    { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  displayName:  { type: String, trim: true, maxlength: 60 },
  bio:          { type: String, trim: true, maxlength: 240 },
  watchlist:    { type: [watchSchema], default: [] }
}, { timestamps: true });

userSchema.statics.signup = async function ({ username, email, password, displayName }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const doc = await this.create({ username, email, passwordHash, displayName: displayName || username });
  return doc;
};

userSchema.statics.findByLogin = async function (login) {
  const q = login.includes('@') ? { email: login.toLowerCase() } : { username: login.toLowerCase() };
  return this.findOne(q);
};

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSession = function () {
  return { id: this._id.toString(), username: this.username, displayName: this.displayName };
};

module.exports = mongoose.model('User', userSchema);
