-- Bucket de fotos + permisos (pegar en Supabase > SQL Editor > Run)
-- Después de este archivo corre seguridad_rls.sql (quita update/delete anónimos de fotos)
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

drop policy if exists "pub read fotos" on storage.objects;
create policy "pub read fotos" on storage.objects
for select using (bucket_id = 'fotos');

drop policy if exists "anon upload fotos" on storage.objects;
create policy "anon upload fotos" on storage.objects
for insert with check (bucket_id = 'fotos');

drop policy if exists "anon update fotos" on storage.objects;
create policy "anon update fotos" on storage.objects
for update using (bucket_id = 'fotos');

drop policy if exists "anon delete fotos" on storage.objects;
create policy "anon delete fotos" on storage.objects
for delete using (bucket_id = 'fotos');
