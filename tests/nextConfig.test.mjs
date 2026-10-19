import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Igual que `next build`: carga .env* antes de leer next.config.js
require('@next/env').loadEnvConfig(new URL('..', import.meta.url).pathname, false, { info() {}, error() {} });
const cfg = require('../next.config.js');

test('next.config: imágenes permiten supabase y webp', () => {
  const pats = cfg.images.remotePatterns;
  assert.ok(Array.isArray(pats) && pats.length >= 1);
  assert.ok(pats.every((p) => p.protocol === 'https'));
  assert.ok(pats.some((p) => /supabase\.co$/.test(p.hostname)));
  assert.ok(cfg.images.formats.includes('image/webp'));
});

test('next.config: hostname exacto y sin avif (tras hallazgo 2)', { skip: !process.env.EXPECT_STRICT_HOST }, () => {
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  assert.deepEqual(cfg.images.remotePatterns.map((p) => p.hostname), [host]);
  assert.ok(!cfg.images.formats.includes('image/avif'));
});
