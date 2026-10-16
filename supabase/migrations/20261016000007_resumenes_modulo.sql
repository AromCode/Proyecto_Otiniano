-- =============================================================================
-- Resúmenes para la cabecera de cada módulo (Compras, Ventas, Inventario) y
-- detalle por metal de proveedores y clientes. Solo lectura, con RLS del usuario
-- (funciones SQL normales sobre vistas security_invoker).
-- =============================================================================

-- Compras del mes en curso (hora de Lima) vs. mes anterior, y lo de hoy
create or replace function resumen_compras(p_empresa uuid)
returns jsonb
language sql stable
as $$
  with b as (
    select i.*
      from v_compra_items i
     where i.empresa_id = p_empresa and i.estado = 'registrada'
       and i.dia >= (date_trunc('month', (now() at time zone 'America/Lima')::date) - interval '1 month')::date),
  mes as (select * from b where b.periodo = periodo_de(now()))
  select jsonb_build_object(
    'periodo',          periodo_de(now()),
    'mes_n',            (select count(distinct compra_id) from mes),
    'mes_kg',           (select coalesce(sum(peso_neto_kg), 0) from mes),
    'mes_importe',      (select coalesce(sum(importe), 0) from mes),
    'mes_precio_prom',  (select case when sum(peso_neto_kg) > 0 then round(sum(importe) / sum(peso_neto_kg), 4) end from mes),
    'anterior_importe', (select coalesce(sum(importe), 0) from b where b.periodo <> periodo_de(now())),
    'hoy_n',            (select count(distinct compra_id) from mes where dia = (now() at time zone 'America/Lima')::date),
    'hoy_importe',      (select coalesce(sum(importe), 0) from mes where dia = (now() at time zone 'America/Lima')::date),
    'proveedor_top',    (select jsonb_build_object('id', proveedor_id, 'nombre', proveedor_nombre, 'importe', sum(importe))
                           from mes where proveedor_id is not null
                          group by proveedor_id, proveedor_nombre order by sum(importe) desc limit 1),
    'metal_top',        (select jsonb_build_object('nombre', metal_nombre, 'kg', sum(peso_neto_kg))
                           from mes group by metal_id, metal_nombre order by sum(peso_neto_kg) desc limit 1))
$$;

-- Ventas confirmadas del mes (por fecha de confirmación) y pendientes de pesaje
create or replace function resumen_ventas(p_empresa uuid)
returns jsonb
language sql stable
as $$
  with mes as (
    select i.*
      from v_venta_items i
     where i.empresa_id = p_empresa and i.estado = 'confirmada' and i.periodo = periodo_de(now())),
  pend as (
    select v.* from v_ventas v where v.empresa_id = p_empresa and v.estado = 'pendiente')
  select jsonb_build_object(
    'periodo',         periodo_de(now()),
    'mes_n',           (select count(distinct venta_id) from mes),
    'mes_kg',          (select coalesce(sum(peso_recibido_kg), 0) from mes),
    'mes_importe',     (select coalesce(sum(importe), 0) from mes),
    'mes_margen',      (select coalesce(sum(importe), 0) - round(coalesce(sum(costo_vendido), 0), 2) from mes),
    'mes_margen_pct',  (select case when sum(importe) > 0
                                 then round((sum(importe) - round(sum(costo_vendido), 2)) * 100 / sum(importe), 2) end from mes),
    'mes_merma_kg',    (select coalesce(sum(merma_kg), 0) from mes),
    'pendientes_n',    (select count(*) from pend),
    'pendientes_kg',   (select coalesce(sum(kg_salida), 0) from pend),
    'cliente_top',     (select jsonb_build_object('id', comprador_id, 'nombre', comprador_nombre, 'importe', sum(importe))
                          from mes group by comprador_id, comprador_nombre order by sum(importe) desc limit 1))
$$;

-- Inventario: kilos y valor a costo / a precio de venta del día
create or replace function resumen_inventario(p_empresa uuid)
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'kg',             coalesce(sum(s.kg), 0),
    'valor_costo',    coalesce(sum(s.valor_costo), 0),
    'valor_venta',    coalesce(sum(s.valor_venta), 0),
    'ganancia_potencial', coalesce(sum(s.valor_venta), 0) - coalesce(sum(s.valor_costo), 0),
    'metales_con_stock', count(*) filter (where s.kg > 0),
    'en_transito',    (select coalesce(sum(v.costo_total), 0) from v_ventas v
                        where v.empresa_id = p_empresa and v.estado = 'pendiente'))
    from v_stock_metal s
   where s.empresa_id = p_empresa
$$;

-- Lo comprado a un proveedor, por metal
create or replace function proveedor_por_metal(p_proveedor uuid)
returns table (metal_id uuid, metal text, color text, n_compras bigint, kg numeric, importe numeric, precio_promedio numeric)
language sql stable
as $$
  select i.metal_id, i.metal_nombre, i.metal_color, count(distinct i.compra_id), sum(i.peso_neto_kg), sum(i.importe),
         case when sum(i.peso_neto_kg) > 0 then round(sum(i.importe) / sum(i.peso_neto_kg), 4) end
    from v_compra_items i
   where i.proveedor_id = p_proveedor and i.estado = 'registrada'
   group by i.metal_id, i.metal_nombre, i.metal_color
   order by sum(i.importe) desc
$$;

-- Lo vendido a un cliente (comprador), por metal: solo ventas confirmadas
create or replace function comprador_por_metal(p_comprador uuid)
returns table (metal_id uuid, metal text, color text, n_ventas bigint, kg numeric, merma_kg numeric, importe numeric, precio_promedio numeric)
language sql stable
as $$
  select i.metal_id, i.metal_nombre, i.metal_color, count(distinct i.venta_id), sum(i.peso_recibido_kg), sum(i.merma_kg), sum(i.importe),
         case when sum(i.peso_recibido_kg) > 0 then round(sum(i.importe) / sum(i.peso_recibido_kg), 4) end
    from v_venta_items i
   where i.comprador_id = p_comprador and i.estado = 'confirmada'
   group by i.metal_id, i.metal_nombre, i.metal_color
   order by sum(i.importe) desc
$$;

revoke execute on function resumen_compras(uuid), resumen_ventas(uuid), resumen_inventario(uuid),
  proveedor_por_metal(uuid), comprador_por_metal(uuid) from anon, public;
grant execute on function resumen_compras(uuid), resumen_ventas(uuid), resumen_inventario(uuid),
  proveedor_por_metal(uuid), comprador_por_metal(uuid) to authenticated, service_role;
