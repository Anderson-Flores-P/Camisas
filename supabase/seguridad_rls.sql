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
