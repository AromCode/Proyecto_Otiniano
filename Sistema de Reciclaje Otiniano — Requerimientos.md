# Sistema de Reciclaje Otiniano — Requerimientos

Oct 23, 2026 · @promtivedev

## Contexto

El Sr. Otiniano quiere un sistema de **control interno** para su negocio de reciclaje: saber desde su oficina cuánto se compró, cuánto se vendió, cuánto hay en stock y cuánto se gana, sin estar en el local. Hoy todo se anota en cuadernos y nadie sabe con certeza cuánto material hay.

Requerimientos tomados de la reunión del 23/10 (presentación de la demo por Aarón). Es un sistema aparte del ERP de Corporación Otiniano y más pequeño. La demo se tomó como base: lo que no se menciona aquí se mantiene como estaba en la demo.

El caso que quiere controlar, en sus palabras: si se compraron 1 000 kg de chatarra con aluminio mezclado, al limpiar debe subir unos 5 o 6 kg el stock de chatarra y bajar lo mismo en aluminio. Si el stock no cuadra, llama al encargado: «según el sistema deberías tener tanto».

## Usuarios y roles

Tres roles, cada uno con su propio menú. El operario de almacén es quien registra en el día a día.

| Rol | Quién | Qué hace |
| --- | --- | --- |
| Gerencia | Sr. Otiniano | Ve todo: panel, stock, caja, capital, utilidad y reportes. Revisa desde su oficina. |
| Administración | Su primo (encargado) | Precios, productos, proveedores y clientes, reportes. Sale a buscar material. |
| Almacén | Personal del local | Registra compras y ventas, pesa, aplica mermas, abre y cierra la caja del día. |

El administrador crea usuarios con nombre, correo y rol desde Configuración (como en la demo).

## Productos

Los productos van en una jerarquía de niveles libres: familia → producto → variante, y una variante puede tener sus propias variantes. Cada nivel tiene su código, su precio y su stock, porque el precio y el peso cambian por variante. La demo solo traía cobre, bronce, aluminio y fierro: se reemplaza por un maestro de productos donde Administración crea familias, productos y variantes.

&#91;embedded content: jerarquía de productos · ejemplos dichos en la reunión\]

Ejemplos dados por el Sr. Otiniano. Él entregará la lista completa; las cajas de color son variantes con precio propio.

## Compras (lo que entra)

La compra es el registro más importante: alguien trae material, se pesa, se paga y entra al stock.

1. **Proveedor.** Lista desplegable con todos los proveedores, que se filtra al escribir las primeras letras del nombre. Pocas veces se recuerda el DNI. Para uno nuevo: DNI, RUC o carné de extranjería, autocompletado con Decolecta.
   1. Decolecta hoy da 100 consultas gratis al mes. Un proveedor ya registrado no se vuelve a consultar.
   2. Cada proveedor se marca **mayorista** (otro almacén de reciclaje que viene a vender) o **minorista** (persona que trae poco).
2. **Producto.** Se elige de la jerarquía (ver Productos). Una compra puede tener varios productos.
3. **Peso bruto en kg.**
4. **Merma en kg (opcional).** Si el material viene sucio, en el momento se le descuenta: «te descuento 5 kg porque tengo que limpiarlo». Se paga por el peso neto.
5. **Precio por kg.** Lo digita el operario. Sale sugerido el precio del día según el tipo de proveedor: al mayorista se le paga un punto más que al minorista, «para no fregar al otro negocio». No es un porcentaje automático.
6. **Pago.** Efectivo, Yape, Plin o transferencia, y de qué caja sale. Los medios de pago se pueden editar.
7. **Foto y nota opcionales.**
8. **Ticket.** Impresora térmica de 80 mm, además de PDF y compartir.

**Regla clave:** el precio y el peso quedan grabados en el ticket. Una vez emitido, el operario **no puede modificarlos**. Una corrección la hace Gerencia o Administración, y queda registrado quién la hizo.

## Limpieza, stock y ventas

**Limpieza (el área de despacho de la demo).** Lo comprado pasa primero por limpieza y recién entra al stock con su peso real.

- Al limpiar se vuelve a pesar. La merma se registra **en kilos**; el sistema calcula su valor en soles y guarda las dos cosas. En la demo el descuento era en soles: hay que cambiarlo, porque en soles el stock queda con kilos que no existen.
- Lo que sale de la limpieza puede ser otro material (el fierro dentro del aluminio). Ese peso **pasa al stock del otro producto**: baja aluminio y sube chatarra en la misma cantidad.
- La merma no debería ser grande. Mostrar el % de merma por compra y por producto, para que Gerencia vea si algo no cuadra (el cobre es caro).

**Stock.** Kilos por producto, costo promedio, valor al precio del día y fecha de la llegada más antigua, como en la demo, pero por cada nivel de la jerarquía.

**Ventas (lo que sale).**

- Comprador, productos, peso, precio, número de guía y foto o PDF de la guía.
- Al elegir el producto se ve el **stock disponible**. No se puede vender más de lo que hay.
- Medio de cobro y caja a la que entra. Comprobante en PDF y ticket 80 mm.

## Caja, capital y reportes

Se mantiene lo de la demo, con estos puntos:

- **Caja diaria:** el almacenero abre la caja, cuenta y opera; al final del día la cierra. Saldos por caja chica, banco y Yape.
- **Capital:** capital aportado por socio, ganancia acumulada y utilidad. Es lo que más le interesa a Gerencia: cuánto se gana en efectivo y cuánto hay en material.
- **Panel de inicio:** caja + mercadería = capital; movimiento por material, stock y curva de compras/ventas/utilidad con filtros de periodo.
- **Reportes:** por material, por proveedor, por cliente, por día, mes y temporada; libro de caja. Todos exportan a Excel y PDF. Los reportes de la demo son genéricos: se ajustan con datos reales.
- **Comprobantes:** primera etapa solo **nota de venta**. Sin boletas ni facturas por ahora («no lo estamos vendiendo con factura»).
- **Visual:** modo oscuro y letra grande se mantienen.

Se debe ver bien en celular: el almacenero registra desde el local.

## Fuera de la primera etapa y próximos pasos

**Queda para después, pero se deja la puerta abierta en el diseño:**

- Facturas, boletas y guías de remisión con SUNAT (requiere certificado digital). Sí hacen traslados, así que la guía es lo primero que vendría.
- Reutilizar el sistema para otros negocios de compra-venta (abarrotes, por ejemplo): el código es propiedad del Sr. Otiniano.

**Próximos pasos:**

- [ ] Subir la demo a producción y enviarle accesos para que la revise y anote observaciones.
- [ ] Enviar la cotización del sistema de reciclaje.
- [ ] Pedirle la lista real de productos con su jerarquía y precios por tipo de proveedor.
- [ ] Reunión de avance el lunes 2 de noviembre.
