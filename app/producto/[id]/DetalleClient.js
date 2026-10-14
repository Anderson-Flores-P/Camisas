'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabase, isSupabaseConfigured } from '../../../lib/supabase';

export default function DetalleClient({ prod, initialVars = [] }) {
  const WHATSAPP_TIENDA = '50379588735';
  const [vars] = useState(initialVars);
  const [fotoIdx, setFotoIdx] = useState(0);
  const [talla, setTalla] = useState('M');
  const [nombre, setNombre] = useState('');
  const [wsp, setWsp] = useState('');
  const [msg, setMsg] = useState('');

  if (!prod) return <div className="detail-wrap"><p className="kicker">No encontrado — <Link href="/">volver</Link></p></div>;
  const fotos = prod.fotos || [];
  const stockTalla = vars.find((v) => v.talla === talla)?.stock ?? null;

  async function pedir(e) {
    e.preventDefault();
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

  return (
    <div className="detail-wrap">
      <Link className="btn-ink small" href="/" prefetch>← catálogo</Link>
      <div className="detail-grid">
        <div className="detail-photo">
          {fotos.length > 0 ? (
            <>
              <Image className="main" src={fotos[fotoIdx]} alt={prod.nombre} width={800} height={800} priority fetchPriority="high" sizes="(max-width: 840px) 100vw, 600px" style={{ width: '100%', height: 'auto' }} />
              {fotos.length > 1 && (
                <div className="thumbs">
                  {fotos.map((f, i) => (
                    <Image key={i} src={f} alt="" width={128} height={128} loading="lazy" className={i === fotoIdx ? 'active' : ''} onClick={() => setFotoIdx(i)} style={{ cursor: 'pointer' }} />
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
          <p className="kicker">Serigrafía en taller · {prod.categoria || 'General'}</p>
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
