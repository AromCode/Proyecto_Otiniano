-- =============================================================================
-- Dashboard con filtro de fechas: resultado y movimiento de un rango de días
-- (hora de Lima). Misma fórmula que v_resultado_mes, pero por día, para que un
-- rango que cubre un mes completo dé exactamente la utilidad de ese mes.
-- Solo lectura, con la RLS del usuario.
-- =============================================================================

create or replace function dashboard_rango(p_empresa uuid, p_desde date, p_hasta date)
returns jsonb
language sql stable
as $$
  with
  c as (
    select i.* from v_compra_items i
     where i.empresa_id = p_empresa and i.estado = 'registrada' and i.dia between p_desde and p_hasta),
  v as (
    select i.* from v_venta_items i
     where i.empresa_id = p_empresa and i.estado = 'confirmada' and i.dia between p_desde and p_hasta),
  aj as (
    select k.metal_id, -sum(k.costo_total) as costo, -sum(k.kg) as kg
      from kardex k
     where k.empresa_id = p_empresa and k.tipo = 'ajuste' and not k.anulado
       and (k.fecha at time zone 'America/Lima')::date between p_desde and p_hasta
     group by k.metal_id),
  t as (
    select (select count(distinct compra_id) from c)              as compras_n,
           (select coalesce(sum(peso_neto_kg), 0) from c)          as compras_kg,
           (select coalesce(sum(importe), 0) from c)               as compras,
           (select count(distinct venta_id) from v)                as ventas_n,
           (select coalesce(sum(peso_recibido_kg), 0) from v)      as ventas_kg,
           (select coalesce(sum(importe), 0) from v)               as ventas,
           (select round(coalesce(sum(costo_vendido), 0), 2) from v) as costo_ventas,
           (select round(coalesce(sum(merma_costo), 0), 2) from v) as merma_venta,
           (select round(coalesce(sum(costo), 0), 2) from aj)      as merma_ajustes,
           (select coalesce(sum(g.monto), 0) from gastos g
             where g.empresa_id = p_empresa and g.estado = 'registrada'
               and (g.fecha at time zone 'America/Lima')::date between p_desde and p_hasta) as gastos,
           (select coalesce(sum(case when m.tipo = 'ingreso' then m.monto else -m.monto end), 0)
              from movimientos_caja m
             where m.empresa_id = p_empresa and m.origen = 'ajuste' and not m.anulado
               and (m.fecha at time zone 'America/Lima')::date between p_desde and p_hasta) as ajustes_caja),
  pm as (
    select x.metal_id, sum(x.kg_c) as kg_c, sum(x.imp_c) as imp_c, sum(x.kg_v) as kg_v, sum(x.imp_v) as imp_v,
           sum(x.margen) as margen
      from (select metal_id, peso_neto_kg as kg_c, importe as imp_c, 0 as kg_v, 0 as imp_v, 0 as margen from c
            union all
            select metal_id, 0, 0, peso_recibido_kg, importe, importe - costo_vendido from v) x
     group by x.metal_id)
  select jsonb_build_object(
    'desde',         p_desde,
    'hasta',         p_hasta,
    'compras_n',     t.compras_n,
    'compras_kg',    t.compras_kg,
    'compras',       t.compras,
    'ventas_n',      t.ventas_n,
    'ventas_kg',     t.ventas_kg,
    'ventas',        t.ventas,
    'costo_ventas',  t.costo_ventas,
    'margen_bruto',  t.ventas - t.costo_ventas,
    'merma',         t.merma_venta + t.merma_ajustes,
    'gastos',        t.gastos,
    'ajustes_caja',  t.ajustes_caja,
    'utilidad',      t.ventas - t.costo_ventas - t.merma_venta - t.merma_ajustes - t.gastos + t.ajustes_caja,
    'por_metal',     coalesce((
      select jsonb_agg(jsonb_build_object(
               'nombre', m.nombre, 'color', m.color,
               'kg_comprado', pm.kg_c, 'compras', pm.imp_c,
               'kg_vendido', pm.kg_v, 'ventas', pm.imp_v, 'margen', round(pm.margen, 2))
             order by pm.imp_c + pm.imp_v desc)
        from pm join metales m on m.id = pm.metal_id), '[]'::jsonb))
  from t
$$;

revoke execute on function dashboard_rango(uuid, date, date) from anon, public;
grant execute on function dashboard_rango(uuid, date, date) to authenticated, service_role;
