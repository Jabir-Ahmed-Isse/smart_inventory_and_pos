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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          organization_id: string
          severity: Database["public"]["Enums"]["log_severity"]
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          organization_id: string
          severity?: Database["public"]["Enums"]["log_severity"]
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          severity?: Database["public"]["Enums"]["log_severity"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["product_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          slug: string | null
          status: Database["public"]["Enums"]["product_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          credit_limit: number
          email: string | null
          id: string
          loyalty_points: number
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          segment: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_limit?: number
          email?: string | null
          id?: string
          loyalty_points?: number
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          segment?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_limit?: number
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          segment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_levels: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          name: string
          slug: string | null
          tax_rate: number
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          slug?: string | null
          tax_rate?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string | null
          tax_rate?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          max_stock: number | null
          min_stock: number
          name: string
          organization_id: string
          reorder_point: number
          retail_price: number
          sku: string
          status: Database["public"]["Enums"]["product_status"]
          supplier_id: string | null
          tax_rate: number
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          max_stock?: number | null
          min_stock?: number
          name: string
          organization_id: string
          reorder_point?: number
          retail_price?: number
          sku: string
          status?: Database["public"]["Enums"]["product_status"]
          supplier_id?: string | null
          tax_rate?: number
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          max_stock?: number | null
          min_stock?: number
          name?: string
          organization_id?: string
          reorder_point?: number
          retail_price?: number
          sku?: string
          status?: Database["public"]["Enums"]["product_status"]
          supplier_id?: string | null
          tax_rate?: number
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_platform_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_platform_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          id: string
          organization_id: string
          product_id: string | null
          purchase_order_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          id?: string
          organization_id: string
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          unit_cost?: number
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          expected_date: string | null
          id: string
          organization_id: string
          po_number: string
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string | null
          total: number
          updated_at: string
          user_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          expected_date?: string | null
          id?: string
          organization_id: string
          po_number: string
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          total?: number
          updated_at?: string
          user_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          expected_date?: string | null
          id?: string
          organization_id?: string
          po_number?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          total?: number
          updated_at?: string
          user_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          id: string
          line_total: number
          organization_id: string
          product_id: string | null
          quantity: number
          sales_order_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          line_total?: number
          organization_id: string
          product_id?: string | null
          quantity?: number
          sales_order_id: string
          unit_price?: number
        }
        Update: {
          id?: string
          line_total?: number
          organization_id?: string
          product_id?: string | null
          quantity?: number
          sales_order_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          opening_balance: number
          organization_id: string
          provider: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          name: string
          opening_balance?: number
          organization_id: string
          provider?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          name?: string
          opening_balance?: number
          organization_id?: string
          provider?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          account_id: string | null
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          order_number: string
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["sales_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          order_number: string
          organization_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["sales_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          order_number?: string
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["sales_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          product_id: string
          quantity: number
          reference: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          product_id: string
          quantity: number
          reference?: string | null
          type: Database["public"]["Enums"]["movement_type"]
          user_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          product_id?: string
          quantity?: number
          reference?: string | null
          type?: Database["public"]["Enums"]["movement_type"]
          user_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          payment_terms: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          organization_id: string
          reference: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          reference?: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          reference?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          base_unit: boolean
          code: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          base_unit?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          base_unit?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_primary: boolean
          location: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          location?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          location?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: {
        Args: { org_name: string; org_slug?: string }
        Returns: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          name: string
          slug: string | null
          tax_rate: number
          timezone: string
          updated_at: string
        }
      }
      is_org_admin: { Args: { org: string }; Returns: boolean }
      is_org_member: { Args: { org: string }; Returns: boolean }
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      org_role: {
        Args: { org: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      seed_demo_data: { Args: { org: string }; Returns: undefined }
    }
    Enums: {
      log_severity: "info" | "warning" | "critical"
      movement_type:
        | "receiving"
        | "sale"
        | "transfer"
        | "adjustment"
        | "damage"
        | "lost"
        | "return"
      account_kind: "bank" | "mobile" | "cash"
      payment_method: "cash" | "card" | "mobile" | "credit" | "bank"
      product_status: "active" | "inactive"
      purchase_status:
        | "draft"
        | "pending"
        | "received"
        | "partial"
        | "overdue"
        | "cancelled"
      sales_status:
        | "draft"
        | "processing"
        | "completed"
        | "refunded"
        | "cancelled"
      txn_type: "income" | "expense"
      user_role: "owner" | "admin" | "manager" | "staff" | "accountant" | "cashier"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience aliases for domain enums.
type PublicEnums = Database["public"]["Enums"]
export type UserRole = PublicEnums["user_role"]
export type ProductStatus = PublicEnums["product_status"]
export type MovementType = PublicEnums["movement_type"]
export type SalesStatus = PublicEnums["sales_status"]
export type PurchaseStatus = PublicEnums["purchase_status"]
export type PaymentMethod = PublicEnums["payment_method"]
export type TxnType = PublicEnums["txn_type"]
export type LogSeverity = PublicEnums["log_severity"]
