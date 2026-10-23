-- =============================================================================
-- Valores nuevos de enums (reunión del 23/10). Archivo aparte: un valor agregado
-- no puede usarse en la misma transacción en que se crea.
--  · rol 'administrador': Administración (precios, productos, proveedores, clientes,
--    reportes y corrección de tickets). Gerencia = 'dueno'; Almacén = 'cajero'.
--  · kardex 'traslado': en la limpieza, material de otro producto que sale de una
--    compra y pasa al stock de ese producto (no es merma).
-- =============================================================================
alter type rol_miembro add value if not exists 'administrador';
alter type tipo_kardex add value if not exists 'traslado';
