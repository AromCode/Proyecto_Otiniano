-- =============================================================================
-- Cambios de la reunión del 23/10 con el Sr. Otiniano
--  1. Roles: Gerencia (dueno) · Administración (administrador) · Almacén (cajero).
--  2. Productos en jerarquía libre (familia → producto → variante → …), cada nivel con
--     código, precio (minorista y mayorista) y stock.
--  3. Proveedor mayorista / minorista: precio sugerido según el tipo (no es un %).
--  4. Compras: merma opcional en kg al pesar; medios de pago editables; el operario no
--     corrige un ticket emitido: lo hace Gerencia o Administración y queda registrado.
--  5. Limpieza (antes «Despacho»): se vuelve a pesar; la merma se guarda en kg y en S/;
--     el material de otra clase pasa al stock de ese producto (traslado). % de merma.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Roles
-- -----------------------------------------------------------------------------
drop policy metales_insert on metales;
drop policy metales_update on metales;
create policy metales_insert on metales for insert to authenticated
  with check (tiene_rol(empresa_id, '{dueno,administrador}'));
create policy metales_update on metales for update to authenticated
  using (tiene_rol(empresa_id, '{dueno,administrador}')) with check (tiene_rol(empresa_id, '{dueno,administrador}'));

drop policy proveedores_insert on proveedores;
drop policy proveedores_update on proveedores;
create policy proveedores_insert on proveedores for insert to authenticated
  with check (tiene_rol(empresa_id, '{dueno,administrador,cajero,balancero}'));
create policy proveedores_update on proveedores for update to authenticated
  using (tiene_rol(empresa_id, '{dueno,administrador,cajero}')) with check (tiene_rol(empresa_id, '{dueno,administrador,cajero}'));

drop policy compradores_insert on compradores;
drop policy compradores_update on compradores;
create policy compradores_insert on compradores for insert to authenticated
  with check (tiene_rol(empresa_id, '{dueno,administrador,cajero}'));
create policy compradores_update on compradores for update to authenticated
  using (tiene_rol(empresa_id, '{dueno,administrador,cajero}')) with check (tiene_rol(empresa_id, '{dueno,administrador,cajero}'));

-- «El precio lo digita el operario; sale sugerido el del día». Configurable en Configuración.
alter table empresas alter column roles_editan_precio set default '{dueno,administrador,cajero,balancero}';
update empresas set roles_editan_precio = '{dueno,administrador,cajero,balancero}';

-- [CONFIRMAR] % de merma desde el cual una limpieza se marca para que Gerencia la revise
alter table empresas add column merma_alerta_pct numeric(5,2) not null default 5
  check (merma_alerta_pct between 0 and 100);

-- -----------------------------------------------------------------------------
-- 2. Productos en jerarquía (la tabla sigue llamándose «metales»)
-- -----------------------------------------------------------------------------
alter table metales
  add column padre_id uuid,
  add column codigo text,
  -- Precio de compra al mayorista (otro almacén que viene a vender). null = igual al minorista.
  add column precio_mayorista numeric(14,2) check (precio_mayorista is null or precio_mayorista >= 0);
alter table metales add constraint metales_padre_fk
  foreign key (empresa_id, padre_id) references metales (empresa_id, id);
create index on metales (padre_id);
-- El mismo nombre puede repetirse en ramas distintas («Sucio» en Cobre y en Aluminio)
alter table metales drop constraint metales_empresa_id_nombre_key;
create unique index metales_nombre_uq on metales
  (empresa_id, coalesce(padre_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(nombre));
create unique index metales_codigo_uq on metales (empresa_id, codigo) where codigo is not null;

create or replace function trg_metal_jerarquia()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.codigo := nullif(upper(trim(new.codigo)), '');
  if new.padre_id is not null then
    if new.padre_id = new.id then
      raise exception 'Un producto no puede estar dentro de sí mismo.';
    end if;
    if exists (
      with recursive a as (
        select id, padre_id from metales where id = new.padre_id
        union all
        select m.id, m.padre_id from metales m join a on m.id = a.padre_id)
      select 1 from a where a.id = new.id) then
      raise exception 'No se puede mover un producto dentro de sus propias variantes.';
    end if;
  end if;
  return new;
end $$;

create trigger metales_jerarquia before insert or update on metales
  for each row execute function trg_metal_jerarquia();

alter table precios_metal add column precio_mayorista numeric(14,2);

create or replace function trg_metal_precio_historico()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.precio_compra    is distinct from old.precio_compra
     or new.precio_venta     is distinct from old.precio_venta
     or new.precio_mayorista is distinct from old.precio_mayorista then
    insert into precios_metal (empresa_id, metal_id, precio_compra, precio_venta, precio_mayorista, creado_por)
    values (new.empresa_id, new.id, new.precio_compra, new.precio_venta, new.precio_mayorista, auth.uid());
  end if;
  return new;
end $$;

-- Árbol de productos: ruta («Cobre › Cable › Quemado»), nivel y clave para ordenar
create view v_productos with (security_invoker = on) as
with recursive t as (
  select m.id, 1 as nivel, m.nombre::text as ruta,
         lpad((m.orden + 100000)::text, 7, '0') || m.nombre as clave_orden,
         array[m.id] as ancestros, m.id as raiz_id
    from metales m
   where m.padre_id is null
  union all
  select h.id, t.nivel + 1, t.ruta || ' › ' || h.nombre,
         t.clave_orden || '/' || lpad((h.orden + 100000)::text, 7, '0') || h.nombre,
         t.ancestros || h.id, t.raiz_id
    from metales h join t on h.padre_id = t.id
)
select m.id, m.empresa_id, m.padre_id, m.codigo, m.nombre, m.color, m.orden, m.unidad, m.activo,
       m.precio_compra, m.precio_mayorista, m.precio_venta,
       t.nivel, t.ruta, t.clave_orden, t.ancestros, t.raiz_id,
       exists (select 1 from metales c where c.padre_id = m.id) as tiene_hijos
  from t join metales m on m.id = t.id;

-- Precio de compra sugerido según el tipo de proveedor
create or replace function _precio_sugerido(p_metal metales, p_clase text)
returns numeric
language sql immutable
as $$
  select case when p_clase = 'mayorista' then coalesce(p_metal.precio_mayorista, p_metal.precio_compra)
              else p_metal.precio_compra end
$$;

-- -----------------------------------------------------------------------------
-- 3. Proveedor mayorista / minorista
-- -----------------------------------------------------------------------------
alter table proveedores add column clase text not null default 'minorista'
  check (clase in ('minorista', 'mayorista'));

drop view v_proveedores_resumen;
create view v_proveedores_resumen with (security_invoker = on) as
select p.*,
       coalesce(x.n_compras, 0) as n_compras,
       coalesce(x.kg, 0)        as kg_total,
       coalesce(x.importe, 0)   as importe_total,
       x.ultima_compra
  from proveedores p
  left join lateral (
    select count(distinct co.id) as n_compras, sum(ci.peso_neto_kg) as kg, sum(ci.importe) as importe,
           max(co.fecha) as ultima_compra
      from compras co join compra_items ci on ci.compra_id = co.id
     where co.proveedor_id = p.id and co.estado = 'registrada'
  ) x on true;

-- -----------------------------------------------------------------------------
-- 4a. Medios de pago editables (cada uno con su tipo base y la caja que usa)
-- -----------------------------------------------------------------------------
create table medios_pago (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) > 0),
  tipo        medio_pago not null,
  caja_id     uuid references cajas(id),
  orden       integer not null default 0,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  unique (empresa_id, nombre)
);
alter table medios_pago enable row level security;
create policy medios_pago_select on medios_pago for select to authenticated using (es_miembro(empresa_id));
create policy medios_pago_insert on medios_pago for insert to authenticated with check (tiene_rol(empresa_id, '{dueno}'));
create policy medios_pago_update on medios_pago for update to authenticated
  using (tiene_rol(empresa_id, '{dueno}')) with check (tiene_rol(empresa_id, '{dueno}'));

create or replace function _sembrar_medios_pago(p_empresa uuid)
returns void
language sql security definer set search_path = public
as $$
  insert into medios_pago (empresa_id, nombre, tipo, caja_id, orden)
  select p_empresa, x.nombre, x.tipo::medio_pago,
         (select c.id from cajas c where c.empresa_id = p_empresa and c.tipo = x.caja::tipo_caja and c.activo
           order by c.orden limit 1),
         x.orden
    from (values ('Efectivo', 'efectivo', 'efectivo', 1), ('Yape', 'yape', 'billetera', 2),
                 ('Plin', 'plin', 'billetera', 3), ('Transferencia', 'transferencia', 'banco', 4))
         as x(nombre, tipo, caja, orden)
  on conflict (empresa_id, nombre) do nothing
$$;

select _sembrar_medios_pago(id) from empresas;

alter table compras add column medio_id uuid references medios_pago(id);
alter table ventas  add column medio_id uuid references medios_pago(id);

create or replace function _medio_pago(p_empresa uuid, p_medio uuid)
returns medios_pago
language plpgsql stable set search_path = public
as $$
declare m medios_pago;
begin
  select * into m from medios_pago where id = p_medio and empresa_id = p_empresa;
  if not found then raise exception 'Medio de pago no válido.'; end if;
  if not m.activo then raise exception 'El medio de pago % está desactivado.', m.nombre; end if;
  return m;
end $$;

create or replace function admin_crear_empresa(
  p_razon_social text, p_ruc text, p_email_dueno text, p_nombre_dueno text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_empresa uuid;
  v_user    uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(trim(p_email_dueno));
  if v_user is null then
    raise exception 'No existe el usuario %. Créelo primero en Authentication → Users.', p_email_dueno;
  end if;

  insert into empresas (razon_social, ruc) values (trim(p_razon_social), _texto(p_ruc))
  returning id into v_empresa;

  insert into miembros (empresa_id, user_id, rol, nombre, email)
  values (v_empresa, v_user, 'dueno', coalesce(_texto(p_nombre_dueno), split_part(p_email_dueno, '@', 1)), lower(trim(p_email_dueno)));

  insert into cajas (empresa_id, nombre, tipo, orden) values
    (v_empresa, 'Caja chica (efectivo)', 'efectivo', 1),
    (v_empresa, 'Banco', 'banco', 2),
    (v_empresa, 'Yape / Plin', 'billetera', 3);
  perform _sembrar_medios_pago(v_empresa);

  insert into categorias_gasto (empresa_id, nombre)
  select v_empresa, unnest(array['Alquiler', 'Luz y agua', 'Personal', 'Flete', 'Combustible',
                                 'Movilidad', 'Mantenimiento', 'Otros']);
  return v_empresa;
end $$;

-- -----------------------------------------------------------------------------
-- 4b. Corrección de tickets de compra (Gerencia o Administración)
-- -----------------------------------------------------------------------------
alter table compras
  add column corregido_en  timestamptz,
  add column corregido_por uuid;

create table correcciones_compra (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  compra_id   uuid not null references compras(id),
  fecha       timestamptz not null default now(),
  motivo      text not null,
  antes       jsonb not null,
  despues     jsonb not null,
  total_antes numeric(14,2) not null,
  total       numeric(14,2) not null,
  creado_por  uuid default auth.uid()
);
create index on correcciones_compra (compra_id);
alter table correcciones_compra enable row level security;
create policy correcciones_compra_select on correcciones_compra for select to authenticated using (es_miembro(empresa_id));

create view v_correcciones_compra with (security_invoker = on) as
select c.*, coalesce(m.nombre, m.email) as creado_por_nombre
  from correcciones_compra c
  left join miembros m on m.empresa_id = c.empresa_id and m.user_id = c.creado_por;

-- -----------------------------------------------------------------------------
-- 5. Limpieza: traslados a otro producto y % de merma
-- -----------------------------------------------------------------------------
alter table selecciones_compra
  add column kg_traslado numeric(12,3) not null default 0 check (kg_traslado >= 0),
  add column kg_compra   numeric(12,3);   -- kilos netos de la compra al limpiar (base del %)

create table limpieza_traslados (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  seleccion_id      uuid not null references selecciones_compra(id) on delete cascade,
  compra_item_id    uuid not null references compra_items(id),
  metal_origen_id   uuid not null references metales(id),
  metal_destino_id  uuid not null references metales(id),
  kg                numeric(12,3) not null check (kg > 0),
  costo_origen      numeric(14,2) not null,   -- kg × precio pagado en la compra
  costo_destino     numeric(14,2) not null,   -- valor con que entra al otro producto
  diferencia        numeric(14,2) generated always as (costo_origen - costo_destino) stored,
  check (metal_origen_id <> metal_destino_id)
);
create index on limpieza_traslados (seleccion_id);
create index on limpieza_traslados (compra_item_id);

alter table limpieza_traslados enable row level security;
do $$
declare t text;
begin
  foreach t in array array['medios_pago', 'correcciones_compra', 'limpieza_traslados'] loop
    execute format('create trigger %I before delete on %I
                    for each row when (pg_trigger_depth() = 0) execute function trg_no_borrar()', t || '_no_borrar', t);
  end loop;
end $$;
create policy limpieza_traslados_select on limpieza_traslados for select to authenticated using (es_miembro(empresa_id));
create trigger correcciones_compra_periodo before insert or update or delete on correcciones_compra
  for each row execute function trg_periodo_abierto();

-- -----------------------------------------------------------------------------
-- Internas de stock
-- -----------------------------------------------------------------------------
-- Cambia solo el costo del stock (kg 0 en el kardex). Negativo = pérdida si p_tipo = 'ajuste'.
create or replace function _stock_costo(
  p_empresa uuid, p_metal uuid, p_costo numeric, p_fecha timestamptz,
  p_tipo tipo_kardex, p_origen_tabla text, p_origen_id uuid)
returns void
language plpgsql set search_path = public
as $$
declare
  s        stock_metal;
  v_nombre text;
begin
  s := _stock_lock(p_empresa, p_metal);
  if s.costo_total + p_costo < 0 then
    select nombre into v_nombre from metales where id = p_metal;
    raise exception 'El costo del stock de % quedaría negativo. Registre un ajuste de inventario.', v_nombre
      using errcode = 'P0001';
  end if;
  update stock_metal set costo_total = costo_total + p_costo, actualizado = now() where metal_id = p_metal;
  insert into kardex (empresa_id, metal_id, fecha, tipo, origen_tabla, origen_id, kg, costo_total)
  values (p_empresa, p_metal, p_fecha, p_tipo, p_origen_tabla, p_origen_id, 0, p_costo);
end $$;

-- Diferencia de una línea de compra corregida (kilos y costo con signo)
create or replace function _stock_correccion(p_empresa uuid, p_metal uuid, p_kg numeric, p_costo numeric, p_compra uuid)
returns void
language plpgsql set search_path = public
as $$
declare
  s        stock_metal;
  v_kg     numeric(12,3);
  v_costo  numeric(16,4);
  v_nombre text;
begin
  s := _stock_lock(p_empresa, p_metal);
  select nombre into v_nombre from metales where id = p_metal;
  v_kg    := s.kg + p_kg;
  v_costo := s.costo_total + p_costo;
  if v_kg < 0 then
    raise exception 'No se puede corregir: de % ya salió parte (stock actual % kg).', v_nombre, s.kg using errcode = 'P0001';
  end if;
  insert into kardex (empresa_id, metal_id, fecha, tipo, origen_tabla, origen_id, kg, costo_total)
  values (p_empresa, p_metal, now(), 'compra', 'compras', p_compra, p_kg, p_costo);
  if v_kg = 0 and v_costo <> 0 then
    insert into kardex (empresa_id, metal_id, fecha, tipo, origen_tabla, origen_id, kg, costo_total)
    values (p_empresa, p_metal, now(), 'ajuste', 'correccion', p_compra, 0, -v_costo);
    v_costo := 0;
  elsif v_costo < 0 then
    raise exception 'No se puede corregir: el costo de % quedaría negativo porque ya hubo ventas. Registre un ajuste de inventario.',
      v_nombre using errcode = 'P0001';
  end if;
  update stock_metal set kg = v_kg, costo_total = v_costo, actualizado = now() where metal_id = p_metal;
end $$;

-- =============================================================================
-- COMPRAS
-- =============================================================================
drop function registrar_compra(uuid, jsonb, uuid, medio_pago, uuid, text, text, uuid, timestamptz, boolean);

-- p_items: [{ "metal_id": uuid, "peso_bruto_kg": "1000", "descuento_kg": "5", "precio_kg": "30" }]
--   descuento_kg = merma al pesar («te descuento 5 kg porque tengo que limpiarlo»): se paga el neto.
--   precio_kg vacío = precio del día según el tipo de proveedor (mayorista o minorista).
-- p_medio: medio de pago configurado; si no se indica caja, se usa la del medio.
create or replace function registrar_compra(
  p_empresa          uuid,
  p_items            jsonb,
  p_caja             uuid default null,
  p_medio_pago       medio_pago default 'efectivo',
  p_proveedor        uuid default null,
  p_notas            text default null,
  p_foto_ticket_url  text default null,
  p_clave            uuid default null,
  p_fecha            timestamptz default null,
  p_aplicar_saldo    boolean default false,
  p_medio            uuid default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rol      rol_miembro;
  v_emp      empresas;
  v_prov     proveedores;
  v_clase    text := 'minorista';
  v_medio    medios_pago;
  v_tipo     medio_pago := coalesce(p_medio_pago, 'efectivo');
  v_caja     uuid := p_caja;
  v_compra   compras;
  v_item     jsonb;
  v_metal    metales;
  v_ci       compra_items;
  v_bruto    numeric(12,3);
  v_desc     numeric(12,3);
  v_sug      numeric(14,2);
  v_precio   numeric(14,2);
  v_total    numeric(14,2) := 0;
  v_aplicado numeric(14,2) := 0;
  v_fecha    timestamptz;
begin
  v_rol := exigir_rol(p_empresa, '{dueno,administrador,cajero,balancero}');
  v_fecha := _fecha_operacion(v_rol, p_fecha);

  -- Idempotencia: si el celular reintenta, devolvemos la misma compra
  if p_clave is not null then
    select * into v_compra from compras where empresa_id = p_empresa and clave_idempotencia = p_clave;
    if found then
      return jsonb_build_object('id', v_compra.id, 'numero', v_compra.numero, 'total', v_compra.total,
                                'saldo_aplicado', v_compra.saldo_aplicado, 'repetida', true);
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agregue al menos un producto a la compra.';
  end if;

  select * into v_emp from empresas where id = p_empresa;
  if p_medio is not null then
    v_medio := _medio_pago(p_empresa, p_medio);
    v_tipo  := v_medio.tipo;
    v_caja  := coalesce(p_caja, v_medio.caja_id);
  end if;
  if v_caja is null then raise exception 'Elija la caja de la que sale el pago.'; end if;
  perform _validar_caja(p_empresa, v_caja);

  if p_proveedor is not null then
    -- Bloqueo del proveedor: dos compras simultáneas no aplican el mismo saldo a favor
    select * into v_prov from proveedores where id = p_proveedor and empresa_id = p_empresa for update;
    if not found then raise exception 'Proveedor no válido.'; end if;
    if not v_prov.activo then raise exception 'El proveedor % está desactivado.', v_prov.nombre; end if;
    v_clase := v_prov.clase;
  end if;

  insert into compras (empresa_id, numero, fecha, proveedor_id, caja_id, medio_pago, medio_id, notas,
                       foto_ticket_url, clave_idempotencia, creado_por)
  values (p_empresa, siguiente_numero(p_empresa, 'compra'), v_fecha, p_proveedor, v_caja, v_tipo, p_medio,
          _texto(p_notas), _texto(p_foto_ticket_url), p_clave, auth.uid())
  returning * into v_compra;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_metal from metales
     where id = (v_item->>'metal_id')::uuid and empresa_id = p_empresa;
    if not found then raise exception 'Producto no válido.'; end if;
    if not v_metal.activo then raise exception 'El producto % está desactivado.', v_metal.nombre; end if;

    v_sug    := _precio_sugerido(v_metal, v_clase);
    v_bruto  := round(coalesce(nullif(v_item->>'peso_bruto_kg', '')::numeric, 0), 3);
    v_desc   := round(coalesce(nullif(v_item->>'descuento_kg', '')::numeric, 0), 3);
    v_precio := round(coalesce(nullif(v_item->>'precio_kg', '')::numeric, v_sug), 2);

    if v_bruto <= 0 then
      raise exception 'El peso bruto de % debe ser mayor a cero.', v_metal.nombre;
    end if;
    if v_desc < 0 or v_desc >= v_bruto then
      raise exception 'La merma de % debe ser menor al peso bruto.', v_metal.nombre;
    end if;
    if v_precio < 0 then
      raise exception 'El precio de % no puede ser negativo.', v_metal.nombre;
    end if;
    if v_precio <> v_sug and not (v_rol = any(v_emp.roles_editan_precio)) then
      raise exception 'No tiene permiso para cambiar el precio de % (precio del día %: S/ %).',
        v_metal.nombre, v_clase, v_sug;
    end if;

    insert into compra_items (empresa_id, compra_id, metal_id, peso_bruto_kg, descuento_kg, precio_kg)
    values (p_empresa, v_compra.id, v_metal.id, v_bruto, v_desc, v_precio)
    returning * into v_ci;

    perform _stock_entrada(p_empresa, v_metal.id, v_ci.peso_neto_kg, v_ci.importe, v_fecha,
                           'compra', 'compras', v_compra.id);
    v_total := v_total + v_ci.importe;
  end loop;

  if v_total <= 0 then
    raise exception 'El total de la compra debe ser mayor a cero.';
  end if;

  if v_emp.monto_doc_obligatorio is not null and v_total >= v_emp.monto_doc_obligatorio
     and (p_proveedor is null or v_prov.tipo_doc = 'SIN_DOC') then
    raise exception 'Para compras desde S/ % se requiere el DNI o RUC del proveedor.', v_emp.monto_doc_obligatorio;
  end if;

  if p_aplicar_saldo and p_proveedor is not null then
    v_aplicado := greatest(0, least(_saldo_proveedor(p_proveedor), v_total));
  end if;

  update compras set total = v_total, saldo_aplicado = v_aplicado where id = v_compra.id;
  if v_total - v_aplicado > 0 then
    perform _mov_caja(p_empresa, v_caja, v_fecha, 'egreso', 'compra', v_compra.id, v_total - v_aplicado,
                      'Compra N° ' || v_compra.numero
                      || case when v_aplicado > 0 then ' (descuento a favor S/ ' || v_aplicado || ')' else '' end);
  end if;

  return jsonb_build_object('id', v_compra.id, 'numero', v_compra.numero, 'total', v_total,
                            'saldo_aplicado', v_aplicado, 'repetida', false);
end $$;

-- Corrige peso bruto, merma y precio de las líneas de una compra ya emitida.
-- p_items: [{ "item_id": uuid, "peso_bruto_kg": "…", "descuento_kg": "…", "precio_kg": "…" }]
-- Stock y caja se ajustan por la diferencia; queda quién, cuándo, por qué y el antes/después.
create or replace function corregir_compra(p_compra uuid, p_items jsonb, p_motivo text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v          compras;
  v_sel      selecciones_compra;
  it         record;
  v_dato     jsonb;
  v_bruto    numeric(12,3);
  v_desc     numeric(12,3);
  v_precio   numeric(14,2);
  v_nuevo    compra_items;
  v_antes    jsonb := '[]'::jsonb;
  v_despues  jsonb := '[]'::jsonb;
  v_total    numeric(14,2);
  v_aplicado numeric(14,2);
  v_dif      numeric(14,2);
begin
  select * into v from compras where id = p_compra for update;
  if not found then raise exception 'Compra no encontrada.'; end if;
  perform exigir_rol(v.empresa_id, '{dueno,administrador}');
  if v.estado = 'anulada' then raise exception 'La compra N° % está anulada.', v.numero; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la corrección.'; end if;

  select * into v_sel from selecciones_compra where compra_id = p_compra and estado = 'registrada';
  if found and (v_sel.kg > 0 or v_sel.kg_traslado > 0) then
    raise exception 'La compra N° % ya pasó por limpieza (N° %) con merma o traslados. Anule primero esa limpieza.',
      v.numero, v_sel.numero;
  end if;

  for it in
    select ci.*, m.nombre as metal_nombre
      from compra_items ci join metales m on m.id = ci.metal_id
     where ci.compra_id = p_compra
     order by ci.metal_id, ci.id
  loop
    select e.val into v_dato from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as e(val)
     where (e.val->>'item_id')::uuid = it.id
     limit 1;
    continue when v_dato is null;

    v_bruto  := round(coalesce(nullif(v_dato->>'peso_bruto_kg', '')::numeric, it.peso_bruto_kg), 3);
    v_desc   := round(coalesce(nullif(v_dato->>'descuento_kg', '')::numeric, it.descuento_kg), 3);
    v_precio := round(coalesce(nullif(v_dato->>'precio_kg', '')::numeric, it.precio_kg), 2);
    v_dato   := null;
    if v_bruto <= 0 then raise exception 'El peso bruto de % debe ser mayor a cero.', it.metal_nombre; end if;
    if v_desc < 0 or v_desc >= v_bruto then raise exception 'La merma de % debe ser menor al peso bruto.', it.metal_nombre; end if;
    if v_precio < 0 then raise exception 'El precio de % no puede ser negativo.', it.metal_nombre; end if;
    continue when v_bruto = it.peso_bruto_kg and v_desc = it.descuento_kg and v_precio = it.precio_kg;

    update compra_items set peso_bruto_kg = v_bruto, descuento_kg = v_desc, precio_kg = v_precio
     where id = it.id
    returning * into v_nuevo;
    perform _stock_correccion(v.empresa_id, it.metal_id, v_nuevo.peso_neto_kg - it.peso_neto_kg,
                              v_nuevo.importe - it.importe, p_compra);

    v_antes := v_antes || jsonb_build_object('item_id', it.id, 'producto', it.metal_nombre,
      'peso_bruto_kg', it.peso_bruto_kg, 'descuento_kg', it.descuento_kg, 'precio_kg', it.precio_kg, 'importe', it.importe);
    v_despues := v_despues || jsonb_build_object('item_id', it.id, 'producto', it.metal_nombre,
      'peso_bruto_kg', v_nuevo.peso_bruto_kg, 'descuento_kg', v_nuevo.descuento_kg, 'precio_kg', v_nuevo.precio_kg,
      'importe', v_nuevo.importe);
  end loop;

  if jsonb_array_length(v_despues) = 0 then raise exception 'No hay cambios que guardar.'; end if;

  select coalesce(sum(importe), 0) into v_total from compra_items where compra_id = p_compra;
  if v_total <= 0 then raise exception 'El total de la compra debe ser mayor a cero.'; end if;
  v_aplicado := least(v.saldo_aplicado, v_total);
  -- Lo que cambia el pago: más importe = sale más de caja; menos = el proveedor devuelve
  v_dif := (v_total - v_aplicado) - (v.total - v.saldo_aplicado);

  update compras
     set total = v_total, saldo_aplicado = v_aplicado, corregido_en = now(), corregido_por = auth.uid()
   where id = p_compra;

  if v_dif <> 0 then
    perform _mov_caja(v.empresa_id, v.caja_id, now(),
                      case when v_dif > 0 then 'egreso'::tipo_mov_caja else 'ingreso'::tipo_mov_caja end,
                      'compra', p_compra, abs(v_dif), 'Corrección de compra N° ' || v.numero);
  end if;

  insert into correcciones_compra (empresa_id, compra_id, motivo, antes, despues, total_antes, total, creado_por)
  values (v.empresa_id, p_compra, _texto(p_motivo), v_antes, v_despues, v.total, v_total, auth.uid());

  return jsonb_build_object('id', p_compra, 'numero', v.numero, 'total_antes', v.total, 'total', v_total,
                            'diferencia', v_dif);
end $$;

create or replace function actualizar_compra_adjuntos(p_compra uuid, p_foto_ticket_url text, p_notas text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v compras;
begin
  select * into v from compras where id = p_compra;
  if not found then raise exception 'Compra no encontrada.'; end if;
  perform exigir_rol(v.empresa_id, '{dueno,administrador,cajero,balancero}');
  update compras set foto_ticket_url = _texto(p_foto_ticket_url), notas = _texto(p_notas) where id = p_compra;
end $$;

-- =============================================================================
-- LIMPIEZA
-- =============================================================================
-- p_lineas: [{ "compra_item_id": uuid,
--              "kg_limpio": "940"          (peso al volver a pesar lo que queda del producto)
--              | "kg_merma": "6",          (o la merma directa, si no se repesa)
--              "traslados": [{ "metal_id": uuid, "kg": "54" }] }]   (otro material que salió)
-- Líneas que no vienen = conformes (sin merma). [] = toda la compra conforme.
-- Merma: sale del stock al precio pagado y va a resultados (kg y S/).
-- Traslado: los kilos pasan al otro producto; entran a su precio de compra del día si es menor
-- al pagado (la diferencia es pérdida y va a resultados) o al pagado si es mayor (sin ganancia ficticia).
create or replace function registrar_limpieza(p_compra uuid, p_lineas jsonb default '[]', p_motivo text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v         compras;
  v_sel     selecciones_compra;
  v_lin     jsonb;
  v_tr      jsonb;
  v_ci      compra_items;
  v_metal   metales;
  v_dest    metales;
  v_limpio  numeric(12,3);
  v_merma   numeric(12,3);
  v_tras    numeric(12,3);
  v_kg      numeric(12,3);
  v_si      seleccion_items;
  v_valor   numeric(14,2);
  v_co      numeric(14,2);
  v_cd      numeric(14,2);
  v_tmerma  numeric(12,3) := 0;
  v_timp    numeric(14,2) := 0;
  v_ttras   numeric(12,3) := 0;
  v_base    numeric(12,3);
  v_vistos  uuid[] := '{}';
begin
  select * into v from compras where id = p_compra for update;
  if not found then raise exception 'Compra no encontrada.'; end if;
  perform exigir_rol(v.empresa_id, '{dueno,administrador,cajero,balancero}');
  if v.estado <> 'registrada' then raise exception 'La compra N° % está anulada.', v.numero; end if;
  select * into v_sel from selecciones_compra where compra_id = p_compra and estado = 'registrada';
  if found then
    raise exception 'La compra N° % ya pasó por limpieza (N° %).', v.numero, v_sel.numero;
  end if;

  select coalesce(sum(peso_neto_kg), 0) into v_base from compra_items where compra_id = p_compra;

  insert into selecciones_compra (empresa_id, numero, compra_id, proveedor_id, fecha, cobrar, motivo, kg_compra, creado_por)
  values (v.empresa_id, siguiente_numero(v.empresa_id, 'seleccion'), p_compra, v.proveedor_id, now(), false,
          _texto(p_motivo), v_base, auth.uid())
  returning * into v_sel;

  for v_lin in select * from jsonb_array_elements(coalesce(p_lineas, '[]'::jsonb)) loop
    select * into v_ci from compra_items where id = (v_lin->>'compra_item_id')::uuid and compra_id = p_compra;
    if not found then raise exception 'Línea de compra no válida.'; end if;
    if v_ci.id = any(v_vistos) then raise exception 'Línea de compra repetida.'; end if;
    v_vistos := v_vistos || v_ci.id;
    select * into v_metal from metales where id = v_ci.metal_id;

    v_tras := 0;
    for v_tr in select * from jsonb_array_elements(coalesce(v_lin->'traslados', '[]'::jsonb)) loop
      v_kg := round(coalesce(nullif(v_tr->>'kg', '')::numeric, 0), 3);
      if v_kg < 0 then raise exception 'Los kilos separados de % no pueden ser negativos.', v_metal.nombre; end if;
      v_tras := v_tras + v_kg;
    end loop;

    if _texto(v_lin->>'kg_limpio') is not null then
      v_limpio := round((v_lin->>'kg_limpio')::numeric, 3);
      if v_limpio < 0 then raise exception 'El peso limpio de % no puede ser negativo.', v_metal.nombre; end if;
      v_merma := v_ci.peso_neto_kg - v_limpio - v_tras;
    else
      v_merma := round(coalesce(nullif(v_lin->>'kg_merma', '')::numeric, 0), 3);
    end if;
    if v_merma < 0 or v_merma + v_tras > v_ci.peso_neto_kg then
      raise exception 'En % lo limpio más lo separado supera lo comprado (% kg). Revise los pesos.',
        v_metal.nombre, v_ci.peso_neto_kg;
    end if;

    if v_merma > 0 then
      insert into seleccion_items (empresa_id, seleccion_id, compra_item_id, metal_id, kg, precio_kg)
      values (v.empresa_id, v_sel.id, v_ci.id, v_ci.metal_id, v_merma, v_ci.precio_kg)
      returning * into v_si;
      perform _stock_salida_costo(v.empresa_id, v_ci.metal_id, v_merma, v_si.importe, now(),
                                  'ajuste', 'selecciones_compra', v_sel.id);
      v_tmerma := v_tmerma + v_merma;
      v_timp   := v_timp + v_si.importe;
    end if;

    for v_tr in select * from jsonb_array_elements(coalesce(v_lin->'traslados', '[]'::jsonb)) loop
      v_kg := round(coalesce(nullif(v_tr->>'kg', '')::numeric, 0), 3);
      continue when v_kg = 0;
      select * into v_dest from metales where id = (v_tr->>'metal_id')::uuid and empresa_id = v.empresa_id;
      if not found then raise exception 'Producto de destino no válido.'; end if;
      if v_dest.id = v_ci.metal_id then
        raise exception 'El material separado de % debe ir a otro producto.', v_metal.nombre;
      end if;
      if not v_dest.activo then raise exception 'El producto % está desactivado.', v_dest.nombre; end if;

      v_valor := case when v_dest.precio_compra > 0 then least(v_ci.precio_kg, v_dest.precio_compra) else v_ci.precio_kg end;
      v_co := round(v_kg * v_ci.precio_kg, 2);
      v_cd := round(v_kg * v_valor, 2);
      if v_co > v_cd then
        perform _stock_costo(v.empresa_id, v_ci.metal_id, -(v_co - v_cd), now(), 'ajuste', 'selecciones_compra', v_sel.id);
      end if;
      perform _stock_salida_costo(v.empresa_id, v_ci.metal_id, v_kg, v_cd, now(), 'traslado', 'selecciones_compra', v_sel.id);
      perform _stock_entrada(v.empresa_id, v_dest.id, v_kg, v_cd, now(), 'traslado', 'selecciones_compra', v_sel.id);

      insert into limpieza_traslados (empresa_id, seleccion_id, compra_item_id, metal_origen_id, metal_destino_id,
                                      kg, costo_origen, costo_destino)
      values (v.empresa_id, v_sel.id, v_ci.id, v_ci.metal_id, v_dest.id, v_kg, v_co, v_cd);
      v_ttras := v_ttras + v_kg;
    end loop;
  end loop;

  update selecciones_compra set kg = v_tmerma, importe = v_timp, kg_traslado = v_ttras where id = v_sel.id;
  return jsonb_build_object('id', v_sel.id, 'numero', v_sel.numero, 'kg_merma', v_tmerma, 'importe_merma', v_timp,
                            'kg_traslado', v_ttras, 'kg_compra', v_base,
                            'pct_merma', case when v_base > 0 then round(v_tmerma * 100 / v_base, 2) end);
end $$;

-- Anular limpieza (Gerencia o Administración): kilos y costo vuelven como estaban
create or replace function anular_seleccion(p_seleccion uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_sel    selecciones_compra;
  k        kardex;
  s        stock_metal;
  v_nombre text;
begin
  select * into v_sel from selecciones_compra where id = p_seleccion for update;
  if not found then raise exception 'Limpieza no encontrada.'; end if;
  perform exigir_rol(v_sel.empresa_id, '{dueno,administrador}');
  if v_sel.estado = 'anulada' then raise exception 'La limpieza N° % ya está anulada.', v_sel.numero; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la anulación.'; end if;

  if v_sel.cobrar and v_sel.importe > 0 then
    perform 1 from proveedores where id = v_sel.proveedor_id for update;
    if _saldo_proveedor(v_sel.proveedor_id) < v_sel.importe then
      raise exception 'No se puede anular: parte de este descuento ya se cobró (en una compra o devolución).';
    end if;
  end if;

  for k in select * from kardex where origen_tabla = 'selecciones_compra' and origen_id = p_seleccion and not anulado
           order by metal_id, kg desc loop
    s := _stock_lock(v_sel.empresa_id, k.metal_id);
    if s.kg - k.kg < 0 or (s.kg - k.kg > 0 and s.costo_total - k.costo_total < 0) then
      select nombre into v_nombre from metales where id = k.metal_id;
      raise exception 'No se puede anular: de % ya salió parte de lo que se separó en la limpieza (stock actual % kg).',
        v_nombre, s.kg;
    end if;
    update stock_metal set kg = kg - k.kg, costo_total = costo_total - k.costo_total, actualizado = now()
     where metal_id = k.metal_id;
  end loop;
  update kardex set anulado = true where origen_tabla = 'selecciones_compra' and origen_id = p_seleccion;
  update selecciones_compra
     set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = _texto(p_motivo)
   where id = p_seleccion;
end $$;

-- =============================================================================
-- VENTAS (Administración también vende; medio de cobro configurable)
-- =============================================================================
drop function registrar_venta(uuid, uuid, jsonb, text, text, text, uuid, timestamptz, uuid, medio_pago, text);
drop function confirmar_venta(uuid, jsonb, uuid, medio_pago, text, timestamptz);

create or replace function confirmar_venta(
  p_venta            uuid,
  p_items            jsonb,
  p_caja             uuid default null,
  p_medio_pago       medio_pago default 'transferencia',
  p_comprobante_url  text default null,
  p_fecha            timestamptz default null,
  p_medio            uuid default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v          ventas;
  v_rol      rol_miembro;
  v_medio    medios_pago;
  v_tipo     medio_pago := coalesce(p_medio_pago, 'transferencia');
  v_caja     uuid := p_caja;
  it         record;
  v_dato     jsonb;
  v_recibido numeric(12,3);
  v_precio   numeric(14,2);
  v_vendido  numeric(16,4);
  v_total    numeric(14,2);
  v_fecha    timestamptz;
begin
  select * into v from ventas where id = p_venta for update;
  if not found then raise exception 'Venta no encontrada.'; end if;
  v_rol := exigir_rol(v.empresa_id, '{dueno,administrador,cajero}');
  if v.estado <> 'pendiente' then
    raise exception 'La venta N° % no está pendiente (estado: %).', v.numero, v.estado;
  end if;
  if p_medio is not null then
    v_medio := _medio_pago(v.empresa_id, p_medio);
    v_tipo  := v_medio.tipo;
    v_caja  := coalesce(p_caja, v_medio.caja_id);
  end if;
  if v_caja is null then raise exception 'Elija la caja a la que entra el cobro.'; end if;
  perform _validar_caja(v.empresa_id, v_caja);
  v_fecha := _fecha_operacion(v_rol, p_fecha);

  for it in
    select vi.*, m.nombre as metal_nombre
      from venta_items vi join metales m on m.id = vi.metal_id
     where vi.venta_id = p_venta
  loop
    select e.val into v_dato from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as e(val)
     where (e.val->>'item_id')::uuid = it.id
     limit 1;
    if v_dato is null or _texto(v_dato->>'peso_recibido_kg') is null or _texto(v_dato->>'precio_kg') is null then
      raise exception 'Falta el peso recibido o el precio de %.', it.metal_nombre;
    end if;
    v_recibido := round((v_dato->>'peso_recibido_kg')::numeric, 3);
    v_precio   := round((v_dato->>'precio_kg')::numeric, 2);
    if v_recibido < 0 or v_precio < 0 then
      raise exception 'Peso recibido y precio de % no pueden ser negativos.', it.metal_nombre;
    end if;
    if v_recibido > round(it.peso_salida_kg * 1.02, 3) then
      raise exception 'El peso recibido de % (% kg) es mayor a lo que salió (% kg). Revise el dato.',
        it.metal_nombre, v_recibido, it.peso_salida_kg;
    end if;
    v_vendido := round(it.costo_total * v_recibido / it.peso_salida_kg, 2);

    update venta_items
       set peso_recibido_kg = v_recibido,
           precio_kg        = v_precio,
           costo_vendido    = v_vendido,
           merma_costo      = it.costo_total - v_vendido
     where id = it.id;
    v_dato := null;
  end loop;

  select coalesce(sum(importe), 0) into v_total from venta_items where venta_id = p_venta;

  update ventas
     set total = v_total, caja_id = v_caja, medio_pago = v_tipo, medio_id = p_medio, estado = 'confirmada',
         fecha_confirmacion = v_fecha, confirmado_por = auth.uid(),
         comprobante_url = coalesce(_texto(p_comprobante_url), comprobante_url)
   where id = p_venta;

  if v_total > 0 then
    perform _mov_caja(v.empresa_id, v_caja, v_fecha, 'ingreso', 'venta', p_venta, v_total,
                      'Venta N° ' || v.numero);
  end if;

  return jsonb_build_object('id', p_venta, 'numero', v.numero, 'total', v_total);
end $$;

create or replace function registrar_venta(
  p_empresa          uuid,
  p_comprador        uuid,
  p_items            jsonb,
  p_guia_numero      text default null,
  p_guia_url         text default null,
  p_notas            text default null,
  p_clave            uuid default null,
  p_fecha            timestamptz default null,
  p_caja             uuid default null,
  p_medio_pago       medio_pago default null,
  p_comprobante_url  text default null,
  p_medio            uuid default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rol       rol_miembro;
  v_venta     ventas;
  v_comp      compradores;
  v_item      jsonb;
  v_metal     metales;
  v_salida    numeric(12,3);
  v_costo     numeric(16,4);
  v_item_id   uuid;
  v_fecha     timestamptz;
  v_conf      jsonb := '[]'::jsonb;
  v_completa  boolean := true;
begin
  v_rol := exigir_rol(p_empresa, '{dueno,administrador,cajero}');
  v_fecha := _fecha_operacion(v_rol, p_fecha);

  if p_clave is not null then
    select * into v_venta from ventas where empresa_id = p_empresa and clave_idempotencia = p_clave;
    if found then
      return jsonb_build_object('id', v_venta.id, 'numero', v_venta.numero, 'estado', v_venta.estado, 'repetida', true);
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agregue al menos un producto a la venta.';
  end if;

  select * into v_comp from compradores where id = p_comprador and empresa_id = p_empresa;
  if not found then raise exception 'Comprador no válido.'; end if;
  if not v_comp.activo then raise exception 'El comprador % está desactivado.', v_comp.razon_social; end if;

  insert into ventas (empresa_id, numero, fecha, comprador_id, guia_numero, guia_url, notas,
                      clave_idempotencia, creado_por)
  values (p_empresa, siguiente_numero(p_empresa, 'venta'), v_fecha, p_comprador, _texto(p_guia_numero),
          _texto(p_guia_url), _texto(p_notas), p_clave, auth.uid())
  returning * into v_venta;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_metal from metales
     where id = (v_item->>'metal_id')::uuid and empresa_id = p_empresa;
    if not found then raise exception 'Producto no válido.'; end if;

    v_salida := round(coalesce(nullif(v_item->>'peso_salida_kg', '')::numeric, 0), 3);
    if v_salida <= 0 then
      raise exception 'El peso de salida de % debe ser mayor a cero.', v_metal.nombre;
    end if;

    -- La BD bloquea vender más que el stock (mensaje claro en _stock_salida)
    v_costo := _stock_salida(p_empresa, v_metal.id, v_salida, v_fecha, 'venta', 'ventas', v_venta.id);

    insert into venta_items (empresa_id, venta_id, metal_id, peso_salida_kg, costo_kg, costo_total)
    values (p_empresa, v_venta.id, v_metal.id, v_salida, round(v_costo / v_salida, 4), v_costo)
    returning id into v_item_id;

    if _texto(v_item->>'peso_recibido_kg') is not null and _texto(v_item->>'precio_kg') is not null then
      v_conf := v_conf || jsonb_build_object('item_id', v_item_id,
                                             'peso_recibido_kg', v_item->>'peso_recibido_kg',
                                             'precio_kg', v_item->>'precio_kg');
    else
      v_completa := false;
    end if;
  end loop;

  if v_completa and (p_caja is not null or p_medio is not null) then
    perform confirmar_venta(v_venta.id, v_conf, p_caja, coalesce(p_medio_pago, 'transferencia'),
                            p_comprobante_url, v_fecha, p_medio);
    v_venta.estado := 'confirmada';
  end if;

  return jsonb_build_object('id', v_venta.id, 'numero', v_venta.numero, 'estado', v_venta.estado, 'repetida', false);
end $$;

create or replace function actualizar_venta_guia(
  p_venta uuid, p_guia_numero text, p_guia_url text, p_comprobante_url text, p_notas text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v ventas;
begin
  select * into v from ventas where id = p_venta;
  if not found then raise exception 'Venta no encontrada.'; end if;
  perform exigir_rol(v.empresa_id, '{dueno,administrador,cajero}');
  update ventas
     set guia_numero = _texto(p_guia_numero), guia_url = _texto(p_guia_url),
         comprobante_url = _texto(p_comprobante_url), notas = _texto(p_notas)
   where id = p_venta;
end $$;

-- =============================================================================
-- VISTAS
-- =============================================================================
-- Compras: + tipo de proveedor, medio de pago, merma al pesar y % de merma en limpieza
drop view v_compras;
create view v_compras with (security_invoker = on) as
select co.*,
       periodo_de(co.fecha) as periodo,
       p.nombre   as proveedor_nombre,
       p.tipo_doc as proveedor_tipo_doc,
       p.nro_doc  as proveedor_nro_doc,
       p.clase    as proveedor_clase,
       ca.nombre  as caja_nombre,
       coalesce(mp.nombre, initcap(co.medio_pago::text)) as medio_nombre,
       i.kg_total, i.kg_bruto, i.kg_merma_compra, i.metales, i.metal_ids,
       case when i.kg_total > 0 then round(co.total / i.kg_total, 4) end as precio_promedio,
       s.id as seleccion_id, s.numero as seleccion_numero, s.kg as seleccion_kg, s.importe as seleccion_importe,
       s.kg_traslado as seleccion_traslado_kg,
       case when s.id is not null and i.kg_total > 0 then round(s.kg * 100 / i.kg_total, 2) end as merma_pct,
       coalesce(s.id is not null and i.kg_total > 0 and s.kg * 100 / i.kg_total > e.merma_alerta_pct, false) as merma_alta,
       co.estado = 'registrada' and s.id is null as por_seleccionar,
       co.estado = 'registrada' and s.id is null
         and (now() at time zone 'America/Lima')::date - (co.fecha at time zone 'America/Lima')::date > e.dias_seleccion as retrasada
  from compras co
  join empresas e on e.id = co.empresa_id
  left join proveedores p on p.id = co.proveedor_id
  join cajas ca on ca.id = co.caja_id
  left join medios_pago mp on mp.id = co.medio_id
  left join selecciones_compra s on s.compra_id = co.id and s.estado = 'registrada'
  left join lateral (
    select coalesce(sum(ci.peso_neto_kg), 0)  as kg_total,
           coalesce(sum(ci.peso_bruto_kg), 0) as kg_bruto,
           coalesce(sum(ci.descuento_kg), 0)  as kg_merma_compra,
           string_agg(distinct m.nombre, ', ') as metales,
           array_agg(distinct ci.metal_id)     as metal_ids
      from compra_items ci join metales m on m.id = ci.metal_id
     where ci.compra_id = co.id
  ) i on true;

drop view v_ventas;
create view v_ventas with (security_invoker = on) as
select ve.*,
       periodo_de(coalesce(ve.fecha_confirmacion, ve.fecha)) as periodo,
       cp.razon_social as comprador_nombre,
       cp.ruc          as comprador_ruc,
       ca.nombre       as caja_nombre,
       case when ve.medio_pago is null then null
            else coalesce(mp.nombre, initcap(ve.medio_pago::text)) end as medio_nombre,
       i.kg_salida, i.kg_recibido, i.merma_kg, i.merma_costo, i.costo_total, i.costo_vendido,
       i.metales, i.metal_ids,
       case when i.kg_recibido > 0 then round(ve.total / i.kg_recibido, 4) end as precio_promedio
  from ventas ve
  join compradores cp on cp.id = ve.comprador_id
  left join cajas ca on ca.id = ve.caja_id
  left join medios_pago mp on mp.id = ve.medio_id
  left join lateral (
    select coalesce(sum(vi.peso_salida_kg), 0)      as kg_salida,
           sum(vi.peso_recibido_kg)                 as kg_recibido,
           sum(vi.merma_kg)                         as merma_kg,
           round(sum(vi.merma_costo), 2)            as merma_costo,
           round(sum(vi.costo_total), 2)            as costo_total,
           round(sum(vi.costo_vendido), 2)          as costo_vendido,
           string_agg(distinct m.nombre, ', ')      as metales,
           array_agg(distinct vi.metal_id)          as metal_ids
      from venta_items vi join metales m on m.id = vi.metal_id
     where vi.venta_id = ve.id
  ) i on true;

-- Limpiezas con su compra, % de merma y detalle de lo separado
drop view v_selecciones;
create view v_selecciones with (security_invoker = on) as
select s.*, co.numero as compra_numero, co.fecha as compra_fecha, co.total as compra_total,
       pr.nombre as proveedor_nombre,
       b.kg_base,
       case when b.kg_base > 0 then round(s.kg * 100 / b.kg_base, 2) end as merma_pct,
       coalesce(b.kg_base > 0 and s.kg * 100 / b.kg_base > e.merma_alerta_pct, false) as merma_alta,
       (select string_agg(m.nombre || ' ' || si.kg || ' kg', ', ' order by m.orden, m.nombre)
          from seleccion_items si join metales m on m.id = si.metal_id where si.seleccion_id = s.id) as detalle,
       (select string_agg(mo.nombre || ' → ' || md.nombre || ' ' || t.kg || ' kg', ', ' order by mo.nombre, md.nombre)
          from limpieza_traslados t
          join metales mo on mo.id = t.metal_origen_id
          join metales md on md.id = t.metal_destino_id
         where t.seleccion_id = s.id) as detalle_traslado
  from selecciones_compra s
  join empresas e on e.id = s.empresa_id
  join compras co on co.id = s.compra_id
  left join proveedores pr on pr.id = s.proveedor_id
  cross join lateral (
    select coalesce(s.kg_compra, (select sum(ci.peso_neto_kg) from compra_items ci where ci.compra_id = s.compra_id)) as kg_base) b;

-- Lotes por fecha de llegada: lo separado en la limpieza también es un lote del producto destino
drop view v_lotes;
create view v_lotes with (security_invoker = on) as
with li as (
  select ci.id as compra_item_id, ci.empresa_id, ci.metal_id, co.id as compra_id, co.numero, co.fecha,
         co.proveedor_id, pr.nombre as proveedor_nombre,
         ci.peso_bruto_kg, ci.peso_neto_kg, ci.precio_kg, ci.importe,
         s.id as seleccion_id, s.numero as seleccion_numero, s.fecha as fecha_seleccion,
         coalesce(sd.kg, 0) as kg_descuento,
         coalesce(tr.kg, 0) as kg_traslado,
         ci.peso_neto_kg - coalesce(sd.kg, 0) - coalesce(tr.kg, 0) as kg_ingresado,
         false as es_traslado
    from compra_items ci
    join compras co on co.id = ci.compra_id and co.estado = 'registrada'
    left join proveedores pr on pr.id = co.proveedor_id
    left join selecciones_compra s on s.compra_id = co.id and s.estado = 'registrada'
    left join lateral (select sum(x.kg) as kg from seleccion_items x
                        where x.compra_item_id = ci.id and x.seleccion_id = s.id) sd on true
    left join lateral (select sum(t.kg) as kg from limpieza_traslados t
                        where t.compra_item_id = ci.id and t.seleccion_id = s.id) tr on true
  union all
  select t.id, t.empresa_id, t.metal_destino_id, co.id, co.numero, co.fecha,
         co.proveedor_id, pr.nombre,
         t.kg, t.kg, round(t.costo_destino / t.kg, 2), t.costo_destino,
         s.id, s.numero, s.fecha,
         0, 0, t.kg, true
    from limpieza_traslados t
    join selecciones_compra s on s.id = t.seleccion_id and s.estado = 'registrada'
    join compras co on co.id = s.compra_id and co.estado = 'registrada'
    left join proveedores pr on pr.id = co.proveedor_id),
acum as (
  select li.*,
         coalesce(sum(li.kg_ingresado) over (partition by li.metal_id order by li.fecha desc, li.numero desc, li.es_traslado
                                             rows between unbounded preceding and 1 preceding), 0) as mas_nuevo
    from li)
select a.*, m.nombre as metal_nombre, m.color as metal_color,
       greatest(0, least(a.kg_ingresado, coalesce(st.kg, 0) - a.mas_nuevo)) as kg_en_stock,
       (now() at time zone 'America/Lima')::date - (a.fecha at time zone 'America/Lima')::date as dias,
       a.seleccion_id is null as por_seleccionar,
       a.seleccion_id is null
         and (now() at time zone 'America/Lima')::date - (a.fecha at time zone 'America/Lima')::date > e.dias_seleccion as retrasado
  from acum a
  join metales m on m.id = a.metal_id
  join empresas e on e.id = a.empresa_id
  left join stock_metal st on st.metal_id = a.metal_id;

-- Stock por producto: + datos de la jerarquía (columnas nuevas al final)
create or replace view v_stock_metal with (security_invoker = on) as
select m.empresa_id,
       m.id                                   as metal_id,
       m.nombre, m.color, m.orden, m.activo, m.unidad,
       coalesce(s.kg, 0)                      as kg,
       coalesce(s.costo_total, 0)             as costo_total,
       case when coalesce(s.kg, 0) > 0 then round(s.costo_total / s.kg, 4) end as costo_promedio,
       round(coalesce(s.costo_total, 0), 2)   as valor_costo,
       m.precio_compra, m.precio_venta,
       round(coalesce(s.kg, 0) * m.precio_venta, 2) as valor_venta,
       m.padre_id, m.codigo, m.precio_mayorista,
       p.ruta, p.nivel, p.clave_orden, p.tiene_hijos
  from metales m
  left join stock_metal s on s.metal_id = m.id
  left join v_productos p on p.id = m.id;

-- Stock por cada nivel de la jerarquía: el nivel suma lo propio y lo de todas sus variantes
create view v_stock_arbol with (security_invoker = on) as
with d as (
  select p.id, p.ancestros, p.precio_venta, coalesce(s.kg, 0) as kg, coalesce(s.costo_total, 0) as costo
    from v_productos p left join stock_metal s on s.metal_id = p.id),
l as (
  select metal_id,
         min(fecha) filter (where kg_en_stock > 0)              as llegada,
         coalesce(sum(kg_en_stock) filter (where por_seleccionar), 0) as por_limpiar,
         bool_or(retrasado and kg_en_stock > 0)                 as retrasado
    from v_lotes group by metal_id)
select p.empresa_id, p.id as metal_id, p.padre_id, p.codigo, p.nombre, p.color, p.orden, p.activo,
       p.nivel, p.ruta, p.clave_orden, p.tiene_hijos,
       p.precio_compra, p.precio_mayorista, p.precio_venta,
       coalesce(sp.kg, 0) as kg_propio,
       x.kg, x.costo_total,
       round(x.costo_total, 2) as valor_costo,
       case when x.kg > 0 then round(x.costo_total / x.kg, 4) end as costo_promedio,
       x.valor_venta,
       y.llegada_antigua, y.kg_por_limpiar, coalesce(y.retrasado, false) as retrasado
  from v_productos p
  left join stock_metal sp on sp.metal_id = p.id
  cross join lateral (
    select coalesce(sum(d.kg), 0) as kg, coalesce(sum(d.costo), 0) as costo_total,
           round(coalesce(sum(d.kg * d.precio_venta), 0), 2) as valor_venta
      from d where p.id = any(d.ancestros)) x
  cross join lateral (
    select min(l.llegada) as llegada_antigua, coalesce(sum(l.por_limpiar), 0) as kg_por_limpiar, bool_or(l.retrasado) as retrasado
      from l join d on d.id = l.metal_id where p.id = any(d.ancestros)) y;

-- Kardex: textos de limpieza, traslados y correcciones
create or replace view v_kardex with (security_invoker = on) as
select k.*,
       m.nombre as metal_nombre,
       case k.origen_tabla
         when 'compras' then 'Compra N° ' || co.numero || coalesce(' · ' || pr.nombre, '')
                             || case when k.fecha <> co.fecha then ' (corrección)' else '' end
         when 'ventas'  then 'Venta N° '  || ve.numero || coalesce(' · ' || cp.razon_social, '')
         when 'ajustes_inventario' then initcap(a.tipo::text) || ': ' || a.motivo
         when 'selecciones_compra' then
           case when sc.cobrar then
             case when k.kg = 0 then 'Ajuste de costo · ' else '' end
             || 'Selección N° ' || sc.numero || ' (compra N° ' || cs.numero || ')'
             || ' · descuento a ' || coalesce(ps.nombre, 'proveedor') || coalesce(': ' || sc.motivo, '')
           else
             'Limpieza N° ' || sc.numero || ' (compra N° ' || cs.numero || ')'
             || case when k.tipo = 'traslado' and k.kg < 0 then ' · separado a ' || coalesce(tl.destinos, 'otro producto')
                     when k.tipo = 'traslado' then ' · separado de ' || coalesce(tl.origenes, 'otro producto')
                     when k.kg = 0 then ' · diferencia de precio del material separado'
                     else ' · merma' end
             || coalesce(': ' || sc.motivo, '')
           end
         when 'correccion' then 'Ajuste de costo por corrección de compra'
         else 'Ajuste de costo por anulación'
       end as detalle,
       case when k.kg <> 0 then round(abs(k.costo_total / k.kg), 4) end as costo_kg,
       sum(case when k.anulado then 0 else k.kg end)
         over (partition by k.metal_id order by k.fecha, k.creado_en, k.id) as saldo_kg,
       sum(case when k.anulado then 0 else k.costo_total end)
         over (partition by k.metal_id order by k.fecha, k.creado_en, k.id) as saldo_costo
  from kardex k
  join metales m on m.id = k.metal_id
  left join compras co            on k.origen_tabla = 'compras' and co.id = k.origen_id
  left join proveedores pr        on pr.id = co.proveedor_id
  left join ventas ve             on k.origen_tabla = 'ventas' and ve.id = k.origen_id
  left join compradores cp        on cp.id = ve.comprador_id
  left join ajustes_inventario a  on k.origen_tabla = 'ajustes_inventario' and a.id = k.origen_id
  left join selecciones_compra sc on k.origen_tabla = 'selecciones_compra' and sc.id = k.origen_id
  left join compras cs            on cs.id = sc.compra_id
  left join proveedores ps        on ps.id = sc.proveedor_id
  left join lateral (
    select string_agg(distinct md.nombre, ', ') filter (where t.metal_origen_id = k.metal_id)  as destinos,
           string_agg(distinct mo.nombre, ', ') filter (where t.metal_destino_id = k.metal_id) as origenes
      from limpieza_traslados t
      join metales md on md.id = t.metal_destino_id
      join metales mo on mo.id = t.metal_origen_id
     where t.seleccion_id = sc.id) tl on k.tipo = 'traslado';

-- =============================================================================
-- REPORTES
-- =============================================================================
-- Compras: + por familia (primer nivel de la jerarquía), semana, año y tipo de proveedor
create or replace function rpt_compras(p_empresa uuid, p_desde date, p_hasta date, p_agrupar text default 'dia')
returns table (clave text, etiqueta text, n_compras bigint, kg numeric, importe numeric, precio_promedio numeric)
language sql stable
as $$
  select k.clave, k.etiqueta,
         count(distinct i.compra_id), sum(i.peso_neto_kg), sum(i.importe),
         case when sum(i.peso_neto_kg) > 0 then round(sum(i.importe) / sum(i.peso_neto_kg), 4) end
    from v_compra_items i
    left join v_productos vp on vp.id = i.metal_id
    left join metales fam on fam.id = vp.raiz_id
    left join proveedores pv on pv.id = i.proveedor_id
    cross join lateral (select
      case p_agrupar when 'mes' then i.periodo when 'metal' then i.metal_id::text
                     when 'familia' then coalesce(vp.raiz_id::text, i.metal_id::text)
                     when 'semana' then to_char(date_trunc('week', i.dia), 'YYYY-MM-DD')
                     when 'anio' then to_char(i.dia, 'YYYY')
                     when 'clase' then coalesce(pv.clase, 'sin')
                     when 'proveedor' then coalesce(i.proveedor_id::text, '-') else i.dia::text end as clave,
      case p_agrupar when 'mes' then i.periodo when 'metal' then coalesce(vp.ruta, i.metal_nombre)
                     when 'familia' then coalesce(fam.nombre, i.metal_nombre)
                     when 'semana' then 'Semana del ' || to_char(date_trunc('week', i.dia), 'DD/MM/YYYY')
                     when 'anio' then to_char(i.dia, 'YYYY')
                     when 'clase' then case pv.clase when 'mayorista' then 'Mayoristas' when 'minorista' then 'Minoristas'
                                                     else 'Sin proveedor' end
                     when 'proveedor' then coalesce(i.proveedor_nombre, 'Sin documento') else to_char(i.dia, 'DD/MM/YYYY') end as etiqueta) k
   where i.empresa_id = p_empresa and i.estado = 'registrada' and i.dia between p_desde and p_hasta
   group by k.clave, k.etiqueta
   order by case when p_agrupar in ('metal', 'proveedor', 'familia', 'clase') then null else k.clave end,
            sum(i.importe) desc
$$;

create or replace function rpt_ventas(p_empresa uuid, p_desde date, p_hasta date, p_agrupar text default 'mes')
returns table (clave text, etiqueta text, n_ventas bigint, kg_salida numeric, kg_recibido numeric,
               merma_kg numeric, importe numeric, precio_promedio numeric)
language sql stable
as $$
  select k.clave, k.etiqueta,
         count(distinct i.venta_id), sum(i.peso_salida_kg), sum(i.peso_recibido_kg), sum(i.merma_kg), sum(i.importe),
         case when sum(i.peso_recibido_kg) > 0 then round(sum(i.importe) / sum(i.peso_recibido_kg), 4) end
    from v_venta_items i
    left join v_productos vp on vp.id = i.metal_id
    left join metales fam on fam.id = vp.raiz_id
    cross join lateral (select
      case p_agrupar when 'dia' then i.dia::text when 'metal' then i.metal_id::text
                     when 'familia' then coalesce(vp.raiz_id::text, i.metal_id::text)
                     when 'semana' then to_char(date_trunc('week', i.dia), 'YYYY-MM-DD')
                     when 'anio' then to_char(i.dia, 'YYYY')
                     when 'comprador' then i.comprador_id::text else i.periodo end as clave,
      case p_agrupar when 'dia' then to_char(i.dia, 'DD/MM/YYYY') when 'metal' then coalesce(vp.ruta, i.metal_nombre)
                     when 'familia' then coalesce(fam.nombre, i.metal_nombre)
                     when 'semana' then 'Semana del ' || to_char(date_trunc('week', i.dia), 'DD/MM/YYYY')
                     when 'anio' then to_char(i.dia, 'YYYY')
                     when 'comprador' then i.comprador_nombre else i.periodo end as etiqueta) k
   where i.empresa_id = p_empresa and i.estado = 'confirmada' and i.dia between p_desde and p_hasta
   group by k.clave, k.etiqueta
   order by case when p_agrupar in ('metal', 'comprador', 'familia') then null else k.clave end,
            sum(i.importe) desc
$$;

-- Merma de limpieza: kilos limpiados, merma (kg, S/ y %), traslados, por producto, compra o proveedor
create or replace function rpt_merma_limpieza(p_empresa uuid, p_desde date, p_hasta date, p_agrupar text default 'metal')
returns table (clave text, etiqueta text, n_limpiezas bigint, kg_limpiado numeric, merma_kg numeric,
               merma_pct numeric, merma_soles numeric, traslado_kg numeric, diferencia_soles numeric)
language sql stable
as $$
  with s as (
    select sc.* from selecciones_compra sc
     where sc.empresa_id = p_empresa and sc.estado = 'registrada'
       and (sc.fecha at time zone 'America/Lima')::date between p_desde and p_hasta),
  base as (
    select ci.metal_id, s.id as seleccion_id, s.compra_id, s.proveedor_id,
           ci.peso_neto_kg as kg,
           coalesce((select sum(x.kg) from seleccion_items x where x.seleccion_id = s.id and x.compra_item_id = ci.id), 0) as merma_kg,
           coalesce((select sum(x.importe) from seleccion_items x where x.seleccion_id = s.id and x.compra_item_id = ci.id), 0) as merma_soles,
           coalesce((select sum(t.kg) from limpieza_traslados t where t.seleccion_id = s.id and t.compra_item_id = ci.id), 0) as traslado_kg,
           coalesce((select sum(t.diferencia) from limpieza_traslados t where t.seleccion_id = s.id and t.compra_item_id = ci.id), 0) as diferencia
      from s join compra_items ci on ci.compra_id = s.compra_id)
  select k.clave, k.etiqueta, count(distinct b.seleccion_id), sum(b.kg), sum(b.merma_kg),
         case when sum(b.kg) > 0 then round(sum(b.merma_kg) * 100 / sum(b.kg), 2) end,
         sum(b.merma_soles), sum(b.traslado_kg), sum(b.diferencia)
    from base b
    left join v_productos vp on vp.id = b.metal_id
    left join compras co on co.id = b.compra_id
    left join proveedores pv on pv.id = b.proveedor_id
    cross join lateral (select
      case p_agrupar when 'compra' then b.compra_id::text when 'proveedor' then coalesce(b.proveedor_id::text, '-')
                     else b.metal_id::text end as clave,
      case p_agrupar when 'compra' then 'Compra N° ' || co.numero
                     when 'proveedor' then coalesce(pv.nombre, 'Sin documento')
                     else vp.ruta end as etiqueta) k
   group by k.clave, k.etiqueta
   order by 6 desc nulls last
$$;

-- =============================================================================
-- Permisos de ejecución (igual que en 006): nada para anónimos; internas solo service_role
-- =============================================================================
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.proname like '\_%' or f.proname like 'admin\_%' or f.proname = 'siguiente_numero' then
      execute format('revoke execute on function %s from authenticated', f.sig);
      execute format('grant execute on function %s to service_role', f.sig);
    else
      execute format('grant execute on function %s to authenticated, service_role', f.sig);
    end if;
  end loop;
end $$;
