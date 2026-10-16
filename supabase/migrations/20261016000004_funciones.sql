-- =============================================================================
-- 004 · Funciones RPC: toda operación de dinero/inventario ocurre en UNA transacción
-- dentro de la base. El frontend solo llama a estas funciones.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Internas (no expuestas al cliente)
-- -----------------------------------------------------------------------------
create or replace function _validar_caja(p_empresa uuid, p_caja uuid)
returns cajas
language plpgsql stable set search_path = public
as $$
declare c cajas;
begin
  select * into c from cajas where id = p_caja and empresa_id = p_empresa;
  if not found then raise exception 'Caja no válida.'; end if;
  if not c.activo then raise exception 'La caja % está desactivada.', c.nombre; end if;
  return c;
end $$;

create or replace function _mov_caja(
  p_empresa uuid, p_caja uuid, p_fecha timestamptz, p_tipo tipo_mov_caja, p_origen origen_mov_caja,
  p_origen_id uuid, p_monto numeric, p_concepto text, p_comprobante_url text default null)
returns uuid
language plpgsql set search_path = public
as $$
declare v_id uuid;
begin
  perform _validar_caja(p_empresa, p_caja);
  insert into movimientos_caja (empresa_id, caja_id, fecha, tipo, origen, origen_id, monto, concepto, comprobante_url, creado_por)
  values (p_empresa, p_caja, p_fecha, p_tipo, p_origen, p_origen_id, p_monto, p_concepto, p_comprobante_url, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Bloquea (y crea si no existe) la fila de stock de un metal
create or replace function _stock_lock(p_empresa uuid, p_metal uuid)
returns stock_metal
language plpgsql set search_path = public
as $$
declare s stock_metal;
begin
  insert into stock_metal (empresa_id, metal_id) values (p_empresa, p_metal)
  on conflict (metal_id) do nothing;
  select * into s from stock_metal where metal_id = p_metal for update;
  return s;
end $$;

create or replace function _stock_entrada(
  p_empresa uuid, p_metal uuid, p_kg numeric, p_costo numeric, p_fecha timestamptz,
  p_tipo tipo_kardex, p_origen_tabla text, p_origen_id uuid)
returns void
language plpgsql set search_path = public
as $$
begin
  perform _stock_lock(p_empresa, p_metal);
  update stock_metal
     set kg = kg + p_kg, costo_total = costo_total + p_costo, actualizado = now()
   where metal_id = p_metal;
  insert into kardex (empresa_id, metal_id, fecha, tipo, origen_tabla, origen_id, kg, costo_total)
  values (p_empresa, p_metal, p_fecha, p_tipo, p_origen_tabla, p_origen_id, p_kg, p_costo);
end $$;

-- Saca kilos al costo promedio ponderado. Devuelve el costo (positivo) de lo que salió.
create or replace function _stock_salida(
  p_empresa uuid, p_metal uuid, p_kg numeric, p_fecha timestamptz,
  p_tipo tipo_kardex, p_origen_tabla text, p_origen_id uuid)
returns numeric
language plpgsql set search_path = public
as $$
declare
  s        stock_metal;
  v_costo  numeric(16,4);
  v_nombre text;
begin
  s := _stock_lock(p_empresa, p_metal);
  if s.kg < p_kg then
    select nombre into v_nombre from metales where id = p_metal;
    raise exception 'Stock insuficiente de %: hay % kg y se intenta sacar % kg.', v_nombre, s.kg, p_kg
      using errcode = 'P0001';
  end if;
  -- Si sale todo, sale todo el costo (evita residuos de redondeo)
  v_costo := case when s.kg = p_kg then s.costo_total else round(s.costo_total * p_kg / s.kg, 4) end;
  update stock_metal
     set kg = kg - p_kg, costo_total = costo_total - v_costo, actualizado = now()
   where metal_id = p_metal;
  insert into kardex (empresa_id, metal_id, fecha, tipo, origen_tabla, origen_id, kg, costo_total)
  values (p_empresa, p_metal, p_fecha, p_tipo, p_origen_tabla, p_origen_id, -p_kg, -v_costo);
  return v_costo;
end $$;

create or replace function _texto(p text)
returns text language sql immutable as $$ select nullif(trim(p), '') $$;

-- Solo el dueño puede registrar con fecha distinta a "ahora"
create or replace function _fecha_operacion(p_rol rol_miembro, p_fecha timestamptz)
returns timestamptz language sql stable as $$
  select case when p_fecha is not null and p_rol = 'dueno' then p_fecha else now() end
$$;

-- =============================================================================
-- COMPRAS
-- =============================================================================
-- p_items: [{ "metal_id": uuid, "peso_bruto_kg": "5.250", "descuento_kg": "0.250", "precio_kg": "30" }]
create or replace function registrar_compra(
  p_empresa          uuid,
  p_items            jsonb,
  p_caja             uuid,
  p_medio_pago       medio_pago default 'efectivo',
  p_proveedor        uuid default null,
  p_notas            text default null,
  p_foto_ticket_url  text default null,
  p_clave            uuid default null,
  p_fecha            timestamptz default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rol     rol_miembro;
  v_emp     empresas;
  v_prov    proveedores;
  v_compra  compras;
  v_item    jsonb;
  v_metal   metales;
  v_ci      compra_items;
  v_bruto   numeric(12,3);
  v_desc    numeric(12,3);
  v_precio  numeric(14,2);
  v_total   numeric(14,2) := 0;
  v_fecha   timestamptz;
begin
  v_rol := exigir_rol(p_empresa, '{dueno,cajero,balancero}');
  v_fecha := _fecha_operacion(v_rol, p_fecha);

  -- Idempotencia: si el celular reintenta, devolvemos la misma compra
  if p_clave is not null then
    select * into v_compra from compras where empresa_id = p_empresa and clave_idempotencia = p_clave;
    if found then
      return jsonb_build_object('id', v_compra.id, 'numero', v_compra.numero, 'total', v_compra.total, 'repetida', true);
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agregue al menos un metal a la compra.';
  end if;

  select * into v_emp from empresas where id = p_empresa;
  perform _validar_caja(p_empresa, p_caja);

  if p_proveedor is not null then
    select * into v_prov from proveedores where id = p_proveedor and empresa_id = p_empresa;
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

  update compras set total = v_total where id = v_compra.id;
  perform _mov_caja(p_empresa, p_caja, v_fecha, 'egreso', 'compra', v_compra.id, v_total,
                    'Compra N° ' || v_compra.numero);

  return jsonb_build_object('id', v_compra.id, 'numero', v_compra.numero, 'total', v_total, 'repetida', false);
end $$;

create or replace function anular_compra(p_compra uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v          compras;
  it         record;
  s          stock_metal;
  v_kg       numeric(12,3);
  v_costo    numeric(16,4);
begin
  select * into v from compras where id = p_compra for update;
  if not found then raise exception 'Compra no encontrada.'; end if;
  perform exigir_rol(v.empresa_id, '{dueno}');
  if v.estado = 'anulada' then raise exception 'La compra N° % ya está anulada.', v.numero; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la anulación.'; end if;

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
      -- Residuo de costo sin kilos (por ventas intermedias a otro promedio): va a resultados como ajuste
      insert into kardex (empresa_id, metal_id, fecha, tipo, origen_tabla, origen_id, kg, costo_total)
      values (v.empresa_id, it.metal_id, now(), 'ajuste', 'anulacion', p_compra, 0, -v_costo);
      v_costo := 0;
    elsif v_costo < 0 then
      raise exception 'No se puede anular: el costo del % quedaría negativo porque ya hubo ventas. Registre un ajuste de inventario.',
        it.metal_nombre;
    end if;
    update stock_metal set kg = v_kg, costo_total = v_costo, actualizado = now() where metal_id = it.metal_id;
  end loop;

  update kardex set anulado = true where origen_tabla = 'compras' and origen_id = p_compra;
  update movimientos_caja set anulado = true where origen = 'compra' and origen_id = p_compra;
  update compras
     set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = _texto(p_motivo)
   where id = p_compra;
end $$;

create or replace function actualizar_compra_adjuntos(p_compra uuid, p_foto_ticket_url text, p_notas text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v compras;
begin
  select * into v from compras where id = p_compra;
  if not found then raise exception 'Compra no encontrada.'; end if;
  perform exigir_rol(v.empresa_id, '{dueno,cajero,balancero}');
  update compras set foto_ticket_url = _texto(p_foto_ticket_url), notas = _texto(p_notas) where id = p_compra;
end $$;

-- =============================================================================
-- VENTAS
-- =============================================================================
-- p_items: [{ "metal_id": uuid, "peso_salida_kg": "4.000",
--             "peso_recibido_kg": "3.950"?, "precio_kg": "34.50"? }]
-- Si todas las líneas traen recibido+precio y se indica caja, se confirma en el acto.
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
  p_comprobante_url  text default null)
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
  v_rol := exigir_rol(p_empresa, '{dueno,cajero}');
  v_fecha := _fecha_operacion(v_rol, p_fecha);

  if p_clave is not null then
    select * into v_venta from ventas where empresa_id = p_empresa and clave_idempotencia = p_clave;
    if found then
      return jsonb_build_object('id', v_venta.id, 'numero', v_venta.numero, 'estado', v_venta.estado, 'repetida', true);
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agregue al menos un metal a la venta.';
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
    if not found then raise exception 'Metal no válido.'; end if;

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

  if v_completa and p_caja is not null then
    perform confirmar_venta(v_venta.id, v_conf, p_caja, coalesce(p_medio_pago, 'transferencia'),
                            p_comprobante_url, v_fecha);
    v_venta.estado := 'confirmada';
  end if;

  return jsonb_build_object('id', v_venta.id, 'numero', v_venta.numero, 'estado', v_venta.estado, 'repetida', false);
end $$;

-- Paso 2: el comprador informa su pesaje y precio → merma automática + ingreso a caja
-- p_items: [{ "item_id": uuid, "peso_recibido_kg": "3.950", "precio_kg": "34.50" }]
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
    v_vendido := round(it.costo_total * v_recibido / it.peso_salida_kg, 4);

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

create or replace function anular_venta(p_venta uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v   ventas;
  it  venta_items;
begin
  select * into v from ventas where id = p_venta for update;
  if not found then raise exception 'Venta no encontrada.'; end if;
  perform exigir_rol(v.empresa_id, '{dueno}');
  if v.estado = 'anulada' then raise exception 'La venta N° % ya está anulada.', v.numero; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la anulación.'; end if;

  for it in select * from venta_items where venta_id = p_venta order by metal_id loop
    perform _stock_lock(v.empresa_id, it.metal_id);
    update stock_metal
       set kg = kg + it.peso_salida_kg, costo_total = costo_total + it.costo_total, actualizado = now()
     where metal_id = it.metal_id;
  end loop;

  update kardex set anulado = true where origen_tabla = 'ventas' and origen_id = p_venta;
  update movimientos_caja set anulado = true where origen = 'venta' and origen_id = p_venta;
  update ventas
     set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = _texto(p_motivo)
   where id = p_venta;
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
  perform exigir_rol(v.empresa_id, '{dueno,cajero}');
  update ventas
     set guia_numero = _texto(p_guia_numero), guia_url = _texto(p_guia_url),
         comprobante_url = _texto(p_comprobante_url), notas = _texto(p_notas)
   where id = p_venta;
end $$;

-- =============================================================================
-- INVENTARIO: ajustes, conteo físico, reclasificación
-- =============================================================================
-- p_kg con signo: negativo = merma / faltante; positivo = sobrante
create or replace function registrar_ajuste(
  p_empresa uuid, p_metal uuid, p_kg numeric, p_motivo text,
  p_tipo tipo_ajuste default 'merma', p_fecha timestamptz default null, p_grupo uuid default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_rol    rol_miembro;
  v_id     uuid := gen_random_uuid();
  v_metal  metales;
  v_kg     numeric(12,3) := round(p_kg, 3);
  v_costo  numeric(16,4);
  s        stock_metal;
  v_fecha  timestamptz;
begin
  v_rol := exigir_rol(p_empresa, '{dueno}');
  v_fecha := _fecha_operacion(v_rol, p_fecha);
  select * into v_metal from metales where id = p_metal and empresa_id = p_empresa;
  if not found then raise exception 'Metal no válido.'; end if;
  if v_kg is null or v_kg = 0 then raise exception 'Indique los kilos del ajuste.'; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo del ajuste.'; end if;

  if v_kg < 0 then
    v_costo := -_stock_salida(p_empresa, p_metal, -v_kg, v_fecha, 'ajuste', 'ajustes_inventario', v_id);
  else
    s := _stock_lock(p_empresa, p_metal);
    v_costo := case when s.kg > 0 then round(s.costo_total * v_kg / s.kg, 4)
                    else round(v_metal.precio_compra * v_kg, 4) end;
    perform _stock_entrada(p_empresa, p_metal, v_kg, v_costo, v_fecha, 'ajuste', 'ajustes_inventario', v_id);
  end if;

  insert into ajustes_inventario (id, empresa_id, metal_id, fecha, tipo, kg, costo_total, motivo, grupo_id, creado_por)
  values (v_id, p_empresa, p_metal, v_fecha, p_tipo, v_kg, v_costo, _texto(p_motivo), p_grupo, auth.uid());
  return v_id;
end $$;

-- Conteo físico: el usuario declara los kilos contados y se ajusta la diferencia
create or replace function registrar_conteo(p_empresa uuid, p_metal uuid, p_kg_contado numeric, p_motivo text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  s      stock_metal;
  v_dif  numeric(12,3);
begin
  perform exigir_rol(p_empresa, '{dueno}');
  if p_kg_contado is null or p_kg_contado < 0 then raise exception 'Los kilos contados no pueden ser negativos.'; end if;
  select * into s from stock_metal where metal_id = p_metal and empresa_id = p_empresa;
  v_dif := round(p_kg_contado, 3) - coalesce(s.kg, 0);
  if v_dif = 0 then return null; end if;
  return registrar_ajuste(p_empresa, p_metal, v_dif,
                          coalesce(_texto(p_motivo), 'Conteo físico: ' || round(p_kg_contado, 3) || ' kg'), 'conteo');
end $$;

-- Mueve kilos de un metal a otro llevando su costo (p. ej. cobre quemado → cobre brillante)
create or replace function reclasificar_metal(
  p_empresa uuid, p_origen uuid, p_destino uuid, p_kg numeric, p_motivo text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_grupo  uuid := gen_random_uuid();
  v_id     uuid := gen_random_uuid();
  v_id2    uuid := gen_random_uuid();
  v_kg     numeric(12,3) := round(p_kg, 3);
  v_costo  numeric(16,4);
begin
  perform exigir_rol(p_empresa, '{dueno}');
  if p_origen = p_destino then raise exception 'Elija metales distintos.'; end if;
  if v_kg is null or v_kg <= 0 then raise exception 'Indique los kilos a reclasificar.'; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo.'; end if;
  if not exists (select 1 from metales where id = p_destino and empresa_id = p_empresa) then
    raise exception 'Metal destino no válido.';
  end if;
  if not exists (select 1 from metales where id = p_origen and empresa_id = p_empresa) then
    raise exception 'Metal origen no válido.';
  end if;

  v_costo := _stock_salida(p_empresa, p_origen, v_kg, now(), 'ajuste', 'ajustes_inventario', v_id);
  perform _stock_entrada(p_empresa, p_destino, v_kg, v_costo, now(), 'ajuste', 'ajustes_inventario', v_id2);

  insert into ajustes_inventario (id, empresa_id, metal_id, fecha, tipo, kg, costo_total, motivo, grupo_id, creado_por)
  values (v_id,  p_empresa, p_origen,  now(), 'reclasificacion', -v_kg, -v_costo, _texto(p_motivo), v_grupo, auth.uid()),
         (v_id2, p_empresa, p_destino, now(), 'reclasificacion',  v_kg,  v_costo, _texto(p_motivo), v_grupo, auth.uid());
  return v_grupo;
end $$;

-- =============================================================================
-- CAJA: gastos, traspasos, arqueos
-- =============================================================================
create or replace function registrar_gasto(
  p_empresa uuid, p_caja uuid, p_monto numeric, p_concepto text,
  p_categoria uuid default null, p_comprobante_url text default null, p_fecha timestamptz default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_rol   rol_miembro;
  v_id    uuid;
  v_fecha timestamptz;
  v_monto numeric(14,2) := round(p_monto, 2);
begin
  v_rol := exigir_rol(p_empresa, '{dueno,cajero}');
  v_fecha := _fecha_operacion(v_rol, p_fecha);
  if v_monto is null or v_monto <= 0 then raise exception 'El monto debe ser mayor a cero.'; end if;
  if _texto(p_concepto) is null then raise exception 'Indique el concepto del gasto.'; end if;
  if p_categoria is not null and not exists (select 1 from categorias_gasto where id = p_categoria and empresa_id = p_empresa) then
    raise exception 'Categoría no válida.';
  end if;
  perform _validar_caja(p_empresa, p_caja);

  insert into gastos (empresa_id, fecha, categoria_id, monto, caja_id, concepto, comprobante_url, creado_por)
  values (p_empresa, v_fecha, p_categoria, v_monto, p_caja, _texto(p_concepto), _texto(p_comprobante_url), auth.uid())
  returning id into v_id;

  perform _mov_caja(p_empresa, p_caja, v_fecha, 'egreso', 'gasto', v_id, v_monto, _texto(p_concepto), _texto(p_comprobante_url));
  return v_id;
end $$;

create or replace function anular_gasto(p_gasto uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare g gastos;
begin
  select * into g from gastos where id = p_gasto for update;
  if not found then raise exception 'Gasto no encontrado.'; end if;
  perform exigir_rol(g.empresa_id, '{dueno}');
  if g.estado = 'anulada' then raise exception 'El gasto ya está anulado.'; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la anulación.'; end if;
  update movimientos_caja set anulado = true where origen = 'gasto' and origen_id = p_gasto;
  update gastos set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = _texto(p_motivo)
   where id = p_gasto;
end $$;

create or replace function registrar_traspaso(
  p_empresa uuid, p_origen uuid, p_destino uuid, p_monto numeric, p_concepto text default null,
  p_fecha timestamptz default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_rol   rol_miembro;
  v_id    uuid;
  v_fecha timestamptz;
  v_monto numeric(14,2) := round(p_monto, 2);
  c_o     cajas;
  c_d     cajas;
begin
  v_rol := exigir_rol(p_empresa, '{dueno,cajero}');
  v_fecha := _fecha_operacion(v_rol, p_fecha);
  if v_monto is null or v_monto <= 0 then raise exception 'El monto debe ser mayor a cero.'; end if;
  if p_origen = p_destino then raise exception 'Elija cajas distintas.'; end if;
  c_o := _validar_caja(p_empresa, p_origen);
  c_d := _validar_caja(p_empresa, p_destino);

  insert into traspasos (empresa_id, fecha, caja_origen_id, caja_destino_id, monto, concepto, creado_por)
  values (p_empresa, v_fecha, p_origen, p_destino, v_monto, _texto(p_concepto), auth.uid())
  returning id into v_id;

  perform _mov_caja(p_empresa, p_origen, v_fecha, 'egreso', 'traspaso', v_id, v_monto,
                    coalesce(_texto(p_concepto), 'Traspaso a ' || c_d.nombre));
  perform _mov_caja(p_empresa, p_destino, v_fecha, 'ingreso', 'traspaso', v_id, v_monto,
                    coalesce(_texto(p_concepto), 'Traspaso desde ' || c_o.nombre));
  return v_id;
end $$;

create or replace function anular_traspaso(p_traspaso uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare t traspasos;
begin
  select * into t from traspasos where id = p_traspaso for update;
  if not found then raise exception 'Traspaso no encontrado.'; end if;
  perform exigir_rol(t.empresa_id, '{dueno}');
  if t.estado = 'anulada' then raise exception 'El traspaso ya está anulado.'; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la anulación.'; end if;
  update movimientos_caja set anulado = true where origen = 'traspaso' and origen_id = p_traspaso;
  update traspasos set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = _texto(p_motivo)
   where id = p_traspaso;
end $$;

create or replace function saldo_caja(p_caja uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0)
    from movimientos_caja where caja_id = p_caja and not anulado
$$;

-- Arqueo: el cajero declara lo contado; el sistema guarda la diferencia.
-- p_ajustar (solo dueño): registra un movimiento de ajuste para que la caja cuadre.
create or replace function registrar_arqueo(
  p_empresa uuid, p_caja uuid, p_contado numeric, p_nota text default null, p_ajustar boolean default false)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rol    rol_miembro;
  v_saldo  numeric(14,2);
  a        arqueos;
begin
  v_rol := exigir_rol(p_empresa, '{dueno,cajero}');
  perform _validar_caja(p_empresa, p_caja);
  if p_contado is null or p_contado < 0 then raise exception 'El monto contado no puede ser negativo.'; end if;
  v_saldo := saldo_caja(p_caja);

  insert into arqueos (empresa_id, caja_id, saldo_sistema, contado, nota, creado_por)
  values (p_empresa, p_caja, v_saldo, round(p_contado, 2), _texto(p_nota), auth.uid())
  returning * into a;

  if p_ajustar and a.diferencia <> 0 then
    if v_rol <> 'dueno' then raise exception 'Solo el dueño puede ajustar la caja.'; end if;
    perform _mov_caja(p_empresa, p_caja, now(),
                      case when a.diferencia > 0 then 'ingreso'::tipo_mov_caja else 'egreso'::tipo_mov_caja end,
                      'ajuste', a.id, abs(a.diferencia), 'Ajuste por arqueo');
  end if;

  return jsonb_build_object('id', a.id, 'saldo_sistema', a.saldo_sistema, 'contado', a.contado, 'diferencia', a.diferencia);
end $$;

-- =============================================================================
-- SOCIEDAD
-- =============================================================================
create or replace function registrar_aporte_retiro(
  p_empresa uuid, p_socio uuid, p_tipo tipo_aporte, p_monto numeric, p_caja uuid,
  p_nota text default null, p_fecha timestamptz default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_rol   rol_miembro;
  v_id    uuid;
  v_fecha timestamptz;
  v_monto numeric(14,2) := round(p_monto, 2);
  s       socios;
begin
  v_rol := exigir_rol(p_empresa, '{dueno}');
  v_fecha := _fecha_operacion(v_rol, p_fecha);
  select * into s from socios where id = p_socio and empresa_id = p_empresa;
  if not found then raise exception 'Socio no válido.'; end if;
  if v_monto is null or v_monto <= 0 then raise exception 'El monto debe ser mayor a cero.'; end if;
  perform _validar_caja(p_empresa, p_caja);

  insert into aportes_retiros (empresa_id, socio_id, fecha, tipo, monto, caja_id, nota, creado_por)
  values (p_empresa, p_socio, v_fecha, p_tipo, v_monto, p_caja, _texto(p_nota), auth.uid())
  returning id into v_id;

  perform _mov_caja(p_empresa, p_caja, v_fecha,
                    case when p_tipo = 'aporte' then 'ingreso'::tipo_mov_caja else 'egreso'::tipo_mov_caja end,
                    case when p_tipo = 'aporte' then 'aporte'::origen_mov_caja else 'retiro'::origen_mov_caja end,
                    v_id, v_monto, initcap(p_tipo::text) || ' de ' || s.nombre);
  return v_id;
end $$;

create or replace function anular_aporte_retiro(p_id uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare a aportes_retiros;
begin
  select * into a from aportes_retiros where id = p_id for update;
  if not found then raise exception 'Movimiento no encontrado.'; end if;
  perform exigir_rol(a.empresa_id, '{dueno}');
  if a.estado = 'anulada' then raise exception 'El movimiento ya está anulado.'; end if;
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la anulación.'; end if;
  update movimientos_caja set anulado = true where origen in ('aporte', 'retiro') and origen_id = p_id;
  update aportes_retiros set estado = 'anulada', anulado_por = auth.uid(), anulado_en = now(), motivo_anulacion = _texto(p_motivo)
   where id = p_id;
end $$;

-- =============================================================================
-- Revocar acceso directo a funciones internas
-- =============================================================================
revoke execute on function _validar_caja(uuid, uuid) from public, anon, authenticated;
revoke execute on function _mov_caja(uuid, uuid, timestamptz, tipo_mov_caja, origen_mov_caja, uuid, numeric, text, text) from public, anon, authenticated;
revoke execute on function _stock_lock(uuid, uuid) from public, anon, authenticated;
revoke execute on function _stock_entrada(uuid, uuid, numeric, numeric, timestamptz, tipo_kardex, text, uuid) from public, anon, authenticated;
revoke execute on function _stock_salida(uuid, uuid, numeric, timestamptz, tipo_kardex, text, uuid) from public, anon, authenticated;
revoke execute on function siguiente_numero(uuid, text) from public, anon, authenticated;
