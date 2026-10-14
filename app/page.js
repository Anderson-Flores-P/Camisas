import HomeClient from './HomeClient';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { mockProductos, mockVariantes, mockCategorias } from '../lib/mock';

export const revalidate = 30;

export default async function Page() {
  if (!isSupabaseConfigured) {
    return (
      <HomeClient
        initialProductos={mockProductos}
        initialVariantes={mockVariantes}
        initialCats={mockCategorias.map((c) => c.nombre)}
      />
    );
  }
  try {
    const sb = getSupabase();
    const [{ data: prods }, { data: vars }, { data: catData }] = await Promise.all([
      sb.from('productos').select('*').eq('activo', true).order('created_at'),
      sb.from('variantes').select('*'),
      sb.from('categorias').select('nombre').order('nombre'),
    ]);
    return (
      <HomeClient
        initialProductos={prods?.length ? prods : mockProductos}
        initialVariantes={vars?.length ? vars : mockVariantes}
        initialCats={catData?.length ? catData.map((c) => c.nombre) : mockCategorias.map((c) => c.nombre)}
      />
    );
  } catch {
    return (
      <HomeClient
        initialProductos={mockProductos}
        initialVariantes={mockVariantes}
        initialCats={mockCategorias.map((c) => c.nombre)}
      />
    );
  }
}
