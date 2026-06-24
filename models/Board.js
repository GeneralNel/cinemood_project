const mongoose = require('mongoose');

const elementSchema = new mongoose.Schema({
  id:       { type: String, required: true },
  type:     { type: String, enum: ['poster', 'sticker', 'swatch', 'note'], required: true },
  x:        { type: Number, default: 0 },
  y:        { type: Number, default: 0 },
  rotation: { type: Number, default: 0 },
  scale:    { type: Number, default: 1, min: 0.2, max: 4 },
  zIndex:   { type: Number, default: 0 },
  payload:  {
    tmdbId:      Number,
    poster:      String,
    title:       String,
    year:        Number,
    stickerId:   String,
    color:       String,
    text:        String,
    markerColor: String
  }
}, { _id: false });

const boardSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'untitled tape', maxlength: 80, trim: true },
  description: { type: String, default: '', maxlength: 600 },
  slug: { type: String, required: true, unique: true, index: true },
  visibility: { type: String, enum: ['public', 'private'], default: 'private', index: true },
  moodTags: [{ type: String, lowercase: true, trim: true, maxlength: 40 }],
  elements: [elementSchema],
  cover: [{ type: String }]
}, { timestamps: true });

boardSchema.methods.refreshCover = function () {
  const posters = this.elements
    .filter(e => e.type === 'poster' && e.payload && e.payload.poster)
    .slice(0, 5)
    .map(e => e.payload.poster);
  this.cover = posters;
};

module.exports = mongoose.model('Board', boardSchema);
