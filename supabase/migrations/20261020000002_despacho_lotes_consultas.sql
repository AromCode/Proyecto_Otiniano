-- =============================================================================
-- Despacho (selección en almacén), descuentos al proveedor, lotes por fecha de
-- llegada, consultas DNI/RUC guardadas y series para los gráficos del inicio.
--
-- Flujo nuevo de compra: se paga peso bruto × precio. Luego en almacén se
-- selecciona el material; si vino tierra, humedad o material de otra clase, se
-- registra el descuento en kg. Ese descuento:
--   · con proveedor identificado → «saldo a favor»: nos lo debe; se descuenta de
--     su próxima compra o lo devuelve en efectivo (no es pérdida);
--   · sin proveedor o si el dueño decide asumirlo → merma (va a resultados).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Parámetros y columnas nuevas
-- -----------------------------------------------------------------------------
-- [CONFIRMAR] días que una compra puede esperar su selección antes de verse «retrasada»
alter table empresas add column dias_seleccion integer not null default 2
  check (dias_seleccion between 0 and 60);

-- Parte del pago de la compra cubierta con el saldo a favor del proveedor
alter table compras add column saldo_aplicado numeric(14,2) not null default 0
  check (saldo_aplicado >= 0 and saldo_aplicado <= total);

-- -----------------------------------------------------------------------------
-- Selección en almacén (una por compra) y sus descuentos por línea
-- -----------------------------------------------------------------------------
create table selecciones_compra (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  numero            integer not null,
  compra_id         uuid not null references compras(id),
  proveedor_id      uuid references proveedores(id),
  fecha             timestamptz not null default now(),
  cobrar            boolean not null,            -- true: el proveedor lo debe; false: merma asumida
  kg                numeric(12,3) not null default 0 check (kg >= 0),
  importe           numeric(14,2) not null default 0 check (importe >= 0),
  motivo            text,
  estado            estado_doc not null default 'registrada',
  creado_por        uuid default auth.uid(),
  creado_en         timestamptz not null default now(),
  anulado_por       uuid,
  anulado_en        timestamptz,
  motivo_anulacion  text,
  unique (empresa_id, numero)
);
create unique index selecciones_compra_vigente on selecciones_compra (compra_id) where estado = 'registrada';
create index on selecciones_compra (empresa_id, fecha desc);
create index on selecciones_compra (proveedor_id);

create table seleccion_items (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id) on delete cascade,
  seleccion_id    uuid not null references selecciones_compra(id) on delete cascade,
  compra_item_id  uuid not null references compra_items(id),
  metal_id        uuid not null references metales(id),
  kg              numeric(12,3) not null check (kg > 0),
  precio_kg       numeric(14,2) not null check (precio_kg >= 0),
  importe         numeric(14,2) generated always as (round(kg * precio_kg, 2)) stored
);
create index on seleccion_items (seleccion_id);
create index on seleccion_items (compra_item_id);

-- Devolución en efectivo de un saldo a favor
create table devoluciones_proveedor (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresas(id) on delete cascade,
  proveedor_id      uuid not null references proveedores(id),
  fecha             timestamptz not null default now(),
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
create index on devoluciones_proveedor (proveedor_id);

do $$
declare t text;
begin
  foreach t in array array['selecciones_compra', 'seleccion_items', 'devoluciones_proveedor'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (es_miembro(empresa_id))', t || '_select', t);
    execute format('create trigger %I before delete on %I
                    for each row when (pg_trigger_depth() = 0) execute function trg_no_borrar()', t || '_no_borrar', t);
  end loop;
  foreach t in array array['selecciones_compra', 'devoluciones_proveedor'] loop
    execute format('create trigger %I before insert or update or delete on %I
                    for each row execute function trg_periodo_abierto()', t || '_periodo', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Consultas DNI/RUC (RENIEC/SUNAT vía Decolecta) guardadas: cada documento se
-- consulta UNA vez y luego se reutiliza. Datos públicos del padrón, compartidos
-- entre empresas para no gastar consultas; sin políticas → solo el servidor
-- (service_role) lee y escribe. empresa_id = quién gastó la consulta.
-- -----------------------------------------------------------------------------
create table padron_documentos (
  tipo_doc       tipo_doc not null check (tipo_doc in ('DNI', 'RUC')),
  nro_doc        text not null,
  encontrado     boolean not null,
  nombre         text,
  direccion      text,
  datos          jsonb,
  consultas      integer not null default 1,
  consultado_en  timestamptz not null default now(),
  empresa_id     uuid references empresas(id) on delete set null,
  creado_por     uuid,
  primary key (tipo_doc, nro_doc),
  check ((tipo_doc = 'DNI' and nro_doc ~ '^\d{8}$') or (tipo_doc = 'RUC' and nro_doc ~ '^\d{11}$'))
);
create index on padron_documentos (empresa_id, consultado_en);
alter table padron_documentos enable row level security;

-- Uso de la cuota de consultas (para Configuración): solo el dueño
create or replace function uso_consultas_doc(p_empresa uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'total',     coalesce((select sum(consultas) from padron_documentos), 0),
    'empresa',   coalesce((select sum(consultas) from padron_documentos where empresa_id = p_empresa), 0),
    'hoy',       coalesce((select sum(consultas) from padron_documentos where empresa_id = p_empresa
                            and (consultado_en at time zone 'America/Lima')::date = (now() at time zone 'America/Lima')::date), 0),
    'guardados', (select count(*) from padron_documentos where encontrado))
   where tiene_rol(p_empresa, '{dueno}')
$$;

-- -----------------------------------------------------------------------------
-- Internas
-- -----------------------------------------------------------------------------
-- Saldo a favor (lo que el proveedor nos debe por descuentos)
create or replace function _saldo_proveedor(p_proveedor uuid)
returns numeric
language sql stable set search_path = public
as $$
  select coalesce((select sum(importe) from selecciones_compra
                    where proveedor_id = p_proveedor and estado = 'registrada' and cobrar), 0)
       - coalesce((select sum(saldo_aplicado) from compras
                    where proveedor_id = p_proveedor and estado = 'registrada'), 0)
       - coalesce((select sum(monto) from devoluciones_proveedor
                    where proveedor_id = p_proveedor and estado = 'registrada'), 0)
$$;

-- Saca kilos del stock a un costo dado (el precio pagado en esa compra, no el promedio).
-- Si el metal queda en 0 kg, el residuo de costo pasa a resultados como ajuste.
create or replace function _stock_salida_costo(
  p_empresa uuid, p_metal uuid, p_kg numeric, p_costo numeric, p_fecha timestamptz,
  p_tipo tipo_kardex, p_origen_tabla text, p_origen_id uuid)
returns void
language plpgsql set search_path = public
as $$
declare
  s        stock_metal;
  v_nombre text;
begin
  s := _stock_lock(p_empresa, p_metal);
  select nombre into v_nombre from metales where id = p_metal;
  if s.kg < p_kg then
    raise exception 'No se puede descontar % kg de %: en stock quedan % kg (ya se vendió parte).', p_kg, v_nombre, s.kg
      using errcode = 'P0001';
  end if;
  if s.kg > p_kg and s.costo_total - p_costo < 0 then
    raise exception 'No se puede descontar % kg de %: el costo del stock quedaría negativo. Registre un ajuste de inventario.',
      p_kg, v_nombre using errcode = 'P0001';
  end if;
  update stock_metal set kg = kg - p_kg, costo_total = costo_total - p_costo, actualizado = now()
   where metal_id = p_metal;
  insert into kardex (empresa_id, metal_id, fecha, tipo, origen_tabla, origen_id, kg, costo_total)
  values (p_empresa, p_metal, p_fecha, p_tipo, p_origen_tabla, p_origen_id, -p_kg, -p_costo);

  if s.kg = p_kg and s.costo_total - p_costo <> 0 then
    insert into kardex (empresa_id, metal_id, fecha, tipo, origen_tabla, origen_id, kg, costo_total)
    values (p_empresa, p_metal, p_fecha, 'ajuste', p_origen_tabla, p_origen_id, 0, -(s.costo_total - p_costo));
    update stock_metal set costo_total = 0 where metal_id = p_metal;
  end if;
end $$;

revoke execute on function _saldo_proveedor(uuid) from public, anon, authenticated;
revoke execute on function _stock_salida_costo(uuid, uuid, numeric, numeric, timestamptz, tipo_kardex, text, uuid)
  from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- COMPRAS: solo peso bruto y precio; opción de cobrar el saldo a favor
-- -----------------------------------------------------------------------------
drop function registrar_compra(uuid, jsonb, uuid, medio_pago, uuid, text, text, uuid, timestamptz);

-- p_items: [{ "metal_id": uuid, "peso_bruto_kg": "5.250", "precio_kg": "30" }]
-- (descuento_kg se sigue aceptando por compatibilidad; el descuento ahora va en la selección)
create or replace function registrar_compra(
  p_empresa          uuid,
  p_items            jsonb,
  p_caja             uuid,
  p_medio_pago       medio_pago default 'efectivo',
  p_proveedor        uuid default null,
  p_notas            text default null,
  p_foto_ticket_url  text default null,
  p_clave            uuid default null,
  p_fecha            timestamptz default null,
  p_aplicar_saldo    boolean default false)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rol      rol_miembro;
  v_emp      empresas;
  v_prov     proveedores;
  v_compra   compras;
  v_item     jsonb;
  v_metal    metales;
  v_ci       compra_items;
  v_bruto    numeric(12,3);
  v_desc     numeric(12,3);
  v_precio   numeric(14,2);
  v_total    numeric(14,2) := 0;
  v_aplicado numeric(14,2) := 0;
  v_fecha    timestamptz;
begin
  v_rol := exigir_rol(p_empresa, '{dueno,cajero,balancero}');
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
    raise exception 'Agregue al menos un metal a la compra.';
  end if;

  select * into v_emp from empresas where id = p_empresa;
  perform _validar_caja(p_empresa, p_caja);

  if p_proveedor is not null then
    -- Bloqueo del proveedor: dos compras simultáneas no aplican el mismo saldo a favor
    select * into v_prov from proveedores where id = p_proveedor and empresa_id = p_empresa for update;
    if not found then raise exception 'Proveedor no válido.'; end if;
    if not v_prov.activo then raise exception 'El proveedor % está desactivado.', v_prov.nombre; end if;
  end if;

  insert into compras (empresa_id, numero, fecha, proveedor_id, caja_id, medio_pago, notas,
                       foto_ticket_url, clave_idempotencia, creado_por)
  values (p_empresa, siguiente_numero(p_empresa, 'compra'), v_fecha, p_proveedor, p_caja, p_medio_pago,
          _texto(p_notas), _texto(p_foto_ticket_url), p_clave, auth.uid())
  returning * into v_compra;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_metal from metales
     where id = (v_item->>'metal_id')::uuid and empresa_id = p_empresa;
    if not found then raise exception 'Metal no válido.'; end if;
    if not v_metal.activo then raise exception 'El metal % está desactivado.', v_metal.nombre; end if;

    v_bruto  := round(coalesce(nullif(v_item->>'peso_bruto_kg', '')::numeric, 0), 3);
    v_desc   := round(coalesce(nullif(v_item->>'descuento_kg', '')::numeric, 0), 3);
    v_precio := round(coalesce(nullif(v_item->>'precio_kg', '')::numeric, v_metal.precio_compra), 2);

    if v_bruto <= 0 then
      raise exception 'El peso bruto de % debe ser mayor a cero.', v_metal.nombre;
    end if;
    if v_desc < 0 or v_desc >= v_bruto then
      raise exception 'El descuento de % debe ser menor al peso bruto.', v_metal.nombre;
    end if;
    if v_precio <> v_metal.precio_compra and not (v_rol = any(v_emp.roles_editan_precio)) then
      raise exception 'No tiene permiso para cambiar el precio de % (precio del día: S/ %).',
        v_metal.nombre, v_metal.precio_compra;
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
    perform _mov_caja(p_empresa, p_caja, v_fecha, 'egreso', 'compra', v_compra.id, v_total - v_aplicado,
                      'Compra N° ' || v_compra.numero
                      || case when v_aplicado > 0 then ' (descuento a favor S/ ' || v_aplicado || ')' else '' end);
  end if;

  return jsonb_build_object('id', v_compra.id, 'numero', v_compra.numero, 'total', v_total,
                            'saldo_aplicado', v_aplicado, 'repetida', false);
end $$;

grant execute on function registrar_compra(uuid, jsonb, uuid, medio_pago, uuid, text, text, uuid, timestamptz, boolean)
  to authenticated, service_role;
revoke execute on function registrar_compra(uuid, jsonb, uuid, medio_pago, uuid, text, text, uuid, timestamptz, boolean)
  from public, anon;

-- Anular compra: si ya tiene descuento de selección, primero se anula esa selección
create or replace function anular_compra(p_compra uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v          compras;
  it         record;
  s          stock_metal;
  v_sel      selecciones_compra;
  v_kg       numeric(12,3);
  v_costo    numeric(16,4);
begin
  select * into v from compras where id = p_compra for update;
  if not found then raise exception 'Compra no encontrada.'; end if;
  perform exigir_rol(v.empresa_id, '{dueno}');
  if v.estado = 'anulada' then raise exception 'La compra N° % ya está anulada.', v.numero; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la anulación.'; end if;

  select * into v_sel from selecciones_compra where compra_id = p_compra and estado = 'registrada';
  if found and v_sel.kg > 0 then
    raise exception 'La compra N° % tiene un descuento de selección (N° %). Anule primero esa selección.', v.numero, v_sel.numero;
  end if;

  for it in
    select ci.*, m.nombre as metal_nombre
      from compra_items ci join metales m on m.id = ci.metal_id
     where ci.compra_id = p_compra
     order by ci.metal_id
  loop
    s := _stock_lock(v.empresa_id, it.metal_id);
    v_kg    := s.kg - it.peso_neto_kg;
    v_costo := s.costo_total - it.importe;
    if v_kg < 0 then
      raise exception 'No se puede anular: del % ya salió parte (stock actual % kg; la compra tiene % kg).',
        it.metal_nombre, s.kg, it.peso_neto_kg;
    end if;
    if v_kg = 0 and v_costo <> 0 then
      insert into kardex (empresa_id, metal_id, fecha, tipo, origen_tabla, origen_id, kg, costo_total)
      values (v.empresa_id, it.metal_id, now(), 'ajuste', 'anulacion', p_compra, 0, -v_costo);
      v_costo := 0;
    elsif v_costo < 0 then
      raise exception 'No se puede anular: el costo del % quedaría negativo porque ya hubo ventas. Registre un ajuste de inventario.',
        it.metal_nombre;
    end if;
    update stock_metal set kg = v_kg, costo_total = v_costo, actualizado = now() where metal_id = it.metal_id;
  end loop;

  -- Selección sin descuento: queda sin efecto junto con la compra
  update selecciones_compra
     set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = 'Compra anulada'
   where compra_id = p_compra and estado = 'registrada';
  update kardex set anulado = true where origen_tabla = 'compras' and origen_id = p_compra;
  update movimientos_caja set anulado = true where origen = 'compra' and origen_id = p_compra;
  update compras
     set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = _texto(p_motivo)
   where id = p_compra;
end $$;

-- -----------------------------------------------------------------------------
-- DESPACHO: selección en almacén
-- -----------------------------------------------------------------------------
-- p_items: [{ "compra_item_id": uuid, "kg": "1.500" }] (solo las líneas con descuento; [] = todo conforme)
create or replace function registrar_seleccion(
  p_compra  uuid,
  p_items   jsonb default '[]',
  p_motivo  text default null,
  p_cobrar  boolean default true)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v        compras;
  v_sel    selecciones_compra;
  v_item   jsonb;
  v_ci     compra_items;
  v_metal  text;
  v_kg     numeric(12,3);
  v_si     seleccion_items;
  v_cobrar boolean;
  v_tkg    numeric(12,3) := 0;
  v_timp   numeric(14,2) := 0;
begin
  select * into v from compras where id = p_compra for update;
  if not found then raise exception 'Compra no encontrada.'; end if;
  perform exigir_rol(v.empresa_id, '{dueno,cajero,balancero}');
  if v.estado <> 'registrada' then raise exception 'La compra N° % está anulada.', v.numero; end if;
  select * into v_sel from selecciones_compra where compra_id = p_compra and estado = 'registrada';
  if found then
    raise exception 'La compra N° % ya fue seleccionada (Selección N° %).', v.numero, v_sel.numero;
  end if;

  -- Sin proveedor identificado no hay a quién cobrar: el descuento es merma
  v_cobrar := coalesce(p_cobrar, true) and v.proveedor_id is not null;

  insert into selecciones_compra (empresa_id, numero, compra_id, proveedor_id, fecha, cobrar, motivo, creado_por)
  values (v.empresa_id, siguiente_numero(v.empresa_id, 'seleccion'), p_compra, v.proveedor_id, now(), v_cobrar,
          _texto(p_motivo), auth.uid())
  returning * into v_sel;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_kg := round(coalesce(nullif(v_item->>'kg', '')::numeric, 0), 3);
    continue when v_kg = 0;
    select * into v_ci from compra_items where id = (v_item->>'compra_item_id')::uuid and compra_id = p_compra;
    if not found then raise exception 'Línea de compra no válida.'; end if;
    select nombre into v_metal from metales where id = v_ci.metal_id;
    if v_kg < 0 then raise exception 'El descuento de % no puede ser negativo.', v_metal; end if;
    if v_kg > v_ci.peso_neto_kg then
      raise exception 'El descuento de % (% kg) no puede ser mayor a lo comprado (% kg).', v_metal, v_kg, v_ci.peso_neto_kg;
    end if;

    insert into seleccion_items (empresa_id, seleccion_id, compra_item_id, metal_id, kg, precio_kg)
    values (v.empresa_id, v_sel.id, v_ci.id, v_ci.metal_id, v_kg, v_ci.precio_kg)
    returning * into v_si;

    perform _stock_salida_costo(v.empresa_id, v_ci.metal_id, v_kg, v_si.importe, now(),
                                case when v_cobrar then 'descuento'::tipo_kardex else 'ajuste'::tipo_kardex end,
                                'selecciones_compra', v_sel.id);
    v_tkg  := v_tkg + v_kg;
    v_timp := v_timp + v_si.importe;
  end loop;

  if v_tkg > 0 and _texto(p_motivo) is null then
    raise exception 'Indique el motivo del descuento (tierra, humedad, otro material…).';
  end if;

  update selecciones_compra set kg = v_tkg, importe = v_timp where id = v_sel.id;
  return jsonb_build_object('id', v_sel.id, 'numero', v_sel.numero, 'kg', v_tkg, 'importe', v_timp, 'cobrar', v_cobrar);
end $$;

create or replace function anular_seleccion(p_seleccion uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_sel  selecciones_compra;
  k      kardex;
begin
  select * into v_sel from selecciones_compra where id = p_seleccion for update;
  if not found then raise exception 'Selección no encontrada.'; end if;
  perform exigir_rol(v_sel.empresa_id, '{dueno}');
  if v_sel.estado = 'anulada' then raise exception 'La selección N° % ya está anulada.', v_sel.numero; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la anulación.'; end if;

  if v_sel.cobrar and v_sel.importe > 0 then
    perform 1 from proveedores where id = v_sel.proveedor_id for update;
    if _saldo_proveedor(v_sel.proveedor_id) < v_sel.importe then
      raise exception 'No se puede anular: parte de este descuento ya se cobró (en una compra o devolución).';
    end if;
  end if;

  -- Los kilos y el costo vuelven al stock tal como salieron
  for k in select * from kardex where origen_tabla = 'selecciones_compra' and origen_id = p_seleccion and not anulado
           order by metal_id loop
    perform _stock_lock(v_sel.empresa_id, k.metal_id);
    update stock_metal set kg = kg - k.kg, costo_total = costo_total - k.costo_total, actualizado = now()
     where metal_id = k.metal_id;
  end loop;
  update kardex set anulado = true where origen_tabla = 'selecciones_compra' and origen_id = p_seleccion;
  update selecciones_compra
     set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = _texto(p_motivo)
   where id = p_seleccion;
end $$;

-- Devolución en efectivo del saldo a favor
create or replace function registrar_devolucion_proveedor(
  p_empresa uuid, p_proveedor uuid, p_monto numeric, p_caja uuid, p_nota text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_prov  proveedores;
  v_monto numeric(14,2) := round(p_monto, 2);
  v_saldo numeric(14,2);
  v_id    uuid;
begin
  perform exigir_rol(p_empresa, '{dueno,cajero}');
  select * into v_prov from proveedores where id = p_proveedor and empresa_id = p_empresa for update;
  if not found then raise exception 'Proveedor no válido.'; end if;
  if v_monto is null or v_monto <= 0 then raise exception 'El monto debe ser mayor a cero.'; end if;
  v_saldo := _saldo_proveedor(p_proveedor);
  if v_monto > v_saldo then
    raise exception 'El monto (S/ %) es mayor al saldo a favor de % (S/ %).', v_monto, v_prov.nombre, v_saldo;
  end if;
  perform _validar_caja(p_empresa, p_caja);

  insert into devoluciones_proveedor (empresa_id, proveedor_id, fecha, monto, caja_id, nota, creado_por)
  values (p_empresa, p_proveedor, now(), v_monto, p_caja, _texto(p_nota), auth.uid())
  returning id into v_id;
  perform _mov_caja(p_empresa, p_caja, now(), 'ingreso', 'devolucion', v_id, v_monto,
                    'Devolución de ' || v_prov.nombre || ' (descuento de selección)');
  return v_id;
end $$;

create or replace function anular_devolucion_proveedor(p_id uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare d devoluciones_proveedor;
begin
  select * into d from devoluciones_proveedor where id = p_id for update;
  if not found then raise exception 'Devolución no encontrada.'; end if;
  perform exigir_rol(d.empresa_id, '{dueno}');
  if d.estado = 'anulada' then raise exception 'La devolución ya está anulada.'; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la anulación.'; end if;
  update movimientos_caja set anulado = true where origen = 'devolucion' and origen_id = p_id;
  update devoluciones_proveedor
     set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = _texto(p_motivo)
   where id = p_id;
end $$;

-- -----------------------------------------------------------------------------
-- VENTAS: el peso recibido no puede superar lo que salió (tolerancia 2 % de balanza)
-- -----------------------------------------------------------------------------
create or replace function confirmar_venta(
  p_venta            uuid,
  p_items            jsonb,
  p_caja             uuid,
  p_medio_pago       medio_pago default 'transferencia',
  p_comprobante_url  text default null,
  p_fecha            timestamptz default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v          ventas;
  v_rol      rol_miembro;
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
  v_rol := exigir_rol(v.empresa_id, '{dueno,cajero}');
  if v.estado <> 'pendiente' then
    raise exception 'La venta N° % no está pendiente (estado: %).', v.numero, v.estado;
  end if;
  perform _validar_caja(v.empresa_id, p_caja);
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
     set total = v_total, caja_id = p_caja, medio_pago = p_medio_pago, estado = 'confirmada',
         fecha_confirmacion = v_fecha, confirmado_por = auth.uid(),
         comprobante_url = coalesce(_texto(p_comprobante_url), comprobante_url)
   where id = p_venta;

  if v_total > 0 then
    perform _mov_caja(v.empresa_id, p_caja, v_fecha, 'ingreso', 'venta', p_venta, v_total,
                      'Venta N° ' || v.numero);
  end if;

  return jsonb_build_object('id', p_venta, 'numero', v.numero, 'total', v_total);
end $$;

-- -----------------------------------------------------------------------------
-- Vistas
-- -----------------------------------------------------------------------------
-- Saldo a favor por proveedor
create view v_saldo_proveedor with (security_invoker = on) as
select p.empresa_id, p.id as proveedor_id, p.nombre, p.tipo_doc, p.nro_doc, p.telefono,
       coalesce(d.descontado, 0) as descontado,
       coalesce(a.aplicado, 0)   as aplicado,
       coalesce(r.devuelto, 0)   as devuelto,
       coalesce(d.descontado, 0) - coalesce(a.aplicado, 0) - coalesce(r.devuelto, 0) as saldo
  from proveedores p
  left join lateral (select sum(importe) as descontado from selecciones_compra
                      where proveedor_id = p.id and estado = 'registrada' and cobrar) d on true
  left join lateral (select sum(saldo_aplicado) as aplicado from compras
                      where proveedor_id = p.id and estado = 'registrada') a on true
  left join lateral (select sum(monto) as devuelto from devoluciones_proveedor
                      where proveedor_id = p.id and estado = 'registrada') r on true;

-- Selecciones con su compra y proveedor
create view v_selecciones with (security_invoker = on) as
select s.*, co.numero as compra_numero, co.fecha as compra_fecha, co.total as compra_total,
       pr.nombre as proveedor_nombre,
       (select string_agg(m.nombre || ' ' || si.kg || ' kg', ', ' order by m.orden, m.nombre)
          from seleccion_items si join metales m on m.id = si.metal_id where si.seleccion_id = s.id) as detalle
  from selecciones_compra s
  join compras co on co.id = s.compra_id
  left join proveedores pr on pr.id = s.proveedor_id;

-- Lotes: cada línea de compra es un lote con su fecha de llegada. Lo que queda en stock se
-- estima saliendo primero lo más antiguo (el stock real se valoriza a costo promedio).
create view v_lotes with (security_invoker = on) as
with li as (
  select ci.id as compra_item_id, ci.empresa_id, ci.metal_id, co.id as compra_id, co.numero, co.fecha,
         co.proveedor_id, pr.nombre as proveedor_nombre,
         ci.peso_bruto_kg, ci.peso_neto_kg, ci.precio_kg, ci.importe,
         s.id as seleccion_id, s.numero as seleccion_numero, s.fecha as fecha_seleccion,
         coalesce(sd.kg, 0) as kg_descuento,
         ci.peso_neto_kg - coalesce(sd.kg, 0) as kg_ingresado
    from compra_items ci
    join compras co on co.id = ci.compra_id and co.estado = 'registrada'
    left join proveedores pr on pr.id = co.proveedor_id
    left join selecciones_compra s on s.compra_id = co.id and s.estado = 'registrada'
    left join lateral (select sum(x.kg) as kg from seleccion_items x
                        where x.compra_item_id = ci.id and x.seleccion_id = s.id) sd on true),
acum as (
  select li.*,
         coalesce(sum(li.kg_ingresado) over (partition by li.metal_id order by li.fecha desc, li.numero desc
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

-- Compras: + precio promedio, estado de selección
drop view v_compras;
create view v_compras with (security_invoker = on) as
select co.*,
       periodo_de(co.fecha) as periodo,
       p.nombre   as proveedor_nombre,
       p.tipo_doc as proveedor_tipo_doc,
       p.nro_doc  as proveedor_nro_doc,
       ca.nombre  as caja_nombre,
       i.kg_total, i.metales, i.metal_ids,
       case when i.kg_total > 0 then round(co.total / i.kg_total, 4) end as precio_promedio,
       s.id as seleccion_id, s.numero as seleccion_numero, s.kg as seleccion_kg, s.importe as seleccion_importe,
       co.estado = 'registrada' and s.id is null as por_seleccionar,
       co.estado = 'registrada' and s.id is null
         and (now() at time zone 'America/Lima')::date - (co.fecha at time zone 'America/Lima')::date > e.dias_seleccion as retrasada
  from compras co
  join empresas e on e.id = co.empresa_id
  left join proveedores p on p.id = co.proveedor_id
  join cajas ca on ca.id = co.caja_id
  left join selecciones_compra s on s.compra_id = co.id and s.estado = 'registrada'
  left join lateral (
    select coalesce(sum(ci.peso_neto_kg), 0) as kg_total,
           string_agg(distinct m.nombre, ', ') as metales,
           array_agg(distinct ci.metal_id)     as metal_ids
      from compra_items ci join metales m on m.id = ci.metal_id
     where ci.compra_id = co.id
  ) i on true;

-- Ventas: + precio promedio de venta por kg
create or replace view v_ventas with (security_invoker = on) as
select ve.*,
       periodo_de(coalesce(ve.fecha_confirmacion, ve.fecha)) as periodo,
       cp.razon_social as comprador_nombre,
       cp.ruc          as comprador_ruc,
       ca.nombre       as caja_nombre,
       i.kg_salida, i.kg_recibido, i.merma_kg, i.merma_costo, i.costo_total, i.costo_vendido,
       i.metales, i.metal_ids,
       case when i.kg_recibido > 0 then round(ve.total / i.kg_recibido, 4) end as precio_promedio
  from ventas ve
  join compradores cp on cp.id = ve.comprador_id
  left join cajas ca on ca.id = ve.caja_id
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

-- Kardex: detalle de selecciones/descuentos
create or replace view v_kardex with (security_invoker = on) as
select k.*,
       m.nombre as metal_nombre,
       case k.origen_tabla
         when 'compras' then 'Compra N° ' || co.numero || coalesce(' · ' || pr.nombre, '')
         when 'ventas'  then 'Venta N° '  || ve.numero || coalesce(' · ' || cp.razon_social, '')
         when 'ajustes_inventario' then initcap(a.tipo::text) || ': ' || a.motivo
         when 'selecciones_compra' then
           case when k.kg = 0 then 'Ajuste de costo · ' else '' end
           || 'Selección N° ' || sc.numero || ' (compra N° ' || cs.numero || ')'
           || case when sc.cobrar then ' · descuento a ' || coalesce(ps.nombre, 'proveedor') else ' · merma asumida' end
           || coalesce(': ' || sc.motivo, '')
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
  left join proveedores ps        on ps.id = sc.proveedor_id;

-- Patrimonio: + lo que los proveedores nos deben por descuentos
create or replace view v_patrimonio with (security_invoker = on) as
select e.id as empresa_id,
       cj.caja,
       st.stock_costo,
       st.stock_precio_venta,
       tr.en_transito,
       ap.aportes, ap.retiros,
       ap.aportes - ap.retiros                                             as capital,
       cj.caja + st.stock_costo + tr.en_transito + pc.por_cobrar           as activos,
       cj.caja + st.stock_costo + tr.en_transito + pc.por_cobrar - (ap.aportes - ap.retiros) as ganancia_acumulada,
       pc.por_cobrar
  from empresas e
  cross join lateral (
    select coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0) as caja
      from movimientos_caja where empresa_id = e.id and not anulado) cj
  cross join lateral (
    select round(coalesce(sum(s.costo_total), 0), 2)            as stock_costo,
           round(coalesce(sum(s.kg * m.precio_venta), 0), 2)    as stock_precio_venta
      from stock_metal s join metales m on m.id = s.metal_id
     where s.empresa_id = e.id) st
  cross join lateral (
    select round(coalesce(sum(vi.costo_total), 0), 2) as en_transito
      from venta_items vi join ventas v on v.id = vi.venta_id
     where v.empresa_id = e.id and v.estado = 'pendiente') tr
  cross join lateral (
    select coalesce(sum(monto) filter (where tipo = 'aporte'), 0) as aportes,
           coalesce(sum(monto) filter (where tipo = 'retiro'), 0) as retiros
      from aportes_retiros where empresa_id = e.id and estado = 'registrada') ap
  cross join lateral (
    select coalesce((select sum(importe) from selecciones_compra
                      where empresa_id = e.id and estado = 'registrada' and cobrar), 0)
         - coalesce((select sum(saldo_aplicado) from compras
                      where empresa_id = e.id and estado = 'registrada'), 0)
         - coalesce((select sum(monto) from devoluciones_proveedor
                      where empresa_id = e.id and estado = 'registrada'), 0) as por_cobrar) pc;

create or replace function patrimonio_al(p_empresa uuid, p_hasta timestamptz)
returns jsonb
language sql stable security definer set search_path = public
as $$
  with
  cj as (select coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0) as caja
           from movimientos_caja where empresa_id = p_empresa and not anulado and fecha < p_hasta),
  st as (select round(coalesce(sum(costo_total), 0), 2) as stock_costo
           from kardex where empresa_id = p_empresa and not anulado and fecha < p_hasta),
  tr as (select round(coalesce(sum(vi.costo_total), 0), 2) as en_transito
           from venta_items vi join ventas v on v.id = vi.venta_id
          where v.empresa_id = p_empresa and v.estado <> 'anulada' and v.fecha < p_hasta
            and (v.fecha_confirmacion is null or v.fecha_confirmacion >= p_hasta)),
  ap as (select coalesce(sum(monto) filter (where tipo = 'aporte'), 0) as aportes,
                coalesce(sum(monto) filter (where tipo = 'retiro'), 0) as retiros
           from aportes_retiros where empresa_id = p_empresa and estado = 'registrada' and fecha < p_hasta),
  pc as (select coalesce((select sum(importe) from selecciones_compra
                           where empresa_id = p_empresa and estado = 'registrada' and cobrar and fecha < p_hasta), 0)
              - coalesce((select sum(saldo_aplicado) from compras
                           where empresa_id = p_empresa and estado = 'registrada' and fecha < p_hasta), 0)
              - coalesce((select sum(monto) from devoluciones_proveedor
                           where empresa_id = p_empresa and estado = 'registrada' and fecha < p_hasta), 0) as por_cobrar)
  select jsonb_build_object(
           'caja', cj.caja, 'stock_costo', st.stock_costo, 'en_transito', tr.en_transito,
           'por_cobrar', pc.por_cobrar,
           'aportes', ap.aportes, 'retiros', ap.retiros, 'capital', ap.aportes - ap.retiros,
           'activos', cj.caja + st.stock_costo + tr.en_transito + pc.por_cobrar,
           'ganancia_acumulada', cj.caja + st.stock_costo + tr.en_transito + pc.por_cobrar - (ap.aportes - ap.retiros))
    from cj, st, tr, ap, pc
   where es_miembro(p_empresa)
$$;

create or replace function dashboard(p_empresa uuid)
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'caja',               p.caja,
    'stock_costo',        p.stock_costo,
    'stock_precio_venta', p.stock_precio_venta,
    'en_transito',        p.en_transito,
    'por_cobrar',         p.por_cobrar,
    'capital',            p.capital,
    'activos',            p.activos,
    'ganancia_acumulada', p.ganancia_acumulada,
    'periodo',            periodo_de(now()),
    'utilidad_mes',       coalesce(r.utilidad, 0),
    'ventas_mes',         coalesce(r.ventas, 0),
    'compras_mes',        coalesce(r.compras, 0),
    'gastos_mes',         coalesce(r.gastos, 0),
    'merma_mes',          coalesce(r.merma_total, 0),
    'hoy_compras_n',      hc.n, 'hoy_compras_kg', hc.kg, 'hoy_compras_importe', hc.importe,
    'hoy_ventas_n',       hv.n, 'hoy_ventas_kg', hv.kg,
    'ventas_pendientes',  (select count(*) from ventas where empresa_id = p_empresa and estado = 'pendiente'),
    'por_seleccionar',    (select count(*) from v_compras where empresa_id = p_empresa and por_seleccionar),
    'selecciones_retrasadas', (select count(*) from v_compras where empresa_id = p_empresa and retrasada))
  from v_patrimonio p
  left join v_resultado_mes r on r.empresa_id = p.empresa_id and r.periodo = periodo_de(now())
  cross join lateral (
    select count(distinct co.id) as n, coalesce(sum(ci.peso_neto_kg), 0) as kg, coalesce(sum(ci.importe), 0) as importe
      from compras co join compra_items ci on ci.compra_id = co.id
     where co.empresa_id = p_empresa and co.estado = 'registrada'
       and (co.fecha at time zone 'America/Lima')::date = (now() at time zone 'America/Lima')::date) hc
  cross join lateral (
    select count(distinct ve.id) as n, coalesce(sum(vi.peso_salida_kg), 0) as kg
      from ventas ve join venta_items vi on vi.venta_id = ve.id
     where ve.empresa_id = p_empresa and ve.estado <> 'anulada'
       and (ve.fecha at time zone 'America/Lima')::date = (now() at time zone 'America/Lima')::date) hv
  where p.empresa_id = p_empresa
$$;

-- -----------------------------------------------------------------------------
-- Series para los gráficos del inicio: por mes y por día con acumulados (curva S).
-- Misma fórmula de utilidad que v_resultado_mes / dashboard_rango.
-- -----------------------------------------------------------------------------
create or replace function dashboard_serie(p_empresa uuid, p_desde date, p_hasta date)
returns jsonb
language sql stable
as $$
  with
  dias as (select d::date as dia from generate_series(p_desde, p_hasta, interval '1 day') d),
  c as (select i.dia, sum(i.importe) as compras, sum(i.peso_neto_kg) as kg
          from v_compra_items i
         where i.empresa_id = p_empresa and i.estado = 'registrada' and i.dia between p_desde and p_hasta
         group by i.dia),
  v as (select i.dia, sum(i.importe) as ventas, sum(i.peso_recibido_kg) as kg,
               sum(i.costo_vendido) as costo, sum(i.merma_costo) as merma
          from v_venta_items i
         where i.empresa_id = p_empresa and i.estado = 'confirmada' and i.dia between p_desde and p_hasta
         group by i.dia),
  aj as (select (k.fecha at time zone 'America/Lima')::date as dia, -sum(k.costo_total) as merma
           from kardex k
          where k.empresa_id = p_empresa and k.tipo = 'ajuste' and not k.anulado
            and (k.fecha at time zone 'America/Lima')::date between p_desde and p_hasta
          group by 1),
  g as (select (fecha at time zone 'America/Lima')::date as dia, sum(monto) as gastos
          from gastos
         where empresa_id = p_empresa and estado = 'registrada'
           and (fecha at time zone 'America/Lima')::date between p_desde and p_hasta
         group by 1),
  cj as (select (fecha at time zone 'America/Lima')::date as dia,
                sum(case when tipo = 'ingreso' then monto else -monto end) as ajustes
           from movimientos_caja
          where empresa_id = p_empresa and origen = 'ajuste' and not anulado
            and (fecha at time zone 'America/Lima')::date between p_desde and p_hasta
          group by 1),
  d as (
    select dias.dia,
           coalesce(c.compras, 0) as compras, coalesce(c.kg, 0) as kg_c,
           coalesce(v.ventas, 0) as ventas, coalesce(v.kg, 0) as kg_v,
           coalesce(v.ventas, 0) - coalesce(v.costo, 0) as margen,
           coalesce(v.merma, 0) + coalesce(aj.merma, 0) as merma,
           coalesce(g.gastos, 0) as gastos,
           coalesce(v.ventas, 0) - coalesce(v.costo, 0) - coalesce(v.merma, 0) - coalesce(aj.merma, 0)
             - coalesce(g.gastos, 0) + coalesce(cj.ajustes, 0) as utilidad
      from dias
      left join c  on c.dia  = dias.dia
      left join v  on v.dia  = dias.dia
      left join aj on aj.dia = dias.dia
      left join g  on g.dia  = dias.dia
      left join cj on cj.dia = dias.dia),
  da as (
    select d.*,
           sum(compras)  over w as compras_acum,
           sum(ventas)   over w as ventas_acum,
           sum(utilidad) over w as utilidad_acum
      from d window w as (order by dia))
  select jsonb_build_object(
    'meses', coalesce((
      select jsonb_agg(jsonb_build_object(
               'periodo', x.periodo, 'compras', round(x.compras, 2), 'ventas', round(x.ventas, 2),
               'margen', round(x.margen, 2), 'merma', round(x.merma, 2), 'gastos', round(x.gastos, 2),
               'utilidad', round(x.utilidad, 2), 'kg_comprado', x.kg_c, 'kg_vendido', x.kg_v)
             order by x.periodo)
        from (select to_char(dia, 'YYYY-MM') as periodo, sum(compras) as compras, sum(ventas) as ventas,
                     sum(margen) as margen, sum(merma) as merma, sum(gastos) as gastos, sum(utilidad) as utilidad,
                     sum(kg_c) as kg_c, sum(kg_v) as kg_v
                from d group by 1) x), '[]'::jsonb),
    'dias', coalesce((
      select jsonb_agg(jsonb_build_object(
               'dia', da.dia, 'compras', round(da.compras, 2), 'ventas', round(da.ventas, 2),
               'utilidad', round(da.utilidad, 2),
               'compras_acum', round(da.compras_acum, 2), 'ventas_acum', round(da.ventas_acum, 2),
               'utilidad_acum', round(da.utilidad_acum, 2))
             order by da.dia)
        from da), '[]'::jsonb))
   where es_miembro(p_empresa)
$$;

-- -----------------------------------------------------------------------------
-- Historial de un metal: compras, ventas, descuentos y precios promedio
-- -----------------------------------------------------------------------------
create or replace function resumen_metal(p_metal uuid, p_desde date, p_hasta date)
returns jsonb
language sql stable
as $$
  with
  c as (select * from v_compra_items
         where metal_id = p_metal and estado = 'registrada' and dia between p_desde and p_hasta),
  v as (select * from v_venta_items
         where metal_id = p_metal and estado = 'confirmada' and dia between p_desde and p_hasta),
  sd as (select si.kg, si.importe from seleccion_items si join selecciones_compra s on s.id = si.seleccion_id
          where si.metal_id = p_metal and s.estado = 'registrada'
            and (s.fecha at time zone 'America/Lima')::date between p_desde and p_hasta),
  meses as (
    select periodo, sum(kg_c) as kg_c, sum(imp_c) as imp_c, sum(kg_v) as kg_v, sum(imp_v) as imp_v
      from (select periodo, peso_neto_kg as kg_c, importe as imp_c, 0 as kg_v, 0 as imp_v from c
            union all
            select periodo, 0, 0, peso_recibido_kg, importe from v) x
     group by periodo)
  select jsonb_build_object(
    'compras_n',          (select count(distinct compra_id) from c),
    'kg_comprado',        (select coalesce(sum(peso_neto_kg), 0) from c),
    'compras',            (select coalesce(sum(importe), 0) from c),
    'precio_prom_compra', (select case when sum(peso_neto_kg) > 0 then round(sum(importe) / sum(peso_neto_kg), 4) end from c),
    'primera_compra',     (select min(fecha) from c),
    'ultima_compra',      (select max(fecha) from c),
    'ventas_n',           (select count(distinct venta_id) from v),
    'kg_vendido',         (select coalesce(sum(peso_recibido_kg), 0) from v),
    'ventas',             (select coalesce(sum(importe), 0) from v),
    'precio_prom_venta',  (select case when sum(peso_recibido_kg) > 0 then round(sum(importe) / sum(peso_recibido_kg), 4) end from v),
    'margen',             (select coalesce(sum(importe), 0) - round(coalesce(sum(costo_vendido), 0), 2) from v),
    'merma_kg',           (select coalesce(sum(merma_kg), 0) from v),
    'ultima_venta',       (select max(coalesce(fecha_confirmacion, fecha)) from v),
    'descuento_kg',       (select coalesce(sum(kg), 0) from sd),
    'descuento_importe',  (select coalesce(sum(importe), 0) from sd),
    'por_mes', coalesce((select jsonb_agg(jsonb_build_object(
                 'periodo', periodo, 'kg_comprado', kg_c, 'compras', imp_c, 'kg_vendido', kg_v, 'ventas', imp_v,
                 'precio_compra', case when kg_c > 0 then round(imp_c / kg_c, 4) end,
                 'precio_venta',  case when kg_v > 0 then round(imp_v / kg_v, 4) end) order by periodo)
                 from meses), '[]'::jsonb))
$$;

-- Precios promedio por metal para los formularios de compra y venta (últimos p_dias días)
create or replace function precios_promedio(p_empresa uuid, p_dias integer default 90)
returns table (metal_id uuid, costo_promedio numeric, compra_promedio numeric, venta_promedio numeric)
language sql stable
as $$
  select m.id,
         s.costo_promedio,
         (select case when sum(i.peso_neto_kg) > 0 then round(sum(i.importe) / sum(i.peso_neto_kg), 4) end
            from v_compra_items i
           where i.metal_id = m.id and i.estado = 'registrada'
             and i.dia > (now() at time zone 'America/Lima')::date - p_dias),
         (select case when sum(i.peso_recibido_kg) > 0 then round(sum(i.importe) / sum(i.peso_recibido_kg), 4) end
            from v_venta_items i
           where i.metal_id = m.id and i.estado = 'confirmada'
             and i.dia > (now() at time zone 'America/Lima')::date - p_dias)
    from metales m
    left join v_stock_metal s on s.metal_id = m.id
   where m.empresa_id = p_empresa
$$;

-- -----------------------------------------------------------------------------
-- Rankings para los gráficos de proveedores y clientes (por kilos y soles)
-- -----------------------------------------------------------------------------
create or replace function ranking_proveedores(p_empresa uuid, p_desde date, p_hasta date, p_metal uuid default null)
returns table (proveedor_id uuid, nombre text, documento text, n_compras bigint, kg numeric, importe numeric, ultima timestamptz)
language sql stable
as $$
  select p.id, p.nombre,
         case when p.nro_doc is null then 'Sin documento' else p.tipo_doc || ' ' || p.nro_doc end,
         count(distinct i.compra_id), sum(i.peso_neto_kg), sum(i.importe), max(i.fecha)
    from v_compra_items i join proveedores p on p.id = i.proveedor_id
   where i.empresa_id = p_empresa and i.estado = 'registrada' and i.dia between p_desde and p_hasta
     and (p_metal is null or i.metal_id = p_metal)
   group by p.id, p.nombre, p.tipo_doc, p.nro_doc
   order by sum(i.peso_neto_kg) desc
$$;

create or replace function ranking_clientes(p_empresa uuid, p_desde date, p_hasta date, p_metal uuid default null)
returns table (comprador_id uuid, nombre text, documento text, n_ventas bigint, kg numeric, importe numeric, ultima timestamptz)
language sql stable
as $$
  select c.id, c.razon_social, coalesce('RUC ' || c.ruc, 'Sin RUC'),
         count(distinct i.venta_id), sum(i.peso_recibido_kg), sum(i.importe), max(coalesce(i.fecha_confirmacion, i.fecha))
    from v_venta_items i join compradores c on c.id = i.comprador_id
   where i.empresa_id = p_empresa and i.estado = 'confirmada' and i.dia between p_desde and p_hasta
     and (p_metal is null or i.metal_id = p_metal)
   group by c.id, c.razon_social, c.ruc
   order by sum(i.peso_recibido_kg) desc
$$;

-- -----------------------------------------------------------------------------
-- Permisos de ejecución de lo nuevo
-- -----------------------------------------------------------------------------
revoke execute on function uso_consultas_doc(uuid), registrar_seleccion(uuid, jsonb, text, boolean),
  anular_seleccion(uuid, text), registrar_devolucion_proveedor(uuid, uuid, numeric, uuid, text),
  anular_devolucion_proveedor(uuid, text), dashboard_serie(uuid, date, date), resumen_metal(uuid, date, date),
  precios_promedio(uuid, integer), ranking_proveedores(uuid, date, date, uuid), ranking_clientes(uuid, date, date, uuid)
  from public, anon;
grant execute on function uso_consultas_doc(uuid), registrar_seleccion(uuid, jsonb, text, boolean),
  anular_seleccion(uuid, text), registrar_devolucion_proveedor(uuid, uuid, numeric, uuid, text),
  anular_devolucion_proveedor(uuid, text), dashboard_serie(uuid, date, date), resumen_metal(uuid, date, date),
  precios_promedio(uuid, integer), ranking_proveedores(uuid, date, date, uuid), ranking_clientes(uuid, date, date, uuid)
  to authenticated, service_role;
