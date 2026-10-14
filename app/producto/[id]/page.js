import DetalleClient from './DetalleClient';
import { getSupabase, isSupabaseConfigured } from '../../../lib/supabase';
import { mockProductos, mockVariantes } from '../../../lib/mock';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  if (!isSupabaseConfigured) return mockProductos.map((p) => ({ id: String(p.id) }));
  try {
    const sb = getSupabase();
    const { data } = await sb.from('productos').select('id').eq('activo', true).limit(100);
    return (data || []).map((p) => ({ id: String(p.id) }));
  } catch {
    return [];
  }
}

export default async function Page({ params }) {
  const { id } = params;
  if (!isSupabaseConfigured) {
    const prod = mockProductos.find((p) => String(p.id) === String(id)) || mockProductos[0];
    const vars = mockVariantes.filter((v) => String(v.producto_id) === String(prod?.id));
    return <DetalleClient prod={prod} initialVars={vars} />;
  }
  try {
    const sb = getSupabase();
    const [{ data: p }, { data: v }] = await Promise.all([
      sb.from('productos').select('id,nombre,precio,categoria,tela,corte,estampado,descripcion,fotos,color_base').eq('id', id).single(),
      sb.from('variantes').select('id,talla,stock').eq('producto_id', id).order('talla'),
    ]);
    if (!p) {
      const prod = mockProductos.find((x) => String(x.id) === String(id)) || null;
      return <DetalleClient prod={prod} initialVars={[]} />;
    }
    return <DetalleClient prod={p} initialVars={v || []} />;
  } catch {
    const prod = mockProductos.find((p) => String(p.id) === String(id)) || mockProductos[0];
    return <DetalleClient prod={prod} initialVars={[]} />;
  }
}
