-- Categorías manuales + switch "Mostrar en inicio"
-- Corre 1 vez en Supabase > SQL Editor > New query > Run.
-- Idempotente: se puede correr aunque ya exista.
alter table productos add column if not exists categoria text default 'General';
alter table productos add column if not exists mostrar_inicio boolean default true;

-- Si PostgREST dice "schema cache", corre también:
-- notify pgrst, 'reload schema';
