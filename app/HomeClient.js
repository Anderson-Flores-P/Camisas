'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const COLORES = [
  { hex: '#232323', name: 'Negro taller' },
  { hex: '#e8e0cf', name: 'Crudo' },
  { hex: '#2e4a7a', name: 'Azul trabajo' },
  { hex: '#3a5a40', name: 'Verde' },
];
const TALLAS = ['S', 'M', 'L', 'XL'];

function pickRandomId(list) {
  const base = list || [];
  if (!base.length) return null;
  return base[Math.floor(Math.random() * base.length)].id;
}

export default function HomeClient({ initialProductos = [], initialVariantes = [], initialCats = [] }) {
  // Datos ya vienen del servidor: sin flash, sin skeleton inicial
  const [productos, setProductos] = useState(initialProductos);
  const [variantes, setVariantes] = useState(initialVariantes);
  const [cats, setCats] = useState(initialCats);
  const [color, setColor] = useState(COLORES[0]);
  const [talla, setTalla] = useState('M');
  const [count, setCount] = useState(0);
  const [toast, setToast] = useState('');
  const [nombre, setNombre] = useState('');
  const [wsp, setWsp] = useState('');
  const [catTodoFiltro, setCatTodoFiltro] = useState('Todas');
  // null en primer render (server y client iguales) para evitar hydration mismatch;
  // el aleatorio se elige solo en useEffect después de montar.
  const [heroId, setHeroId] = useState(null);
  const carRef = useRef(null);

  useEffect(() => {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    // Elige hero aleatoria al montar (cambia en cada refresh, sin romper hidratación)
    setHeroId(pickRandomId(initialProductos));
    // Revalida en silencio sin mostrar skeleton (no bloquea)
    if (!isSupabaseConfigured) return;
    let vivo = true;
    async function refresh() {
      try {
        const sb = getSupabase();
        const [{ data: prods }, { data: vars }, { data: catData }] = await Promise.all([
          sb.from('productos').select('*').eq('activo', true).order('created_at'),
          sb.from('variantes').select('*'),
          sb.from('categorias').select('nombre').order('nombre'),
        ]);
        if (!vivo) return;
        if (prods?.length) {
          setProductos(prods);
          setHeroId((prev) => prev || pickRandomId(prods));
        }
        if (vars?.length) setVariantes(vars);
        if (catData?.length) setCats(catData.map((c) => c.nombre));
      } catch { /* silencioso: ya hay datos del servidor */ }
    }
    refresh();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stockMap = useMemo(() => {
    const m = new Map();
    for (const v of variantes) m.set(`${v.producto_id}|${v.talla}`, v.stock);
    return m;
  }, [variantes]);
  const destacados = useMemo(() => productos.filter((p) => p.mostrar_inicio !== false), [productos]);
  const principal = productos.find((p) => p.id === heroId) || productos[0];
  const stockActual = principal ? stockMap.get(`${principal.id}|${talla}`) : null;
  const todasCats = useMemo(() => {
    const enUso = [...new Set(productos.map((p) => p.categoria || 'General'))];
    if (!cats.length) return enUso;
    const orden = cats.filter((c) => enUso.includes(c));
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
            <p className="kicker">Selección taller — serigrafía en taller</p>
            <h1>Una camisa normal, con un estampado que sí te pondrías.</h1>
            {principal && (
              <div className="hero-pick">
                <span className="hero-pick-tag">Hoy · {principal.categoria || 'General'}</span>
                <strong className="hero-pick-name">{principal.nombre}</strong>
                <span className="hero-pick-meta">$ {principal.precio} · <Link href={`/producto/${principal.id}`} prefetch>ver ficha →</Link></span>
              </div>
            )}
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
              <div className="price"><strong>$ {principal?.precio ?? '—'}</strong></div>
              <button className="btn-ink primary" onClick={() => principal && anotar(principal)}>Anotar esta talla</button>
            </div>
          </div>
          <div className="hero-photo reveal visible">
            <figure className="photo-card">
              {principal?.fotos?.length > 0 ? (
                <Image src={principal.fotos[0]} alt={principal.nombre} width={640} height={640} priority fetchPriority="high" sizes="(max-width: 840px) 100vw, 480px" style={{ width: '100%', height: 'auto', borderRadius: 4, border: '1.5px solid #1c1a16' }} />
              ) : (
              <svg viewBox="0 0 340 340" className="shirt" role="img" aria-label="Camisa">
                <ellipse cx="170" cy="308" rx="95" ry="12" fill="#000" opacity="0.12" />
                <path d="M118 52 L72 76 L50 122 L86 136 L96 116 L96 282 L244 282 L244 116 L254 136 L290 122 L268 76 L222 52 L202 66 L192 66 L192 54 L148 54 L148 66 L138 66 Z" fill={principal?.color_base || color.hex} stroke="#111" strokeWidth="3" />
                <circle cx="169" cy="166" r="39" fill="#d95d33" />
                <path d="M139 166 Q154 148 169 166 Q184 184 199 166" stroke="#232323" strokeWidth="5.5" fill="none" strokeLinecap="round" />
                <text x="170" y="248" textAnchor="middle" fontFamily="Georgia, serif" fontSize="15" fontWeight="bold" letterSpacing="2" fill="#e8e0cf">{(principal?.categoria || 'WAVE CLUB').toUpperCase().slice(0, 14)}</text>
              </svg>
              )}
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
            {destacados.length > 1 && (
              <div className="carousel-btns">
                <button className="btn-ink small" onClick={() => moverCar(-1)} aria-label="Anterior">←</button>
                <button className="btn-ink small" onClick={() => moverCar(1)} aria-label="Siguiente">→</button>
              </div>
            )}
          </div>
          <div className="carousel-track" ref={carRef}>
            {destacados.length === 0 && <p className="small-note">Nada destacado por ahora — márcalo en /admin.</p>}
            {destacados.map((p) => (
              <article className="card real carousel-card" key={p.id}>
                <div className="card-top"><span className="sku">{p.categoria || 'General'}</span></div>
                <div className="mini-shirt">
                  {p.fotos?.length > 0 ? (
                    <Link href={`/producto/${p.id}`} prefetch>
                      <Image src={p.fotos[0]} alt={p.nombre} width={480} height={480} loading="lazy" sizes="(max-width: 840px) 70vw, 280px" className="prod-img" style={{ width: '100%', height: 'auto' }} />
                    </Link>
                  ) : (
                  <svg viewBox="0 0 340 340"><path d="M118 52 L72 76 L50 122 L86 136 L96 116 L96 282 L244 282 L244 116 L254 136 L290 122 L268 76 L222 52 L202 66 L192 66 L192 54 L148 54 L148 66 L138 66 Z" fill={p.color_base || color.hex} stroke="#111" strokeWidth="3" /><circle cx="169" cy="166" r="39" fill="#d95d33" /></svg>
                  )}
                </div>
                <h3><Link href={`/producto/${p.id}`} prefetch>{p.nombre}</Link></h3>
                <div className="card-foot"><strong>$ {p.precio}</strong><span><Link className="btn-ink small" href={`/producto/${p.id}`} prefetch>Ver</Link> <button className="btn-ink primary small" onClick={() => anotar(p)}>Anotar</button></span></div>
              </article>
            ))}
          </div>
        </section>

        <section className="catalog" id="explorar">
          <div className="section-head"><p className="kicker">Explorar</p><h2>Todas por categoría</h2>
            <p className="small-note">Aquí salen todas aunque estén ocultas de portada. La categoría siempre aparece.</p>
          </div>
          {todasCats.length > 0 && (
            <div className="cat-pills">
              <button className={`cat-pill ${catTodoFiltro === 'Todas' ? 'active' : ''}`} onClick={() => setCatTodoFiltro('Todas')}>Todas ({productos.length})</button>
              {todasCats.map((c) => (
                <button key={c} className={`cat-pill ${catTodoFiltro === c ? 'active' : ''}`} onClick={() => setCatTodoFiltro(c)}>
                  {c} ({productos.filter((p) => (p.categoria || 'General') === c).length})
                </button>
              ))}
            </div>
          )}
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
                    <Link href={`/producto/${p.id}`} prefetch>
                      <Image src={p.fotos[0]} alt={p.nombre} width={480} height={480} loading="lazy" sizes="(max-width: 840px) 90vw, 300px" className="prod-img" style={{ width: '100%', height: 'auto' }} />
                    </Link>
                  ) : (
                  <svg viewBox="0 0 340 340"><path d="M118 52 L72 76 L50 122 L86 136 L96 116 L96 282 L244 282 L244 116 L254 136 L290 122 L268 76 L222 52 L202 66 L192 66 L192 54 L148 54 L148 66 L138 66 Z" fill={p.color_base || color.hex} stroke="#111" strokeWidth="3" /><circle cx="169" cy="166" r="39" fill="#d95d33" /></svg>
                  )}
                </div>
                <h3><Link href={`/producto/${p.id}`} prefetch>{p.nombre}</Link></h3>
                <div className="card-foot"><strong>$ {p.precio}</strong><span><Link className="btn-ink small" href={`/producto/${p.id}`} prefetch>Ver</Link> <button className="btn-ink primary small" onClick={() => anotar(p)}>Anotar</button></span></div>
              </article>
            ))}
          </div>
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
