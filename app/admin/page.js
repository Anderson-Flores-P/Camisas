'use client';
import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';

const TALLAS = ['S', 'M', 'L', 'XL'];
const ESTADOS = ['anotado', 'confirmado', 'impreso', 'entregado', 'cancelado'];

export default function Admin() {
  const [ok, setOk] = useState(null); // null = verificando, false = login, true = dentro
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [productos, setProductos] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [form, setForm] = useState({ nombre: '', ubicacion: '', precio: '', tela: '', corte: '', color_base: '#232323', descripcion: '' });
  const [fotoFile, setFotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((d) => setOk(d.ok === true))
      .catch(() => setOk(false));
  }, []);

  useEffect(() => {
    if (ok === true) load();
  }, [ok]);

  async function load() {
    if (!isSupabaseConfigured) {
      const raw = localStorage.getItem('mock-db');
      if (raw) {
        const db = JSON.parse(raw);
        setProductos(db.productos || []);
        setVariantes(db.variantes || []);
        setPedidos(db.pedidos || []);
      }
      return;
    }
    const sb = getSupabase();
    const { data: p } = await sb.from('productos').select('*').order('created_at', { ascending: false });
    const { data: v } = await sb.from('variantes').select('*');
    const { data: pe } = await sb.from('pedidos').select('*').order('created_at', { ascending: false }).limit(100);
    setProductos(p || []);
    setVariantes(v || []);
    setPedidos(pe || []);
  }

  function saveMock(np, nv, npe) {
    localStorage.setItem('mock-db', JSON.stringify({ productos: np, variantes: nv, pedidos: npe }));
  }

  // Si Supabase no tiene una columna (ej. descripcion), el error técnico
  // no le dice nada al usuario: lo traducimos a la acción a tomar.
  function dbErrorMsg(error) {
    const m = String(error?.message || error || '');
    if (/schema cache|column/i.test(m)) {
      const col = (m.match(/'(\w+)' column/) || [])[1] || 'una columna';
      return `Falta la columna '${col}' en Supabase: pega supabase/migracion.sql en el SQL Editor, dale Run y luego Recargar.`;
    }
    return m;
  }

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setKey('');
        setOk(true);
      } else {
        setMsg(d.error || 'Clave incorrecta');
      }
    } catch {
      setMsg('No se pudo conectar con el servidor');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setOk(false);
    setKey('');
  }

  async function subirArchivo(file) {
    const sb = getSupabase();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('fotos').upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    const { data } = sb.storage.from('fotos').getPublicUrl(path);
    return data.publicUrl;
  }

  async function agregarFoto(productoId, file) {
    if (!file) return;
    if (!isSupabaseConfigured) {
      // Modo maqueta: vista previa solo en esta sesión (no se guarda la imagen)
      const url = URL.createObjectURL(file);
      const np = productos.map((p) => (p.id === productoId ? { ...p, fotos: [...(p.fotos || []), url] } : p));
      setProductos(np);
      setMsg('Foto agregada en esta sesión (modo maqueta: no se guarda)');
      return;
    }
    try {
      setUploading(true);
      const url = await subirArchivo(file);
      const prod = productos.find((p) => p.id === productoId);
      const fotos = [...(prod?.fotos || []), url];
      const sb = getSupabase();
      const { error } = await sb.from('productos').update({ fotos }).eq('id', productoId);
      if (error) setMsg(error.message);
      else { setMsg('Foto subida'); load(); }
    } catch (e) {
      setMsg('Error subiendo: ' + e.message + ' — ¿corriste supabase/storage.sql?');
    } finally {
      setUploading(false);
    }
  }

  async function quitarFoto(productoId, url) {
    const prod = productos.find((p) => p.id === productoId);
    const fotos = (prod?.fotos || []).filter((f) => f !== url);
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    if (!isSupabaseConfigured) {
      const np = productos.map((p) => (p.id === productoId ? { ...p, fotos } : p));
      setProductos(np); saveMock(np, variantes, pedidos);
      setMsg('Foto quitada (modo maqueta)');
      return;
    }
    const sb = getSupabase();
    await sb.from('productos').update({ fotos }).eq('id', productoId);
    load();
  }

  async function crearProducto(e) {
    e.preventDefault();
    let fotos = [];
    if (fotoFile && isSupabaseConfigured) {
      try {
        setUploading(true);
        fotos = [await subirArchivo(fotoFile)];
      } catch (err) {
        setMsg('Error subiendo foto: ' + err.message + ' — ¿corriste supabase/storage.sql?');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }
    const payload = { nombre: form.nombre, ubicacion: form.ubicacion, precio: Number(form.precio), tela: form.tela, corte: form.corte, color_base: form.color_base, descripcion: form.descripcion, fotos, activo: true };
    if (!isSupabaseConfigured) {
      const np = [{ ...payload, id: 'mock-' + Date.now() }, ...productos];
      // crear variantes con stock 0
      const nv = [...variantes];
      TALLAS.forEach((t) => nv.push({ id: 'v-' + Date.now() + t, producto_id: np[0].id, talla: t, color: 'Único', stock: 0 }));
      setProductos(np); setVariantes(nv); saveMock(np, nv, pedidos);
      setMsg('Producto creado en modo maqueta');
    } else {
      const sb = getSupabase();
      const { data, error } = await sb.from('productos').insert(payload).select().single();
      if (error) setMsg(dbErrorMsg(error));
      else {
        // crear variantes base
        await sb.from('variantes').insert(TALLAS.map((t) => ({ producto_id: data.id, talla: t, color: 'Único', stock: 0 })));
        setMsg('Producto creado');
        load();
      }
    }
    setForm({ nombre: '', ubicacion: '', precio: '', tela: '', corte: '', color_base: '#232323', descripcion: '' });
    setFotoFile(null);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({ nombre: p.nombre || '', ubicacion: p.ubicacion || p.sku || '', precio: p.precio || '', tela: p.tela || '', corte: p.corte || '', descripcion: p.descripcion || '' });
  }

  async function saveEdit(id) {
    const payload = { nombre: editForm.nombre, ubicacion: editForm.ubicacion, precio: Number(editForm.precio), tela: editForm.tela, corte: editForm.corte, descripcion: editForm.descripcion };
    if (!isSupabaseConfigured) {
      const np = productos.map((p) => (p.id === id ? { ...p, ...payload } : p));
      setProductos(np); saveMock(np, variantes, pedidos);
      setMsg('Editado en modo maqueta');
    } else {
      const sb = getSupabase();
      const { error } = await sb.from('productos').update(payload).eq('id', id);
      setMsg(error ? dbErrorMsg(error) : 'Cambios guardados');
      load();
    }
    setEditingId(null);
  }

  async function borrarProducto(id) {
    if (!confirm('¿Borrar producto?')) return;
    if (!isSupabaseConfigured) {
      const np = productos.filter((p) => p.id !== id);
      setProductos(np); saveMock(np, variantes, pedidos);
    } else {
      const sb = getSupabase();
      await sb.from('productos').delete().eq('id', id);
      load();
    }
  }

  async function cambiarStock(id, delta) {
    const v = variantes.find((x) => x.id === id);
    const nuevo = Math.max(0, (v.stock || 0) + delta);
    if (!isSupabaseConfigured) {
      const nv = variantes.map((x) => (x.id === id ? { ...x, stock: nuevo } : x));
      setVariantes(nv); saveMock(productos, nv, pedidos);
    } else {
      const sb = getSupabase();
      await sb.from('variantes').update({ stock: nuevo }).eq('id', id);
      load();
    }
  }

  async function cambiarEstado(id, estado) {
    if (!isSupabaseConfigured) {
      const npe = pedidos.map((p) => (p.id === id ? { ...p, estado } : p));
      setPedidos(npe); saveMock(productos, variantes, npe);
    } else {
      const sb = getSupabase();
      await sb.from('pedidos').update({ estado }).eq('id', id);
      load();
    }
  }

  if (ok === null) {
    return (
      <div className="admin-wrap login-wrap">
        <div className="login-card">
          <p className="kicker">Taller — acceso privado</p>
          <p className="login-sub">Verificando acceso…</p>
        </div>
      </div>
    );
  }

  if (!ok) {
    return (
      <div className="admin-wrap login-wrap">
        <div className="login-card">
          <span className="tape t1" />
          <span className="tape t2" />
          <p className="kicker">Taller — acceso privado</p>
          <h2>Entrar al taller</h2>
          <p className="login-sub">Zona privada. Ingresa tu clave de taller para gestionar productos, stock y pedidos.</p>
          <form onSubmit={login} className="login-form">
            <label className="label" htmlFor="admin-key">Clave de taller</label>
            <input
              id="admin-key"
              className="input"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <button className="btn-ink primary" type="submit" disabled={busy || !key}>
              {busy ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
          {msg && <p className="login-error">{msg}</p>}
          <a className="login-back" href="/">← volver a la tienda</a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <p className="kicker">Taller — admin</p>
      <h2>Productos · Stock · Pedidos</h2>
      {!isSupabaseConfigured && <p className="mode-note">MODO MAQUETA: sin Supabase, se guarda en tu navegador. Pega tus keys en .env.local para modo real.</p>}
      {msg && <p className="mode-note">{msg}</p>}
      <div className="admin-bar">
        <a className="btn-ink small" href="/">← ver tienda</a>
        <span>
          <button className="btn-ink small" onClick={load}>Recargar</button>{' '}
          <button className="btn-ink small" onClick={logout}>Salir</button>
        </span>
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <h3>Nuevo producto</h3>
          <form onSubmit={crearProducto} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" placeholder="Nombre (Wave Club — negra)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <input className="input" placeholder="Ubicación: ej. D:/fotos/wave o estante 2" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
            <input className="input" placeholder="Precio 59.90" type="number" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
            <input className="input" placeholder="Tela" value={form.tela} onChange={(e) => setForm({ ...form, tela: e.target.value })} />
            <input className="input" placeholder="Corte" value={form.corte} onChange={(e) => setForm({ ...form, corte: e.target.value })} />
            <textarea className="input" placeholder="Descripción larga (se ve en el detalle)" rows="3" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            <label className="label">Foto (frente) — JPG/PNG</label>
            <input className="input" type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files?.[0] || null)} />
            <button className="btn-ink primary" type="submit" disabled={uploading}>{uploading ? 'Subiendo...' : 'Crear'}</button>
          </form>
        </div>

        <div className="admin-card">
          <h3>Productos ({productos.length})</h3>
          <div className="prod-list">
            {productos.length === 0 && <p className="small-note">Sin productos todavía. Crea el primero a la izquierda.</p>}
            {productos.map((p) => (
              editingId === p.id ? (
                <div className="prod-edit" key={p.id}>
                  <p className="label">Editando — {p.nombre}</p>
                  <div className="edit-grid">
                    <label>Nombre<input className="input" value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} /></label>
                    <label>Precio<input className="input" type="number" step="0.01" value={editForm.precio} onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })} /></label>
                    <label>Ubicación<input className="input" value={editForm.ubicacion} onChange={(e) => setEditForm({ ...editForm, ubicacion: e.target.value })} placeholder="D:/fotos/... o estante 2" /></label>
                    <label>Tela<input className="input" value={editForm.tela} onChange={(e) => setEditForm({ ...editForm, tela: e.target.value })} /></label>
                    <label>Corte<input className="input" value={editForm.corte} onChange={(e) => setEditForm({ ...editForm, corte: e.target.value })} /></label>
                    <label className="span-2">Descripción<textarea className="input" rows="2" value={editForm.descripcion} onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })} /></label>
                  </div>
                  <p className="label">Fotos ({(p.fotos || []).length})</p>
                  <div className="photo-row">
                    {(p.fotos || []).map((f) => (
                      <span className="photo-thumb" key={f}>
                        <img src={f} alt="" />
                        <button className="photo-x" title="Quitar foto" onClick={() => quitarFoto(p.id, f)}>×</button>
                      </span>
                    ))}
                    <label className="btn-ink small photo-add">{uploading ? '…' : '+ agregar'}
                      <input type="file" accept="image/*" hidden onChange={(e) => agregarFoto(p.id, e.target.files?.[0])} />
                    </label>
                  </div>
                  <div className="admin-row">
                    <button className="btn-ink primary small" onClick={() => saveEdit(p.id)}>guardar cambios</button>
                    <button className="btn-ink small" onClick={() => setEditingId(null)}>cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="prod-item" key={p.id}>
                  {(p.fotos || []).length > 0
                    ? <img src={p.fotos[0]} alt={p.nombre} className="prod-thumb" />
                    : <span className="badge">sin foto</span>}
                  <div className="prod-meta">
                    <strong>{p.nombre}</strong>
                    <span className="prod-sub">$ {p.precio}{(p.ubicacion || p.sku) ? ` · ${p.ubicacion || p.sku}` : ''}</span>
                  </div>
                  <div className="admin-row">
                    <button className="btn-ink small" onClick={() => startEdit(p)}>editar</button>
                    <button className="btn-ink small" onClick={() => borrarProducto(p.id)}>borrar</button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 16 }}>
        <h3>Stock por talla</h3>
        <div className="stock-list">
          {productos.length === 0 && <p className="small-note">Sin productos todavía.</p>}
          {productos.map((p) => (
            <div className="stock-row" key={p.id}>
              <span className="stock-name" title={p.nombre}>{p.nombre}</span>
              <div className="stock-tallas">
                {TALLAS.map((t) => {
                  const v = variantes.find((x) => x.producto_id === p.id && x.talla === t);
                  if (!v) return <span className="stock-talla" key={t}><b>{t} · —</b></span>;
                  return (
                    <span className="stock-talla" key={v.id}>
                      <b>{t} · {v.stock}</b>
                      <button className="btn-ink slim" onClick={() => cambiarStock(v.id, -1)}>−</button>
                      <button className="btn-ink slim" onClick={() => cambiarStock(v.id, 1)}>+</button>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 16 }}>
        <h3>Pedidos ({pedidos.length})</h3>
        <table className="table"><thead><tr><th>Cliente</th><th>Items</th><th>Total</th><th>Estado</th></tr></thead>
          <tbody>{pedidos.map((pe) => (
            <tr key={pe.id}><td>{pe.nombre_cliente}<br />{pe.whatsapp}</td><td><pre style={{ whiteSpace: 'pre-wrap', fontSize: '.75rem' }}>{JSON.stringify(pe.items, null, 1)}</pre></td><td>$ {pe.total}</td>
              <td><select className="select" value={pe.estado} onChange={(e) => cambiarEstado(pe.id, e.target.value)}>{ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}</select></td></tr>
          ))}</tbody></table>
      </div>
    </div>
  );
}
