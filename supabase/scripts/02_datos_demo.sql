-- =============================================================================
-- Datos de prueba INVENTADOS. Crea una empresa APARTE ("Metales Demo (pruebas)")
-- con el mismo dueño, para no ensuciar la empresa real (nada se borra, solo se anula).
-- Cambie el correo y ejecútelo completo en Supabase → SQL Editor
-- o con: pnpm sb db query --linked -f supabase/scripts/02_datos_demo.sql
-- Opera con las mismas funciones RPC que la app (como el usuario dueño).
-- =============================================================================

do $$
declare
  v_email   text := 'dueno@ejemplo.com';   -- ← dueño (ya creado en Auth)
  v_razon   text := 'Metales Demo (pruebas)';
  v_user    uuid;
  v_emp     uuid;
  v_caja    uuid;
  v_banco   uuid;
  v_socio1  uuid;
  v_socio2  uuid;
  v_cobre   uuid;
  v_bronce  uuid;
  v_alum    uuid;
  v_fierro  uuid;
  v_comp    uuid;
  v_prov    uuid[];
  v_venta   jsonb;
  v_item    uuid;
  i         int;
begin
  select id into v_user from auth.users where lower(email) = lower(v_email);
  if v_user is null then raise exception 'No existe el usuario %', v_email; end if;
  if exists (select 1 from empresas where razon_social = v_razon) then
    raise exception 'La empresa "%" ya existe: los datos demo ya fueron cargados.', v_razon;
  end if;
  v_emp := admin_crear_empresa(v_razon, null, v_email);

  -- Actuar como el dueño (las RPC validan rol con auth.uid())
  perform set_config('request.jwt.claim.sub', v_user::text, true);

  select id into v_caja  from cajas where empresa_id = v_emp and tipo = 'efectivo' order by orden limit 1;
  select id into v_banco from cajas where empresa_id = v_emp and tipo = 'banco' order by orden limit 1;

  insert into metales (empresa_id, nombre, color, orden, precio_compra, precio_venta) values
    (v_emp, 'Cobre',    '#c2621f', 1, 30.00, 34.50) returning id into v_cobre;
  insert into metales (empresa_id, nombre, color, orden, precio_compra, precio_venta) values
    (v_emp, 'Bronce',   '#b8862e', 2, 20.00, 23.00) returning id into v_bronce;
  insert into metales (empresa_id, nombre, color, orden, precio_compra, precio_venta) values
    (v_emp, 'Aluminio', '#9ca3af', 3,  4.50,  5.60) returning id into v_alum;
  insert into metales (empresa_id, nombre, color, orden, precio_compra, precio_venta) values
    (v_emp, 'Fierro',   '#57534e', 4,  0.80,  1.05) returning id into v_fierro;

  insert into socios (empresa_id, nombre, porcentaje) values (v_emp, 'Socio A (demo)', 50) returning id into v_socio1;
  insert into socios (empresa_id, nombre, porcentaje) values (v_emp, 'Socio B (demo)', 50) returning id into v_socio2;
  perform registrar_aporte_retiro(v_emp, v_socio1, 'aporte', 10000, v_caja, 'Capital inicial');
  perform registrar_aporte_retiro(v_emp, v_socio2, 'aporte', 10000, v_caja, 'Capital inicial');

  insert into proveedores (empresa_id, tipo_doc, nro_doc, nombre, telefono) values
    (v_emp, 'DNI', '40000001', 'Juan Demo Quispe', '900000001'),
    (v_emp, 'DNI', '40000002', 'María Demo Huamán', '900000002'),
    (v_emp, 'DNI', '40000003', 'Pedro Demo Rojas', null),
    (v_emp, 'RUC', '20000000001', 'Reciclajes Demo EIRL', '014000000');
  select array_agg(id order by nro_doc) into v_prov from proveedores where empresa_id = v_emp and nro_doc like '%0000%';

  insert into compradores (empresa_id, ruc, razon_social, contacto)
  values (v_emp, '20999999991', 'Fundición Demo SAC', 'Sr. Comprador') returning id into v_comp;

  -- 12 compras variadas
  for i in 1..12 loop
    perform registrar_compra(
      v_emp,
      jsonb_build_array(
        jsonb_build_object('metal_id', case i % 3 when 0 then v_cobre when 1 then v_bronce else v_alum end,
                           'peso_bruto_kg', (5 + i * 3.25)::text, 'descuento_kg', (i % 4 * 0.25)::text),
        jsonb_build_object('metal_id', v_fierro, 'peso_bruto_kg', (20 + i * 7)::text, 'descuento_kg', '0.5')
      ),
      v_caja, 'efectivo',
      case when i % 5 = 0 then null else v_prov[1 + i % array_length(v_prov, 1)] end,
      'Compra de prueba ' || i);
  end loop;

  -- Una venta confirmada con merma y una pendiente
  v_venta := registrar_venta(v_emp, v_comp,
    jsonb_build_array(jsonb_build_object('metal_id', v_cobre, 'peso_salida_kg', '40', 'peso_recibido_kg', '39.6', 'precio_kg', '34.50')),
    'T001-000001', null, 'Venta demo', null, null, v_banco, 'transferencia');
  v_venta := registrar_venta(v_emp, v_comp,
    jsonb_build_array(jsonb_build_object('metal_id', v_fierro, 'peso_salida_kg', '300')),
    'T001-000002', null, 'Venta demo pendiente de pesaje');

  perform registrar_gasto(v_emp, v_caja, 800, 'Alquiler del local (demo)',
    (select id from categorias_gasto where empresa_id = v_emp and nombre = 'Alquiler'));
  perform registrar_gasto(v_emp, v_caja, 120.50, 'Luz (demo)',
    (select id from categorias_gasto where empresa_id = v_emp and nombre = 'Luz y agua'));
  perform registrar_traspaso(v_emp, v_caja, v_banco, 5000, 'Depósito al banco (demo)');
  perform registrar_ajuste(v_emp, v_alum, -0.75, 'Humedad detectada en conteo (demo)', 'merma');

  raise notice 'Datos demo cargados en la empresa %', v_emp;
end $$;
