const mongoose = require('mongoose');
const Board = require('../models/Board');

const BUCKETS = {
  morning:   ['spring-renewal', 'road-trip', 'friday-recharge', 'just-paid', 'need-laugh'],
  afternoon: ['need-laugh', 'just-paid', 'dinner-party', 'first-date', 'summer-fever'],
  evening:   ['red-wine-rain', 'dinner-party', 'glow-up', 'neon-noir', 'first-date', 'need-cry'],
  night:     ['3am', 'lonely-apt', 'existential', 'autumn-dread', 'neon-noir', 'red-wine-rain']
};

function bucketFor(hour) {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  if (hour >= 18 && hour <= 22) return 'evening';
  return 'night';
}

async function tonightFeed(now = new Date(), limit = 12) {
  const bucket = bucketFor(now.getHours());
  const tags = BUCKETS[bucket];

  if (mongoose.connection.readyState !== 1) return { bucket, boards: [] };

  const tagged = await Board.find({ visibility: 'public', moodTags: { $in: tags } })
    .sort('-updatedAt')
    .limit(limit)
    .populate('owner', 'username displayName')
    .lean();

  if (tagged.length >= limit) return { bucket, boards: tagged };

  const excludeIds = tagged.map(b => b._id);
  const filler = await Board.find({ visibility: 'public', _id: { $nin: excludeIds } })
    .sort('-updatedAt')
    .limit(limit - tagged.length)
    .populate('owner', 'username displayName')
    .lean();

  return { bucket, boards: [...tagged, ...filler] };
}

module.exports = { tonightFeed, bucketFor };
