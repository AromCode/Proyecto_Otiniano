-- =============================================================================
-- Valores nuevos de enums (archivo aparte: un valor agregado no puede usarse en
-- la misma transacción en que se crea).
--  · kardex 'descuento': kilos que salen del stock por descuento en la selección
--    de almacén y que el proveedor nos debe (no es merma: no va a resultados).
--  · caja 'devolucion': el proveedor nos devuelve en efectivo un descuento.
-- =============================================================================
alter type tipo_kardex add value if not exists 'descuento';
alter type origen_mov_caja add value if not exists 'devolucion';
