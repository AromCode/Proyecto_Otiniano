-- =============================================================================
-- 001 · Base: tenancy (empresas, miembros), roles, helpers de seguridad
-- =============================================================================

-- gen_random_uuid() es nativo desde Postgres 13: no hace falta pgcrypto.

create type rol_miembro as enum ('dueno', 'socio', 'cajero', 'balancero');

create table empresas (
  id                     uuid primary key default gen_random_uuid(),
  razon_social           text not null check (length(trim(razon_social)) > 0),
  ruc                    text check (ruc is null or ruc ~ '^\d{11}$'),
  direccion              text,
  telefono               text,
  logo_url               text,
  moneda                 text not null default 'PEN',
  -- [CONFIRMAR] monto desde el cual el proveedor debe tener DNI/RUC. null = nunca obligatorio.
  monto_doc_obligatorio  numeric(14,2) check (monto_doc_obligatorio is null or monto_doc_obligatorio >= 0),
  -- [CONFIRMAR] roles que pueden cambiar el precio/kg en el mostrador (distinto al precio del día).
  roles_editan_precio    rol_miembro[] not null default '{dueno}',
  activo                 boolean not null default true,
  creado_en              timestamptz not null default now()
);

create table miembros (
  empresa_id  uuid not null references empresas(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  rol         rol_miembro not null,
  nombre      text,
  email       text,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  primary key (empresa_id, user_id)
);
create index on miembros (user_id);

-- -----------------------------------------------------------------------------
-- Helpers de seguridad (SECURITY DEFINER para no recursar en la RLS de miembros)
-- -----------------------------------------------------------------------------
create or replace function mi_rol(p_empresa uuid)
returns rol_miembro
language sql stable security definer set search_path = public
as $$
  select m.rol
    from miembros m
    join empresas e on e.id = m.empresa_id and e.activo
   where m.empresa_id = p_empresa and m.user_id = auth.uid() and m.activo
$$;

create or replace function es_miembro(p_empresa uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select mi_rol(p_empresa) is not null $$;

create or replace function tiene_rol(p_empresa uuid, p_roles rol_miembro[])
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(mi_rol(p_empresa) = any(p_roles), false) $$;

-- Lanza error si el usuario no tiene alguno de los roles indicados.
create or replace function exigir_rol(p_empresa uuid, p_roles rol_miembro[])
returns rol_miembro
language plpgsql stable security definer set search_path = public
as $$
declare v_rol rol_miembro;
begin
  v_rol := mi_rol(p_empresa);
  if v_rol is null then
    raise exception 'No pertenece a esta empresa.' using errcode = '42501';
  end if;
  if not (v_rol = any(p_roles)) then
    raise exception 'Su rol (%) no tiene permiso para esta operación.', v_rol using errcode = '42501';
  end if;
  return v_rol;
end $$;

-- -----------------------------------------------------------------------------
-- Correlativos por empresa (número de compra, venta, etc.)
-- -----------------------------------------------------------------------------
create table correlativos (
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo       text not null,
  ultimo     integer not null default 0,
  primary key (empresa_id, tipo)
);

create or replace function siguiente_numero(p_empresa uuid, p_tipo text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v integer;
begin
  insert into correlativos (empresa_id, tipo, ultimo) values (p_empresa, p_tipo, 1)
  on conflict (empresa_id, tipo) do update set ultimo = correlativos.ultimo + 1
  returning ultimo into v;
  return v;
end $$;

-- Periodo contable (YYYY-MM) en hora de Lima
create or replace function periodo_de(p timestamptz)
returns text
language sql stable
as $$ select to_char(p at time zone 'America/Lima', 'YYYY-MM') $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table empresas     enable row level security;
alter table miembros     enable row level security;
alter table correlativos enable row level security;

create policy empresas_select on empresas for select to authenticated
  using (es_miembro(id));
create policy empresas_update on empresas for update to authenticated
  using (tiene_rol(id, '{dueno}')) with check (tiene_rol(id, '{dueno}'));

create policy miembros_select on miembros for select to authenticated
  using (user_id = auth.uid() or es_miembro(empresa_id));
create policy miembros_update on miembros for update to authenticated
  using (tiene_rol(empresa_id, '{dueno}')) with check (tiene_rol(empresa_id, '{dueno}'));
-- Altas de miembros: por servidor con service_role (crea el usuario en Auth).

-- correlativos: sin políticas → solo accesible desde funciones SECURITY DEFINER.
