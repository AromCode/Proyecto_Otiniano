// Texto de la guía del sistema para el cliente. Fiel a lo que hace el sistema: si cambia una pantalla, actualizar aquí.
// Usar solo caracteres que la fuente Helvetica del PDF dibuja: guion "-" (no "−"), ">" (no flechas).

export type Bloque =
  | { t: "p"; texto: string }
  | { t: "sub"; texto: string }
  | { t: "lista"; items: string[] }
  | { t: "pasos"; items: string[] }
  | { t: "tabla"; columnas: string[]; anchos: number[]; filas: string[][] }
  | { t: "decir"; texto: string }
  | { t: "ojo"; texto: string; titulo?: string };

export interface Seccion {
  titulo: string;
  donde?: string;
  quien?: string;
  bloques: Bloque[];
}

export interface Capitulo {
  id: string;
  titulo: string;
  etiqueta?: string;
  resumen?: string;
  color: string;
  intro?: string;
  bloques?: Bloque[];
  secciones?: Seccion[];
}

export const CAPITULOS: Capitulo[] = [
  // ---------------------------------------------------------------------------
  {
    id: "que-es",
    titulo: "¿Qué es el sistema?",
    etiqueta: "Visión general",
    resumen: "La idea, la pregunta que responde y las reglas que lo hacen confiable",
    color: "marca",
    intro:
      "Un sistema para negocios de compra y venta de metales (cobre, bronce, aluminio, fierro...). Ordena todo el ciclo del negocio: comprar chatarra en el mostrador, acumularla, venderla a un comprador mayor y saber cuánto se ganó.",
    secciones: [
      {
        titulo: "El problema que resuelve",
        bloques: [
          { t: "p", texto: "El negocio le compra chatarra a personas de a pie (desde un kilo hasta una tonelada), la junta y luego la vende a fundiciones o recicladoras. En el camino siempre hay **merma** (la balanza del comprador pesa menos que la nuestra) y, como el negocio es una **sociedad**, los socios necesitan saber cómo va el dinero." },
          { t: "p", texto: "La pregunta de fondo es: **«Empezamos con 20 mil... ¿ahora tenemos 21, 22 o 23 mil? ¿Cuánto está en plata y cuánto en producto?»**. El sistema la responde en cualquier momento, sin esperar a fin de mes:" },
          {
            t: "tabla", columnas: ["Pregunta", "Dónde lo responde el sistema"], anchos: [2, 4],
            filas: [
              ["¿Cuánto hay en caja?", "Saldo de cada caja (efectivo, banco, Yape/Plin) al momento."],
              ["¿Cuánto hay en mercadería?", "Kilos de cada metal por su costo promedio, más lo que está en camino al comprador."],
              ["¿Cuánto ganamos?", "Utilidad por mes, por periodo y por metal, y la parte de cada socio según su %."],
            ],
          },
          { t: "decir", texto: "«Usted ya no tiene que sacar cuentas en cuaderno. Cada compra, venta o gasto que se registra actualiza solo la caja, el stock y la ganancia. En el Inicio ve en un segundo cuánto tiene en plata, cuánto en metal y cuánto ha ganado.»" },
        ],
      },
      {
        titulo: "Cómo se usa",
        bloques: [
          { t: "lista", items: [
            "Es una **aplicación web**: funciona en el navegador del celular y de la computadora, sin instalar programas.",
            "En el celular se puede **instalar como app** (aparece el ícono «Metales» en la pantalla). Al abrirla va directo a «Nueva compra», a pantalla completa.",
            "**Celular en el mostrador** para comprar rápido; **computadora** para revisar reportes, caja y configuración.",
            "No tiene página pública: **solo se entra con usuario y contraseña** que crea el dueño.",
            "Está preparado para **varias empresas**: un mismo usuario puede trabajar en más de un negocio y cada empresa ve solo sus datos.",
          ] },
        ],
      },
      {
        titulo: "Las reglas que lo hacen confiable",
        bloques: [
          { t: "lista", items: [
            "**Los cálculos de dinero e inventario los hace el sistema, no la persona.** El peso neto, los totales, el costo promedio, la merma y la utilidad salen solos.",
            "**Todo o nada:** una compra descuenta la caja, suma el stock y queda en el kardex al mismo tiempo. Si algo falla, no se guarda nada a medias.",
            "**Nada se borra.** Si hubo un error se **anula indicando el motivo**, y queda registrado quién, cuándo y por qué. Al anular, la caja y el stock vuelven a como estaban.",
            "**Cada quien ve lo suyo.** Según el rol (dueño, socio, cajero, balancero) cambia lo que se ve y lo que se puede hacer. La seguridad la controla la base de datos, no solo la pantalla.",
            "**Cierre de mes:** el dueño puede cerrar un mes; se guarda una foto de los números y ya nadie puede cambiar movimientos de ese mes (salvo que el dueño lo reabra con motivo).",
            "**No deja vender lo que no hay:** si se intenta despachar más kilos que el stock, el sistema lo rechaza.",
          ] },
          { t: "decir", texto: "«Aquí nadie puede borrar una compra para tapar un error o algo peor. Si se anula, queda escrito quién lo hizo y por qué, y la plata y los kilos regresan solos.»" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "acceso",
    titulo: "Ingreso, roles y menú",
    etiqueta: "Primeros pasos",
    resumen: "Cómo se entra, quién puede hacer qué y cómo moverse por el sistema",
    color: "stone",
    secciones: [
      {
        titulo: "Ingresar al sistema",
        donde: "Pantalla de ingreso",
        quien: "Todos",
        bloques: [
          { t: "p", texto: "Se ingresa con **correo y contraseña** y el botón «Ingresar». Si los datos están mal sale «Correo o contraseña incorrectos». Los usuarios no se registran solos: **los crea el dueño** en Configuración y les entrega su contraseña inicial." },
          { t: "p", texto: "Si una persona tiene usuario pero todavía no fue agregada a ninguna empresa, verá el mensaje «Su usuario no tiene empresa asignada. Pida al dueño del negocio que lo agregue en Configuración > Usuarios»." },
        ],
      },
      {
        titulo: "Los cuatro roles",
        bloques: [
          {
            t: "tabla", columnas: ["Rol", "Para quién", "Qué puede hacer"], anchos: [1.2, 2, 4],
            filas: [
              ["Dueño", "El dueño o administrador", "Todo: comprar, vender, caja, precios, ajustes de inventario, anular, cerrar y reabrir meses, socios, usuarios y configuración."],
              ["Socio", "Los socios del negocio", "Ve todo (inicio, caja, inventario con costos, reportes, capital). No registra operaciones ni anula."],
              ["Cajero", "Quien atiende y maneja la plata", "Compras, ventas y caja (gastos, traspasos, arqueos). Crea proveedores y clientes. No cambia precios ni anula."],
              ["Balancero", "Quien pesa en el mostrador", "Solo registra compras y ve las compras que él hizo y los precios del día."],
            ],
          },
          { t: "sub", texto: "Permisos en detalle" },
          {
            t: "tabla", columnas: ["Acción", "Dueño", "Socio", "Cajero", "Balancero"], anchos: [3, 1, 1, 1, 1.2],
            filas: [
              ["Registrar compras", "Sí", "-", "Sí", "Sí"],
              ["Registrar y confirmar ventas", "Sí", "-", "Sí", "-"],
              ["Caja: gastos, traspasos, arqueos", "Sí", "-", "Sí", "-"],
              ["Crear y editar proveedores y clientes", "Sí", "-", "Sí", "-"],
              ["Ver todo (costos, utilidad, capital)", "Sí", "Sí", "-", "-"],
              ["Ver y exportar reportes", "Sí", "Sí", "-", "-"],
              ["Cambiar precios del día", "Sí", "-", "-", "-"],
              ["Ajustes y conteos de inventario", "Sí", "-", "-", "-"],
              ["Anular operaciones", "Sí", "-", "-", "-"],
              ["Socios, aportes, retiros, cierres de mes", "Sí", "-", "-", "-"],
              ["Configuración y usuarios", "Sí", "-", "-", "-"],
            ],
          },
          { t: "p", texto: "Además, el dueño puede decidir en Configuración si el **cajero y/o el balancero pueden cambiar el precio por kilo** en el mostrador al momento de comprar." },
          { t: "decir", texto: "«Cada trabajador entra con su usuario y ve solo lo que necesita. El balancero no ve cuánta plata hay ni cuánto se gana; el socio ve todos los números pero no puede tocar nada; y anular algo solo lo puede usted.»" },
        ],
      },
      {
        titulo: "El menú: organizado por módulos",
        quien: "Todos (cada rol ve solo sus opciones)",
        bloques: [
          { t: "p", texto: "El menú lateral agrupa las pantallas en **módulos**, cada uno con su color. Al entrar a un módulo, sus pantallas aparecen como **pestañas** arriba del contenido." },
          {
            t: "tabla", columnas: ["Módulo", "Pantallas"], anchos: [1.6, 4],
            filas: [
              ["Inicio", "Resumen general («¿Cuánto tenemos?» o «¿Qué vamos a hacer hoy?», según el rol)."],
              ["Compras", "Nueva compra · Historial · Reportes"],
              ["Ventas", "Nueva venta · Historial · Reportes"],
              ["Contactos", "Buscar · Proveedores · Clientes · Socios"],
              ["Inventario", "Stock · Precios del día · Reportes"],
              ["Caja y finanzas", "Caja · Capital y cierres · Reportes"],
              ["Gestión", "Todos los reportes · Configuración"],
            ],
          },
          { t: "p", texto: "Al pie del menú están las preferencias de vista (tema claro/oscuro y letra grande), «Mi cuenta» y «Cerrar sesión». Si el usuario pertenece a **más de una empresa**, arriba del menú aparece una lista para cambiar de empresa." },
          { t: "sub", texto: "En el celular" },
          { t: "lista", items: [
            "Arriba: logo, nombre de la empresa y el botón de menú.",
            "Abajo: una **barra fija** con los accesos principales (Inicio, Compras, el botón redondo destacado **Comprar**, Ventas, Caja, según el rol) y «Más», que abre el menú completo.",
            "Las tablas se convierten en **tarjetas** para leerse cómodo sin mover la pantalla de lado.",
          ] },
        ],
      },
      {
        titulo: "Mi cuenta",
        donde: "Tocar el nombre del usuario al pie del menú",
        quien: "Todos",
        bloques: [
          { t: "lista", items: [
            "Muestra nombre, correo, empresa y rol.",
            "**Vista:** tema Claro, Oscuro o Automático (sigue al celular), y tamaño de letra Normal o **Grande** (útil para quien ve con dificultad; se guarda en ese equipo).",
            "**Cambiar contraseña:** nueva contraseña de mínimo 8 caracteres, repetida.",
          ] },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "inicio",
    titulo: "Inicio",
    etiqueta: "Módulo Inicio",
    resumen: "El tablero del dueño con filtros y el inicio de trabajo del cajero y balancero",
    color: "marca",
    intro: "Es lo primero que se ve al entrar. Cambia según el rol: el dueño y los socios ven el **resumen de gestión**; el cajero y el balancero ven **botones grandes** para trabajar.",
    secciones: [
      {
        titulo: "Inicio del dueño y socios: «¿Cuánto tenemos?»",
        donde: "Inicio",
        quien: "Dueño y socio",
        bloques: [
          { t: "sub", texto: "1. Lo que tenemos (siempre al día de hoy)" },
          { t: "lista", items: [
            "**En caja:** la suma de todas las cajas, con enlace a «Ver cajas».",
            "**En mercadería:** el stock valorizado a costo promedio, más lo que está en camino al comprador (en tránsito).",
            "**Total (caja + mercadería):** lo que vale hoy el negocio, comparado con el capital aportado por los socios.",
            "**Ganancia acumulada:** lo que tenemos menos el capital. En verde si se ganó, en rojo si se perdió.",
          ] },
          { t: "p", texto: "Si hay ventas esperando el pesaje del comprador, aparece un aviso con el enlace «Confirmar»." },
          { t: "sub", texto: "2. Resultado del periodo (con filtros)" },
          { t: "p", texto: "Botones para elegir el periodo: **Hoy, Últimos 7 días, Este mes** (el que sale por defecto), **Mes anterior, Este año** y **Personalizado** (se eligen fechas Desde y Hasta). Al cambiar el periodo, la información actual se queda atenuada hasta que llegan los números nuevos completos." },
          { t: "lista", items: [
            "**Utilidad** del periodo, con el margen y los gastos.",
            "**Ventas** y **Compras** del periodo (cantidad, kilos y soles). Tocándolas se abre el historial ya filtrado por esas fechas.",
            "**Merma** del periodo, valorizada a costo.",
            "Tabla **«Movimiento por metal»**: por cada metal, kilos e importe comprado, kilos e importe vendido y el margen ganado (en rojo si se perdió).",
          ] },
          { t: "sub", texto: "3. Utilidad por mes" },
          { t: "p", texto: "Gráfico de barras con la utilidad de cada mes: **naranja = ganancia, rojo = pérdida**. Se elige ver 6, 12 o 24 meses; los meses sin movimiento se muestran en cero, para ver la evolución en el tiempo. Tiene un eje con montos, el total de los meses mostrados y, al pasar el dedo o el mouse por una barra, el detalle de ese mes (utilidad, ventas y gastos). Debajo, el enlace al estado de resultados." },
          { t: "sub", texto: "4. Stock por metal" },
          { t: "p", texto: "Barras con los kilos y el valor a costo de cada metal que hay hoy en almacén, ordenados de mayor a menor valor." },
          { t: "decir", texto: "«Esta es su pantalla. Arriba ve cuánto vale hoy el negocio y cuánto ha ganado desde que empezó. Más abajo elige el periodo (hoy, la semana, el mes) y ve cuánto vendió, compró y ganó, metal por metal. Y el gráfico le muestra mes a mes si va ganando o perdiendo.»" },
        ],
      },
      {
        titulo: "Inicio del cajero y balancero: «¿Qué vamos a hacer hoy?»",
        donde: "Inicio",
        quien: "Cajero y balancero",
        bloques: [
          { t: "p", texto: "Pensado para el mostrador: botones grandes y lo del día." },
          { t: "lista", items: [
            "Botones grandes: **Nueva compra**, **Nueva venta** y **Caja** (estos dos solo el cajero), **Compras de hoy** (el balancero lo ve como «Mis compras») y **Precios del día**.",
            "Cifras del día (solo el cajero): compras de hoy (kilos, cantidad y soles), ventas de hoy (kilos que salieron) y lo que hay en caja, con el saldo de cada caja.",
            "**Precios de compra de hoy** de cada metal, para tenerlos a la vista.",
            "**Últimas compras de hoy** (hasta 8), con proveedor, hora, metales, total y kilos. El balancero ve solo las suyas.",
            "Aviso de ventas pendientes de pesaje (cajero).",
          ] },
          { t: "decir", texto: "«Su trabajador abre el sistema y tiene los botones grandes para comprar. No se pierde en menús ni ve información que no le corresponde.»" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "compras",
    titulo: "Compras",
    etiqueta: "Módulo Compras",
    resumen: "Comprar en el mostrador, ticket, historial, anulación y reportes",
    color: "teal",
    intro: "Es lo que más se usa: registrar lo que se le compra a cada persona en el mostrador, pagarle y entregarle su ticket.",
    secciones: [
      {
        titulo: "Nueva compra",
        donde: "Compras > Nueva compra (o el botón redondo «Comprar» del celular)",
        quien: "Dueño, cajero y balancero",
        bloques: [
          { t: "sub", texto: "Pasos" },
          { t: "pasos", items: [
            "**¿Quién vende?** Buscar al proveedor por DNI, RUC o nombre. Si es nuevo, botón «+ Nuevo». Es **opcional**: si no se elige a nadie, la compra queda como «Sin documento».",
            "**Tocar el metal** para agregarlo. Cada botón muestra el metal y su precio del día. Se pueden agregar varios metales (o el mismo dos veces).",
            "En cada línea poner el **peso bruto** y el **descuento** (tierra, humedad...). El sistema calcula solo el **peso neto = bruto - descuento** y el **importe = neto x precio**.",
            "El **precio por kilo** se llena solo con el precio del día. Solo se puede cambiar si el dueño lo permitió para ese rol.",
            "Elegir el **medio de pago** (Efectivo, Yape, Plin o Transferencia). La **caja de donde sale el dinero** se elige sola según el medio (efectivo > caja de efectivo, Yape/Plin > billetera, transferencia > banco) y se puede cambiar.",
            "Opcional: **foto del ticket de la balanza** (en el celular abre la cámara) y **notas**.",
            "Abajo siempre se ve el **total en kilos y en soles**. Botón **«Pagar y guardar»**.",
          ] },
          { t: "sub", texto: "Al guardar" },
          { t: "lista", items: [
            "Aparece «Compra N° X registrada»: **se descontó el dinero de la caja y se sumaron los kilos al stock**, de una sola vez.",
            "**Ticket:** PDF de 80 mm listo para impresora térmica, con empresa, número, fecha, proveedor, metales, pesos, precios y total.",
            "**Compartir:** envía el ticket por WhatsApp (u otra app) desde el celular.",
            "Botones para hacer otra compra o ver el detalle.",
            "Si el celular pierde la señal y se vuelve a enviar, **la compra no se duplica**.",
          ] },
          { t: "sub", texto: "Reglas" },
          { t: "lista", items: [
            "Debe haber al menos un metal y el neto de cada línea debe ser mayor a cero.",
            "**DNI/RUC obligatorio desde cierto monto:** si el dueño configuró un monto (por ejemplo S/ 500), las compras desde ese monto exigen un proveedor con DNI o RUC. El monto todavía está por definir con el cliente.",
          ] },
          { t: "decir", texto: "«En el mostrador es tocar el metal, poner el peso y listo: el sistema saca el neto y el total, descuenta la plata de la caja y suma los kilos. Al cliente se le da su ticket impreso o por WhatsApp.»" },
        ],
      },
      {
        titulo: "Historial de compras",
        donde: "Compras > Historial",
        quien: "Todos (el balancero ve solo las compras que él registró)",
        bloques: [
          { t: "p", texto: "Arriba, un **resumen del mes**: compras del mes en soles (comparado con el mes anterior), kilos comprados y precio promedio por kilo, lo comprado hoy y el **proveedor del mes** (a quién más se le compró)." },
          { t: "lista", items: [
            "**Filtros:** buscar por número de compra, DNI o nombre; rango de fechas; metal; estado (registradas o anuladas).",
            "**Tabla:** número, fecha, proveedor, metales, kilos, total y estado. Las anuladas salen en rojo con el total tachado.",
            "Arriba de la tabla, el total de compras, kilos y soles de lo filtrado (sin contar anuladas).",
          ] },
        ],
      },
      {
        titulo: "Detalle de una compra y anulación",
        donde: "Compras > Historial > tocar una compra",
        quien: "Todos; anular solo el dueño",
        bloques: [
          { t: "lista", items: [
            "Muestra cada metal con bruto, descuento, neto, precio e importe; el proveedor (con enlace a su ficha), medio de pago, caja, quién la registró, notas y la foto del ticket de balanza.",
            "Botón **Ticket** para reimprimir.",
            "Botón **Anular** (solo el dueño): pide un **motivo obligatorio** y avisa que «se devolverá el dinero a la caja y se descontarán los kilos del stock». La compra no desaparece: queda marcada como anulada, con fecha, usuario y motivo.",
          ] },
          { t: "ojo", texto: "No se puede anular ni registrar en un **mes cerrado**. Primero el dueño debe reabrir ese mes indicando el motivo." },
        ],
      },
      {
        titulo: "Reportes de compras",
        donde: "Compras > Reportes",
        quien: "Dueño y socio",
        bloques: [
          { t: "lista", items: [
            "**Compras:** kilos, soles y precio promedio, agrupado por día, mes, metal o proveedor.",
            "**Ranking de proveedores:** quién nos vende más (útil, por ejemplo, para un sorteo o premio a los mejores proveedores).",
          ] },
          { t: "p", texto: "Se descargan en **Excel o PDF** (ver el capítulo Reportes)." },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "ventas",
    titulo: "Ventas",
    etiqueta: "Módulo Ventas",
    resumen: "Despachar al comprador, confirmar su pesaje, la merma y los reportes",
    color: "indigo",
    intro: "Una venta tiene **dos momentos**: (1) el metal **sale** pesado en nuestra balanza y (2) el comprador lo **pesa en la suya** y paga. La diferencia entre los dos pesos es la **merma**, y el sistema la calcula sola.",
    secciones: [
      {
        titulo: "Nueva venta (salida del metal)",
        donde: "Ventas > Nueva venta",
        quien: "Dueño y cajero",
        bloques: [
          { t: "pasos", items: [
            "Elegir el **comprador** (cliente registrado con su RUC).",
            "Anotar el **N° de guía de traslado** (por ejemplo T001-000123) y, si se tiene, adjuntar **foto o PDF de la guía**.",
            "Agregar los **metales que salen** con el **peso de nuestra balanza**. Solo aparecen los metales con stock, y cada uno muestra cuántos kilos hay.",
            "Si todavía no se tiene el pesaje del comprador: botón **«Registrar salida»**. La venta queda **«Pendiente de pesaje»** y esos kilos pasan a «en tránsito».",
            "Si ya se tiene el pesaje y el precio del comprador, marcar la casilla **«confirmar ahora»**: se anota el **peso recibido** y el **precio** de cada metal (sugerido con el precio de venta del día), el medio de cobro y la caja donde entra el dinero. Botón **«Registrar y cobrar»**.",
          ] },
          { t: "lista", items: [
            "El sistema calcula **merma = salida - recibido** e **importe = recibido x precio**.",
            "**No deja vender más kilos de los que hay en stock** (avisa «No hay suficiente cobre: stock X»).",
          ] },
        ],
      },
      {
        titulo: "Confirmar el pesaje del comprador",
        donde: "Ventas > Historial > venta pendiente",
        quien: "Dueño y cajero",
        bloques: [
          { t: "p", texto: "Cuando el comprador informa cuánto pesó y cuánto paga, se abre la venta pendiente y en el recuadro **«Confirmar pesaje del comprador»** se anota, por cada metal, el **peso recibido** y el **precio por kilo**, el medio de cobro, la caja y opcionalmente el comprobante (foto o PDF). Botón **«Confirmar y cobrar»**." },
          { t: "lista", items: [
            "El dinero **entra a la caja** elegida.",
            "La diferencia de peso se registra sola como **merma**, valorizada al costo del metal.",
            "La venta pasa a **Confirmada** y suma a la utilidad del mes en que se confirmó.",
          ] },
          { t: "decir", texto: "«Usted despacha 1,000 kilos; la fundición pesa 985 y le paga eso. Aquí anota los 985 y el precio, y el sistema le dice cuánto perdió en merma, en kilos y en soles.»" },
        ],
      },
      {
        titulo: "Historial y detalle de ventas",
        donde: "Ventas > Historial",
        quien: "Dueño, socio y cajero",
        bloques: [
          { t: "p", texto: "Resumen arriba: **ventas del mes**, **margen del mes** y su % (dueño y socio; el cajero ve en su lugar la merma del mes), ventas **por pesar** con los kilos en tránsito, y el **cliente del mes**." },
          { t: "lista", items: [
            "**Filtros:** fechas, comprador, metal y estado (pendiente de pesaje, confirmada, anulada).",
            "**Tabla:** número, fecha, comprador, metales, kilos de salida, merma, total y estado (ámbar pendiente, verde confirmada, rojo anulada).",
            "**Detalle de la venta:** salida, recibido, merma, precio e importe por metal; comprador, total cobrado, medio y caja; guía y comprobante (editables por dueño y cajero).",
            "Dueño y socio ven además **«Costo y merma»**: el costo de lo vendido, la merma valorizada y el **margen ganado** en esa venta.",
            "**Nota de salida / Venta:** documento PDF de 80 mm para imprimir.",
            "**Anular** (solo el dueño, con motivo): los kilos vuelven al stock con su costo y, si estaba cobrada, se revierte el ingreso de caja.",
          ] },
        ],
      },
      {
        titulo: "Reportes de ventas",
        donde: "Ventas > Reportes",
        quien: "Dueño y socio",
        bloques: [
          { t: "lista", items: [
            "**Ventas:** kilos de salida y recibidos, merma e ingresos, por mes, día, metal o comprador.",
            "**Margen por metal:** precio promedio de venta menos costo promedio, en soles por kilo y en %. Dice qué metal deja más ganancia.",
            "**Merma:** cuánto se perdió por diferencia de pesos y ajustes, en kilos y en soles.",
          ] },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "contactos",
    titulo: "Contactos",
    etiqueta: "Módulo Contactos",
    resumen: "Proveedores, clientes y socios, con buscador único y fichas",
    color: "fuchsia",
    intro: "Todas las personas y empresas con las que trabaja el negocio, en un solo lugar: **proveedores** (nos venden metal), **clientes** (les vendemos) y **socios** (dueños del negocio).",
    secciones: [
      {
        titulo: "Buscar",
        donde: "Contactos > Buscar",
        quien: "Todos (cada rol ve los tipos que le corresponden)",
        bloques: [
          { t: "p", texto: "Un solo buscador: **«Buscar por DNI, RUC o nombre»**. Si se escriben números busca por documento; si se escribe texto, por nombre. Muestra a la vez proveedores, clientes y socios, con su tipo y un dato útil: «Le compramos S/ ...», «Le vendimos S/ ...» o su % de participación. Tocando un resultado se abre su ficha. Con la casilla «Incluir inactivos» también aparecen los desactivados." },
          { t: "p", texto: "Sin búsqueda, muestra cuántos proveedores, clientes y socios activos hay." },
        ],
      },
      {
        titulo: "Proveedores",
        donde: "Contactos > Proveedores",
        quien: "Todos; crear y editar: dueño y cajero",
        bloques: [
          { t: "lista", items: [
            "**Lista** ordenada por lo que más se le compró: nombre, documento, teléfono, número de compras, kilos, total y última compra. Filtro por texto y por estado.",
            "**Nuevo proveedor:** tipo de documento (DNI, RUC, Carné de extranjería o Sin documento), número, nombre o razón social, teléfono y dirección. Valida que el DNI tenga 8 dígitos y el RUC 11.",
            "**Consulta automática:** con DNI o RUC, el botón de la lupa trae el nombre desde RENIEC o la razón social y dirección desde SUNAT (requiere tener contratado el servicio de consulta; si no, se escribe a mano).",
            "**Ficha del proveedor:** compras, kilos que nos vendió, total pagado y última compra; pestaña con el historial de sus compras y pestaña **«Por metal»** (qué nos vende, cuántos kilos y a qué precio promedio).",
            "**No se borran:** se **desactivan**. Un proveedor inactivo ya no aparece al comprar, pero su historial se conserva.",
          ] },
        ],
      },
      {
        titulo: "Clientes (compradores)",
        donde: "Contactos > Clientes",
        quien: "Dueño, socio y cajero; crear y editar: dueño y cajero",
        bloques: [
          { t: "lista", items: [
            "Fundiciones, recicladoras y compradores mayores a quienes se vende.",
            "**Datos:** RUC (con consulta automática a SUNAT), razón social, dirección, teléfono y persona de contacto.",
            "**Ficha:** ventas confirmadas (y cuántas están pendientes de pesaje), kilos recibidos, total cobrado, última venta; historial de ventas y detalle por metal con merma y precio promedio.",
            "También se desactivan en vez de borrarse.",
          ] },
        ],
      },
      {
        titulo: "Socios",
        donde: "Contactos > Socios",
        quien: "Dueño y socio; crear y editar: solo dueño",
        bloques: [
          { t: "lista", items: [
            "Quiénes son dueños del negocio y con qué **porcentaje de participación** (sirve para repartir la utilidad).",
            "Si los porcentajes de los socios activos **no suman 100 %**, el sistema muestra un aviso.",
            "**Ficha del socio:** su %, su **capital** (aportes menos retiros), la utilidad del mes que le corresponde según su %, sus aportes y retiros, y una tabla con **la utilidad que le toca mes a mes** (últimos 24 meses).",
            "Los aportes, retiros y cierres de mes se registran en **Caja y finanzas > Capital y cierres**.",
          ] },
          { t: "decir", texto: "«Cada socio puede entrar y ver cuánto puso, cuánto retiró y cuánto le corresponde de la ganancia de cada mes, sin pedirle cuentas a nadie.»" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "inventario",
    titulo: "Inventario y precios",
    etiqueta: "Módulo Inventario",
    resumen: "Stock por metal, costo promedio, kardex, ajustes y precios del día",
    color: "violet",
    intro: "Cuántos kilos hay de cada metal y cuánto costaron. El costo se calcula con **costo promedio ponderado**: si se compró cobre a S/ 30 y luego a S/ 32, el costo del kilo en almacén es el promedio según los kilos de cada compra.",
    secciones: [
      {
        titulo: "Stock",
        donde: "Inventario > Stock",
        quien: "Dueño, socio y cajero (los costos solo dueño y socio)",
        bloques: [
          { t: "p", texto: "Resumen arriba: **kilos en stock**, **valor a costo**, **valor a precio de hoy** (lo que valdría vendido al precio del día) y **ganancia si vendemos hoy** (más lo que está en tránsito)." },
          { t: "lista", items: [
            "**Tabla por metal:** kilos en stock, costo promedio por kilo, valor a costo, precio de venta del día y valor a venta. Tocando un metal se abre su **kardex**.",
            "**Últimos ajustes** hechos al inventario, con tipo, kilos (+ sobrante, - faltante), costo y motivo.",
          ] },
        ],
      },
      {
        titulo: "Ajustes de inventario",
        donde: "Inventario > Stock (botones arriba)",
        quien: "Solo dueño",
        bloques: [
          { t: "lista", items: [
            "**Conteo físico:** se pesa lo que realmente hay en almacén y se anota. El sistema compara con lo que dice y **registra la diferencia** como merma (faltante) o sobrante. Si coincide, avisa que no hubo ajuste.",
            "**Ajuste / merma:** restar (merma, faltante) o sumar (sobrante) kilos de un metal, con **motivo obligatorio** (por ejemplo «humedad, limpieza del material»).",
            "**Reclasificar:** pasar kilos de un metal a otro llevando su costo (por ejemplo, de «cobre quemado» a «cobre brillante» después de limpiarlo).",
          ] },
          { t: "p", texto: "Todo ajuste queda registrado y afecta la utilidad del mes (la merma es pérdida)." },
        ],
      },
      {
        titulo: "Kardex de un metal",
        donde: "Inventario > Stock > tocar un metal",
        quien: "Dueño, socio y cajero",
        bloques: [
          { t: "p", texto: "El **libro de entradas y salidas** del metal: cada compra, venta y ajuste con su fecha, kilos, costo y el **saldo acumulado** en kilos y en soles. Cada línea enlaza a la compra o venta que la originó. Se filtra por fechas y se descarga en Excel." },
          { t: "decir", texto: "«Si un día le falta cobre, aquí ve movimiento por movimiento por dónde entró y por dónde salió cada kilo.»" },
        ],
      },
      {
        titulo: "Precios del día",
        donde: "Inventario > Precios del día",
        quien: "Todos lo ven; solo el dueño los cambia",
        bloques: [
          { t: "lista", items: [
            "Tabla con cada metal y su **precio de compra** y **precio de venta** por kilo.",
            "El dueño cambia los precios directamente en la tabla y presiona **«Guardar precios»** (solo guarda los que cambió).",
            "**Histórico de cambios:** cada cambio de precio queda registrado automáticamente con fecha.",
            "**+ Metal:** crear un metal con nombre, precios, orden en la lista y color de etiqueta. Si un metal tiene variantes con precio distinto, se crea uno por variante (Cobre brillante, Cobre quemado...).",
            "Los metales **no se borran**, se desactivan.",
          ] },
          { t: "p", texto: "El precio de compra del día es el que aparece solo al registrar una compra, y el de venta se sugiere al confirmar una venta." },
        ],
      },
      {
        titulo: "Reportes de inventario",
        donde: "Inventario > Reportes",
        quien: "Dueño y socio",
        bloques: [
          { t: "lista", items: [
            "**Kardex:** entradas, salidas y saldo de un metal elegido.",
            "**Merma:** diferencia de pesos en ventas y ajustes, valorizada a costo (positivo = pérdida, negativo = sobrante).",
          ] },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "finanzas",
    titulo: "Caja y finanzas",
    etiqueta: "Módulo Caja y finanzas",
    resumen: "Cajas, gastos, traspasos, arqueos, capital de socios y cierre de mes",
    color: "sky",
    secciones: [
      {
        titulo: "Caja",
        donde: "Caja y finanzas > Caja",
        quien: "Dueño, socio y cajero (registrar: dueño y cajero)",
        bloques: [
          { t: "p", texto: "Arriba el **saldo total** y una **tarjeta por cada caja** (efectivo, banco, billetera Yape/Plin...) con su saldo, ingresos y egresos. Tocando una tarjeta se filtran sus movimientos. Las compras, ventas, gastos, aportes y retiros mueven la caja **solos**." },
          { t: "sub", texto: "Pestañas" },
          { t: "lista", items: [
            "**Movimientos:** todo lo que entró y salió, con fecha, caja, origen (compra, venta, gasto, aporte, retiro, traspaso, ajuste), concepto y el **saldo acumulado** de la caja. Las compras y ventas enlazan a su detalle. Filtros por caja, origen y fechas.",
            "**Gastos**, **Traspasos** y **Arqueos**: cada tipo por separado, con su detalle.",
          ] },
          { t: "sub", texto: "Botones" },
          { t: "lista", items: [
            "**Gasto:** monto, categoría (luz, alquiler, transporte...), concepto, caja de donde sale y comprobante opcional (foto o PDF). Resta de la caja y cuenta como gasto en la utilidad del mes.",
            "**Traspaso:** mover dinero entre cajas (por ejemplo, depositar el efectivo en el banco). No cambia la utilidad, solo dónde está la plata.",
            "**Arqueo:** contar el efectivo y anotarlo. El sistema guarda la diferencia con su saldo e informa si **la caja cuadra** o cuánto **sobra o falta**. El dueño puede además ajustar el saldo del sistema a lo contado.",
          ] },
          { t: "p", texto: "Gastos y traspasos se **anulan con motivo** (solo el dueño)." },
          { t: "decir", texto: "«Al cierre del día su cajero cuenta la plata, la anota, y el sistema le dice al toque si cuadra o cuánto falta. Usted lo ve desde su celular.»" },
        ],
      },
      {
        titulo: "Capital y cierres",
        donde: "Caja y finanzas > Capital y cierres",
        quien: "Dueño y socio (acciones: solo dueño)",
        bloques: [
          { t: "p", texto: "Responde cuánto pusieron los socios y cuánto ha crecido el negocio. **Capital = aportes - retiros.**" },
          { t: "lista", items: [
            "**Indicadores:** capital aportado, lo que tenemos (caja + stock + en tránsito), ganancia acumulada y utilidad del mes.",
            "**Capital por socio:** cada socio con su %, su capital y la utilidad que le corresponde en el periodo elegido.",
            "**Aporte / retiro:** registrar dinero que un socio pone (aporte) o saca (retiro), de qué caja, fecha y nota. Mueve la caja y el capital. Se anula con motivo.",
          ] },
          { t: "sub", texto: "Cierre de mes" },
          { t: "pasos", items: [
            "El dueño presiona **«Cerrar mes»** y elige el mes.",
            "El sistema guarda una **foto** de ese momento: la caja, el stock por metal, el resultado del mes y la utilidad de cada socio.",
            "Desde ahí **nadie puede registrar ni anular movimientos de ese mes**: los números quedan firmes.",
            "Si hubo un error, el dueño puede **reabrir** el mes indicando el motivo, que queda registrado.",
          ] },
          { t: "decir", texto: "«A fin de mes usted cierra, y ese mes queda como un acta: nadie puede cambiar un número después. Si hay que corregir algo, se reabre dejando escrito por qué.»" },
        ],
      },
      {
        titulo: "Reportes de caja y finanzas",
        donde: "Caja y finanzas > Reportes",
        quien: "Dueño y socio",
        bloques: [
          { t: "lista", items: [
            "**Libro de caja:** movimientos con saldo inicial y acumulado, de una caja o de todas.",
            "**Estado de resultados:** mes a mes.",
            "**Patrimonio: ¿cuánto tenemos?:** caja + stock frente al capital.",
          ] },
          { t: "p", texto: "El detalle de cada uno está en el capítulo siguiente." },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "reportes",
    titulo: "Reportes",
    etiqueta: "Módulo Gestión",
    resumen: "Los 9 reportes, sus filtros y la exportación a Excel y PDF",
    color: "stone",
    intro: "Todos los reportes están juntos en **Gestión > Todos los reportes** y, además, cada módulo muestra los suyos en su pestaña «Reportes». Los ven el dueño y los socios.",
    secciones: [
      {
        titulo: "Cómo se usan",
        bloques: [
          { t: "pasos", items: [
            "Elegir el reporte con los botones de arriba.",
            "Elegir las fechas **Desde / Hasta** (por defecto, del inicio del mes hasta hoy) y, según el reporte, cómo agrupar, el metal o la caja.",
            "**Ver** en pantalla, o descargar en **Excel** o **PDF**. Los tres muestran exactamente lo mismo, con razón social, título, rango de fechas y totales.",
          ] },
        ],
      },
      {
        titulo: "Lista de reportes",
        bloques: [
          {
            t: "tabla", columnas: ["Reporte", "Qué responde", "Opciones"], anchos: [2, 4, 2],
            filas: [
              ["Compras", "¿Cuántos kilos y soles compramos y a qué precio promedio?", "Por día, mes, metal o proveedor"],
              ["Ventas", "¿Cuánto vendimos? Kilos de salida, recibidos, merma e ingresos.", "Por mes, día, metal o comprador"],
              ["Margen por metal", "¿Qué metal deja más ganancia? Venta menos costo por kilo, en S/ y %.", "Fechas"],
              ["Merma", "¿Cuánto perdimos por diferencia de pesos y ajustes?", "Fechas"],
              ["Kardex", "Entradas, salidas y saldo de un metal.", "Metal y fechas"],
              ["Libro de caja", "Movimientos de caja con saldo inicial y acumulado.", "Caja y fechas"],
              ["Estado de resultados", "Utilidad de cada mes, con todos sus componentes.", "Fechas"],
              ["Patrimonio", "¿Cuánto tenemos? Caja + stock frente al capital: la ganancia acumulada.", "Foto a hoy"],
              ["Ranking de proveedores", "¿Quién nos vende más?", "Fechas"],
            ],
          },
        ],
      },
      {
        titulo: "Cómo se calcula la utilidad",
        bloques: [
          { t: "p", texto: "**Utilidad = ventas - costo de lo vendido - mermas - gastos (+/- ajustes de caja).**" },
          { t: "lista", items: [
            "**Las compras no son gasto:** el dinero de una compra pasa a ser mercadería en el almacén. Se vuelve costo recién cuando ese metal se vende.",
            "El **costo de lo vendido** usa el costo promedio de cada metal al momento de la venta.",
            "La **merma** (en ventas y en ajustes de inventario) se cuenta como pérdida, valorizada a costo.",
            "Por eso siempre cuadra: **lo que tenemos - capital = suma de las utilidades** de todos los meses.",
          ] },
          { t: "decir", texto: "«Si este mes compró mucho y vendió poco, no quiere decir que perdió: esa plata está en el almacén como metal. El sistema lo separa para que vea la ganancia real.»" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "configuracion",
    titulo: "Configuración",
    etiqueta: "Módulo Gestión",
    resumen: "Datos de la empresa, usuarios, cajas y categorías de gasto",
    color: "stone",
    intro: "Solo la ve el dueño. Aquí se ajusta el sistema al negocio. (Los metales y sus precios se manejan en Inventario > Precios del día.)",
    secciones: [
      {
        titulo: "Empresa",
        donde: "Gestión > Configuración",
        quien: "Solo dueño",
        bloques: [
          { t: "lista", items: [
            "**Razón social, RUC, teléfono y dirección:** salen en los tickets y reportes.",
            "**Exigir DNI/RUC desde (S/):** monto a partir del cual una compra necesita el documento del proveedor. Vacío = nunca obligatorio.",
            "**Quién puede cambiar el precio por kilo en el mostrador:** el dueño siempre; se puede habilitar al cajero y/o al balancero.",
          ] },
        ],
      },
      {
        titulo: "Usuarios y roles",
        donde: "Gestión > Configuración",
        quien: "Solo dueño",
        bloques: [
          { t: "lista", items: [
            "Lista de usuarios con su rol, que se puede cambiar, y el botón para **desactivar** o **activar** (un usuario desactivado ya no entra).",
            "**+ Usuario:** nombre, correo, **contraseña inicial** (mínimo 6 caracteres, se le entrega a la persona) y rol. Si esa persona ya tiene cuenta en otra empresa, se la agrega conservando su contraseña.",
            "El dueño no puede quitarse su propio rol ni desactivarse (para no quedarse sin acceso).",
          ] },
        ],
      },
      {
        titulo: "Cajas y categorías de gasto",
        donde: "Gestión > Configuración",
        quien: "Solo dueño",
        bloques: [
          { t: "lista", items: [
            "**Cajas:** crear o editar cajas con nombre, tipo (Efectivo, Banco o Billetera Yape/Plin) y orden. Se desactivan, no se borran.",
            "**Categorías de gasto:** luz, agua, alquiler, transporte, sueldos... Se agregan y se activan o desactivan con un toque. Sirven para ordenar los gastos.",
          ] },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "demo",
    titulo: "Recorrido sugerido para la reunión",
    etiqueta: "Demostración",
    resumen: "El orden recomendado para mostrar el sistema, como un día de trabajo",
    color: "marca",
    intro: "Una forma natural de presentarlo es contar **un día del negocio** de principio a fin. Use la empresa de prueba «Metales Demo», así puede registrar y anular sin miedo.",
    bloques: [
      { t: "pasos", items: [
        "**Inicio (como dueño):** «¿Cuánto tenemos?»: caja, mercadería, total y ganancia acumulada. Cambiar el filtro a «Hoy» y a «Este mes».",
        "**Precios del día:** mostrar cómo el dueño fija el precio de compra y venta de cada metal y el histórico.",
        "**Nueva compra:** buscar o crear un proveedor, tocar «Cobre», poner bruto y descuento, ver el neto y el total calculados solos, elegir efectivo y guardar. Abrir el **ticket** y mostrar «Compartir» por WhatsApp.",
        "**Caja:** ver que el dinero de la compra ya salió de la caja de efectivo. Registrar un gasto pequeño (por ejemplo, transporte).",
        "**Inventario:** ver que los kilos ya se sumaron al stock y abrir el **kardex** del metal.",
        "**Nueva venta:** despachar kilos a un comprador con su guía, dejarla «Pendiente de pesaje». Luego **confirmar el pesaje** con un poco menos de kilos y mostrar la **merma** calculada sola y el **margen** de la venta.",
        "**Volver al Inicio:** ver cómo cambiaron la utilidad del periodo, la tabla por metal y el gráfico.",
        "**Anular la compra de prueba** con un motivo: mostrar que la plata y los kilos regresan y que queda registrado quién y por qué.",
        "**Reportes:** abrir el estado de resultados y el patrimonio, y descargar uno en **Excel** y otro en **PDF**.",
        "**Roles:** entrar con un usuario cajero o balancero (o mostrar Configuración > Usuarios) para que vea que cada trabajador solo ve lo suyo.",
        "**Capital y cierres:** explicar los socios, sus % y el cierre de mes como «acta» que nadie puede cambiar.",
        "**En el celular:** mostrar la barra de abajo, el botón «Comprar», el modo oscuro, la letra grande y cómo se instala como app.",
      ] },
      { t: "ojo", titulo: "CONSEJO", texto: "Antes de la reunión, entre una vez a cada sección para que ya estén cargadas y la demostración sea fluida." },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: "pendientes",
    titulo: "Puntos a confirmar con el cliente y próximos pasos",
    etiqueta: "Para cerrar la reunión",
    resumen: "Decisiones que dependen del cliente y lo que viene después",
    color: "sky",
    intro: "Algunas reglas del negocio dependen de cómo trabaja el cliente. El sistema las deja **configurables o pendientes** para no inventarlas. Conviene aprovechar la reunión para definirlas.",
    secciones: [
      {
        titulo: "Preguntas para el cliente",
        bloques: [
          { t: "pasos", items: [
            "**Metales:** ¿cuál es la lista exacta de metales y variantes? ¿Hay precio distinto por variante (por ejemplo, cobre brillante y cobre quemado)?",
            "**Unidad:** ¿siempre se compra y vende por kilo, o también por unidad (baterías, motores)?",
            "**Precio del día:** ¿quién lo fija, cada cuánto cambia y el cajero puede negociarlo en el mostrador?",
            "**DNI obligatorio:** ¿desde qué monto de compra se exige el DNI o RUC del proveedor?",
            "**Crédito:** ¿venden a crédito (cobros en partes)? ¿Compran a crédito?",
            "**Moneda:** ¿alguna venta es en dólares?",
            "**Socios:** ¿cuántos socios son, qué % tiene cada uno y cuál fue el capital inicial (los «20 mil»)?",
            "**Locales:** ¿hay uno o varios locales? Con varios, el stock y la caja irían por local.",
            "**SUNAT:** ¿hoy emiten las guías en el portal de SUNAT? ¿Tienen RUC y certificado digital?",
            "**Gastos fijos:** ¿qué gastos fijos tienen (alquiler, luz, sueldos...) para cargarlos como categorías?",
            "**Sorteo para proveedores:** si lo quieren, ¿un boleto por compra, por cada X kilos o por cada X soles?",
          ] },
          { t: "ojo", texto: "El tema tributario (liquidación de compra y guía de remisión) debe validarlo el **contador** del cliente." },
        ],
      },
      {
        titulo: "Lo que viene después (opcional)",
        bloques: [
          { t: "lista", items: [
            "**Facturación electrónica SUNAT:** emitir liquidaciones de compra y guías de remisión electrónicas desde el sistema.",
            "**Sorteos para proveedores:** boletos según sus compras, para fidelizarlos.",
            "**Uso sin internet:** registrar compras aunque se caiga la señal y que se envíen después.",
            "**Varios locales**, ventas a crédito y dólares, según lo que responda el cliente.",
            "**Versión para otros negocios:** el sistema ya está preparado para varias empresas.",
          ] },
        ],
      },
    ],
  },
];
