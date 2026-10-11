-- Migración completa: corre TODO este archivo 1 vez en
-- Supabase > SQL Editor > New query > Run.
-- Es idempotente: puedes correrlo aunque ya exista alguna columna.
alter table productos add column if not exists descripcion text default '';
alter table productos add column if not exists ubicacion text default '';
alter table productos add column if not exists fotos text[] default '{}';

-- Si PostgREST sigue diciendo "schema cache", corre también esto:
-- notify pgrst, 'reload schema';
