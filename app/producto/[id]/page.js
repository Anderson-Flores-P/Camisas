'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSupabase, isSupabaseConfigured } from '../../../lib/supabase';
import { mockProductos, mockVariantes } from '../../../lib/mock';

export default function ProductoDetalle() {
  const WHATSAPP_TIENDA = '50379588735';
  const { id } = useParams();
  const [prod, setProd] = useState(null);
  const [vars, setVars] = useState([]);
  const [fotoIdx, setFotoIdx] = useState(0);
  const [talla, setTalla] = useState('M');
  const [nombre, setNombre] = useState('');
  const [wsp, setWsp] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) {
        const raw = localStorage.getItem('mock-db');
        let ps = mockProductos, vs = mockVariantes;
        if (raw) {
          const db = JSON.parse(raw);
          ps = db.productos?.length ? db.productos : ps;
          vs = db.variantes || vs;
        }
        setProd(ps.find((p) => String(p.id) === String(id)) || ps[0]);
        setVars(vs.filter((v) => String(v.producto_id) === String(id)));
        return;
      }
      const sb = getSupabase();
      const { data: p } = await sb.from('productos').select('*').eq('id', id).single();
      const { data: v } = await sb.from('variantes').select('*').eq('producto_id', id).order('talla');
      if (p) setProd(p);
      setVars(v || []);
    }
    if (id) load();
  }, [id]);

  const stockTalla = vars.find((v) => v.talla === talla)?.stock ?? null;

  async function pedir(e) {
    e.preventDefault();
    if (!prod) return;
    const payload = {
      nombre_cliente: nombre || 'sin nombre',
      whatsapp: wsp || '',
      items: [{ producto_id: prod.id, nombre: prod.nombre, talla, cantidad: 1 }],
      total: prod.precio,
      estado: 'anotado',
    };
    if (!isSupabaseConfigured) {
      setMsg('Anotado en modo maqueta. Conecta Supabase para guardar.');
      return;
    }
    const sb = getSupabase();
    const { error } = await sb.from('pedidos').insert(payload);
    setMsg(error ? 'Error: ' + error.message : 'Pedido guardado — te escribimos por WhatsApp');
  }

  if (!prod) return <div className="detail-wrap"><p className="kicker">Cargando...</p></div>;
  const fotos = prod.fotos || [];

  return (
    <div className="detail-wrap">
      <a className="btn-ink small" href="/">← catálogo</a>
      <div className="detail-grid">
        <div className="detail-photo">
          {fotos.length > 0 ? (
            <>
              <img className="main" src={fotos[fotoIdx]} alt={prod.nombre} />
              {fotos.length > 1 && (
                <div className="thumbs">
                  {fotos.map((f, i) => (
                    <img key={i} src={f} alt="" className={i === fotoIdx ? 'active' : ''} onClick={() => setFotoIdx(i)} />
                  ))}
                </div>
              )}
              <p className="small-note" style={{ marginTop: 8 }}>Foto {fotoIdx + 1} de {fotos.length} — frente / detalle / atrás</p>
            </>
          ) : (
            <p className="small-note">Sin fotos aún — sube desde /admin con “+ foto”.</p>
          )}
        </div>

        <div className="detail-info">
          <p className="kicker">Serigrafía en taller</p>
          <h1>{prod.nombre}</h1>
          <p className="detail-price"><strong>$ {prod.precio}</strong></p>
          {prod.descripcion ? <p className="detail-desc">{prod.descripcion}</p> : null}
          <dl className="specs">
            <div><dt>Tela</dt><dd>{prod.tela || '—'}</dd></div>
            <div><dt>Corte</dt><dd>{prod.corte || '—'}</dd></div>
            <div><dt>Estampado</dt><dd>{prod.estampado || '—'}</dd></div>
          </dl>

          <p className="label" style={{ marginTop: 14 }}>Talla — stock real</p>
          <div className="sizes">
            {['S', 'M', 'L', 'XL'].map((t) => {
              const st = vars.find((v) => v.talla === t)?.stock;
              return (
                <button key={t} className={`size ${talla === t ? 'active' : ''}`} onClick={() => setTalla(t)} title={st !== undefined ? `stock: ${st}` : ''}>
                  {t}
                </button>
              );
            })}
          </div>
          <p className="size-picked">
            {stockTalla === null ? 'Stock no cargado — créalo en /admin' : stockTalla > 0 ? `Hay ${stockTalla} en talla ${talla}` : `Agotado en ${talla} por ahora`}
          </p>
          <table className="stock-table">
            <tbody>
              {vars.map((v) => (
                <tr key={v.id}><td>Talla {v.talla}</td><td>{v.stock} disp.</td></tr>
              ))}
            </tbody>
          </table>

          <form onSubmit={pedir} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            <input className="input" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input className="input" placeholder="Tu WhatsApp" value={wsp} onChange={(e) => setWsp(e.target.value)} />
            <button className="btn-ink primary" type="submit" disabled={stockTalla === 0}>
              {stockTalla === 0 ? 'Agotado en esta talla' : `Pedir talla ${talla}`}
            </button>
          </form>
          {msg && <p className="mode-note" style={{ background: '#f7f2e6', color: '#1c1a16', border: '1.5px solid #1c1a16' }}>{msg}</p>}
          <p style={{ marginTop: 10 }}>
              <a className="btn-ink" target="_blank" rel="noreferrer" href={`https://wa.me/${WHATSAPP_TIENDA}?text=${encodeURIComponent(`Hola, quiero ${prod.nombre} talla ${talla}`)}`}>
              Preguntar por WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
