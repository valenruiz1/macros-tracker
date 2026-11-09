create table comidas (
  id bigint generated always as identity primary key,
  fecha date not null,
  comida text not null,
  nombre text not null,
  gramos numeric default 0,
  kcal numeric default 0,
  prote numeric default 0,
  carbos numeric default 0,
  grasas numeric default 0,
  creado timestamptz default now()
);
create table dias (
  fecha date primary key,
  pasos integer default 0
);
-- Sin políticas: solo tu servidor (con la service key) puede leer y escribir.
alter table comidas enable row level security;
alter table dias enable row level security;
