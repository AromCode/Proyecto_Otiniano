# Sistema Metales — compra y venta de chatarra

Sistema web (PWA) para el negocio de compra-venta de metales de Otiniano: compras en mostrador
desde el celular, ventas a compradores mayores con merma, inventario a costo promedio, caja,
socios y reportes. Multiempresa desde el día uno. Especificación: `PROPUESTA_SISTEMA_CHATARRA.md`.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 · Supabase (Postgres, Auth,
Storage, RLS) · pnpm.

---

## Puesta en marcha (Supabase en la nube)

### 1. Crear el proyecto en Supabase
1. En <https://supabase.com/dashboard> → **New project** (región: *South America (São Paulo)*).
2. En **Project Settings → API** copie: `Project URL`, `anon`/`publishable key` y `service_role`/`secret key`.
3. En **Authentication → Sign In / Providers → Email**: desactive *Allow new users to sign up*
   (los usuarios los crea el dueño desde la app).

### 2. Variables de entorno
```bash
cp .env.example .env.local    # y complete los tres valores
```

### 3. Subir el esquema de base de datos
**Opción A — CLI (recomendada):**
```bash
pnpm exec supabase login          # abre el navegador una vez
pnpm db:link                      # elija su proyecto (pide la contraseña de la BD)
pnpm db:push                      # aplica supabase/migrations/*.sql
```
**Opción B — a mano:** en **SQL Editor**, pegue y ejecute en orden cada archivo de
`supabase/migrations/` (001 → 006).

### 4. Crear la empresa y el usuario dueño
1. **Authentication → Users → Add user** (correo + contraseña, marque *Auto Confirm User*).
2. En **SQL Editor** ejecute `supabase/scripts/01_crear_empresa.sql` con ese correo.
3. *(Opcional, solo en una empresa de prueba)* `supabase/scripts/02_datos_demo.sql` carga datos inventados.

### 5. Ejecutar
```bash
pnpm install
pnpm dev          # http://localhost:3000
```

### Despliegue
Vercel: importe el repositorio, cargue las mismas variables de entorno y despliegue.
En Supabase → **Authentication → URL Configuration** agregue la URL de producción.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Compilación de producción |
| `pnpm test` | Pruebas: casos §8 de la propuesta, RLS multiempresa, scripts, PDF (Postgres embebido, sin red) |
| `pnpm db:validar` | Aplica las migraciones en un Postgres embebido y reporta errores de SQL |
| `pnpm db:push` | Sube migraciones nuevas a Supabase |
| `pnpm db:types` | Genera tipos TypeScript desde la BD enlazada |
| `pnpm typecheck` / `pnpm lint` | Verificación estática |

## Flujo de desarrollo

1. **Migración nueva** en `supabase/migrations/AAAAMMDDHHMMSS_nombre.sql`. Nunca editar una migración
   ya subida a producción: se crea otra.
2. **Prueba** en `tests/db/` (PGlite) con el caso de negocio. `pnpm test`.
3. **Pantalla**: Server Component lee vistas; las escrituras van por *server actions* que llaman RPC.
4. `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
5. Rama → PR → vista previa en Vercel → probar en celular → merge → `pnpm db:push` antes del deploy.

## Arquitectura (reglas del proyecto)

- **El dinero y el inventario se calculan en la BD.** Compras, ventas, anulaciones, ajustes, gastos,
  traspasos, aportes y cierres son funciones RPC transaccionales (`supabase/migrations/…_funciones.sql`).
  Los totales salen de vistas (`v_*`) y funciones `rpt_*`. La pantalla solo muestra.
- **RLS en todas las tablas.** Lectura: miembros de la empresa. Las tablas de operación no tienen
  políticas de escritura: solo se modifican vía RPC (`SECURITY DEFINER`) que validan el rol.
- **Nada se borra.** Se anula con motivo y usuario; un trigger impide `DELETE`.
- **Montos** `numeric(14,2)`, **pesos** `numeric(12,3)`; el costo se valoriza al céntimo en cada salida
  para que *caja + stock − capital* = *suma de utilidades* exacto.
- **Costo promedio ponderado** por metal en `stock_metal`, con libro `kardex`.
- **Cierre de mes**: guarda snapshot y un trigger bloquea cambios del periodo hasta reabrirlo.
- **Archivos** (tickets, guías, comprobantes) en el bucket privado `archivos/{empresa_id}/…`.

```
src/
  app/(app)/        pantallas autenticadas (comprar, compras, vender, ventas, inventario, caja,
                    precios, proveedores, compradores, socios, reportes, configuracion)
  app/login         acceso
  components/ui     botones, campos, tabla→tarjetas en celular, modal, formularios
  lib/              contexto (usuario/empresa/rol), permisos, formato es-PE, montos, reportes, pdf
supabase/
  migrations/       esquema, RLS, RPC, vistas, storage
  scripts/          alta de empresa y datos demo
tests/              pruebas (PGlite)
```

## Pendiente de confirmar con el cliente  `[CONFIRMAR]`

Configurables ya en la app (Configuración / Precios): monto desde el que se exige DNI, quién puede
cambiar el precio en el mostrador, lista de metales y variantes, cajas, socios y porcentajes.

Sin implementar hasta que el cliente responda: ventas/compras **a crédito**, ventas en **dólares**,
**varios locales**, compras **por unidad** (baterías, motores), emisión electrónica **SUNAT** (fase 4),
**sorteos** (fase 4; el ranking de proveedores ya existe).
