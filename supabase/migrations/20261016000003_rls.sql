-- =============================================================================
-- 003 · RLS en todas las tablas de negocio
-- Lectura: cualquier miembro activo de la empresa.
-- Escritura de maestros: según rol. Escritura de operaciones: SOLO vía funciones RPC
-- (SECURITY DEFINER) → no hay políticas insert/update para esas tablas.
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'metales','precios_metal','proveedores','compradores','cajas','categorias_gasto',
    'stock_metal','kardex','compras','compra_items','ventas','venta_items','ajustes_inventario',
    'movimientos_caja','gastos','traspasos','arqueos','socios','aportes_retiros','cierres_mes']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (es_miembro(empresa_id))',
                   t || '_select', t);
  end loop;
end $$;

-- Metales y precios del día: solo el dueño
create policy metales_insert on metales for insert to authenticated
  with check (tiene_rol(empresa_id, '{dueno}'));
create policy metales_update on metales for update to authenticated
  using (tiene_rol(empresa_id, '{dueno}')) with check (tiene_rol(empresa_id, '{dueno}'));

-- Proveedores: cualquiera que compre puede registrarlos en el mostrador
create policy proveedores_insert on proveedores for insert to authenticated
  with check (tiene_rol(empresa_id, '{dueno,cajero,balancero}'));
create policy proveedores_update on proveedores for update to authenticated
  using (tiene_rol(empresa_id, '{dueno,cajero}')) with check (tiene_rol(empresa_id, '{dueno,cajero}'));

-- Compradores
create policy compradores_insert on compradores for insert to authenticated
  with check (tiene_rol(empresa_id, '{dueno,cajero}'));
create policy compradores_update on compradores for update to authenticated
  using (tiene_rol(empresa_id, '{dueno,cajero}')) with check (tiene_rol(empresa_id, '{dueno,cajero}'));

-- Configuración: cajas, categorías, socios → dueño
create policy cajas_insert on cajas for insert to authenticated
  with check (tiene_rol(empresa_id, '{dueno}'));
create policy cajas_update on cajas for update to authenticated
  using (tiene_rol(empresa_id, '{dueno}')) with check (tiene_rol(empresa_id, '{dueno}'));

create policy categorias_gasto_insert on categorias_gasto for insert to authenticated
  with check (tiene_rol(empresa_id, '{dueno}'));
create policy categorias_gasto_update on categorias_gasto for update to authenticated
  using (tiene_rol(empresa_id, '{dueno}')) with check (tiene_rol(empresa_id, '{dueno}'));

create policy socios_insert on socios for insert to authenticated
  with check (tiene_rol(empresa_id, '{dueno}'));
create policy socios_update on socios for update to authenticated
  using (tiene_rol(empresa_id, '{dueno}')) with check (tiene_rol(empresa_id, '{dueno}'));

-- Notas y fotos de compras/ventas se actualizan vía RPC también (ver 004).
