# Propuesta de desarrollo: sistema para compra-venta de metales (chatarra)

> **Para quien desarrolla (y para Claude Code):** este documento es la especificación de partida.
> Léelo completo antes de escribir código. Lo marcado como **[CONFIRMAR]** no está decidido: no lo
> inventes; déjalo configurable o pregúntalo. Responde y escribe la UI en **español (Perú)**.

---

## 1. Contexto

Un cliente nuestro (Otiniano, el mismo del ERP de transportes) tiene con un primo, **en sociedad**,
un negocio de **compra y venta de metales**: cobre, bronce, aluminio, etc.

Cómo funciona hoy, según lo que contó en la reunión del 09/10/2026:

- En el local llega gente de a pie y les **vende metal**: desde «un kilito de cobre» hasta media
  tonelada o una tonelada. **Esa gente no emite factura.**
- Ellos acumulan y luego **venden** a un comprador mayor. Para movilizar la mercadería **hacen una
  guía**.
- Siempre hay **merma**: lo que se compró no es exactamente lo que pesa o se vende al final.
- Como es sociedad, a fin de mes necesitan saber **si ganaron o perdieron**: «iniciamos con 20 mil y
  ahora tenemos 21, 22 o 23 mil»; «hay tanto en plata y el resto está en producto».
- Quiere **registrar a los que les venden**: tener una base, y en algún momento motivarlos, por
  ejemplo con un **sorteo de Navidad** (canastas, chocolatada).
- Preguntó si existe algo tipo SaaS donde «uno se registra y ya hace sus movimientos». **Decisión:**
  se construye a medida para él, pero **multiempresa desde el día uno**, para poder ofrecérselo a
  otros negocios después sin rehacerlo (ver §3).

**Objetivo del producto:** que en cualquier momento el dueño vea **cuánto tiene en caja, cuánto en
mercadería (kilos × costo) y cuánto ganó**, por metal y por mes, con un registro de compras rápido de
hacer en el mostrador desde el celular.

---

## 2. Alcance

### Dentro (MVP)
1. Maestro de **metales** con precio de compra y de venta del día.
2. **Proveedores** (los que nos venden), con búsqueda por DNI/RUC.
3. **Compras** en el mostrador: rápida, desde celular, con ticket imprimible.
4. **Ventas** a compradores mayores, con guía de traslado.
5. **Inventario** por metal (kilos y costo promedio) y **merma**.
6. **Caja**: ingresos, egresos, saldo.
7. **Socios y capital**: aportes, retiros, utilidad por socio.
8. **Reportes y dashboard**, con exportación a Excel y PDF.
9. **Usuarios y roles**.

### Fuera del MVP (fase 2 o más)
- Emisión electrónica a SUNAT (liquidación de compra, guía de remisión remitente, facturas).
- Sorteos / programa de puntos para proveedores.
- Autorregistro de nuevas empresas (SaaS abierto con planes y pagos).
- App offline.

---

## 3. Stack y arquitectura

Mismo stack que el ERP de transportes, para reutilizar piezas y que el equipo no cambie de contexto:

- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind**.
- **Supabase**: Postgres, Auth, Storage (fotos de tickets de balanza, comprobantes), RLS.
- **PWA**: el registro de compras se hace en celular en el mostrador.
- Exportación: Excel (`xlsx`/`exceljs`) y PDF (`@react-pdf/renderer` o similar).
- Proyecto **nuevo**: repositorio y proyecto de Supabase propios. **No** se mezcla con el ERP de
  transportes.

### Multiempresa (obligatorio desde el inicio)
- Tabla `empresas`. **Toda** tabla de negocio lleva `empresa_id uuid not null`.
- RLS en todas las tablas: un usuario solo ve filas de las empresas a las que pertenece
  (`miembros(empresa_id, user_id, rol)`).
- Nunca filtrar por empresa solo en el frontend; la RLS es la garantía.
- Al principio hay **una** empresa (la de Otiniano), creada a mano. El alta de empresas por
  autorregistro queda para la fase 3.

### Reglas de ingeniería
- Montos en `numeric(14,2)`; pesos en `numeric(12,3)` (kg con gramos). Nada de `float`.
- Moneda: soles (PEN). **[CONFIRMAR]** si alguna venta es en dólares; si sí, guardar `moneda` y
  `tipo_cambio`.
- La lógica de dinero e inventario vive en **la base**: vistas y funciones/triggers. La pantalla
  solo muestra. Un número nunca se calcula distinto en dos pantallas.
- Nada se borra: compras y ventas se **anulan** (con motivo y quién). Los maestros se
  **activan/desactivan**.
- Auditoría: `creado_por`, `creado_en`, `anulado_por`, `anulado_en`, `motivo_anulacion`.
- Validaciones en el servidor/BD además del formulario.
- UI pulida y **responsive de verdad** (celular de 360 px, media pantalla y escritorio), sin scroll
  horizontal de la página.

---

## 4. Modelo de datos (borrador)

> Es un punto de partida, no un dogma. Ajustar nombres si hace falta, pero mantener las reglas.

```sql
-- Tenancy
empresas (id, razon_social, ruc, direccion, logo_url, creado_en)
miembros (empresa_id, user_id, rol)  -- rol: 'dueno' | 'socio' | 'cajero' | 'balancero'

-- Maestros
metales (id, empresa_id, nombre, unidad default 'kg', activo,
         precio_compra numeric, precio_venta numeric)  -- precio vigente; histórico abajo
precios_metal (id, empresa_id, metal_id, fecha, precio_compra, precio_venta, creado_por)
             -- "precio del día": una fila por cambio; la compra copia el precio usado

proveedores (id, empresa_id, tipo_doc 'DNI'|'RUC'|'CE'|'SIN_DOC', nro_doc, nombre,
             telefono, direccion, foto_doc_url, activo, creado_en)
             -- unique (empresa_id, tipo_doc, nro_doc) cuando hay documento
compradores (id, empresa_id, ruc, razon_social, direccion, telefono, activo)

-- Operación
compras (id, empresa_id, numero serial por empresa, fecha timestamptz, proveedor_id,
         total numeric, medio_pago 'efectivo'|'yape'|'plin'|'transferencia',
         estado 'registrada'|'anulada', foto_ticket_url, notas, creado_por, ...)
compra_items (id, compra_id, metal_id, peso_bruto_kg, descuento_kg, peso_neto_kg,
              precio_kg, importe)
              -- descuento_kg: tierra, humedad, plástico, "impureza" que se descuenta al pesar

ventas (id, empresa_id, numero, fecha, comprador_id, total, medio_pago, estado,
        guia_numero, guia_url, comprobante_url, notas, ...)
venta_items (id, venta_id, metal_id, peso_salida_kg, peso_recibido_kg, precio_kg, importe)
            -- salida = lo que sale de nuestra balanza; recibido = lo que pesa/paga el comprador

ajustes_inventario (id, empresa_id, metal_id, fecha, kg (+/-), motivo, creado_por)
                   -- conteo físico, merma detectada, reclasificación

-- Dinero
cajas (id, empresa_id, nombre, tipo 'efectivo'|'banco'|'billetera')
movimientos_caja (id, empresa_id, caja_id, fecha, tipo 'ingreso'|'egreso',
                  origen 'compra'|'venta'|'gasto'|'aporte'|'retiro'|'traspaso'|'ajuste',
                  origen_id, monto, concepto, comprobante_url, creado_por)
gastos (id, empresa_id, fecha, categoria, monto, caja_id, comprobante_url, concepto)
        -- alquiler, luz, flete, personal, combustible...

-- Sociedad
socios (id, empresa_id, nombre, dni, porcentaje numeric(5,2), activo)
aportes_retiros (id, empresa_id, socio_id, fecha, tipo 'aporte'|'retiro', monto, caja_id, nota)
cierres_mes (id, empresa_id, periodo 'YYYY-MM', snapshot jsonb, cerrado_por, cerrado_en)
```

### Vistas clave
- `v_stock_metal`: por metal, kg comprados − kg vendidos (salida) ± ajustes = **kg en stock**;
  **costo promedio ponderado**; **valor del stock** a costo y a precio de venta del día.
- `v_saldo_caja`: saldo por caja.
- `v_resultado_mes`: ventas − costo de lo vendido − mermas valorizadas − gastos = **utilidad**.
- `v_patrimonio`: caja + stock valorizado − deudas (si las hay) vs. capital aportado.

---

## 5. Reglas de negocio

### Compras (el flujo más usado, que sea rapidísimo)
1. Elegir o registrar al proveedor. Buscar por DNI/RUC; si no existe, crearlo en el mismo modal
   (lookup a RENIEC/SUNAT por API si hay token; si no, a mano). Se permite **"Sin documento"** para
   compras chicas: **[CONFIRMAR]** el monto a partir del cual el documento es obligatorio.
2. Agregar una o varias líneas: metal → peso bruto → descuento (kg) → **peso neto** → precio/kg
   (prellenado con el precio del día, editable con permiso) → importe **en vivo**.
3. Total, medio de pago, foto opcional del ticket de balanza.
4. Guardar: crea la compra, sus ítems, el **egreso de caja** y suma al stock. **Todo en una sola
   transacción** (función RPC en Postgres), no en varias llamadas desde el front.
5. Ticket imprimible / compartible por WhatsApp (PDF 80 mm).

### Ventas
1. Comprador (con RUC) → líneas por metal: **peso de salida** (nuestra balanza).
2. Cuando el comprador confirma su pesaje: **peso recibido** y precio. La diferencia
   salida − recibido es **merma de venta**, se registra sola.
3. Ingreso a caja por lo cobrado. **[CONFIRMAR]** si venden a crédito (entonces: cuentas por
   cobrar con pagos parciales).
4. Guía de traslado: en el MVP se guarda el número y la foto/PDF. La emisión electrónica es fase 2.

### Inventario y costo
- Costo por **promedio ponderado** por metal (se recalcula con cada compra).
- El stock **no puede quedar negativo**: la BD bloquea una venta mayor al stock (con mensaje claro).
- Merma = ajuste negativo (conteo físico) + diferencia de pesos en venta. Se valoriza a costo
  promedio y aparece en el reporte.

### Caja
- Cada compra, venta, gasto, aporte y retiro genera su movimiento de forma automática; no se
  registra dos veces.
- Traspasos entre cajas (efectivo ↔ banco).
- Arqueo: el cajero declara el efectivo contado; el sistema muestra la diferencia.

### Socios y resultado
- Capital = aportes − retiros.
- **Utilidad del mes** según `v_resultado_mes`; repartida según el `porcentaje` de cada socio
  (solo informativo; el reparto real se registra como retiro).
- Cierre de mes: guarda un snapshot y bloquea editar movimientos de ese periodo (el dueño puede
  reabrir con motivo).

---

## 6. Pantallas

1. **Inicio (dashboard)**: tarjetas con caja total, valor del stock, utilidad del mes, kg comprados
   y vendidos hoy; gráfico de ganancia por mes; stock por metal.
2. **Comprar** (botón grande, pensado para celular en el mostrador).
3. **Compras**: lista con filtros (fecha, proveedor, metal, estado), detalle, anular.
4. **Vender** / **Ventas**: igual que compras.
5. **Inventario**: stock por metal, costo promedio, valor; ajustes; historial (kardex por metal).
6. **Precios del día**: tabla editable rápida de compra/venta por metal, con histórico.
7. **Proveedores** y **Compradores**: CRUD, activar/desactivar; ficha con su historial y totales
   (kg y soles vendidos a nosotros).
8. **Caja**: saldo por caja, movimientos, gastos, traspasos, arqueo.
9. **Socios**: aportes, retiros, utilidad por socio.
10. **Reportes**: ver §7.
11. **Configuración**: empresa, usuarios y roles, cajas, categorías de gasto, metales.

### Roles
| Rol | Puede |
|---|---|
| Dueño | Todo, incluido anular, reabrir meses y gestionar usuarios |
| Socio | Ver todo y los reportes; no anula |
| Cajero | Compras, ventas, caja; no edita precios del día ni anula |
| Balancero | Solo registrar compras |

---

## 7. Reportes (Excel y PDF, filtros por rango de fechas)

- **Compras** por día/mes, por metal y por proveedor (kg, S/, precio promedio).
- **Ventas** por mes, por metal y por comprador.
- **Margen por metal**: precio promedio de venta − costo promedio, en S/ por kg y en %.
- **Merma** por metal y periodo (kg y S/).
- **Kardex** por metal.
- **Caja**: libro de caja con saldo acumulado.
- **Estado de resultados** mensual con comparación de meses.
- **Patrimonio / «¿cuánto tenemos?»**: caja + stock valorizado vs. capital inicial → ganancia
  acumulada. Es el número que pidió el cliente.
- **Ranking de proveedores** (útil para el sorteo de Navidad de la fase 2).

---

## 8. Fases y entregables

| Fase | Contenido | Criterio de aceptación |
|---|---|---|
| **0. Base** | Repo, Supabase, auth, multiempresa + RLS, layout responsive, roles | Un usuario de la empresa A no ve nada de la B (probado con dos empresas) |
| **1. Núcleo** | Metales, precios del día, proveedores, compras, inventario, caja | Una compra resta de la caja y suma al stock al céntimo y al gramo; anular la revierte |
| **2. Ventas y merma** | Compradores, ventas, pesos salida/recibido, ajustes, gastos | El stock no baja de cero; la merma aparece valorizada |
| **3. Sociedad y reportes** | Socios, aportes/retiros, cierre de mes, dashboard, reportes Excel/PDF | El reporte de patrimonio cuadra con caja + stock calculados a mano en un caso de prueba |
| **4. (Opcional)** | SUNAT: liquidación de compra y guía de remisión remitente electrónicas; sorteos; autorregistro SaaS | Por definir |

Cada fase se entrega desplegada, con datos de prueba (inventados) y una lista de lo que se probó.

### Casos de prueba mínimos
1. Compra de 5.250 kg de cobre a S/ 30/kg con 0.250 kg de descuento → neto 5.000 kg, S/ 150.00,
   caja −150.00, stock +5.000 kg.
2. Dos compras a precios distintos → el costo promedio es el ponderado correcto.
3. Venta de 4.000 kg (salida) y el comprador recibe 3.950 → merma 0.050 kg valorizada a costo.
4. Intentar vender más que el stock → la BD lo rechaza con mensaje claro.
5. Anular una compra → caja y stock vuelven a como estaban; queda quién y por qué.
6. Cierre de mes → no se puede editar un movimiento de ese mes sin reabrir.

---

## 9. Preguntas abiertas para el cliente **[CONFIRMAR]**

1. ¿Lista exacta de metales y sus variantes? (cobre brillante / quemado, bronce, aluminio perfil /
   lata, fierro, baterías…). ¿Precio distinto por variante?
2. ¿Siempre se compra y vende **por kilo**? ¿Hay compras por unidad (baterías, motores)?
3. ¿Quién fija el precio del día y cada cuánto cambia? ¿El cajero puede negociar el precio?
4. ¿Desde qué monto se exige DNI al que vende?
5. ¿Venden a crédito? ¿Compran a crédito?
6. ¿Cuántos socios y qué porcentaje tiene cada uno? ¿Capital inicial (los «20 mil»)?
7. ¿Un local o varios? (si son varios: stock y caja por local).
8. ¿Las guías para trasladar se emiten hoy en el portal de SUNAT? ¿Tienen RUC y certificado digital?
9. ¿Qué gastos fijos tienen (alquiler, personal, flete) para el estado de resultados?
10. ¿Cómo quieren el sorteo: un boleto por compra, por cada X kg o por cada X soles?

### Nota tributaria (validar con su contador)
Comprar a personas **sin RUC** normalmente se sustenta con una **liquidación de compra** (comprobante
que emite el comprador), y trasladar la mercadería propia con una **guía de remisión remitente**. El
comercio de chatarra puede tener normativa sectorial propia. **No implementar nada de esto en el
MVP** hasta que el contador confirme qué aplica; el modelo de datos ya deja `compras` y `ventas`
listos para asociarles un comprobante después.

---

## 10. Qué reutilizar del ERP de transportes (pedir el acceso al repo)

- Patrón de **caja** (movimientos automáticos por origen, vista de saldo).
- **Búsqueda por RUC/DNI** con autocompletado.
- Patrón **activar/desactivar** de maestros y anulación con motivo.
- Exportación **Excel/PDF** de tablas y layout responsive (`CONVENCIONES_RESPONSIVE.md`).
- Firma y envío a SUNAT (`src/lib/sunat/`) para la fase 4.

**No copiar** datos, `.env`, tokens ni documentos del cliente del ERP de transportes: este es un
proyecto y una base de datos distintos.
