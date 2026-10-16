-- =============================================================================
-- 005 · Vistas y reportes. Un número se calcula en UN solo lugar: aquí.
-- Todas las vistas usan security_invoker → respetan la RLS del usuario.
-- =============================================================================

-- Stock por metal con costo promedio ponderado y valorización
create view v_stock_metal with (security_invoker = on) as
select m.empresa_id,
       m.id                                   as metal_id,
       m.nombre, m.color, m.orden, m.activo, m.unidad,
       coalesce(s.kg, 0)                      as kg,
       coalesce(s.costo_total, 0)             as costo_total,
       case when coalesce(s.kg, 0) > 0 then round(s.costo_total / s.kg, 4) end as costo_promedio,
       round(coalesce(s.costo_total, 0), 2)   as valor_costo,
       m.precio_compra, m.precio_venta,
       round(coalesce(s.kg, 0) * m.precio_venta, 2) as valor_venta
  from metales m
  left join stock_metal s on s.metal_id = m.id;

-- Saldo por caja
create view v_saldo_caja with (security_invoker = on) as
select c.empresa_id, c.id as caja_id, c.nombre, c.tipo, c.activo, c.orden,
       coalesce(sum(mc.monto) filter (where mc.tipo = 'ingreso'), 0) as ingresos,
       coalesce(sum(mc.monto) filter (where mc.tipo = 'egreso'), 0)  as egresos,
       coalesce(sum(case when mc.tipo = 'ingreso' then mc.monto else -mc.monto end), 0) as saldo
  from cajas c
  left join movimientos_caja mc on mc.caja_id = c.id and not mc.anulado
 group by c.empresa_id, c.id, c.nombre, c.tipo, c.activo, c.orden;

-- Movimientos de caja con saldo acumulado por caja
create view v_movimientos_caja with (security_invoker = on) as
select mc.*,
       c.nombre as caja_nombre,
       periodo_de(mc.fecha) as periodo,
       sum(case when mc.anulado then 0 when mc.tipo = 'ingreso' then mc.monto else -mc.monto end)
         over (partition by mc.caja_id order by mc.fecha, mc.creado_en, mc.id) as saldo_acumulado
  from movimientos_caja mc
  join cajas c on c.id = mc.caja_id;

-- Compras (cabecera enriquecida)
create view v_compras with (security_invoker = on) as
select co.*,
       periodo_de(co.fecha) as periodo,
       p.nombre   as proveedor_nombre,
       p.tipo_doc as proveedor_tipo_doc,
       p.nro_doc  as proveedor_nro_doc,
       ca.nombre  as caja_nombre,
       i.kg_total, i.metales, i.metal_ids
  from compras co
  left join proveedores p on p.id = co.proveedor_id
  join cajas ca on ca.id = co.caja_id
  left join lateral (
    select coalesce(sum(ci.peso_neto_kg), 0) as kg_total,
           string_agg(distinct m.nombre, ', ') as metales,
           array_agg(distinct ci.metal_id)     as metal_ids
      from compra_items ci join metales m on m.id = ci.metal_id
     where ci.compra_id = co.id
  ) i on true;

create view v_compra_items with (security_invoker = on) as
select ci.*,
       co.numero, co.fecha, co.estado, co.proveedor_id, co.medio_pago,
       periodo_de(co.fecha) as periodo,
       (co.fecha at time zone 'America/Lima')::date as dia,
       m.nombre as metal_nombre, m.color as metal_color,
       p.nombre as proveedor_nombre
  from compra_items ci
  join compras co on co.id = ci.compra_id
  join metales m on m.id = ci.metal_id
  left join proveedores p on p.id = co.proveedor_id;

-- Ventas
create view v_ventas with (security_invoker = on) as
select ve.*,
       periodo_de(coalesce(ve.fecha_confirmacion, ve.fecha)) as periodo,
       cp.razon_social as comprador_nombre,
       cp.ruc          as comprador_ruc,
       ca.nombre       as caja_nombre,
       i.kg_salida, i.kg_recibido, i.merma_kg, i.merma_costo, i.costo_total, i.costo_vendido,
       i.metales, i.metal_ids
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

create view v_venta_items with (security_invoker = on) as
select vi.*,
       ve.numero, ve.fecha, ve.fecha_confirmacion, ve.estado, ve.comprador_id,
       periodo_de(coalesce(ve.fecha_confirmacion, ve.fecha)) as periodo,
       (coalesce(ve.fecha_confirmacion, ve.fecha) at time zone 'America/Lima')::date as dia,
       m.nombre as metal_nombre, m.color as metal_color,
       cp.razon_social as comprador_nombre
  from venta_items vi
  join ventas ve on ve.id = vi.venta_id
  join metales m on m.id = vi.metal_id
  join compradores cp on cp.id = ve.comprador_id;

-- Kardex con saldo acumulado por metal
create view v_kardex with (security_invoker = on) as
select k.*,
       m.nombre as metal_nombre,
       case k.origen_tabla
         when 'compras' then 'Compra N° ' || co.numero || coalesce(' · ' || pr.nombre, '')
         when 'ventas'  then 'Venta N° '  || ve.numero || coalesce(' · ' || cp.razon_social, '')
         when 'ajustes_inventario' then initcap(a.tipo::text) || ': ' || a.motivo
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
  left join ajustes_inventario a  on k.origen_tabla = 'ajustes_inventario' and a.id = k.origen_id;

-- Resultado mensual: ventas − costo de lo vendido − mermas − gastos (+/- ajustes de caja)
create view v_resultado_mes with (security_invoker = on) as
with
v as (
  select ve.empresa_id, periodo_de(coalesce(ve.fecha_confirmacion, ve.fecha)) as periodo,
         sum(vi.importe)          as ventas,
         sum(vi.peso_recibido_kg) as kg_vendidos,
         sum(vi.costo_vendido)    as costo_vendido,
         sum(vi.merma_costo)      as merma_venta,
         sum(vi.merma_kg)         as merma_venta_kg
    from ventas ve join venta_items vi on vi.venta_id = ve.id
   where ve.estado = 'confirmada'
   group by 1, 2),
aj as (
  select empresa_id, periodo_de(fecha) as periodo,
         -sum(costo_total) as merma_ajustes, -sum(kg) as merma_ajustes_kg
    from kardex where tipo = 'ajuste' and not anulado
   group by 1, 2),
g as (
  select empresa_id, periodo_de(fecha) as periodo, sum(monto) as gastos
    from gastos where estado = 'registrada'
   group by 1, 2),
cj as (
  select empresa_id, periodo_de(fecha) as periodo,
         sum(case when tipo = 'ingreso' then monto else -monto end) as ajustes_caja
    from movimientos_caja where origen = 'ajuste' and not anulado
   group by 1, 2),
c as (
  select co.empresa_id, periodo_de(co.fecha) as periodo,
         sum(ci.importe) as compras, sum(ci.peso_neto_kg) as kg_comprados
    from compras co join compra_items ci on ci.compra_id = co.id
   where co.estado = 'registrada'
   group by 1, 2),
p as (
  select empresa_id, periodo from v  union select empresa_id, periodo from aj
  union select empresa_id, periodo from g  union select empresa_id, periodo from cj
  union select empresa_id, periodo from c),
r as (
  select p.empresa_id, p.periodo,
         coalesce(c.compras, 0)                     as compras,
         coalesce(c.kg_comprados, 0)                as kg_comprados,
         coalesce(v.ventas, 0)                      as ventas,
         coalesce(v.kg_vendidos, 0)                 as kg_vendidos,
         round(coalesce(v.costo_vendido, 0), 2)     as costo_ventas,
         round(coalesce(v.merma_venta, 0), 2)       as merma_venta,
         coalesce(v.merma_venta_kg, 0)              as merma_venta_kg,
         round(coalesce(aj.merma_ajustes, 0), 2)    as merma_ajustes,
         coalesce(aj.merma_ajustes_kg, 0)           as merma_ajustes_kg,
         coalesce(g.gastos, 0)                      as gastos,
         coalesce(cj.ajustes_caja, 0)               as ajustes_caja
    from p
    left join v  on v.empresa_id  = p.empresa_id and v.periodo  = p.periodo
    left join aj on aj.empresa_id = p.empresa_id and aj.periodo = p.periodo
    left join g  on g.empresa_id  = p.empresa_id and g.periodo  = p.periodo
    left join cj on cj.empresa_id = p.empresa_id and cj.periodo = p.periodo
    left join c  on c.empresa_id  = p.empresa_id and c.periodo  = p.periodo)
select r.*,
       r.ventas - r.costo_ventas                                        as margen_bruto,
       r.merma_venta + r.merma_ajustes                                  as merma_total,
       r.ventas - r.costo_ventas - r.merma_venta - r.merma_ajustes
         - r.gastos + r.ajustes_caja                                    as utilidad
  from r
 where es_miembro(r.empresa_id);

-- Patrimonio actual: «¿cuánto tenemos?»
create view v_patrimonio with (security_invoker = on) as
select e.id as empresa_id,
       cj.caja,
       st.stock_costo,
       st.stock_precio_venta,
       tr.en_transito,
       ap.aportes, ap.retiros,
       ap.aportes - ap.retiros                                   as capital,
       cj.caja + st.stock_costo + tr.en_transito                 as activos,
       cj.caja + st.stock_costo + tr.en_transito - (ap.aportes - ap.retiros) as ganancia_acumulada
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
      from aportes_retiros where empresa_id = e.id and estado = 'registrada') ap;

-- Patrimonio a una fecha de corte (para cierres de mes)
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
           from aportes_retiros where empresa_id = p_empresa and estado = 'registrada' and fecha < p_hasta)
  select jsonb_build_object(
           'caja', cj.caja, 'stock_costo', st.stock_costo, 'en_transito', tr.en_transito,
           'aportes', ap.aportes, 'retiros', ap.retiros, 'capital', ap.aportes - ap.retiros,
           'activos', cj.caja + st.stock_costo + tr.en_transito,
           'ganancia_acumulada', cj.caja + st.stock_costo + tr.en_transito - (ap.aportes - ap.retiros))
    from cj, st, tr, ap
   where es_miembro(p_empresa)
$$;

-- Capital y utilidad por socio
create view v_capital_socio with (security_invoker = on) as
select s.empresa_id, s.id as socio_id, s.nombre, s.dni, s.porcentaje, s.activo,
       coalesce(sum(a.monto) filter (where a.tipo = 'aporte'), 0) as aportes,
       coalesce(sum(a.monto) filter (where a.tipo = 'retiro'), 0) as retiros,
       coalesce(sum(case when a.tipo = 'aporte' then a.monto else -a.monto end), 0) as capital
  from socios s
  left join aportes_retiros a on a.socio_id = s.id and a.estado = 'registrada'
 group by s.empresa_id, s.id, s.nombre, s.dni, s.porcentaje, s.activo;

create view v_utilidad_socio with (security_invoker = on) as
select r.empresa_id, r.periodo, s.id as socio_id, s.nombre, s.porcentaje,
       r.utilidad as utilidad_empresa,
       round(r.utilidad * s.porcentaje / 100, 2) as utilidad_socio
  from v_resultado_mes r
  join socios s on s.empresa_id = r.empresa_id and s.activo;

-- Resumen de proveedores (ficha y ranking)
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

create view v_compradores_resumen with (security_invoker = on) as
select c.*,
       coalesce(x.n_ventas, 0)   as n_ventas,
       coalesce(x.kg, 0)         as kg_total,
       coalesce(x.importe, 0)    as importe_total,
       x.ultima_venta
  from compradores c
  left join lateral (
    select count(distinct v.id) as n_ventas, sum(vi.peso_recibido_kg) as kg, sum(vi.importe) as importe,
           max(v.fecha) as ultima_venta
      from ventas v join venta_items vi on vi.venta_id = v.id
     where v.comprador_id = c.id and v.estado = 'confirmada'
  ) x on true;

create view v_gastos with (security_invoker = on) as
select g.*, cg.nombre as categoria_nombre, c.nombre as caja_nombre, periodo_de(g.fecha) as periodo
  from gastos g
  left join categorias_gasto cg on cg.id = g.categoria_id
  join cajas c on c.id = g.caja_id;

create view v_aportes_retiros with (security_invoker = on) as
select a.*, s.nombre as socio_nombre, c.nombre as caja_nombre
  from aportes_retiros a
  join socios s on s.id = a.socio_id
  join cajas c on c.id = a.caja_id;

create view v_arqueos with (security_invoker = on) as
select a.*, c.nombre as caja_nombre
  from arqueos a join cajas c on c.id = a.caja_id;

create view v_ajustes with (security_invoker = on) as
select a.*, m.nombre as metal_nombre
  from ajustes_inventario a join metales m on m.id = a.metal_id;

-- =============================================================================
-- Reportes parametrizados (rango de fechas en hora de Lima, inclusive)
-- =============================================================================
create or replace function rpt_compras(p_empresa uuid, p_desde date, p_hasta date, p_agrupar text default 'dia')
returns table (clave text, etiqueta text, n_compras bigint, kg numeric, importe numeric, precio_promedio numeric)
language sql stable
as $$
  select k.clave, k.etiqueta,
         count(distinct i.compra_id), sum(i.peso_neto_kg), sum(i.importe),
         case when sum(i.peso_neto_kg) > 0 then round(sum(i.importe) / sum(i.peso_neto_kg), 4) end
    from v_compra_items i
    cross join lateral (select
      case p_agrupar when 'mes' then i.periodo when 'metal' then i.metal_id::text
                     when 'proveedor' then coalesce(i.proveedor_id::text, '-') else i.dia::text end as clave,
      case p_agrupar when 'mes' then i.periodo when 'metal' then i.metal_nombre
                     when 'proveedor' then coalesce(i.proveedor_nombre, 'Sin documento') else to_char(i.dia, 'DD/MM/YYYY') end as etiqueta) k
   where i.empresa_id = p_empresa and i.estado = 'registrada' and i.dia between p_desde and p_hasta
   group by k.clave, k.etiqueta
   order by case when p_agrupar in ('metal', 'proveedor') then null else k.clave end,
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
    cross join lateral (select
      case p_agrupar when 'dia' then i.dia::text when 'metal' then i.metal_id::text
                     when 'comprador' then i.comprador_id::text else i.periodo end as clave,
      case p_agrupar when 'dia' then to_char(i.dia, 'DD/MM/YYYY') when 'metal' then i.metal_nombre
                     when 'comprador' then i.comprador_nombre else i.periodo end as etiqueta) k
   where i.empresa_id = p_empresa and i.estado = 'confirmada' and i.dia between p_desde and p_hasta
   group by k.clave, k.etiqueta
   order by case when p_agrupar in ('metal', 'comprador') then null else k.clave end,
            sum(i.importe) desc
$$;

create or replace function rpt_margen_metal(p_empresa uuid, p_desde date, p_hasta date)
returns table (metal_id uuid, metal text, kg_vendidos numeric, ventas numeric, costo_vendido numeric,
               precio_prom_venta numeric, costo_prom numeric, margen_kg numeric, margen_pct numeric, margen_total numeric)
language sql stable
as $$
  with b as (
    select i.metal_id, i.metal_nombre,
           sum(i.peso_recibido_kg) as kg, sum(i.importe) as ventas, round(sum(i.costo_vendido), 2) as costo
      from v_venta_items i
     where i.empresa_id = p_empresa and i.estado = 'confirmada' and i.dia between p_desde and p_hasta
     group by i.metal_id, i.metal_nombre)
  select metal_id, metal_nombre, kg, ventas, costo,
         case when kg > 0 then round(ventas / kg, 4) end,
         case when kg > 0 then round(costo / kg, 4) end,
         case when kg > 0 then round((ventas - costo) / kg, 4) end,
         case when ventas > 0 then round((ventas - costo) * 100 / ventas, 2) end,
         ventas - costo
    from b
   order by ventas - costo desc
$$;

create or replace function rpt_merma(p_empresa uuid, p_desde date, p_hasta date)
returns table (metal_id uuid, metal text, merma_venta_kg numeric, merma_venta_costo numeric,
               merma_ajuste_kg numeric, merma_ajuste_costo numeric, total_kg numeric, total_costo numeric)
language sql stable
as $$
  with mv as (
    select i.metal_id, sum(i.merma_kg) as kg, round(sum(i.merma_costo), 2) as costo
      from v_venta_items i
     where i.empresa_id = p_empresa and i.estado = 'confirmada' and i.dia between p_desde and p_hasta
     group by i.metal_id),
  ma as (
    select k.metal_id, -sum(k.kg) as kg, round(-sum(k.costo_total), 2) as costo
      from kardex k
      left join ajustes_inventario a on k.origen_tabla = 'ajustes_inventario' and a.id = k.origen_id
     where k.empresa_id = p_empresa and k.tipo = 'ajuste' and not k.anulado
       and coalesce(a.tipo, 'otro') <> 'reclasificacion'
       and (k.fecha at time zone 'America/Lima')::date between p_desde and p_hasta
     group by k.metal_id)
  select m.id, m.nombre,
         coalesce(mv.kg, 0), coalesce(mv.costo, 0), coalesce(ma.kg, 0), coalesce(ma.costo, 0),
         coalesce(mv.kg, 0) + coalesce(ma.kg, 0), coalesce(mv.costo, 0) + coalesce(ma.costo, 0)
    from metales m
    left join mv on mv.metal_id = m.id
    left join ma on ma.metal_id = m.id
   where m.empresa_id = p_empresa and (mv.metal_id is not null or ma.metal_id is not null)
   order by 8 desc
$$;

-- Libro de caja con saldo inicial y acumulado (p_caja null = todas las cajas)
create or replace function rpt_libro_caja(p_empresa uuid, p_desde date, p_hasta date, p_caja uuid default null)
returns table (fecha timestamptz, caja text, origen text, concepto text, ingreso numeric, egreso numeric, saldo numeric)
language sql stable
as $$
  with base as (
    select mc.*, c.nombre as caja_nombre
      from movimientos_caja mc join cajas c on c.id = mc.caja_id
     where mc.empresa_id = p_empresa and not mc.anulado and (p_caja is null or mc.caja_id = p_caja)),
  ini as (
    select coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0) as saldo
      from base where (fecha at time zone 'America/Lima')::date < p_desde)
  select (p_desde::timestamp at time zone 'America/Lima'), null::text, 'saldo_inicial', 'Saldo inicial',
         null::numeric, null::numeric, ini.saldo
    from ini
  union all
  select b.fecha, b.caja_nombre, b.origen::text, b.concepto,
         case when b.tipo = 'ingreso' then b.monto end,
         case when b.tipo = 'egreso' then b.monto end,
         ini.saldo + sum(case when b.tipo = 'ingreso' then b.monto else -b.monto end)
                       over (order by b.fecha, b.creado_en, b.id)
    from base b, ini
   where (b.fecha at time zone 'America/Lima')::date between p_desde and p_hasta
  order by 1, 3 desc
$$;

create or replace function rpt_ranking_proveedores(p_empresa uuid, p_desde date, p_hasta date)
returns table (proveedor_id uuid, nombre text, documento text, n_compras bigint, kg numeric, importe numeric, ultima_compra timestamptz)
language sql stable
as $$
  select p.id, p.nombre,
         case when p.nro_doc is null then 'Sin documento' else p.tipo_doc || ' ' || p.nro_doc end,
         count(distinct i.compra_id), sum(i.peso_neto_kg), sum(i.importe), max(i.fecha)
    from v_compra_items i join proveedores p on p.id = i.proveedor_id
   where i.empresa_id = p_empresa and i.estado = 'registrada' and i.dia between p_desde and p_hasta
   group by p.id, p.nombre, p.tipo_doc, p.nro_doc
   order by sum(i.importe) desc
$$;

-- Tarjetas del dashboard
create or replace function dashboard(p_empresa uuid)
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'caja',               p.caja,
    'stock_costo',        p.stock_costo,
    'stock_precio_venta', p.stock_precio_venta,
    'en_transito',        p.en_transito,
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
    'ventas_pendientes',  (select count(*) from ventas where empresa_id = p_empresa and estado = 'pendiente'))
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

-- =============================================================================
-- Cierre de mes
-- =============================================================================
create or replace function cerrar_mes(p_empresa uuid, p_periodo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_fin      timestamptz;
  v_snapshot jsonb;
  v_actual   cierres_mes;
begin
  perform exigir_rol(p_empresa, '{dueno}');
  if p_periodo !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Periodo inválido (use AAAA-MM).'; end if;
  if p_periodo > periodo_de(now()) then raise exception 'No se puede cerrar un periodo futuro.'; end if;

  select * into v_actual from cierres_mes where empresa_id = p_empresa and periodo = p_periodo;
  if found and v_actual.estado = 'cerrado' then raise exception 'El periodo % ya está cerrado.', p_periodo; end if;

  v_fin := ((p_periodo || '-01')::date + interval '1 month')::timestamp at time zone 'America/Lima';

  v_snapshot := jsonb_build_object(
    'periodo',     p_periodo,
    'resultado',   (select to_jsonb(r) - 'empresa_id' from v_resultado_mes r
                     where r.empresa_id = p_empresa and r.periodo = p_periodo),
    'patrimonio',  patrimonio_al(p_empresa, v_fin),
    'stock',       (select jsonb_agg(jsonb_build_object('metal', m.nombre, 'kg', x.kg, 'costo', round(x.costo, 2)) order by m.orden, m.nombre)
                      from (select metal_id, sum(kg) as kg, sum(costo_total) as costo
                              from kardex where empresa_id = p_empresa and not anulado and fecha < v_fin
                             group by metal_id) x
                      join metales m on m.id = x.metal_id
                     where x.kg <> 0 or x.costo <> 0),
    'utilidad_socios', (select jsonb_agg(jsonb_build_object('socio', nombre, 'porcentaje', porcentaje, 'utilidad', utilidad_socio))
                          from v_utilidad_socio where empresa_id = p_empresa and periodo = p_periodo),
    'generado_en', now());

  insert into cierres_mes (empresa_id, periodo, estado, snapshot, cerrado_por, cerrado_en)
  values (p_empresa, p_periodo, 'cerrado', v_snapshot, auth.uid(), now())
  on conflict (empresa_id, periodo) do update
     set estado = 'cerrado', snapshot = excluded.snapshot, cerrado_por = excluded.cerrado_por, cerrado_en = now();
end $$;

create or replace function reabrir_mes(p_empresa uuid, p_periodo text, p_motivo text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform exigir_rol(p_empresa, '{dueno}');
  if _texto(p_motivo) is null then raise exception 'Indique el motivo de la reapertura.'; end if;
  update cierres_mes
     set estado = 'reabierto', reabierto_por = auth.uid(), reabierto_en = now(), motivo_reapertura = _texto(p_motivo)
   where empresa_id = p_empresa and periodo = p_periodo and estado = 'cerrado';
  if not found then raise exception 'El periodo % no está cerrado.', p_periodo; end if;
end $$;
