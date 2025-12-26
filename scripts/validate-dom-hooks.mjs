import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainTs = fs.readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');

// Extract all must('id') calls from src/main.ts so the check stays in sync with the code.
const mustIds = Array.from(mainTs.matchAll(/must(?:<[^>]+>)?\('([^']+)'\)/g)).map(m => m[1]);

// De-dup while preserving order.
const seen = new Set();
const requiredIds = mustIds.filter(id => {
  if (seen.has(id)) return false;
  seen.add(id);
  return true;
});

function countId(id) {
  const re = new RegExp(`id="${id}"`, 'g');
  const m = html.match(re);
  return m ? m.length : 0;
}

const missing = [];
const dup = [];

for (const id of requiredIds) {
  const c = countId(id);
  if (c === 0) missing.push(id);
  if (c > 1) dup.push({ id, count: c });
}

if (missing.length || dup.length) {
  console.error('DOM hook validation failed.');
  if (missing.length) console.error('Missing IDs:', missing.join(', '));
  if (dup.length) console.error('Duplicate IDs:', dup.map(x => `${x.id}(${x.count})`).join(', '));
  process.exit(1);
}

console.log(`DOM hook validation OK (${requiredIds.length} required ids present exactly once).`);
