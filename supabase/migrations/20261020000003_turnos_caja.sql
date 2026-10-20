-- =============================================================================
-- Apertura y cierre de caja (turnos)
--  · Abrir: el cajero cuenta el efectivo con que empieza; queda el saldo del sistema en ese momento.
--  · Cerrar: cuenta lo que hay al final; el sistema arma el resumen del turno (inicio + ingresos −
--    egresos = esperado) y guarda la diferencia con lo contado. El dueño puede ajustar la caja.
--  · Una caja tiene a lo más un turno abierto. Los turnos no bloquean compras ni ventas:
--    son el cuadre del día que se imprime y firma.
-- Los movimientos del turno son los registrados (creado_en) entre la apertura y el cierre.
-- =============================================================================

create table turnos_caja (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid not null references empresas(id) on delete cascade,
  caja_id            uuid not null references cajas(id),
  numero             integer not null,
  abierto_en         timestamptz not null default clock_timestamp(),
  abierto_por        uuid default auth.uid(),
  saldo_apertura     numeric(14,2) not null,
  contado_apertura   numeric(14,2) not null check (contado_apertura >= 0),
  diferencia_apertura numeric(14,2) generated always as (contado_apertura - saldo_apertura) stored,
  nota_apertura      text,
  cerrado_en         timestamptz,
  cerrado_por        uuid,
  saldo_cierre       numeric(14,2),
  contado_cierre     numeric(14,2) check (contado_cierre >= 0),
  diferencia_cierre  numeric(14,2) generated always as (contado_cierre - saldo_cierre) stored,
  ajustado           boolean not null default false,
  nota_cierre        text,
  unique (empresa_id, numero)
);
create unique index turnos_caja_un_abierto on turnos_caja (caja_id) where cerrado_en is null;
create index on turnos_caja (empresa_id, abierto_en desc);

alter table turnos_caja enable row level security;
create policy turnos_caja_select on turnos_caja for select to authenticated using (es_miembro(empresa_id));

create view v_turnos_caja with (security_invoker = on) as
select t.*, c.nombre as caja_nombre, c.tipo as caja_tipo,
       ma.nombre as abierto_por_nombre, mc.nombre as cerrado_por_nombre
  from turnos_caja t
  join cajas c on c.id = t.caja_id
  left join miembros ma on ma.empresa_id = t.empresa_id and ma.user_id = t.abierto_por
  left join miembros mc on mc.empresa_id = t.empresa_id and mc.user_id = t.cerrado_por;

create or replace function abrir_caja(p_empresa uuid, p_caja uuid, p_contado numeric, p_nota text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  c cajas;
  t turnos_caja;
begin
  perform exigir_rol(p_empresa, '{dueno,cajero}');
  c := _validar_caja(p_empresa, p_caja);
  if p_contado is null or p_contado < 0 then raise exception 'El monto contado no puede ser negativo.'; end if;
  perform 1 from cajas where id = p_caja for update;  -- dos aperturas a la vez: una espera a la otra
  if exists (select 1 from turnos_caja where caja_id = p_caja and cerrado_en is null) then
    raise exception 'La caja % ya está abierta. Ciérrela antes de abrir otro turno.', c.nombre;
  end if;

  insert into turnos_caja (empresa_id, caja_id, numero, saldo_apertura, contado_apertura, nota_apertura, abierto_por)
  values (p_empresa, p_caja, siguiente_numero(p_empresa, 'turno_caja'), saldo_caja(p_caja), round(p_contado, 2),
          _texto(p_nota), auth.uid())
  returning * into t;

  return jsonb_build_object('id', t.id, 'numero', t.numero, 'saldo_apertura', t.saldo_apertura,
                            'contado_apertura', t.contado_apertura, 'diferencia', t.diferencia_apertura);
end $$;

-- Resumen del turno (abierto: hasta ahora). Con los permisos de quien consulta (RLS).
create or replace function resumen_turno(p_turno uuid)
returns jsonb
language plpgsql stable set search_path = public
as $$
declare
  t      v_turnos_caja;
  v_hasta timestamptz;
  v_ing  numeric(14,2);
  v_egr  numeric(14,2);
  v_esp  numeric(14,2);
  v_sist numeric(14,2);
  v_det  jsonb;
  v_anul integer;
begin
  select * into t from v_turnos_caja where id = p_turno;
  if not found then raise exception 'Turno no encontrado.'; end if;
  v_hasta := coalesce(t.cerrado_en, clock_timestamp());

  select coalesce(sum(monto) filter (where tipo = 'ingreso' and not anulado), 0),
         coalesce(sum(monto) filter (where tipo = 'egreso' and not anulado), 0),
         count(*) filter (where anulado)
    into v_ing, v_egr, v_anul
    from movimientos_caja
   where caja_id = t.caja_id and creado_en >= t.abierto_en and creado_en <= v_hasta;

  select coalesce(jsonb_agg(jsonb_build_object('origen', origen, 'tipo', tipo, 'cantidad', n, 'monto', total)
                            order by tipo desc, total desc), '[]'::jsonb)
    into v_det
    from (select origen, tipo, count(*) as n, sum(monto) as total
            from movimientos_caja
           where caja_id = t.caja_id and creado_en >= t.abierto_en and creado_en <= v_hasta and not anulado
           group by origen, tipo) x;

  v_esp  := t.saldo_apertura + v_ing - v_egr;
  v_sist := coalesce(t.saldo_cierre, saldo_caja(t.caja_id));

  return jsonb_build_object(
    'id', t.id, 'numero', t.numero, 'caja', t.caja_nombre, 'caja_id', t.caja_id,
    'abierto_en', t.abierto_en, 'abierto_por', t.abierto_por_nombre,
    'cerrado_en', t.cerrado_en, 'cerrado_por', t.cerrado_por_nombre,
    'saldo_apertura', t.saldo_apertura, 'contado_apertura', t.contado_apertura,
    'diferencia_apertura', t.diferencia_apertura,
    'ingresos', v_ing, 'egresos', v_egr, 'esperado', v_esp,
    -- Cambios fuera del turno que mueven el saldo (p. ej. anular una compra de otro día)
    'otros', v_sist - v_esp,
    'saldo_sistema', v_sist,
    'contado_cierre', t.contado_cierre, 'diferencia_cierre', t.diferencia_cierre,
    'ajustado', t.ajustado, 'nota_apertura', t.nota_apertura, 'nota_cierre', t.nota_cierre,
    'anulados', v_anul, 'detalle', v_det);
end $$;

-- Cierre: p_ajustar (solo dueño) registra un ajuste para que la caja quede igual a lo contado.
create or replace function cerrar_caja(p_turno uuid, p_contado numeric, p_nota text default null, p_ajustar boolean default false)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rol rol_miembro;
  t     turnos_caja;
begin
  select * into t from turnos_caja where id = p_turno for update;
  if not found then raise exception 'Turno no encontrado.'; end if;
  v_rol := exigir_rol(t.empresa_id, '{dueno,cajero}');
  if t.cerrado_en is not null then raise exception 'El turno N° % ya está cerrado.', t.numero; end if;
  if p_contado is null or p_contado < 0 then raise exception 'El monto contado no puede ser negativo.'; end if;
  if p_ajustar and v_rol <> 'dueno' then raise exception 'Solo el dueño puede ajustar la caja.'; end if;

  update turnos_caja
     set cerrado_en = clock_timestamp(), cerrado_por = auth.uid(), saldo_cierre = saldo_caja(t.caja_id),
         contado_cierre = round(p_contado, 2), nota_cierre = _texto(p_nota)
   where id = p_turno
  returning * into t;

  if p_ajustar and t.diferencia_cierre <> 0 then
    perform _mov_caja(t.empresa_id, t.caja_id, now(),
                      case when t.diferencia_cierre > 0 then 'ingreso'::tipo_mov_caja else 'egreso'::tipo_mov_caja end,
                      'ajuste', t.id, abs(t.diferencia_cierre), 'Ajuste por cierre de caja N° ' || t.numero);
    update turnos_caja set ajustado = true where id = p_turno;
  end if;

  return resumen_turno(p_turno);
end $$;
