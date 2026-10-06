'use client';
import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';

const TALLAS = ['S', 'M', 'L', 'XL'];
const ESTADOS = ['anotado', 'confirmado', 'impreso', 'entregado', 'cancelado'];

export default function Admin() {
  const [ok, setOk] = useState(false);
  const [key, setKey] = useState('');
  const [productos, setProductos] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [form, setForm] = useState({ nombre: '', sku: '', precio: '', tela: '', corte: '', color_base: '#232323', descripcion: '' });
  const [fotoFile, setFotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ADMIN_KEY && sessionStorage.getItem('admin') === '1') setOk(true);
    else if (!process.env.NEXT_PUBLIC_ADMIN_KEY) setOk(true); // sin clave en local, entrar directo
    load();
  }, []);

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

  function login(e) {
    e.preventDefault();
    if (!process.env.NEXT_PUBLIC_ADMIN_KEY || key === process.env.NEXT_PUBLIC_ADMIN_KEY) {
      setOk(true);
      sessionStorage.setItem('admin', '1');
    } else setMsg('Clave incorrecta');
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
    const payload = { nombre: form.nombre, sku: form.sku, precio: Number(form.precio), tela: form.tela, corte: form.corte, color_base: form.color_base, descripcion: form.descripcion, fotos, activo: true };
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
      if (error) setMsg(error.message);
      else {
        // crear variantes base
        await sb.from('variantes').insert(TALLAS.map((t) => ({ producto_id: data.id, talla: t, color: 'Único', stock: 0 })));
        setMsg('Producto creado');
        load();
      }
    }
    setForm({ nombre: '', sku: '', precio: '', tela: '', corte: '', color_base: '#232323', descripcion: '' });
    setFotoFile(null);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({ nombre: p.nombre || '', precio: p.precio || '', tela: p.tela || '', corte: p.corte || '', descripcion: p.descripcion || '' });
  }

  async function saveEdit(id) {
    const payload = { nombre: editForm.nombre, precio: Number(editForm.precio), tela: editForm.tela, corte: editForm.corte, descripcion: editForm.descripcion };
    if (!isSupabaseConfigured) {
      const np = productos.map((p) => (p.id === id ? { ...p, ...payload } : p));
      setProductos(np); saveMock(np, variantes, pedidos);
      setMsg('Editado en modo maqueta');
    } else {
      const sb = getSupabase();
      const { error } = await sb.from('productos').update(payload).eq('id', id);
      setMsg(error ? error.message : 'Cambios guardados');
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

  if (!ok) {
    return (
      <div className="admin-wrap">
        <p className="kicker">Admin</p>
        <h2>Entrar al taller</h2>
        <form onSubmit={login} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input className="input" type="password" placeholder="Clave admin" value={key} onChange={(e) => setKey(e.target.value)} />
          <button className="btn-ink primary" type="submit">Entrar</button>
        </form>
        {msg && <p className="mode-note">{msg}</p>}
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
        <button className="btn-ink small" onClick={load}>Recargar</button>
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <h3>Nuevo producto</h3>
          <form onSubmit={crearProducto} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" placeholder="Nombre (Wave Club — negra)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <input className="input" placeholder="SKU 002" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
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
          <table className="table"><thead><tr><th>Foto</th><th>Nombre</th><th>Precio</th><th></th></tr></thead>
            <tbody>{productos.map((p) => (
              editingId === p.id ? (
              <tr key={p.id}>
                <td><span className="badge">{p.sku}</span></td>
                <td colSpan="2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input className="input" value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} placeholder="Nombre" />
                    <input className="input" type="number" step="0.01" value={editForm.precio} onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })} placeholder="Precio" />
                    <input className="input" value={editForm.tela} onChange={(e) => setEditForm({ ...editForm, tela: e.target.value })} placeholder="Tela" />
                    <input className="input" value={editForm.corte} onChange={(e) => setEditForm({ ...editForm, corte: e.target.value })} placeholder="Corte" />
                    <textarea className="input" rows="2" value={editForm.descripcion} onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })} placeholder="Descripción" />
                  </div>
                </td>
                <td><div className="admin-row"><button className="btn-ink primary small" onClick={() => saveEdit(p.id)}>guardar</button><button className="btn-ink small" onClick={() => setEditingId(null)}>x</button></div></td></tr>
              ) : (
              <tr key={p.id}>
                <td>
                  {(p.fotos || []).length > 0
                    ? <img src={p.fotos[0]} alt={p.nombre} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4, border: '1.5px solid #1c1a16' }} />
                    : <span className="badge">sin foto</span>}
                  <div style={{ marginTop: 4 }}>
                    <label className="btn-ink small" style={{ cursor: 'pointer' }}>{uploading ? '...' : '+ foto'}
                      <input type="file" accept="image/*" hidden onChange={(e) => agregarFoto(p.id, e.target.files?.[0])} />
                    </label>
                    {(p.fotos || []).length > 0 && <button className="btn-ink small" style={{ marginLeft: 4 }} onClick={() => quitarFoto(p.id, p.fotos[0])}>x</button>}
                  </div>
                </td>
                <td>{p.nombre}<br /><span className="badge">{p.sku}</span></td><td>$ {p.precio}</td>
                <td><div className="admin-row"><button className="btn-ink small" onClick={() => startEdit(p)}>editar</button><button className="btn-ink small" onClick={() => borrarProducto(p.id)}>borrar</button></div></td></tr>
              )
            ))}</tbody></table>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 16 }}>
        <h3>Stock por talla</h3>
        <table className="table"><thead><tr><th>Producto</th><th>Talla</th><th>Stock</th><th></th></tr></thead>
          <tbody>{variantes.map((v) => (
            <tr key={v.id}><td>{productos.find((p) => p.id === v.producto_id)?.nombre || v.producto_id}</td><td>{v.talla}</td><td>{v.stock}</td>
              <td><div className="admin-row"><button className="btn-ink small" onClick={() => cambiarStock(v.id, -1)}>-</button><button className="btn-ink small" onClick={() => cambiarStock(v.id, 1)}>+</button></div></td></tr>
          ))}</tbody></table>
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
