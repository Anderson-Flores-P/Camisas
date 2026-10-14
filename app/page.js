'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { mockProductos, mockVariantes, mockCategorias } from '../lib/mock';

const COLORES = [
  { hex: '#232323', name: 'Negro taller' },
  { hex: '#e8e0cf', name: 'Crudo' },
  { hex: '#2e4a7a', name: 'Azul trabajo' },
  { hex: '#3a5a40', name: 'Verde' },
];
const TALLAS = ['S', 'M', 'L', 'XL'];

export default function Home() {
  // Si hay Supabase, arrancamos vacío + loading para no mostrar
  // precios mock que luego cambian. Si no hay, mock directo sin parpadeo.
  const [productos, setProductos] = useState(() => (isSupabaseConfigured ? [] : mockProductos));
  const [variantes, setVariantes] = useState(() => (isSupabaseConfigured ? [] : mockVariantes));
  const [loading, setLoading] = useState(() => isSupabaseConfigured);
  const [color, setColor] = useState(COLORES[0]);
  const [talla, setTalla] = useState('M');
  const [count, setCount] = useState(0);
  const [toast, setToast] = useState('');
  const [nombre, setNombre] = useState('');
  const [wsp, setWsp] = useState('');
  const [catTodoFiltro, setCatTodoFiltro] = useState('Todas');
  const [cats, setCats] = useState(() => (isSupabaseConfigured ? [] : mockCategorias.map((c) => c.nombre)));
  const carRef = useRef(null);

  useEffect(() => {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    if (!isSupabaseConfigured) return;
    let vivo = true;
    async function load() {
      try {
        const sb = getSupabase();
        const [{ data: prods }, { data: vars }, { data: catData }] = await Promise.all([
          sb.from('productos').select('*').eq('activo', true).order('created_at'),
          sb.from('variantes').select('*'),
          sb.from('categorias').select('nombre').order('nombre'),
        ]);
        if (!vivo) return;
        if (prods?.length) setProductos(prods);
        else setProductos(mockProductos);
        if (vars?.length) setVariantes(vars);
        else setVariantes(mockVariantes);
        if (catData?.length) setCats(catData.map((c) => c.nombre));
      } catch {
        if (!vivo) return;
        setProductos(mockProductos);
        setVariantes(mockVariantes);
      } finally {
        if (vivo) setLoading(false);
      }
    }
    load();
    return () => { vivo = false; };
  }, []);

  const stockMap = useMemo(() => {
    const m = new Map();
    for (const v of variantes) m.set(`${v.producto_id}|${v.talla}`, v.stock);
    return m;
  }, [variantes]);
  const destacados = useMemo(() => productos.filter((p) => p.mostrar_inicio !== false), [productos]);
  const principal = destacados[0] || productos[0];
  const stockActual = principal ? stockMap.get(`${principal.id}|${talla}`) : null;
  // Explorar: TODAS las camisas activas, sin importar el switch (independiente de destacados)
  const todasCats = useMemo(() => {
    const enUso = [...new Set(productos.map((p) => p.categoria || 'General'))];
    if (!cats.length) return enUso;
    const orden = cats.filter((c) => enUso.includes(c));
    // categorías con camisas pero que no están en la tabla (datos viejos) al final
    return [...orden, ...enUso.filter((c) => !orden.includes(c))];
  }, [productos, cats]);
  const todosVisibles = catTodoFiltro === 'Todas' ? productos : productos.filter((p) => (p.categoria || 'General') === catTodoFiltro);

  function moverCar(dir) {
    const el = carRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 300, behavior: 'smooth' });
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  function anotar(producto) {
    setCount((c) => c + 1);
    showToast(`Anotado: ${producto.nombre} ${color.name} talla ${talla}`);
  }

  async function enviarPedido(e) {
    e.preventDefault();
    const prod = principal;
    if (!prod) return;
    const payload = {
      nombre_cliente: nombre || 'sin nombre',
      whatsapp: wsp || '',
      items: [{ producto_id: prod.id, nombre: prod.nombre, talla, color: color.name, cantidad: 1 }],
      total: prod.precio,
      estado: 'anotado',
    };
    if (isSupabaseConfigured) {
      const sb = getSupabase();
      const { error } = await sb.from('pedidos').insert(payload);
      showToast(error ? 'Error guardando: ' + error.message : 'Pedido guardado — te escribimos por WhatsApp');
    } else {
      showToast('Pedido anotado');
    }
  }

  return (
    <>
      <div className="topbar">
        <span>DROP 01 — se imprime bajo pedido, tardamos 3 a 5 días</span>
      </div>
      <header className="nav">
        <div className="nav-inner">
          <a href="#" className="logo">wave club <small>store</small></a>
          <nav className="links">
            <a href="#camisa">La camisa</a>
            <a href="#catalogo">Destacados</a>
            <a href="#explorar">Explorar</a>
            <a href="#pedido">Cómo pedir</a>
          </nav>
          <div className="nav-actions">
            <button className="btn-note">Anotados ({count})</button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="camisa">
          <div className="hero-text reveal visible">
            <p className="kicker">Muestra Nº 01 — serigrafía en taller</p>
            <h1>Una camisa normal, con un estampado que sí te pondrías.</h1>
            <div className="field">
              <p className="label">Color de tela</p>
              <div className="colors">
                {COLORES.map((c) => (
                  <button key={c.name} className={`color ${color.name === c.name ? 'active' : ''}`} onClick={() => setColor(c)}>
                    <i style={{ background: c.hex }} />{c.name.split(' ')[0]}
                  </button>
                ))}
              </div>
              <p className="chosen">Viendo ahora: <strong>{color.name}</strong></p>
            </div>
            <div className="field">
              <p className="label">Talla{stockActual != null ? ` — ${stockActual} disponibles` : ''}</p>
              <div className="sizes">
                {TALLAS.map((t) => (
                  <button key={t} className={`size ${talla === t ? 'active' : ''}`} onClick={() => setTalla(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="buy-row">
              <div className="price"><strong>$ {loading ? '—' : (principal?.precio ?? '—')}</strong></div>
              <button className="btn-ink primary" onClick={() => principal && anotar(principal)} disabled={loading}>Anotar esta talla</button>
            </div>
          </div>
          <div className="hero-photo reveal visible">
            <figure className="photo-card">
              {loading ? (
                <div className="img-skeleton" />
              ) : principal?.fotos?.length > 0 ? (
                <img src={principal.fotos[0]} alt={principal.nombre} style={{ width: '100%', borderRadius: 4, border: '1.5px solid #1c1a16' }} />
              ) : (
              <svg viewBox="0 0 340 340" className="shirt" role="img" aria-label="Camisa">
                <ellipse cx="170" cy="308" rx="95" ry="12" fill="#000" opacity="0.12" />
                <path d="M118 52 L72 76 L50 122 L86 136 L96 116 L96 282 L244 282 L244 116 L254 136 L290 122 L268 76 L222 52 L202 66 L192 66 L192 54 L148 54 L148 66 L138 66 Z" fill={color.hex} stroke="#111" strokeWidth="3" />
                <circle cx="169" cy="166" r="39" fill="#d95d33" />
                <path d="M139 166 Q154 148 169 166 Q184 184 199 166" stroke="#232323" strokeWidth="5.5" fill="none" strokeLinecap="round" />
                <text x="170" y="248" textAnchor="middle" fontFamily="Georgia, serif" fontSize="17" fontWeight="bold" letterSpacing="3" fill="#e8e0cf">WAVE CLUB</text>
              </svg>
              )}
              <span className="stamp">muestra</span>
              <figcaption>{principal?.nombre ?? 'Wave Club'} — frente, sin modelo.</figcaption>
            </figure>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track"><span>algodón grueso · corte recto · se imprime al pedir · tallas S a XL ·&nbsp;</span><span>algodón grueso · corte recto · se imprime al pedir · tallas S a XL ·&nbsp;</span></div>
        </div>

        <section className="catalog" id="catalogo">
          <div className="section-head carousel-head">
            <div><p className="kicker">Destacados</p><h2>En portada</h2>
            <p className="small-note">Solo lo marcado en /admin con “Mostrar en inicio”. Desliza →</p></div>
            {!loading && destacados.length > 1 && (
              <div className="carousel-btns">
                <button className="btn-ink small" onClick={() => moverCar(-1)} aria-label="Anterior">←</button>
                <button className="btn-ink small" onClick={() => moverCar(1)} aria-label="Siguiente">→</button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="carousel-track">
              {[0, 1, 2].map((i) => (
                <article className="card carousel-card" key={i} aria-hidden="true">
                  <div className="img-skeleton small" />
                  <div className="line-skeleton" />
                  <div className="line-skeleton short" />
                </article>
              ))}
            </div>
          ) : (
          <div className="carousel-track" ref={carRef}>
            {destacados.length === 0 && <p className="small-note">Nada destacado por ahora — márcalo en /admin.</p>}
            {destacados.map((p) => (
              <article className="card real carousel-card" key={p.id}>
                <div className="card-top"><span className="sku">{p.categoria || 'General'}</span></div>
                <div className="mini-shirt">
                  {p.fotos?.length > 0 ? (
                    <a href={`/producto/${p.id}`}>
                      <img src={p.fotos[0]} alt={p.nombre} className="prod-img" loading="lazy" />
                    </a>
                  ) : (
                  <svg viewBox="0 0 340 340"><path d="M118 52 L72 76 L50 122 L86 136 L96 116 L96 282 L244 282 L244 116 L254 136 L290 122 L268 76 L222 52 L202 66 L192 66 L192 54 L148 54 L148 66 L138 66 Z" fill={p.color_base || color.hex} stroke="#111" strokeWidth="3" /><circle cx="169" cy="166" r="39" fill="#d95d33" /></svg>
                  )}
                </div>
                <h3><a href={`/producto/${p.id}`}>{p.nombre}</a></h3>
                <div className="card-foot"><strong>$ {p.precio}</strong><span><a className="btn-ink small" href={`/producto/${p.id}`}>Ver</a> <button className="btn-ink primary small" onClick={() => anotar(p)}>Anotar</button></span></div>
              </article>
            ))}
          </div>
          )}
        </section>

        <section className="catalog" id="explorar">
          <div className="section-head"><p className="kicker">Explorar</p><h2>Todas por categoría</h2>
            <p className="small-note">Aquí salen todas aunque estén ocultas de portada. La categoría siempre aparece.</p>
          </div>
          {!loading && todasCats.length > 0 && (
            <div className="cat-pills">
              <button className={`cat-pill ${catTodoFiltro === 'Todas' ? 'active' : ''}`} onClick={() => setCatTodoFiltro('Todas')}>Todas ({productos.length})</button>
              {todasCats.map((c) => (
                <button key={c} className={`cat-pill ${catTodoFiltro === c ? 'active' : ''}`} onClick={() => setCatTodoFiltro(c)}>
                  {c} ({productos.filter((p) => (p.categoria || 'General') === c).length})
                </button>
              ))}
            </div>
          )}
          {!loading && (
          <div className="grid">
            {todosVisibles.length === 0 && <p className="small-note">Nada aquí todavía.</p>}
            {todosVisibles.map((p) => (
              <article className="card real" key={p.id}>
                <div className="card-top">
                  <span className="sku">{p.categoria || 'General'}</span>
                  {p.mostrar_inicio === false && <span className="sku">solo catálogo</span>}
                </div>
                <div className="mini-shirt">
                  {p.fotos?.length > 0 ? (
                    <a href={`/producto/${p.id}`}>
                      <img src={p.fotos[0]} alt={p.nombre} className="prod-img" loading="lazy" />
                    </a>
                  ) : (
                  <svg viewBox="0 0 340 340"><path d="M118 52 L72 76 L50 122 L86 136 L96 116 L96 282 L244 282 L244 116 L254 136 L290 122 L268 76 L222 52 L202 66 L192 66 L192 54 L148 54 L148 66 L138 66 Z" fill={p.color_base || color.hex} stroke="#111" strokeWidth="3" /><circle cx="169" cy="166" r="39" fill="#d95d33" /></svg>
                  )}
                </div>
                <h3><a href={`/producto/${p.id}`}>{p.nombre}</a></h3>
                <div className="card-foot"><strong>$ {p.precio}</strong><span><a className="btn-ink small" href={`/producto/${p.id}`}>Ver</a> <button className="btn-ink primary small" onClick={() => anotar(p)}>Anotar</button></span></div>
              </article>
            ))}
          </div>
          )}
        </section>

        <section className="order" id="pedido">
          <div className="order-box">
            <div>
              <p className="kicker">Cómo pedir</p>
              <h2>Anota y te escribimos</h2>
              <form onSubmit={enviarPedido} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <input className="input" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                <input className="input" placeholder="Tu WhatsApp (51...)" value={wsp} onChange={(e) => setWsp(e.target.value)} />
                <button className="btn-ink primary" type="submit">Guardar pedido ({talla} / {color.name})</button>
              </form>
            </div>
            <div className="order-side">
              <p className="label">Cómo funciona</p>
              <p className="draft">Eliges tu camisa en el catálogo, anotas talla y nos dejas tu nombre + WhatsApp. Te escribimos para confirmar.</p>
              <p className="small-note" style={{ marginTop: 8 }}>El mensaje específico de cada camisa está en su página de detalle.</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p className="legal">Taller — Drop 01</p>
      </footer>
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}
