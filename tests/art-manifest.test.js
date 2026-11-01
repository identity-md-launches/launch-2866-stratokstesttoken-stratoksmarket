import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('published atlas lists every runtime sheet and sprite with matching coordinates', () => {
  const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
  const runtime = read('../web/src/expanse/atlas.json');
  for (const file of ['../web/public/art/manifest.json', '../dist/art/manifest.json']) {
    const published = read(file);
    assert.deepEqual(published.sheets, runtime.sheets, file);
    assert.deepEqual(published.sprites, runtime.sprites, file);
  }
});
