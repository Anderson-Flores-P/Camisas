-- PROPUESTA (fase 2) — NO CORRER TODAVÍA: rompe el /admin actual.
-- Hoy /admin escribe directo desde el navegador con la anon key; con esto la anon key
-- queda en solo-lectura del catálogo + crear pedidos. Antes hay que mover las escrituras del
-- admin a un lugar con privilegios (ver README de la propuesta en el reporte de parche):
--   Opción A: rutas /api/admin/* en el servidor que validan la cookie taller_admin y usan
--             SUPABASE_SERVICE_ROLE_KEY (solo servidor; service_role ignora RLS).
--   Opción B: login del admin con Supabase Auth y políticas "to authenticated" limitadas a
--             su email (bloque comentado al final).
-- Correr DESPUÉS de seguridad_rls.sql. Idempotente.

-- catálogo: lectura pública, sin escritura con la anon key
drop policy if exists "pub_write" on productos;
drop policy if exists "pub_write" on variantes;
drop policy if exists "pub_write" on categorias;

-- pedidos: la anon key solo puede crear (pedido_insert de la fase 1); no lee datos de clientes ni modifica
drop policy if exists "pub_read" on pedidos;
drop policy if exists "pedido_update" on pedidos;

-- Opción B (Supabase Auth). Cambia admin@ejemplo.com por el email del admin:
-- create policy "admin_all" on productos   for all to authenticated using ((auth.jwt() ->> 'email') = 'admin@ejemplo.com') with check ((auth.jwt() ->> 'email') = 'admin@ejemplo.com');
-- create policy "admin_all" on variantes   for all to authenticated using ((auth.jwt() ->> 'email') = 'admin@ejemplo.com') with check ((auth.jwt() ->> 'email') = 'admin@ejemplo.com');
-- create policy "admin_all" on categorias  for all to authenticated using ((auth.jwt() ->> 'email') = 'admin@ejemplo.com') with check ((auth.jwt() ->> 'email') = 'admin@ejemplo.com');
-- create policy "admin_read" on pedidos    for select to authenticated using ((auth.jwt() ->> 'email') = 'admin@ejemplo.com');
-- create policy "admin_upd"  on pedidos    for update to authenticated using ((auth.jwt() ->> 'email') = 'admin@ejemplo.com') with check (true);
-- create policy "admin upload fotos" on storage.objects for insert to authenticated with check (bucket_id = 'fotos' and storage.extension(name) = 'jpg' and (auth.jwt() ->> 'email') = 'admin@ejemplo.com');
