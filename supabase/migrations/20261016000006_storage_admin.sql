-- =============================================================================
-- 006 · Storage (fotos de tickets, guías, comprobantes) y administración
-- =============================================================================

-- Bucket privado. Ruta obligatoria: {empresa_id}/{carpeta}/{archivo}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('archivos', 'archivos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create or replace function es_miembro_ruta(p_nombre text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare v_primera text := split_part(p_nombre, '/', 1);
begin
  if v_primera !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return es_miembro(v_primera::uuid);
end $$;

create policy archivos_select on storage.objects for select to authenticated
  using (bucket_id = 'archivos' and es_miembro_ruta(name));
create policy archivos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'archivos' and es_miembro_ruta(name));

-- -----------------------------------------------------------------------------
-- Alta de empresa (fase 0–2: se ejecuta a mano desde el SQL Editor de Supabase)
-- El usuario dueño debe existir antes en Authentication → Users.
-- -----------------------------------------------------------------------------
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

  insert into categorias_gasto (empresa_id, nombre)
  select v_empresa, unnest(array['Alquiler', 'Luz y agua', 'Personal', 'Flete', 'Combustible',
                                 'Movilidad', 'Mantenimiento', 'Otros']);
  return v_empresa;
end $$;

revoke execute on function admin_crear_empresa(text, text, text, text) from public, anon, authenticated;

-- Al dar de alta un usuario desde la app (service_role) se agrega como miembro
create or replace function admin_agregar_miembro(p_empresa uuid, p_user uuid, p_rol rol_miembro, p_nombre text, p_email text)
returns void
language sql security definer set search_path = public
as $$
  insert into miembros (empresa_id, user_id, rol, nombre, email)
  values (p_empresa, p_user, p_rol, p_nombre, lower(p_email))
  on conflict (empresa_id, user_id) do update set rol = excluded.rol, activo = true, nombre = excluded.nombre
$$;
revoke execute on function admin_agregar_miembro(uuid, uuid, rol_miembro, text, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Permisos de ejecución: nada para anónimos; internas y admin solo service_role
-- -----------------------------------------------------------------------------
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

-- Funciones creadas a futuro en public no quedan abiertas a anon por defecto
alter default privileges in schema public revoke execute on functions from public, anon;
