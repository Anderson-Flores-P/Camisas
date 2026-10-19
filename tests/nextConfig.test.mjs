import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const cfg = require('../next.config.js');

test('next.config: imágenes permiten supabase y webp', () => {
  const pats = cfg.images.remotePatterns;
  assert.ok(Array.isArray(pats) && pats.length >= 1);
  assert.ok(pats.every((p) => p.protocol === 'https'));
  assert.ok(pats.some((p) => /supabase\.co$/.test(p.hostname)));
  assert.ok(cfg.images.formats.includes('image/webp'));
});
