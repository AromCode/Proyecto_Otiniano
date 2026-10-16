-- =============================================================================
-- 002 · Tablas de negocio: maestros, operación, dinero, sociedad
-- Regla: toda tabla de negocio lleva empresa_id; montos numeric(14,2); pesos numeric(12,3)
-- =============================================================================

create type tipo_doc        as enum ('DNI', 'RUC', 'CE', 'SIN_DOC');
create type medio_pago      as enum ('efectivo', 'yape', 'plin', 'transferencia');
create type tipo_caja       as enum ('efectivo', 'banco', 'billetera');
create type estado_doc      as enum ('registrada', 'anulada');
create type estado_venta    as enum ('pendiente', 'confirmada', 'anulada');
create type tipo_mov_caja   as enum ('ingreso', 'egreso');
create type origen_mov_caja as enum ('compra', 'venta', 'gasto', 'aporte', 'retiro', 'traspaso', 'ajuste');
create type tipo_kardex     as enum ('compra', 'venta', 'ajuste');
create type tipo_ajuste     as enum ('conteo', 'merma', 'reclasificacion', 'otro');
create type tipo_aporte     as enum ('aporte', 'retiro');
create type estado_cierre   as enum ('cerrado', 'reabierto');

-- -----------------------------------------------------------------------------
-- Maestros
-- -----------------------------------------------------------------------------
create table metales (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  nombre         text not null check (length(trim(nombre)) > 0),
  unidad         text not null default 'kg',
  color          text,                       -- color de la etiqueta en la UI (hex)
  orden          integer not null default 0,
  precio_compra  numeric(14,2) not null default 0 check (precio_compra >= 0),
  precio_venta   numeric(14,2) not null default 0 check (precio_venta >= 0),
  activo         boolean not null default true,
  creado_por     uuid default auth.uid(),
  creado_en      timestamptz not null default now(),
  unique (empresa_id, nombre),
  unique (empresa_id, id)
);

create table precios_metal (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  metal_id       uuid not null references metales(id) on delete cascade,
  fecha          timestamptz not null default now(),
  precio_compra  numeric(14,2) not null,
  precio_venta   numeric(14,2) not null,
  creado_por     uuid default auth.uid()
);
create index on precios_metal (empresa_id, metal_id, fecha desc);

create table proveedores (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  tipo_doc      tipo_doc not null default 'DNI',
  nro_doc       text,
  nombre        text not null check (length(trim(nombre)) > 0),
  telefono      text,
  direccion     text,
  foto_doc_url  text,
  notas         text,
  activo        boolean not null default true,
  creado_por    uuid default auth.uid(),
  creado_en     timestamptz not null default now(),
  check ((tipo_doc = 'SIN_DOC') = (nro_doc is null)),
  check (tipo_doc <> 'DNI' or nro_doc ~ '^\d{8}$'),
  check (tipo_doc <> 'RUC' or nro_doc ~ '^\d{11}$')
);
create unique index proveedores_doc_uq on proveedores (empresa_id, tipo_doc, nro_doc) where nro_doc is not null;
create index on proveedores (empresa_id, nombre);

create table compradores (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  ruc           text check (ruc is null or ruc ~ '^\d{11}$'),
  razon_social  text not null check (length(trim(razon_social)) > 0),
  direccion     text,
  telefono      text,
  contacto      text,
  activo        boolean not null default true,
  creado_por    uuid default auth.uid(),
  creado_en     timestamptz not null default now()
);
create unique index compradores_ruc_uq on compradores (empresa_id, ruc) where ruc is not null;

create table cajas (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nombre      text not null,
  tipo        tipo_caja not null default 'efectivo',
  orden       integer not null default 0,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  unique (empresa_id, nombre)
);

create table categorias_gasto (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nombre      text not null,
  activo      boolean not null default true,
  unique (empresa_id, nombre)
);

-- -----------------------------------------------------------------------------
-- Inventario
-- -----------------------------------------------------------------------------
-- Saldo vigente por metal. Lo mantienen SOLO las funciones RPC (con bloqueo de fila).
-- costo_total con 4 decimales para que el promedio ponderado no pierda céntimos.
create table stock_metal (
  empresa_id   uuid not null references empresas(id) on delete cascade,
  metal_id     uuid not null references metales(id) on delete cascade,
  kg           numeric(12,3) not null default 0 check (kg >= 0),
  costo_total  numeric(16,4) not null default 0,
  actualizado  timestamptz not null default now(),
  primary key (metal_id)
);
create index on stock_metal (empresa_id);

-- Kardex: libro de entradas/salidas físicas. stock_metal = suma de filas no anuladas.
create table kardex (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  metal_id      uuid not null references metales(id),
  fecha         timestamptz not null,
  tipo          tipo_kardex not null,
  origen_tabla  text not null,     -- 'compras' | 'ventas' | 'ajustes_inventario' | 'anulacion'
  origen_id     uuid,
  kg            numeric(12,3) not null,
  costo_total   numeric(16,4) not null,
  anulado       boolean not null default false,
  creado_en     timestamptz not null default clock_timestamp()
);
create index on kardex (empresa_id, metal_id, fecha);
create index on kardex (origen_id);

-- -----------------------------------------------------------------------------
-- Compras
-- -----------------------------------------------------------------------------
create table compras (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas(id) on delete cascade,
  numero              integer not null,
  fecha               timestamptz not null default now(),
  proveedor_id        uuid references proveedores(id),   -- null = "sin documento / público"
  caja_id             uuid not null references cajas(id),
  medio_pago          medio_pago not null default 'efectivo',
  total               numeric(14,2) not null default 0 check (total >= 0),
  estado              estado_doc not null default 'registrada',
  foto_ticket_url     text,
  notas               text,
  clave_idempotencia  uuid,
  creado_por          uuid default auth.uid(),
  creado_en           timestamptz not null default now(),
  anulado_por         uuid,
  anulado_en          timestamptz,
  motivo_anulacion    text,
  unique (empresa_id, numero),
  unique (empresa_id, clave_idempotencia)
);
create index on compras (empresa_id, fecha desc);
create index on compras (proveedor_id);

create table compra_items (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  compra_id      uuid not null references compras(id) on delete cascade,
  metal_id       uuid not null references metales(id),
  peso_bruto_kg  numeric(12,3) not null check (peso_bruto_kg > 0),
  descuento_kg   numeric(12,3) not null default 0 check (descuento_kg >= 0),
  peso_neto_kg   numeric(12,3) generated always as (peso_bruto_kg - descuento_kg) stored,
  precio_kg      numeric(14,2) not null check (precio_kg >= 0),
  importe        numeric(14,2) generated always as (round((peso_bruto_kg - descuento_kg) * precio_kg, 2)) stored,
  check (peso_bruto_kg - descuento_kg > 0)
);
create index on compra_items (compra_id);
create index on compra_items (empresa_id, metal_id);

-- -----------------------------------------------------------------------------
-- Ventas (dos pasos: salida de nuestra balanza → confirmación del pesaje del comprador)
-- -----------------------------------------------------------------------------
create table ventas (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas(id) on delete cascade,
  numero              integer not null,
  fecha               timestamptz not null default now(),       -- fecha de salida
  fecha_confirmacion  timestamptz,                               -- fecha en que se reconoce el ingreso
  comprador_id        uuid not null references compradores(id),
  caja_id             uuid references cajas(id),
  medio_pago          medio_pago,
  total               numeric(14,2) not null default 0 check (total >= 0),
  estado              estado_venta not null default 'pendiente',
  guia_numero         text,
  guia_url            text,
  comprobante_url     text,
  notas               text,
  clave_idempotencia  uuid,
  creado_por          uuid default auth.uid(),
  creado_en           timestamptz not null default now(),
  confirmado_por      uuid,
  anulado_por         uuid,
  anulado_en          timestamptz,
  motivo_anulacion    text,
  unique (empresa_id, numero),
  unique (empresa_id, clave_idempotencia)
);
create index on ventas (empresa_id, fecha desc);

create table venta_items (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  venta_id          uuid not null references ventas(id) on delete cascade,
  metal_id          uuid not null references metales(id),
  peso_salida_kg    numeric(12,3) not null check (peso_salida_kg > 0),
  peso_recibido_kg  numeric(12,3) check (peso_recibido_kg >= 0),
  precio_kg         numeric(14,2) check (precio_kg >= 0),
  importe           numeric(14,2) generated always as (round(peso_recibido_kg * precio_kg, 2)) stored,
  merma_kg          numeric(12,3) generated always as (peso_salida_kg - peso_recibido_kg) stored,
  costo_kg          numeric(14,4) not null,     -- costo promedio al momento de la salida
  costo_total       numeric(16,4) not null,     -- costo de lo que salió
  costo_vendido     numeric(16,4),              -- parte del costo atribuible a lo recibido
  merma_costo       numeric(16,4)               -- costo_total − costo_vendido
);
create index on venta_items (venta_id);
create index on venta_items (empresa_id, metal_id);

create table ajustes_inventario (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references empresas(id) on delete cascade,
  metal_id     uuid not null references metales(id),
  fecha        timestamptz not null default now(),
  tipo         tipo_ajuste not null default 'conteo',
  kg           numeric(12,3) not null check (kg <> 0),
  costo_total  numeric(16,4) not null,
  motivo       text not null check (length(trim(motivo)) > 0),
  grupo_id     uuid,          -- une las dos patas de una reclasificación
  creado_por   uuid default auth.uid(),
  creado_en    timestamptz not null default now()
);
create index on ajustes_inventario (empresa_id, fecha desc);

-- -----------------------------------------------------------------------------
-- Dinero
-- -----------------------------------------------------------------------------
create table movimientos_caja (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresas(id) on delete cascade,
  caja_id          uuid not null references cajas(id),
  fecha            timestamptz not null default now(),
  tipo             tipo_mov_caja not null,
  origen           origen_mov_caja not null,
  origen_id        uuid,
  monto            numeric(14,2) not null check (monto > 0),
  concepto         text,
  comprobante_url  text,
  anulado          boolean not null default false,
  creado_por       uuid default auth.uid(),
  creado_en        timestamptz not null default clock_timestamp()
);
create index on movimientos_caja (empresa_id, caja_id, fecha);
create index on movimientos_caja (origen_id);

create table gastos (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  fecha             timestamptz not null default now(),
  categoria_id      uuid references categorias_gasto(id),
  monto             numeric(14,2) not null check (monto > 0),
  caja_id           uuid not null references cajas(id),
  concepto          text not null,
  comprobante_url   text,
  estado            estado_doc not null default 'registrada',
  creado_por        uuid default auth.uid(),
  creado_en         timestamptz not null default now(),
  anulado_por       uuid,
  anulado_en        timestamptz,
  motivo_anulacion  text
);
create index on gastos (empresa_id, fecha desc);

create table traspasos (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  fecha             timestamptz not null default now(),
  caja_origen_id    uuid not null references cajas(id),
  caja_destino_id   uuid not null references cajas(id),
  monto             numeric(14,2) not null check (monto > 0),
  concepto          text,
  estado            estado_doc not null default 'registrada',
  creado_por        uuid default auth.uid(),
  creado_en         timestamptz not null default now(),
  anulado_por       uuid,
  anulado_en        timestamptz,
  motivo_anulacion  text,
  check (caja_origen_id <> caja_destino_id)
);

create table arqueos (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references empresas(id) on delete cascade,
  caja_id        uuid not null references cajas(id),
  fecha          timestamptz not null default now(),
  saldo_sistema  numeric(14,2) not null,
  contado        numeric(14,2) not null check (contado >= 0),
  diferencia     numeric(14,2) generated always as (contado - saldo_sistema) stored,
  nota           text,
  creado_por     uuid default auth.uid()
);

-- -----------------------------------------------------------------------------
-- Sociedad
-- -----------------------------------------------------------------------------
create table socios (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nombre      text not null,
  dni         text check (dni is null or dni ~ '^\d{8}$'),
  porcentaje  numeric(5,2) not null default 0 check (porcentaje between 0 and 100),
  user_id     uuid references auth.users(id),
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table aportes_retiros (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  socio_id          uuid not null references socios(id),
  fecha             timestamptz not null default now(),
  tipo              tipo_aporte not null,
  monto             numeric(14,2) not null check (monto > 0),
  caja_id           uuid not null references cajas(id),
  nota              text,
  estado            estado_doc not null default 'registrada',
  creado_por        uuid default auth.uid(),
  creado_en         timestamptz not null default now(),
  anulado_por       uuid,
  anulado_en        timestamptz,
  motivo_anulacion  text
);

create table cierres_mes (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references empresas(id) on delete cascade,
  periodo            text not null check (periodo ~ '^\d{4}-\d{2}$'),
  estado             estado_cierre not null default 'cerrado',
  snapshot           jsonb not null,
  cerrado_por        uuid default auth.uid(),
  cerrado_en         timestamptz not null default now(),
  reabierto_por      uuid,
  reabierto_en       timestamptz,
  motivo_reapertura  text,
  unique (empresa_id, periodo)
);

-- -----------------------------------------------------------------------------
-- Bloqueo de periodos cerrados
-- -----------------------------------------------------------------------------
create or replace function periodo_cerrado(p_empresa uuid, p_fecha timestamptz)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from cierres_mes
     where empresa_id = p_empresa and periodo = periodo_de(p_fecha) and estado = 'cerrado'
  )
$$;

create or replace function trg_periodo_abierto()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and periodo_cerrado(old.empresa_id, old.fecha) then
    raise exception 'El periodo % está cerrado. El dueño debe reabrirlo para modificarlo.', periodo_de(old.fecha)
      using errcode = 'P0001';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and periodo_cerrado(new.empresa_id, new.fecha) then
    raise exception 'El periodo % está cerrado. El dueño debe reabrirlo para registrar movimientos.', periodo_de(new.fecha)
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['compras','ventas','ajustes_inventario','movimientos_caja','gastos',
                           'traspasos','aportes_retiros','kardex']
  loop
    execute format('create trigger %I before insert or update or delete on %I
                    for each row execute function trg_periodo_abierto()', t || '_periodo', t);
  end loop;
end $$;

-- Nada se borra: compras, ventas y movimientos se anulan.
create or replace function trg_no_borrar()
returns trigger language plpgsql as $$
begin
  raise exception 'Los registros de % no se borran; se anulan.', tg_table_name;
end $$;

do $$
declare t text;
begin
  foreach t in array array['compras','compra_items','ventas','venta_items','ajustes_inventario',
                           'movimientos_caja','gastos','traspasos','aportes_retiros','kardex','precios_metal']
  loop
    execute format('create trigger %I before delete on %I
                    for each row when (pg_trigger_depth() = 0) execute function trg_no_borrar()', t || '_no_borrar', t);
  end loop;
end $$;

-- Histórico de precios: cada cambio de precio en metales deja una fila
create or replace function trg_metal_precio_historico()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.precio_compra is distinct from old.precio_compra
     or new.precio_venta  is distinct from old.precio_venta then
    insert into precios_metal (empresa_id, metal_id, precio_compra, precio_venta, creado_por)
    values (new.empresa_id, new.id, new.precio_compra, new.precio_venta, auth.uid());
  end if;
  return new;
end $$;

create trigger metales_precio_historico after insert or update on metales
  for each row execute function trg_metal_precio_historico();
