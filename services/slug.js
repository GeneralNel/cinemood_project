const crypto = require('crypto');

function kebab(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function unique(base, exists) {
  const root = kebab(base) || 'tape';
  if (!(await exists(root))) return root;
  for (let i = 0; i < 5; i++) {
    const tail = crypto.randomBytes(3).toString('hex');
    const candidate = `${root}-${tail}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

module.exports = { kebab, unique };
