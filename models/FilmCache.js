const mongoose = require('mongoose');

const filmSchema = new mongoose.Schema({
  tmdbId:    { type: Number, required: true, unique: true, index: true },
  kind:      { type: String, enum: ['movie', 'tv'], default: 'movie' },
  title:     { type: String, required: true },
  year:      { type: Number },
  overview:  { type: String },
  poster:    { type: String },
  backdrop:  { type: String },
  genres:    [{ type: Number }],
  runtime:   { type: Number },
  voteAvg:   { type: Number },
  fetchedAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

filmSchema.index({ title: 'text', overview: 'text' });

module.exports = mongoose.model('FilmCache', filmSchema);
