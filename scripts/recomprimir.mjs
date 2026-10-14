// Recomprime fotos existentes de Supabase: PNG 4MB -> JPG 1200px ~200KB
// Uso: node scripts/recomprimir.mjs (una sola vez)
import sharp from 'sharp';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  })
);
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const { data: prods } = await sb.from('productos').select('id,nombre,fotos').eq('activo', true);
console.log('productos:', prods?.length);
for (const p of prods || []) {
  const nuevas = [];
  let cambio = false;
  for (const url of p.fotos || []) {
    try {
      const head = await fetch(url, { method: 'HEAD' });
      const size = Number(head.headers.get('content-length') || 0);
      const tipo = head.headers.get('content-type') || '';
      // ya liviana: dejar igual
      if (size > 0 && size < 450 * 1024) { nuevas.push(url); continue; }
      console.log(`bajando ${p.nombre.slice(0, 20)} (${(size / 1048576).toFixed(1)}MB ${tipo})...`);
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const out = await sharp(buf).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      console.log(`  ${(size / 1024).toFixed(0)}KB -> ${(out.length / 1024).toFixed(0)}KB`);
      const path = `recomp-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await sb.storage.from('fotos').upload(path, out, { contentType: 'image/jpeg', upsert: false });
      if (error) throw new Error(error.message);
      const { data } = sb.storage.from('fotos').getPublicUrl(path);
      nuevas.push(data.publicUrl);
      cambio = true;
    } catch (e) {
      console.log('  error, se deja original:', e.message);
      nuevas.push(url);
    }
  }
  if (cambio) {
    const { error } = await sb.from('productos').update({ fotos: nuevas }).eq('id', p.id);
    console.log(error ? '  update ERROR: ' + error.message : `  ${p.nombre} actualizado`);
  }
}
console.log('listo');
