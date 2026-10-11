-- Nuevas camisas — esquema Supabase
-- Pégalo en Supabase > SQL Editor > New query > Run

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  sku text,
  ubicacion text default '',
  precio numeric(10,2) not null default 59.90,
  tela text default 'Algodón 220g',
  corte text default 'Recto',
  estampado text default 'Serigrafía frente',
  color_base text default '#232323',
  fotos text[] default '{}',
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id) on delete cascade,
  talla text not null check (talla in ('S','M','L','XL')),
  color text default 'Único',
  stock int not null default 0,
  created_at timestamptz default now(),
  unique(producto_id, talla, color)
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  nombre_cliente text,
  whatsapp text,
  items jsonb not null default '[]',
  total numeric(10,2) default 0,
  estado text default 'anotado' check (estado in ('anotado','confirmado','impreso','entregado','cancelado')),
  created_at timestamptz default now()
);

-- Lectura pública para la tienda, escritura abierta en MVP
-- (luego lo cerramos con auth; por ahora para que funcione sin login)
alter table productos enable row level security;
alter table variantes enable row level security;
alter table pedidos enable row level security;

drop policy if exists "pub_read" on productos;
create policy "pub_read" on productos for select using (true);
drop policy if exists "pub_write" on productos;
create policy "pub_write" on productos for all using (true) with check (true);

drop policy if exists "pub_read" on variantes;
create policy "pub_read" on variantes for select using (true);
drop policy if exists "pub_write" on variantes;
create policy "pub_write" on variantes for all using (true) with check (true);

drop policy if exists "pub_read" on pedidos;
create policy "pub_read" on pedidos for select using (true);
drop policy if exists "pub_write" on pedidos;
create policy "pub_write" on pedidos for all using (true) with check (true);

-- Datos de ejemplo
insert into productos (nombre, sku, precio, tela, corte) values
('Wave Club — negra', 'SKU 001', 59.90, 'Algodón 220g', 'Recto / oversize leve')
on conflict do nothing;
