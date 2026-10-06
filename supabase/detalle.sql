-- Descripción larga para la página de detalle (correr 1 vez en SQL Editor)
alter table productos add column if not exists descripcion text default '';
