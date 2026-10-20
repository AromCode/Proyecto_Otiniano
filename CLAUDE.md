# CLAUDE.md

Sistema de compra-venta de metales (chatarra). Especificación: `PROPUESTA_SISTEMA_CHATARRA.md`.
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
- Navegación por módulos (Compras, Ventas, Contactos, Inventario, Caja y finanzas) en `src/components/shell/modulos.ts`:
  menú lateral y pestañas salen de ahí. Reportes de cada módulo con `VistaReportes` (`ids` + `base`).
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
