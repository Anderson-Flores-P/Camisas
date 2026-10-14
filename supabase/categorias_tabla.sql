-- Categorías gestionadas desde /admin (sin texto libre para evitar duplicados)
-- Corre 1 vez en Supabase > SQL Editor > New query > Run.
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text unique not null,
  created_at timestamptz default now()
);

alter table categorias enable row level security;

drop policy if exists "pub_read" on categorias;
create policy "pub_read" on categorias for select using (true);
drop policy if exists "pub_write" on categorias;
create policy "pub_write" on categorias for all using (true) with check (true);

-- Asegura columnas en productos (por si no corriste categorias.sql)
alter table productos add column if not exists categoria text default 'General';
alter table productos add column if not exists mostrar_inicio boolean default true;

-- Migra categorías existentes desde productos (evita duplicados por mayúsculas/espacios)
insert into categorias (nombre)
select distinct trim(categoria) from productos
where trim(categoria) <> '' and categoria is not null
on conflict (nombre) do nothing;

-- Semillas iniciales si está vacío
insert into categorias (nombre) values
('Wave Club'), ('One Piece'), ('Naruto'), ('Pokemon'), ('Kimetsu no Yaiba')
on conflict (nombre) do nothing;
