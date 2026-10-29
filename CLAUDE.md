# CLAUDE.md

Sistema de compra-venta de metales (chatarra). Especificación: `PROPUESTA_SISTEMA_CHATARRA.md`; cambios de la
reunión del 23/10 en `Sistema de Reciclaje Otiniano — Requerimientos.md` (mandan sobre la propuesta).
UI y textos en **español (Perú)**. Lo marcado **[CONFIRMAR]** en la propuesta no se inventa: se deja configurable.

## Comandos
- `pnpm test` — pruebas de BD en PGlite (casos §8, RLS, scripts) + PDF. Correr tras cualquier cambio SQL.
- `pnpm db:validar` — solo aplica migraciones en PGlite.
- `pnpm typecheck && pnpm lint && pnpm build` antes de dar algo por terminado.
- Supabase es **en la nube** (sin Docker): `pnpm db:push` sube migraciones.

## Reglas
- Lógica de dinero/inventario SOLO en Postgres (RPC + vistas). El front no calcula montos oficiales;
  `src/lib/montos.ts` es solo para la vista previa en vivo (enteros: gramos y céntimos).
- Tablas de operación sin políticas de escritura: se escriben vía funciones `SECURITY DEFINER` que
  llaman `exigir_rol()`. Funciones internas empiezan con `_` y no se exponen.
- Toda tabla de negocio lleva `empresa_id`; nunca filtrar empresa solo en el frontend.
- No borrar: anular con motivo. Migraciones ya desplegadas no se editan; se agrega una nueva.
- Costo valorizado al céntimo en cada salida (`_stock_salida`) para que patrimonio y resultados cuadren exacto.
- Roles: Gerencia = `dueno`, Administración = `administrador`, Almacén = `cajero` (`balancero`/`socio` heredados).
  Productos = tabla `metales` con jerarquía libre (`padre_id`, `v_productos`, stock por nivel en `v_stock_arbol`);
  en la UI se dice «producto», no «metal». Precio sugerido según proveedor mayorista/minorista (`_precio_sugerido`).
- Ticket emitido: el almacén no lo edita; `corregir_compra` (Gerencia/Administración) ajusta stock y caja y deja
  registro en `correcciones_compra`. Limpieza (`registrar_limpieza`, ruta `/limpieza`, antes Despacho) guarda la merma
  en kg y S/ y pasa el material separado a otro producto (`limpieza_traslados`, kardex `traslado`).
- Medios de pago editables en `medios_pago` (tipo base + caja); las RPC reciben `p_medio`.
- Navegación por módulos (Compras, Ventas, Contactos, Inventario, Caja y finanzas) en `src/components/shell/modulos.ts`:
  menú lateral y pestañas salen de ahí. Reportes de cada módulo con `VistaReportes` (`ids` + `base`).
- Marca Grupo Otiniano: azul del logo (`marca-*`, neutros fríos en la escala `stone`). Originales en `Logotipos/`,
  recortes en `public/marca/`. Login y `/restablecer` usan `EscenaMarca` (fondo oscuro fijo, animaciones en `globals.css`).
  Login = correo y contraseña (el sistema lleva al panel según el rol). «Ingreso directo por rol» solo en `pnpm dev`
  (`usuariosDev` en `src/lib/dev-login.ts`: usuario de prueba de cada rol en la empresa DEV_LOGIN_EMPRESA), y solo
  abriendo en localhost (`esHostLocal`; desde la IP de la red no aparece). Todo `next` de redirección pasa por `destinoSeguro`.
- Barra lateral azul FIJA (claro y oscuro): `fondo-lateral` + tokens `lateral-*` (fuera del bloque oscuro) y
  `ACENTO_LATERAL` por módulo en `modulos.ts`. Dentro de ella no usar `stone-*`/`TONOS`/`bg-superficie` (se invierten).
- Módulos = familia de azules, claves por módulo (`TONOS.compras` sky, `ventas` anil, `contactos` cyan, `inventario`
  acero, `caja` blue); hero en `FONDOS` de `panel-modulo.tsx`. Verde/rojo/ámbar solo para estados (`Insignia` con punto).
- Modo oscuro = variables de color redefinidas en `globals.css` (sin clases `dark:`). Usar `bg-superficie`,
  nunca `bg-white`; colores de módulo vía `TONOS`. Si se usa un color nuevo con tinte, agregarlo al bloque oscuro.
- Resúmenes de módulo (`resumen_compras/ventas/inventario`) y fichas por metal salen de la BD (`src/components/resumen-modulo.tsx`).
- Apertura/cierre de caja = `turnos_caja` (`abrir_caja`, `cerrar_caja`, `resumen_turno`): no bloquean operaciones;
  el ticket de cierre (`/imprimir/cierre/[id]`) y los de compra/venta son HTML de 80 mm (`components/ticket`), no PDF.
- Responsive real: `TablaDatos` (tabla en escritorio, tarjetas en celular); sin scroll horizontal de página.
- Server actions sin `revalidatePath` (re-arma la página dentro de la respuesta y el botón queda colgado):
  el cliente llama `router.refresh()` tras el éxito (`FormularioAccion` ya lo hace). Descargas de Excel con `EnlaceDescarga`.
- Server actions devuelven `Resultado` (`ok`/`fallo` de `src/lib/acciones.ts`); permisos de UI en
  `src/lib/permisos.ts` (espejo de la RLS, no la reemplaza).
