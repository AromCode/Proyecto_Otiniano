export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ajustes_inventario: {
        Row: {
          costo_total: number
          creado_en: string
          creado_por: string | null
          empresa_id: string
          fecha: string
          grupo_id: string | null
          id: string
          kg: number
          metal_id: string
          motivo: string
          tipo: Database["public"]["Enums"]["tipo_ajuste"]
        }
        Insert: {
          costo_total: number
          creado_en?: string
          creado_por?: string | null
          empresa_id: string
          fecha?: string
          grupo_id?: string | null
          id?: string
          kg: number
          metal_id: string
          motivo: string
          tipo?: Database["public"]["Enums"]["tipo_ajuste"]
        }
        Update: {
          costo_total?: number
          creado_en?: string
          creado_por?: string | null
          empresa_id?: string
          fecha?: string
          grupo_id?: string | null
          id?: string
          kg?: number
          metal_id?: string
          motivo?: string
          tipo?: Database["public"]["Enums"]["tipo_ajuste"]
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_inventario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_inventario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "ajustes_inventario_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "metales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_inventario_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "v_stock_metal"
            referencedColumns: ["metal_id"]
          },
        ]
      }
      aportes_retiros: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          caja_id: string
          creado_en: string
          creado_por: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_doc"]
          fecha: string
          id: string
          monto: number
          motivo_anulacion: string | null
          nota: string | null
          socio_id: string
          tipo: Database["public"]["Enums"]["tipo_aporte"]
        }
        Insert: {
          anulado_en?: string | null
          anulado_por?: string | null
          caja_id: string
          creado_en?: string
          creado_por?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_doc"]
          fecha?: string
          id?: string
          monto: number
          motivo_anulacion?: string | null
          nota?: string | null
          socio_id: string
          tipo: Database["public"]["Enums"]["tipo_aporte"]
        }
        Update: {
          anulado_en?: string | null
          anulado_por?: string | null
          caja_id?: string
          creado_en?: string
          creado_por?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_doc"]
          fecha?: string
          id?: string
          monto?: number
          motivo_anulacion?: string | null
          nota?: string | null
          socio_id?: string
          tipo?: Database["public"]["Enums"]["tipo_aporte"]
        }
        Relationships: [
          {
            foreignKeyName: "aportes_retiros_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aportes_retiros_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "aportes_retiros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aportes_retiros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "aportes_retiros_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aportes_retiros_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "v_capital_socio"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "aportes_retiros_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "v_utilidad_socio"
            referencedColumns: ["socio_id"]
          },
        ]
      }
      arqueos: {
        Row: {
          caja_id: string
          contado: number
          creado_por: string | null
          diferencia: number | null
          empresa_id: string
          fecha: string
          id: string
          nota: string | null
          saldo_sistema: number
        }
        Insert: {
          caja_id: string
          contado: number
          creado_por?: string | null
          diferencia?: number | null
          empresa_id: string
          fecha?: string
          id?: string
          nota?: string | null
          saldo_sistema: number
        }
        Update: {
          caja_id?: string
          contado?: number
          creado_por?: string | null
          diferencia?: number | null
          empresa_id?: string
          fecha?: string
          id?: string
          nota?: string | null
          saldo_sistema?: number
        }
        Relationships: [
          {
            foreignKeyName: "arqueos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arqueos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "arqueos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arqueos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      cajas: {
        Row: {
          activo: boolean
          creado_en: string
          empresa_id: string
          id: string
          nombre: string
          orden: number
          tipo: Database["public"]["Enums"]["tipo_caja"]
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          empresa_id: string
          id?: string
          nombre: string
          orden?: number
          tipo?: Database["public"]["Enums"]["tipo_caja"]
        }
        Update: {
          activo?: boolean
          creado_en?: string
          empresa_id?: string
          id?: string
          nombre?: string
          orden?: number
          tipo?: Database["public"]["Enums"]["tipo_caja"]
        }
        Relationships: [
          {
            foreignKeyName: "cajas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      categorias_gasto: {
        Row: {
          activo: boolean
          empresa_id: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          empresa_id: string
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          empresa_id?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_gasto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_gasto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      cierres_mes: {
        Row: {
          cerrado_en: string
          cerrado_por: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_cierre"]
          id: string
          motivo_reapertura: string | null
          periodo: string
          reabierto_en: string | null
          reabierto_por: string | null
          snapshot: Json
        }
        Insert: {
          cerrado_en?: string
          cerrado_por?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_cierre"]
          id?: string
          motivo_reapertura?: string | null
          periodo: string
          reabierto_en?: string | null
          reabierto_por?: string | null
          snapshot: Json
        }
        Update: {
          cerrado_en?: string
          cerrado_por?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_cierre"]
          id?: string
          motivo_reapertura?: string | null
          periodo?: string
          reabierto_en?: string | null
          reabierto_por?: string | null
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cierres_mes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_mes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      compra_items: {
        Row: {
          compra_id: string
          descuento_kg: number
          empresa_id: string
          id: string
          importe: number | null
          metal_id: string
          peso_bruto_kg: number
          peso_neto_kg: number | null
          precio_kg: number
        }
        Insert: {
          compra_id: string
          descuento_kg?: number
          empresa_id: string
          id?: string
          importe?: number | null
          metal_id: string
          peso_bruto_kg: number
          peso_neto_kg?: number | null
          precio_kg: number
        }
        Update: {
          compra_id?: string
          descuento_kg?: number
          empresa_id?: string
          id?: string
          importe?: number | null
          metal_id?: string
          peso_bruto_kg?: number
          peso_neto_kg?: number | null
          precio_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "compra_items_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "v_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "compra_items_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "metales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "v_stock_metal"
            referencedColumns: ["metal_id"]
          },
        ]
      }
      compradores: {
        Row: {
          activo: boolean
          contacto: string | null
          creado_en: string
          creado_por: string | null
          direccion: string | null
          empresa_id: string
          id: string
          razon_social: string
          ruc: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          contacto?: string | null
          creado_en?: string
          creado_por?: string | null
          direccion?: string | null
          empresa_id: string
          id?: string
          razon_social: string
          ruc?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          contacto?: string | null
          creado_en?: string
          creado_por?: string | null
          direccion?: string | null
          empresa_id?: string
          id?: string
          razon_social?: string
          ruc?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      compras: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          caja_id: string
          clave_idempotencia: string | null
          creado_en: string
          creado_por: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_doc"]
          fecha: string
          foto_ticket_url: string | null
          id: string
          medio_pago: Database["public"]["Enums"]["medio_pago"]
          motivo_anulacion: string | null
          notas: string | null
          numero: number
          proveedor_id: string | null
          total: number
        }
        Insert: {
          anulado_en?: string | null
          anulado_por?: string | null
          caja_id: string
          clave_idempotencia?: string | null
          creado_en?: string
          creado_por?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_doc"]
          fecha?: string
          foto_ticket_url?: string | null
          id?: string
          medio_pago?: Database["public"]["Enums"]["medio_pago"]
          motivo_anulacion?: string | null
          notas?: string | null
          numero: number
          proveedor_id?: string | null
          total?: number
        }
        Update: {
          anulado_en?: string | null
          anulado_por?: string | null
          caja_id?: string
          clave_idempotencia?: string | null
          creado_en?: string
          creado_por?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_doc"]
          fecha?: string
          foto_ticket_url?: string | null
          id?: string
          medio_pago?: Database["public"]["Enums"]["medio_pago"]
          motivo_anulacion?: string | null
          notas?: string | null
          numero?: number
          proveedor_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_resumen"
            referencedColumns: ["id"]
          },
        ]
      }
      correlativos: {
        Row: {
          empresa_id: string
          tipo: string
          ultimo: number
        }
        Insert: {
          empresa_id: string
          tipo: string
          ultimo?: number
        }
        Update: {
          empresa_id?: string
          tipo?: string
          ultimo?: number
        }
        Relationships: [
          {
            foreignKeyName: "correlativos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correlativos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      empresas: {
        Row: {
          activo: boolean
          creado_en: string
          direccion: string | null
          id: string
          logo_url: string | null
          moneda: string
          monto_doc_obligatorio: number | null
          razon_social: string
          roles_editan_precio: Database["public"]["Enums"]["rol_miembro"][]
          ruc: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          direccion?: string | null
          id?: string
          logo_url?: string | null
          moneda?: string
          monto_doc_obligatorio?: number | null
          razon_social: string
          roles_editan_precio?: Database["public"]["Enums"]["rol_miembro"][]
          ruc?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          creado_en?: string
          direccion?: string | null
          id?: string
          logo_url?: string | null
          moneda?: string
          monto_doc_obligatorio?: number | null
          razon_social?: string
          roles_editan_precio?: Database["public"]["Enums"]["rol_miembro"][]
          ruc?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      gastos: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          caja_id: string
          categoria_id: string | null
          comprobante_url: string | null
          concepto: string
          creado_en: string
          creado_por: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_doc"]
          fecha: string
          id: string
          monto: number
          motivo_anulacion: string | null
        }
        Insert: {
          anulado_en?: string | null
          anulado_por?: string | null
          caja_id: string
          categoria_id?: string | null
          comprobante_url?: string | null
          concepto: string
          creado_en?: string
          creado_por?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_doc"]
          fecha?: string
          id?: string
          monto: number
          motivo_anulacion?: string | null
        }
        Update: {
          anulado_en?: string | null
          anulado_por?: string | null
          caja_id?: string
          categoria_id?: string | null
          comprobante_url?: string | null
          concepto?: string
          creado_en?: string
          creado_por?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_doc"]
          fecha?: string
          id?: string
          monto?: number
          motivo_anulacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_gasto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      kardex: {
        Row: {
          anulado: boolean
          costo_total: number
          creado_en: string
          empresa_id: string
          fecha: string
          id: string
          kg: number
          metal_id: string
          origen_id: string | null
          origen_tabla: string
          tipo: Database["public"]["Enums"]["tipo_kardex"]
        }
        Insert: {
          anulado?: boolean
          costo_total: number
          creado_en?: string
          empresa_id: string
          fecha: string
          id?: string
          kg: number
          metal_id: string
          origen_id?: string | null
          origen_tabla: string
          tipo: Database["public"]["Enums"]["tipo_kardex"]
        }
        Update: {
          anulado?: boolean
          costo_total?: number
          creado_en?: string
          empresa_id?: string
          fecha?: string
          id?: string
          kg?: number
          metal_id?: string
          origen_id?: string | null
          origen_tabla?: string
          tipo?: Database["public"]["Enums"]["tipo_kardex"]
        }
        Relationships: [
          {
            foreignKeyName: "kardex_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "kardex_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "metales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "v_stock_metal"
            referencedColumns: ["metal_id"]
          },
        ]
      }
      metales: {
        Row: {
          activo: boolean
          color: string | null
          creado_en: string
          creado_por: string | null
          empresa_id: string
          id: string
          nombre: string
          orden: number
          precio_compra: number
          precio_venta: number
          unidad: string
        }
        Insert: {
          activo?: boolean
          color?: string | null
          creado_en?: string
          creado_por?: string | null
          empresa_id: string
          id?: string
          nombre: string
          orden?: number
          precio_compra?: number
          precio_venta?: number
          unidad?: string
        }
        Update: {
          activo?: boolean
          color?: string | null
          creado_en?: string
          creado_por?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          orden?: number
          precio_compra?: number
          precio_venta?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "metales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      miembros: {
        Row: {
          activo: boolean
          creado_en: string
          email: string | null
          empresa_id: string
          nombre: string | null
          rol: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          email?: string | null
          empresa_id: string
          nombre?: string | null
          rol: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }
        Update: {
          activo?: boolean
          creado_en?: string
          email?: string | null
          empresa_id?: string
          nombre?: string | null
          rol?: Database["public"]["Enums"]["rol_miembro"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miembros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      movimientos_caja: {
        Row: {
          anulado: boolean
          caja_id: string
          comprobante_url: string | null
          concepto: string | null
          creado_en: string
          creado_por: string | null
          empresa_id: string
          fecha: string
          id: string
          monto: number
          origen: Database["public"]["Enums"]["origen_mov_caja"]
          origen_id: string | null
          tipo: Database["public"]["Enums"]["tipo_mov_caja"]
        }
        Insert: {
          anulado?: boolean
          caja_id: string
          comprobante_url?: string | null
          concepto?: string | null
          creado_en?: string
          creado_por?: string | null
          empresa_id: string
          fecha?: string
          id?: string
          monto: number
          origen: Database["public"]["Enums"]["origen_mov_caja"]
          origen_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_mov_caja"]
        }
        Update: {
          anulado?: boolean
          caja_id?: string
          comprobante_url?: string | null
          concepto?: string | null
          creado_en?: string
          creado_por?: string | null
          empresa_id?: string
          fecha?: string
          id?: string
          monto?: number
          origen?: Database["public"]["Enums"]["origen_mov_caja"]
          origen_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_mov_caja"]
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_caja_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_caja_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "movimientos_caja_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_caja_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      precios_metal: {
        Row: {
          creado_por: string | null
          empresa_id: string
          fecha: string
          id: string
          metal_id: string
          precio_compra: number
          precio_venta: number
        }
        Insert: {
          creado_por?: string | null
          empresa_id: string
          fecha?: string
          id?: string
          metal_id: string
          precio_compra: number
          precio_venta: number
        }
        Update: {
          creado_por?: string | null
          empresa_id?: string
          fecha?: string
          id?: string
          metal_id?: string
          precio_compra?: number
          precio_venta?: number
        }
        Relationships: [
          {
            foreignKeyName: "precios_metal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_metal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "precios_metal_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "metales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precios_metal_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "v_stock_metal"
            referencedColumns: ["metal_id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean
          creado_en: string
          creado_por: string | null
          direccion: string | null
          empresa_id: string
          foto_doc_url: string | null
          id: string
          nombre: string
          notas: string | null
          nro_doc: string | null
          telefono: string | null
          tipo_doc: Database["public"]["Enums"]["tipo_doc"]
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          creado_por?: string | null
          direccion?: string | null
          empresa_id: string
          foto_doc_url?: string | null
          id?: string
          nombre: string
          notas?: string | null
          nro_doc?: string | null
          telefono?: string | null
          tipo_doc?: Database["public"]["Enums"]["tipo_doc"]
        }
        Update: {
          activo?: boolean
          creado_en?: string
          creado_por?: string | null
          direccion?: string | null
          empresa_id?: string
          foto_doc_url?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          nro_doc?: string | null
          telefono?: string | null
          tipo_doc?: Database["public"]["Enums"]["tipo_doc"]
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      socios: {
        Row: {
          activo: boolean
          creado_en: string
          dni: string | null
          empresa_id: string
          id: string
          nombre: string
          porcentaje: number
          user_id: string | null
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          dni?: string | null
          empresa_id: string
          id?: string
          nombre: string
          porcentaje?: number
          user_id?: string | null
        }
        Update: {
          activo?: boolean
          creado_en?: string
          dni?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          porcentaje?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "socios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      stock_metal: {
        Row: {
          actualizado: string
          costo_total: number
          empresa_id: string
          kg: number
          metal_id: string
        }
        Insert: {
          actualizado?: string
          costo_total?: number
          empresa_id: string
          kg?: number
          metal_id: string
        }
        Update: {
          actualizado?: string
          costo_total?: number
          empresa_id?: string
          kg?: number
          metal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_metal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_metal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "stock_metal_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: true
            referencedRelation: "metales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_metal_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: true
            referencedRelation: "v_stock_metal"
            referencedColumns: ["metal_id"]
          },
        ]
      }
      traspasos: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          caja_destino_id: string
          caja_origen_id: string
          concepto: string | null
          creado_en: string
          creado_por: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_doc"]
          fecha: string
          id: string
          monto: number
          motivo_anulacion: string | null
        }
        Insert: {
          anulado_en?: string | null
          anulado_por?: string | null
          caja_destino_id: string
          caja_origen_id: string
          concepto?: string | null
          creado_en?: string
          creado_por?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_doc"]
          fecha?: string
          id?: string
          monto: number
          motivo_anulacion?: string | null
        }
        Update: {
          anulado_en?: string | null
          anulado_por?: string | null
          caja_destino_id?: string
          caja_origen_id?: string
          concepto?: string | null
          creado_en?: string
          creado_por?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_doc"]
          fecha?: string
          id?: string
          monto?: number
          motivo_anulacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "traspasos_caja_destino_id_fkey"
            columns: ["caja_destino_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traspasos_caja_destino_id_fkey"
            columns: ["caja_destino_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "traspasos_caja_origen_id_fkey"
            columns: ["caja_origen_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traspasos_caja_origen_id_fkey"
            columns: ["caja_origen_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "traspasos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traspasos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      venta_items: {
        Row: {
          costo_kg: number
          costo_total: number
          costo_vendido: number | null
          empresa_id: string
          id: string
          importe: number | null
          merma_costo: number | null
          merma_kg: number | null
          metal_id: string
          peso_recibido_kg: number | null
          peso_salida_kg: number
          precio_kg: number | null
          venta_id: string
        }
        Insert: {
          costo_kg: number
          costo_total: number
          costo_vendido?: number | null
          empresa_id: string
          id?: string
          importe?: number | null
          merma_costo?: number | null
          merma_kg?: number | null
          metal_id: string
          peso_recibido_kg?: number | null
          peso_salida_kg: number
          precio_kg?: number | null
          venta_id: string
        }
        Update: {
          costo_kg?: number
          costo_total?: number
          costo_vendido?: number | null
          empresa_id?: string
          id?: string
          importe?: number | null
          merma_costo?: number | null
          merma_kg?: number | null
          metal_id?: string
          peso_recibido_kg?: number | null
          peso_salida_kg?: number
          precio_kg?: number | null
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "venta_items_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "metales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "v_stock_metal"
            referencedColumns: ["metal_id"]
          },
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          caja_id: string | null
          clave_idempotencia: string | null
          comprador_id: string
          comprobante_url: string | null
          confirmado_por: string | null
          creado_en: string
          creado_por: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_venta"]
          fecha: string
          fecha_confirmacion: string | null
          guia_numero: string | null
          guia_url: string | null
          id: string
          medio_pago: Database["public"]["Enums"]["medio_pago"] | null
          motivo_anulacion: string | null
          notas: string | null
          numero: number
          total: number
        }
        Insert: {
          anulado_en?: string | null
          anulado_por?: string | null
          caja_id?: string | null
          clave_idempotencia?: string | null
          comprador_id: string
          comprobante_url?: string | null
          confirmado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_venta"]
          fecha?: string
          fecha_confirmacion?: string | null
          guia_numero?: string | null
          guia_url?: string | null
          id?: string
          medio_pago?: Database["public"]["Enums"]["medio_pago"] | null
          motivo_anulacion?: string | null
          notas?: string | null
          numero: number
          total?: number
        }
        Update: {
          anulado_en?: string | null
          anulado_por?: string | null
          caja_id?: string | null
          clave_idempotencia?: string | null
          comprador_id?: string
          comprobante_url?: string | null
          confirmado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_venta"]
          fecha?: string
          fecha_confirmacion?: string | null
          guia_numero?: string | null
          guia_url?: string | null
          id?: string
          medio_pago?: Database["public"]["Enums"]["medio_pago"] | null
          motivo_anulacion?: string | null
          notas?: string | null
          numero?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "ventas_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "ventas_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "compradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "v_compradores_resumen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
    }
    Views: {
      v_ajustes: {
        Row: {
          costo_total: number | null
          creado_en: string | null
          creado_por: string | null
          empresa_id: string | null
          fecha: string | null
          grupo_id: string | null
          id: string | null
          kg: number | null
          metal_id: string | null
          metal_nombre: string | null
          motivo: string | null
          tipo: Database["public"]["Enums"]["tipo_ajuste"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_inventario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_inventario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "ajustes_inventario_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "metales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_inventario_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "v_stock_metal"
            referencedColumns: ["metal_id"]
          },
        ]
      }
      v_aportes_retiros: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          caja_id: string | null
          caja_nombre: string | null
          creado_en: string | null
          creado_por: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_doc"] | null
          fecha: string | null
          id: string | null
          monto: number | null
          motivo_anulacion: string | null
          nota: string | null
          socio_id: string | null
          socio_nombre: string | null
          tipo: Database["public"]["Enums"]["tipo_aporte"] | null
        }
        Relationships: [
          {
            foreignKeyName: "aportes_retiros_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aportes_retiros_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "aportes_retiros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aportes_retiros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "aportes_retiros_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aportes_retiros_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "v_capital_socio"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "aportes_retiros_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "v_utilidad_socio"
            referencedColumns: ["socio_id"]
          },
        ]
      }
      v_arqueos: {
        Row: {
          caja_id: string | null
          caja_nombre: string | null
          contado: number | null
          creado_por: string | null
          diferencia: number | null
          empresa_id: string | null
          fecha: string | null
          id: string | null
          nota: string | null
          saldo_sistema: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arqueos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arqueos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "arqueos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arqueos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      v_capital_socio: {
        Row: {
          activo: boolean | null
          aportes: number | null
          capital: number | null
          dni: string | null
          empresa_id: string | null
          nombre: string | null
          porcentaje: number | null
          retiros: number | null
          socio_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "socios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      v_compra_items: {
        Row: {
          compra_id: string | null
          descuento_kg: number | null
          dia: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_doc"] | null
          fecha: string | null
          id: string | null
          importe: number | null
          medio_pago: Database["public"]["Enums"]["medio_pago"] | null
          metal_color: string | null
          metal_id: string | null
          metal_nombre: string | null
          numero: number | null
          periodo: string | null
          peso_bruto_kg: number | null
          peso_neto_kg: number | null
          precio_kg: number | null
          proveedor_id: string | null
          proveedor_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compra_items_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "v_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "compra_items_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "metales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_items_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "v_stock_metal"
            referencedColumns: ["metal_id"]
          },
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_resumen"
            referencedColumns: ["id"]
          },
        ]
      }
      v_compradores_resumen: {
        Row: {
          activo: boolean | null
          contacto: string | null
          creado_en: string | null
          creado_por: string | null
          direccion: string | null
          empresa_id: string | null
          id: string | null
          importe_total: number | null
          kg_total: number | null
          n_ventas: number | null
          razon_social: string | null
          ruc: string | null
          telefono: string | null
          ultima_venta: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      v_compras: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          caja_id: string | null
          caja_nombre: string | null
          clave_idempotencia: string | null
          creado_en: string | null
          creado_por: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_doc"] | null
          fecha: string | null
          foto_ticket_url: string | null
          id: string | null
          kg_total: number | null
          medio_pago: Database["public"]["Enums"]["medio_pago"] | null
          metal_ids: string[] | null
          metales: string | null
          motivo_anulacion: string | null
          notas: string | null
          numero: number | null
          periodo: string | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          proveedor_nro_doc: string | null
          proveedor_tipo_doc: Database["public"]["Enums"]["tipo_doc"] | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_resumen"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gastos: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          caja_id: string | null
          caja_nombre: string | null
          categoria_id: string | null
          categoria_nombre: string | null
          comprobante_url: string | null
          concepto: string | null
          creado_en: string | null
          creado_por: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_doc"] | null
          fecha: string | null
          id: string | null
          monto: number | null
          motivo_anulacion: string | null
          periodo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_gasto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      v_kardex: {
        Row: {
          anulado: boolean | null
          costo_kg: number | null
          costo_total: number | null
          creado_en: string | null
          detalle: string | null
          empresa_id: string | null
          fecha: string | null
          id: string | null
          kg: number | null
          metal_id: string | null
          metal_nombre: string | null
          origen_id: string | null
          origen_tabla: string | null
          saldo_costo: number | null
          saldo_kg: number | null
          tipo: Database["public"]["Enums"]["tipo_kardex"] | null
        }
        Relationships: [
          {
            foreignKeyName: "kardex_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "kardex_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "metales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "v_stock_metal"
            referencedColumns: ["metal_id"]
          },
        ]
      }
      v_movimientos_caja: {
        Row: {
          anulado: boolean | null
          caja_id: string | null
          caja_nombre: string | null
          comprobante_url: string | null
          concepto: string | null
          creado_en: string | null
          creado_por: string | null
          empresa_id: string | null
          fecha: string | null
          id: string | null
          monto: number | null
          origen: Database["public"]["Enums"]["origen_mov_caja"] | null
          origen_id: string | null
          periodo: string | null
          saldo_acumulado: number | null
          tipo: Database["public"]["Enums"]["tipo_mov_caja"] | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_caja_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_caja_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "movimientos_caja_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_caja_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      v_patrimonio: {
        Row: {
          activos: number | null
          aportes: number | null
          caja: number | null
          capital: number | null
          empresa_id: string | null
          en_transito: number | null
          ganancia_acumulada: number | null
          retiros: number | null
          stock_costo: number | null
          stock_precio_venta: number | null
        }
        Relationships: []
      }
      v_proveedores_resumen: {
        Row: {
          activo: boolean | null
          creado_en: string | null
          creado_por: string | null
          direccion: string | null
          empresa_id: string | null
          foto_doc_url: string | null
          id: string | null
          importe_total: number | null
          kg_total: number | null
          n_compras: number | null
          nombre: string | null
          notas: string | null
          nro_doc: string | null
          telefono: string | null
          tipo_doc: Database["public"]["Enums"]["tipo_doc"] | null
          ultima_compra: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      v_resultado_mes: {
        Row: {
          ajustes_caja: number | null
          compras: number | null
          costo_ventas: number | null
          empresa_id: string | null
          gastos: number | null
          kg_comprados: number | null
          kg_vendidos: number | null
          margen_bruto: number | null
          merma_ajustes: number | null
          merma_ajustes_kg: number | null
          merma_total: number | null
          merma_venta: number | null
          merma_venta_kg: number | null
          periodo: string | null
          utilidad: number | null
          ventas: number | null
        }
        Relationships: []
      }
      v_saldo_caja: {
        Row: {
          activo: boolean | null
          caja_id: string | null
          egresos: number | null
          empresa_id: string | null
          ingresos: number | null
          nombre: string | null
          orden: number | null
          saldo: number | null
          tipo: Database["public"]["Enums"]["tipo_caja"] | null
        }
        Relationships: [
          {
            foreignKeyName: "cajas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      v_stock_metal: {
        Row: {
          activo: boolean | null
          color: string | null
          costo_promedio: number | null
          costo_total: number | null
          empresa_id: string | null
          kg: number | null
          metal_id: string | null
          nombre: string | null
          orden: number | null
          precio_compra: number | null
          precio_venta: number | null
          unidad: string | null
          valor_costo: number | null
          valor_venta: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      v_utilidad_socio: {
        Row: {
          empresa_id: string | null
          nombre: string | null
          periodo: string | null
          porcentaje: number | null
          socio_id: string | null
          utilidad_empresa: number | null
          utilidad_socio: number | null
        }
        Relationships: []
      }
      v_venta_items: {
        Row: {
          comprador_id: string | null
          comprador_nombre: string | null
          costo_kg: number | null
          costo_total: number | null
          costo_vendido: number | null
          dia: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_venta"] | null
          fecha: string | null
          fecha_confirmacion: string | null
          id: string | null
          importe: number | null
          merma_costo: number | null
          merma_kg: number | null
          metal_color: string | null
          metal_id: string | null
          metal_nombre: string | null
          numero: number | null
          periodo: string | null
          peso_recibido_kg: number | null
          peso_salida_kg: number | null
          precio_kg: number | null
          venta_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venta_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "venta_items_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "metales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_metal_id_fkey"
            columns: ["metal_id"]
            isOneToOne: false
            referencedRelation: "v_stock_metal"
            referencedColumns: ["metal_id"]
          },
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venta_items_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "compradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "v_compradores_resumen"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ventas: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          caja_id: string | null
          caja_nombre: string | null
          clave_idempotencia: string | null
          comprador_id: string | null
          comprador_nombre: string | null
          comprador_ruc: string | null
          comprobante_url: string | null
          confirmado_por: string | null
          costo_total: number | null
          costo_vendido: number | null
          creado_en: string | null
          creado_por: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_venta"] | null
          fecha: string | null
          fecha_confirmacion: string | null
          guia_numero: string | null
          guia_url: string | null
          id: string | null
          kg_recibido: number | null
          kg_salida: number | null
          medio_pago: Database["public"]["Enums"]["medio_pago"] | null
          merma_costo: number | null
          merma_kg: number | null
          metal_ids: string[] | null
          metales: string | null
          motivo_anulacion: string | null
          notas: string | null
          numero: number | null
          periodo: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_caja"
            referencedColumns: ["caja_id"]
          },
          {
            foreignKeyName: "ventas_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "compradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "v_compradores_resumen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "v_patrimonio"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
    }
    Functions: {
      _fecha_operacion: {
        Args: {
          p_fecha: string
          p_rol: Database["public"]["Enums"]["rol_miembro"]
        }
        Returns: string
      }
      _mov_caja: {
        Args: {
          p_caja: string
          p_comprobante_url?: string
          p_concepto: string
          p_empresa: string
          p_fecha: string
          p_monto: number
          p_origen: Database["public"]["Enums"]["origen_mov_caja"]
          p_origen_id: string
          p_tipo: Database["public"]["Enums"]["tipo_mov_caja"]
        }
        Returns: string
      }
      _stock_entrada: {
        Args: {
          p_costo: number
          p_empresa: string
          p_fecha: string
          p_kg: number
          p_metal: string
          p_origen_id: string
          p_origen_tabla: string
          p_tipo: Database["public"]["Enums"]["tipo_kardex"]
        }
        Returns: undefined
      }
      _stock_lock: {
        Args: { p_empresa: string; p_metal: string }
        Returns: {
          actualizado: string
          costo_total: number
          empresa_id: string
          kg: number
          metal_id: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_metal"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _stock_salida: {
        Args: {
          p_empresa: string
          p_fecha: string
          p_kg: number
          p_metal: string
          p_origen_id: string
          p_origen_tabla: string
          p_tipo: Database["public"]["Enums"]["tipo_kardex"]
        }
        Returns: number
      }
      _texto: { Args: { p: string }; Returns: string }
      _validar_caja: {
        Args: { p_caja: string; p_empresa: string }
        Returns: {
          activo: boolean
          creado_en: string
          empresa_id: string
          id: string
          nombre: string
          orden: number
          tipo: Database["public"]["Enums"]["tipo_caja"]
        }
        SetofOptions: {
          from: "*"
          to: "cajas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      actualizar_compra_adjuntos: {
        Args: { p_compra: string; p_foto_ticket_url: string; p_notas: string }
        Returns: undefined
      }
      actualizar_venta_guia: {
        Args: {
          p_comprobante_url: string
          p_guia_numero: string
          p_guia_url: string
          p_notas: string
          p_venta: string
        }
        Returns: undefined
      }
      admin_agregar_miembro: {
        Args: {
          p_email: string
          p_empresa: string
          p_nombre: string
          p_rol: Database["public"]["Enums"]["rol_miembro"]
          p_user: string
        }
        Returns: undefined
      }
      admin_crear_empresa: {
        Args: {
          p_email_dueno: string
          p_nombre_dueno?: string
          p_razon_social: string
          p_ruc: string
        }
        Returns: string
      }
      anular_aporte_retiro: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      anular_compra: {
        Args: { p_compra: string; p_motivo: string }
        Returns: undefined
      }
      anular_gasto: {
        Args: { p_gasto: string; p_motivo: string }
        Returns: undefined
      }
      anular_traspaso: {
        Args: { p_motivo: string; p_traspaso: string }
        Returns: undefined
      }
      anular_venta: {
        Args: { p_motivo: string; p_venta: string }
        Returns: undefined
      }
      cerrar_mes: {
        Args: { p_empresa: string; p_periodo: string }
        Returns: undefined
      }
      comprador_por_metal: {
        Args: { p_comprador: string }
        Returns: {
          color: string
          importe: number
          kg: number
          merma_kg: number
          metal: string
          metal_id: string
          n_ventas: number
          precio_promedio: number
        }[]
      }
      confirmar_venta: {
        Args: {
          p_caja: string
          p_comprobante_url?: string
          p_fecha?: string
          p_items: Json
          p_medio_pago?: Database["public"]["Enums"]["medio_pago"]
          p_venta: string
        }
        Returns: Json
      }
      dashboard: { Args: { p_empresa: string }; Returns: Json }
      es_miembro: { Args: { p_empresa: string }; Returns: boolean }
      es_miembro_ruta: { Args: { p_nombre: string }; Returns: boolean }
      exigir_rol: {
        Args: {
          p_empresa: string
          p_roles: Database["public"]["Enums"]["rol_miembro"][]
        }
        Returns: Database["public"]["Enums"]["rol_miembro"]
      }
      mi_rol: {
        Args: { p_empresa: string }
        Returns: Database["public"]["Enums"]["rol_miembro"]
      }
      patrimonio_al: {
        Args: { p_empresa: string; p_hasta: string }
        Returns: Json
      }
      periodo_cerrado: {
        Args: { p_empresa: string; p_fecha: string }
        Returns: boolean
      }
      periodo_de: { Args: { p: string }; Returns: string }
      proveedor_por_metal: {
        Args: { p_proveedor: string }
        Returns: {
          color: string
          importe: number
          kg: number
          metal: string
          metal_id: string
          n_compras: number
          precio_promedio: number
        }[]
      }
      reabrir_mes: {
        Args: { p_empresa: string; p_motivo: string; p_periodo: string }
        Returns: undefined
      }
      reclasificar_metal: {
        Args: {
          p_destino: string
          p_empresa: string
          p_kg: number
          p_motivo: string
          p_origen: string
        }
        Returns: string
      }
      registrar_ajuste: {
        Args: {
          p_empresa: string
          p_fecha?: string
          p_grupo?: string
          p_kg: number
          p_metal: string
          p_motivo: string
          p_tipo?: Database["public"]["Enums"]["tipo_ajuste"]
        }
        Returns: string
      }
      registrar_aporte_retiro: {
        Args: {
          p_caja: string
          p_empresa: string
          p_fecha?: string
          p_monto: number
          p_nota?: string
          p_socio: string
          p_tipo: Database["public"]["Enums"]["tipo_aporte"]
        }
        Returns: string
      }
      registrar_arqueo: {
        Args: {
          p_ajustar?: boolean
          p_caja: string
          p_contado: number
          p_empresa: string
          p_nota?: string
        }
        Returns: Json
      }
      registrar_compra: {
        Args: {
          p_caja: string
          p_clave?: string
          p_empresa: string
          p_fecha?: string
          p_foto_ticket_url?: string
          p_items: Json
          p_medio_pago?: Database["public"]["Enums"]["medio_pago"]
          p_notas?: string
          p_proveedor?: string
        }
        Returns: Json
      }
      registrar_conteo: {
        Args: {
          p_empresa: string
          p_kg_contado: number
          p_metal: string
          p_motivo?: string
        }
        Returns: string
      }
      registrar_gasto: {
        Args: {
          p_caja: string
          p_categoria?: string
          p_comprobante_url?: string
          p_concepto: string
          p_empresa: string
          p_fecha?: string
          p_monto: number
        }
        Returns: string
      }
      registrar_traspaso: {
        Args: {
          p_concepto?: string
          p_destino: string
          p_empresa: string
          p_fecha?: string
          p_monto: number
          p_origen: string
        }
        Returns: string
      }
      registrar_venta: {
        Args: {
          p_caja?: string
          p_clave?: string
          p_comprador: string
          p_comprobante_url?: string
          p_empresa: string
          p_fecha?: string
          p_guia_numero?: string
          p_guia_url?: string
          p_items: Json
          p_medio_pago?: Database["public"]["Enums"]["medio_pago"]
          p_notas?: string
        }
        Returns: Json
      }
      resumen_compras: { Args: { p_empresa: string }; Returns: Json }
      resumen_inventario: { Args: { p_empresa: string }; Returns: Json }
      resumen_ventas: { Args: { p_empresa: string }; Returns: Json }
      rpt_compras: {
        Args: {
          p_agrupar?: string
          p_desde: string
          p_empresa: string
          p_hasta: string
        }
        Returns: {
          clave: string
          etiqueta: string
          importe: number
          kg: number
          n_compras: number
          precio_promedio: number
        }[]
      }
      rpt_libro_caja: {
        Args: {
          p_caja?: string
          p_desde: string
          p_empresa: string
          p_hasta: string
        }
        Returns: {
          caja: string
          concepto: string
          egreso: number
          fecha: string
          ingreso: number
          origen: string
          saldo: number
        }[]
      }
      rpt_margen_metal: {
        Args: { p_desde: string; p_empresa: string; p_hasta: string }
        Returns: {
          costo_prom: number
          costo_vendido: number
          kg_vendidos: number
          margen_kg: number
          margen_pct: number
          margen_total: number
          metal: string
          metal_id: string
          precio_prom_venta: number
          ventas: number
        }[]
      }
      rpt_merma: {
        Args: { p_desde: string; p_empresa: string; p_hasta: string }
        Returns: {
          merma_ajuste_costo: number
          merma_ajuste_kg: number
          merma_venta_costo: number
          merma_venta_kg: number
          metal: string
          metal_id: string
          total_costo: number
          total_kg: number
        }[]
      }
      rpt_ranking_proveedores: {
        Args: { p_desde: string; p_empresa: string; p_hasta: string }
        Returns: {
          documento: string
          importe: number
          kg: number
          n_compras: number
          nombre: string
          proveedor_id: string
          ultima_compra: string
        }[]
      }
      rpt_ventas: {
        Args: {
          p_agrupar?: string
          p_desde: string
          p_empresa: string
          p_hasta: string
        }
        Returns: {
          clave: string
          etiqueta: string
          importe: number
          kg_recibido: number
          kg_salida: number
          merma_kg: number
          n_ventas: number
          precio_promedio: number
        }[]
      }
      saldo_caja: { Args: { p_caja: string }; Returns: number }
      siguiente_numero: {
        Args: { p_empresa: string; p_tipo: string }
        Returns: number
      }
      tiene_rol: {
        Args: {
          p_empresa: string
          p_roles: Database["public"]["Enums"]["rol_miembro"][]
        }
        Returns: boolean
      }
    }
    Enums: {
      estado_cierre: "cerrado" | "reabierto"
      estado_doc: "registrada" | "anulada"
      estado_venta: "pendiente" | "confirmada" | "anulada"
      medio_pago: "efectivo" | "yape" | "plin" | "transferencia"
      origen_mov_caja:
        | "compra"
        | "venta"
        | "gasto"
        | "aporte"
        | "retiro"
        | "traspaso"
        | "ajuste"
      rol_miembro: "dueno" | "socio" | "cajero" | "balancero"
      tipo_ajuste: "conteo" | "merma" | "reclasificacion" | "otro"
      tipo_aporte: "aporte" | "retiro"
      tipo_caja: "efectivo" | "banco" | "billetera"
      tipo_doc: "DNI" | "RUC" | "CE" | "SIN_DOC"
      tipo_kardex: "compra" | "venta" | "ajuste"
      tipo_mov_caja: "ingreso" | "egreso"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_cierre: ["cerrado", "reabierto"],
      estado_doc: ["registrada", "anulada"],
      estado_venta: ["pendiente", "confirmada", "anulada"],
      medio_pago: ["efectivo", "yape", "plin", "transferencia"],
      origen_mov_caja: [
        "compra",
        "venta",
        "gasto",
        "aporte",
        "retiro",
        "traspaso",
        "ajuste",
      ],
      rol_miembro: ["dueno", "socio", "cajero", "balancero"],
      tipo_ajuste: ["conteo", "merma", "reclasificacion", "otro"],
      tipo_aporte: ["aporte", "retiro"],
      tipo_caja: ["efectivo", "banco", "billetera"],
      tipo_doc: ["DNI", "RUC", "CE", "SIN_DOC"],
      tipo_kardex: ["compra", "venta", "ajuste"],
      tipo_mov_caja: ["ingreso", "egreso"],
    },
  },
} as const
