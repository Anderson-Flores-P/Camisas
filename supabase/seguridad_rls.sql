-- Endurecimiento de políticas (fase 1) que NO rompe nada de lo que hoy funciona:
-- catálogo público, pedidos desde la tienda y el /admin actual (que escribe con la anon key).
-- Correr en Supabase > SQL Editor DESPUÉS de schema.sql, categorias_tabla.sql y storage.sql.
-- Idempotente. Lo que falta cerrar está en propuesta_rls_admin.sql (requiere cambiar el /admin).

-- pedidos: la tienda solo crea pedidos nuevos en estado 'anotado'; con la anon key nadie borra pedidos.
drop policy if exists "pub_write" on pedidos;
drop policy if exists "pedido_insert" on pedidos;
create policy "pedido_insert" on pedidos for insert
  with check (estado = 'anotado' and jsonb_typeof(items) = 'array');
-- /admin cambia el estado con la anon key: se mantiene hasta aplicar la fase 2.
drop policy if exists "pedido_update" on pedidos;
create policy "pedido_update" on pedidos for update using (true) with check (true);

-- storage: nadie puede sobrescribir ni borrar fotos con la anon key (ni /admin ni recomprimir lo usan).
drop policy if exists "anon update fotos" on storage.objects;
drop policy if exists "anon delete fotos" on storage.objects;
-- subida: solo .jpg (image/jpeg) en el bucket fotos, que es lo único que suben /admin y recomprimir.
drop policy if exists "anon upload fotos" on storage.objects;
create policy "anon upload fotos" on storage.objects for insert
  with check (bucket_id = 'fotos' and storage.extension(name) = 'jpg');
update storage.buckets set allowed_mime_types = array['image/jpeg'] where id = 'fotos';
