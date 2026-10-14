'use client';
import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { mockCategorias } from '../../lib/mock';

const TALLAS = ['S', 'M', 'L', 'XL'];
const ESTADOS = ['anotado', 'confirmado', 'impreso', 'entregado', 'cancelado'];

export default function Admin() {
  const [ok, setOk] = useState(null); // null = verificando, false = login, true = dentro
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [productos, setProductos] = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [form, setForm] = useState({ nombre: '', ubicacion: '', categoria: '', precio: '', tela: '', corte: '', color_base: '#232323', descripcion: '', mostrar_inicio: true });
  const [fotoFile, setFotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState('');
  const [filtroCat, setFiltroCat] = useState('Todas');
  const [categorias, setCategorias] = useState(() => (isSupabaseConfigured ? [] : mockCategorias));
  const [nuevaCat, setNuevaCat] = useState('');

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
        setCategorias(db.categorias?.length ? db.categorias : mockCategorias);
      } else {
        setCategorias(mockCategorias);
      }
      return;
    }
    const sb = getSupabase();
    const [{ data: p }, { data: v }, { data: pe }, { data: cats }] = await Promise.all([
      sb.from('productos').select('*').order('created_at', { ascending: false }),
      sb.from('variantes').select('*'),
      sb.from('pedidos').select('*').order('created_at', { ascending: false }).limit(100),
      sb.from('categorias').select('*').order('nombre'),
    ]);
    setProductos(p || []);
    setVariantes(v || []);
    setPedidos(pe || []);
    setCategorias(cats || []);
  }

  function saveMock(np, nv, npe, ncats) {
    const prev = JSON.parse(localStorage.getItem('mock-db') || '{}');
    localStorage.setItem('mock-db', JSON.stringify({
      productos: np ?? prev.productos,
      variantes: nv ?? prev.variantes,
      pedidos: npe ?? prev.pedidos,
      categorias: ncats ?? prev.categorias ?? mockCategorias,
    }));
  }

  async function crearCategoria(e) {
    e?.preventDefault?.();
    const nombre = nuevaCat.trim();
    if (!nombre) return;
    if (categorias.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      setMsg(`La categoría "${nombre}" ya existe`);
      return;
    }
    if (!isSupabaseConfigured) {
      const nc = [...categorias, { id: 'c-' + Date.now(), nombre }];
      setCategorias(nc); saveMock(undefined, undefined, undefined, nc);
      setNuevaCat(''); setMsg(`Categoría "${nombre}" creada (maqueta)`);
      return;
    }
    const sb = getSupabase();
    const { error } = await sb.from('categorias').insert({ nombre });
    setMsg(error ? dbErrorMsg(error) : `Categoría "${nombre}" creada`);
    if (!error) { setNuevaCat(''); load(); }
  }

  async function borrarCategoria(id, nombre) {
    const enUso = productos.filter((p) => (p.categoria || 'General') === nombre).length;
    if (enUso > 0 && !confirm(`"${nombre}" tiene ${enUso} camisa(s). ¿Borrarla igual? Las camisas quedarán como General.`)) return;
    if (!isSupabaseConfigured) {
      const nc = categorias.filter((c) => c.id !== id);
      setCategorias(nc); saveMock(undefined, undefined, undefined, nc);
      return;
    }
    const sb = getSupabase();
    const { error } = await sb.from('categorias').delete().eq('id', id);
    setMsg(error ? dbErrorMsg(error) : 'Categoría borrada');
    if (!error) load();
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

  // Compras con celular pesan 3-5MB y el detalle las descarga enteras.
  // Se redimensiona a max 1200px JPEG 0.82 (~150-300KB, 10x más rápido).
  function comprimirImagen(file) {
    return new Promise((resolve) => {
      if (!file?.type?.startsWith('image/')) return resolve(file);
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1200;
        let { width: w, height: h } = img;
        if (w <= MAX && h <= MAX && file.size < 400 * 1024) return resolve(file);
        const ratio = Math.min(MAX / w, MAX / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function subirArchivo(file) {
    const sb = getSupabase();
    const comp = await comprimirImagen(file);
    const final = comp instanceof Blob && !(comp instanceof File)
      ? new File([comp], (file.name.split('.').shift() || 'foto') + '.jpg', { type: 'image/jpeg' })
      : comp;
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await sb.storage.from('fotos').upload(path, final, { upsert: false, contentType: 'image/jpeg' });
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
    const payload = { nombre: form.nombre, ubicacion: form.ubicacion, categoria: form.categoria || 'General', precio: Number(form.precio), tela: form.tela, corte: form.corte, color_base: form.color_base, descripcion: form.descripcion, fotos, activo: true, mostrar_inicio: form.mostrar_inicio !== false };
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
    setForm({ nombre: '', ubicacion: '', categoria: '', precio: '', tela: '', corte: '', color_base: '#232323', descripcion: '', mostrar_inicio: true });
    setFotoFile(null);
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({ nombre: p.nombre || '', ubicacion: p.ubicacion || p.sku || '', categoria: p.categoria || 'General', precio: p.precio || '', tela: p.tela || '', corte: p.corte || '', descripcion: p.descripcion || '', mostrar_inicio: p.mostrar_inicio !== false, activo: p.activo !== false });
  }

  async function saveEdit(id) {
    const payload = { nombre: editForm.nombre, ubicacion: editForm.ubicacion, categoria: editForm.categoria || 'General', precio: Number(editForm.precio), tela: editForm.tela, corte: editForm.corte, descripcion: editForm.descripcion, mostrar_inicio: editForm.mostrar_inicio !== false, activo: editForm.activo !== false };
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

  async function toggleCampo(id, campo, valorActual) {
    const nuevo = !valorActual;
    if (!isSupabaseConfigured) {
      const np = productos.map((p) => (p.id === id ? { ...p, [campo]: nuevo } : p));
      setProductos(np); saveMock(np, variantes, pedidos);
      setMsg(`${campo === 'mostrar_inicio' ? 'Visibilidad en inicio' : 'Estado'} actualizado (maqueta)`);
      return;
    }
    const sb = getSupabase();
    const { error } = await sb.from('productos').update({ [campo]: nuevo }).eq('id', id);
    setMsg(error ? dbErrorMsg(error) : 'Actualizado');
    if (!error) load();
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
            <label className="label" style={{ margin: 0 }}>Categoría — elige de la lista</label>
            <select className="select" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required>
              <option value="">— elegir categoría —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
            <input className="input" placeholder="Ubicación: ej. D:/fotos/wave o estante 2" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
            <input className="input" placeholder="Precio 59.90" type="number" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
            <input className="input" placeholder="Tela" value={form.tela} onChange={(e) => setForm({ ...form, tela: e.target.value })} />
            <input className="input" placeholder="Corte" value={form.corte} onChange={(e) => setForm({ ...form, corte: e.target.value })} />
            <textarea className="input" placeholder="Descripción larga (se ve en el detalle)" rows="3" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'Courier New, monospace', fontSize: '.82rem' }}>
              <input type="checkbox" checked={form.mostrar_inicio !== false} onChange={(e) => setForm({ ...form, mostrar_inicio: e.target.checked })} />
              Mostrar en inicio
            </label>
            <label className="label">Foto (frente) — JPG/PNG</label>
            <input className="input" type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files?.[0] || null)} />
            <button className="btn-ink primary" type="submit" disabled={uploading}>{uploading ? 'Subiendo...' : 'Crear'}</button>
          </form>
        </div>

        <div className="admin-card">
          <h3>Productos ({productos.length})</h3>
          <div className="admin-row" style={{ marginBottom: 8 }}>
            <label className="label" style={{ margin: 0 }}>Filtrar:</label>
            <select className="select" style={{ width: 'auto' }} value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)}>
              <option value="Todas">Todas ({productos.length})</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.nombre}>{c.nombre} ({productos.filter((p) => (p.categoria || 'General') === c.nombre).length})</option>
              ))}
            </select>
          </div>
          <div className="prod-list">
            {productos.length === 0 && <p className="small-note">Sin productos todavía. Crea el primero a la izquierda.</p>}
            {productos.filter((p) => filtroCat === 'Todas' || (p.categoria || 'General') === filtroCat).map((p) => (
              editingId === p.id ? (
                <div className="prod-edit" key={p.id}>
                  <p className="label">Editando — {p.nombre}</p>
                  <div className="edit-grid">
                    <label>Nombre<input className="input" value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} /></label>
                    <label>Precio<input className="input" type="number" step="0.01" value={editForm.precio} onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })} /></label>
                    <label>Categoría<select className="select" value={editForm.categoria || ''} onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}>
                      <option value="">— elegir —</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select></label>
                    <label>Ubicación<input className="input" value={editForm.ubicacion} onChange={(e) => setEditForm({ ...editForm, ubicacion: e.target.value })} placeholder="D:/fotos/... o estante 2" /></label>
                    <label>Tela<input className="input" value={editForm.tela} onChange={(e) => setEditForm({ ...editForm, tela: e.target.value })} /></label>
                    <label>Corte<input className="input" value={editForm.corte} onChange={(e) => setEditForm({ ...editForm, corte: e.target.value })} /></label>
                    <label className="span-2">Descripción<textarea className="input" rows="2" value={editForm.descripcion} onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })} /></label>
                    <label className="span-2" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={editForm.mostrar_inicio !== false} onChange={(e) => setEditForm({ ...editForm, mostrar_inicio: e.target.checked })} /> Mostrar en inicio
                    </label>
                    <label className="span-2" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={editForm.activo !== false} onChange={(e) => setEditForm({ ...editForm, activo: e.target.checked })} /> Activo (visible en tienda)
                    </label>
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
                    <span className="prod-sub">
                      <span className="badge">{p.categoria || 'General'}</span>{' '}
                      <span className={`badge ${p.mostrar_inicio === false ? 'off' : ''}`}>{p.mostrar_inicio === false ? 'oculto inicio' : 'en inicio'}</span>{' '}
                      {p.activo === false && <span className="badge off">inactivo</span>}
                    </span>
                  </div>
                  <div className="admin-row">
                    <button className="btn-ink small" onClick={() => toggleCampo(p.id, 'mostrar_inicio', p.mostrar_inicio !== false)} title="Mostrar / ocultar en pantalla principal">
                      {p.mostrar_inicio === false ? 'a inicio' : 'quitar'}
                    </button>
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
        <h3>Categorías ({categorias.length})</h3>
        <p className="small-note">Créalas aquí una vez. Luego solo eliges de la lista al crear camisas — sin escribir a mano.</p>
        <form onSubmit={crearCategoria} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input className="input" placeholder="Nueva categoría: ej. One Piece" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} />
          <button className="btn-ink primary small" type="submit" disabled={!nuevaCat.trim()}>Agregar</button>
        </form>
        <div className="stock-list">
          {categorias.map((c) => {
            const n = productos.filter((p) => (p.categoria || 'General') === c.nombre).length;
            return (
              <div className="stock-row" key={c.id}>
                <span className="stock-name">{c.nombre}</span>
                <span className="badge">{n} camisa(s)</span>
                <button className="btn-ink small" onClick={() => borrarCategoria(c.id, c.nombre)}>borrar</button>
              </div>
            );
          })}
          {categorias.length === 0 && <p className="small-note">Sin categorías — crea la primera arriba. Si usas Supabase, corre supabase/categorias_tabla.sql.</p>}
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
            <tr key={pe.id}>
              <td>{pe.nombre_cliente}<br />{pe.whatsapp ? <a href={`https://wa.me/${String(pe.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{pe.whatsapp}</a> : '—'}<br /><span className="badge">{pe.created_at ? new Date(pe.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span></td>
              <td>{(pe.items || []).map((it, i) => (
                <span className="order-item" key={i}>{it.cantidad > 1 ? `${it.cantidad}× ` : ''}{it.nombre || 'Camisa'}{it.talla ? ` · talla ${it.talla}` : ''}{it.color ? ` · ${it.color}` : ''}</span>
              ))}</td>
              <td>$ {pe.total}</td>
              <td><select className="select" value={pe.estado} onChange={(e) => cambiarEstado(pe.id, e.target.value)}>{ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}</select></td></tr>
          ))}</tbody></table>
      </div>
    </div>
  );
}
