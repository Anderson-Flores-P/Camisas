-- Ubicación física del producto (texto libre, solo se ve en /admin)
-- Correr 1 vez en Supabase > SQL Editor > Run
alter table productos add column if not exists ubicacion text default '';
