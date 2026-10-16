-- =============================================================================
-- Alta de la empresa (Sprint 0). Ejecutar en Supabase → SQL Editor.
-- ANTES: crear el usuario dueño en Authentication → Users → "Add user"
--        (con "Auto Confirm User" marcado).
-- =============================================================================

select admin_crear_empresa(
  'Metales Otiniano',          -- razón social  [CONFIRMAR con el cliente]
  null,                        -- RUC (11 dígitos) o null
  'dueno@ejemplo.com',         -- correo del usuario dueño ya creado en Auth
  'Otiniano'                   -- nombre a mostrar
);
