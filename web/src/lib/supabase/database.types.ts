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
          logo_url: string | null
          legal_name: string | null
          tagline: string | null
          industry: string | null
          email: string | null
          phone: string | null
          website: string | null
          tax_id: string | null
          registration_number: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state_region: string | null
          postal_code: string | null
          country: string | null
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
          logo_url?: string | null
          legal_name?: string | null
          tagline?: string | null
          industry?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          tax_id?: string | null
          registration_number?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state_region?: string | null
          postal_code?: string | null
          country?: string | null
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
          logo_url?: string | null
          legal_name?: string | null
          tagline?: string | null
          industry?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          tax_id?: string | null
          registration_number?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state_region?: string | null
          postal_code?: string | null
          country?: string | null
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
          is_featured: boolean
          min_price: number | null
          max_price: number | null
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
          is_featured?: boolean
          min_price?: number | null
          max_price?: number | null
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
          is_featured?: boolean
          min_price?: number | null
          max_price?: number | null
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
      chart_of_accounts: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          organization_id: string
          parent_id: string | null
          subtype: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          organization_id: string
          parent_id?: string | null
          subtype?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          organization_id?: string
          parent_id?: string | null
          subtype?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: []
      }
      account_mappings: {
        Row: {
          account_id: string
          created_at: string
          id: string
          key: string
          organization_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          key: string
          organization_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          key?: string
          organization_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          entry_date: string
          entry_number: string
          id: string
          memo: string | null
          organization_id: string
          posted_at: string | null
          reference: string | null
          source: Database["public"]["Enums"]["journal_source"]
          source_id: string | null
          status: Database["public"]["Enums"]["journal_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_number: string
          id?: string
          memo?: string | null
          organization_id: string
          posted_at?: string | null
          reference?: string | null
          source?: Database["public"]["Enums"]["journal_source"]
          source_id?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          memo?: string | null
          organization_id?: string
          posted_at?: string | null
          reference?: string | null
          source?: Database["public"]["Enums"]["journal_source"]
          source_id?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          updated_at?: string
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_id: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
          line_no: number
          organization_id: string
        }
        Insert: {
          account_id: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
          line_no?: number
          organization_id: string
        }
        Update: {
          account_id?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
          line_no?: number
          organization_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          manager_employee_id: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manager_employee_id?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manager_employee_id?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          base_salary: number
          bank_account: string | null
          bank_name: string | null
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          first_name: string
          gender: string | null
          hire_date: string
          id: string
          last_name: string | null
          manager_id: string | null
          mobile_money: string | null
          national_id: string | null
          notes: string | null
          organization_id: string
          pay_frequency: Database["public"]["Enums"]["pay_frequency"]
          phone: string | null
          photo_url: string | null
          position_id: string | null
          status: Database["public"]["Enums"]["employee_status"]
          termination_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          base_salary?: number
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          first_name: string
          gender?: string | null
          hire_date?: string
          id?: string
          last_name?: string | null
          manager_id?: string | null
          mobile_money?: string | null
          national_id?: string | null
          notes?: string | null
          organization_id: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          phone?: string | null
          photo_url?: string | null
          position_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          base_salary?: number
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          first_name?: string
          gender?: string | null
          hire_date?: string
          id?: string
          last_name?: string | null
          manager_id?: string | null
          mobile_money?: string | null
          national_id?: string | null
          notes?: string | null
          organization_id?: string
          pay_frequency?: Database["public"]["Enums"]["pay_frequency"]
          phone?: string | null
          photo_url?: string | null
          position_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      leave_types: {
        Row: {
          code: string | null
          color: string | null
          created_at: string
          default_days: number
          id: string
          is_paid: boolean
          name: string
          organization_id: string
        }
        Insert: {
          code?: string | null
          color?: string | null
          created_at?: string
          default_days?: number
          id?: string
          is_paid?: boolean
          name: string
          organization_id: string
        }
        Update: {
          code?: string | null
          color?: string | null
          created_at?: string
          default_days?: number
          id?: string
          is_paid?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string | null
          organization_id: string
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          days?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type_id?: string | null
          organization_id: string
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string | null
          organization_id?: string
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          hours: number
          id: string
          notes: string | null
          organization_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          hours?: number
          id?: string
          notes?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          work_date?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          hours?: number
          id?: string
          notes?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          work_date?: string
        }
        Relationships: []
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation: number
          acquisition_date: string
          asset_number: string
          category: string | null
          cost: number
          created_at: string
          created_by: string | null
          id: string
          journal_entry_id: string | null
          method: string
          name: string
          notes: string | null
          organization_id: string
          salvage_value: number
          status: Database["public"]["Enums"]["asset_status"]
          updated_at: string
          useful_life_months: number
        }
        Insert: {
          accumulated_depreciation?: number
          acquisition_date?: string
          asset_number: string
          category?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          method?: string
          name: string
          notes?: string | null
          organization_id: string
          salvage_value?: number
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
          useful_life_months?: number
        }
        Update: {
          accumulated_depreciation?: number
          acquisition_date?: string
          asset_number?: string
          category?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          method?: string
          name?: string
          notes?: string | null
          organization_id?: string
          salvage_value?: number
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
          useful_life_months?: number
        }
        Relationships: []
      }
      depreciation_entries: {
        Row: {
          amount: number
          asset_id: string
          created_at: string
          id: string
          journal_entry_id: string | null
          organization_id: string
          period: string
        }
        Insert: {
          amount?: number
          asset_id: string
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          organization_id: string
          period: string
        }
        Update: {
          amount?: number
          asset_id?: string
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          organization_id?: string
          period?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          created_at: string
          created_by: string | null
          fiscal_year: number
          id: string
          name: string
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fiscal_year: number
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fiscal_year?: number
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_lines: {
        Row: {
          account_id: string
          annual_amount: number
          budget_id: string
          id: string
          organization_id: string
        }
        Insert: {
          account_id: string
          annual_amount?: number
          budget_id: string
          id?: string
          organization_id: string
        }
        Update: {
          account_id?: string
          annual_amount?: number
          budget_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          account_id: string | null
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          next_due_date: string
          notes: string | null
          organization_id: string
          recurrence: Database["public"]["Enums"]["recurrence"]
          start_date: string
          supplier_id: string | null
          tax_amount: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          next_due_date?: string
          notes?: string | null
          organization_id: string
          recurrence?: Database["public"]["Enums"]["recurrence"]
          start_date?: string
          supplier_id?: string | null
          tax_amount?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          next_due_date?: string
          notes?: string | null
          organization_id?: string
          recurrence?: Database["public"]["Enums"]["recurrence"]
          start_date?: string
          supplier_id?: string | null
          tax_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          expense_date: string
          expense_number: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          organization_id: string
          payment_entry_id: string | null
          recurring_id: string | null
          status: Database["public"]["Enums"]["expense_status"]
          supplier_id: string | null
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          expense_date?: string
          expense_number: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          organization_id: string
          payment_entry_id?: string | null
          recurring_id?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          supplier_id?: string | null
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          expense_date?: string
          expense_number?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          organization_id?: string
          payment_entry_id?: string | null
          recurring_id?: string | null
          status?: Database["public"]["Enums"]["expense_status"]
          supplier_id?: string | null
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      salary_components: {
        Row: {
          active: boolean
          amount: number
          applies_to_all: boolean
          calc_method: Database["public"]["Enums"]["calc_method"]
          code: string | null
          component_type: Database["public"]["Enums"]["component_type"]
          created_at: string
          id: string
          is_statutory: boolean
          is_taxable: boolean
          name: string
          organization_id: string
          rate: number
        }
        Insert: {
          active?: boolean
          amount?: number
          applies_to_all?: boolean
          calc_method?: Database["public"]["Enums"]["calc_method"]
          code?: string | null
          component_type: Database["public"]["Enums"]["component_type"]
          created_at?: string
          id?: string
          is_statutory?: boolean
          is_taxable?: boolean
          name: string
          organization_id: string
          rate?: number
        }
        Update: {
          active?: boolean
          amount?: number
          applies_to_all?: boolean
          calc_method?: Database["public"]["Enums"]["calc_method"]
          code?: string | null
          component_type?: Database["public"]["Enums"]["component_type"]
          created_at?: string
          id?: string
          is_statutory?: boolean
          is_taxable?: boolean
          name?: string
          organization_id?: string
          rate?: number
        }
        Relationships: []
      }
      employee_components: {
        Row: {
          active: boolean
          amount: number | null
          component_id: string
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          rate: number | null
        }
        Insert: {
          active?: boolean
          amount?: number | null
          component_id: string
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          rate?: number | null
        }
        Update: {
          active?: boolean
          amount?: number | null
          component_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          rate?: number | null
        }
        Relationships: []
      }
      pay_adjustments: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["component_type"]
          amount: number
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          label: string
          organization_id: string
          pay_run_id: string
        }
        Insert: {
          adjustment_type: Database["public"]["Enums"]["component_type"]
          amount?: number
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          label: string
          organization_id: string
          pay_run_id: string
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["component_type"]
          amount?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          label?: string
          organization_id?: string
          pay_run_id?: string
        }
        Relationships: []
      }
      pay_runs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          journal_entry_id: string | null
          name: string
          notes: string | null
          organization_id: string
          pay_date: string
          payment_entry_id: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payrun_status"]
          total_deductions: number
          total_gross: number
          total_net: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          pay_date?: string
          payment_entry_id?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payrun_status"]
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          pay_date?: string
          payment_entry_id?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payrun_status"]
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Relationships: []
      }
      payslips: {
        Row: {
          advance_repayment: number
          basic: number
          created_at: string
          employee_id: string
          gross: number
          id: string
          net_pay: number
          organization_id: string
          pay_run_id: string
          status: Database["public"]["Enums"]["payslip_status"]
          total_deductions: number
          total_earnings: number
        }
        Insert: {
          advance_repayment?: number
          basic?: number
          created_at?: string
          employee_id: string
          gross?: number
          id?: string
          net_pay?: number
          organization_id: string
          pay_run_id: string
          status?: Database["public"]["Enums"]["payslip_status"]
          total_deductions?: number
          total_earnings?: number
        }
        Update: {
          advance_repayment?: number
          basic?: number
          created_at?: string
          employee_id?: string
          gross?: number
          id?: string
          net_pay?: number
          organization_id?: string
          pay_run_id?: string
          status?: Database["public"]["Enums"]["payslip_status"]
          total_deductions?: number
          total_earnings?: number
        }
        Relationships: []
      }
      payslip_items: {
        Row: {
          amount: number
          component_id: string | null
          id: string
          item_type: Database["public"]["Enums"]["component_type"]
          label: string
          organization_id: string
          payslip_id: string
        }
        Insert: {
          amount?: number
          component_id?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["component_type"]
          label: string
          organization_id: string
          payslip_id: string
        }
        Update: {
          amount?: number
          component_id?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["component_type"]
          label?: string
          organization_id?: string
          payslip_id?: string
        }
        Relationships: []
      }
      employee_advances: {
        Row: {
          advance_type: Database["public"]["Enums"]["advance_type"]
          amount: number
          approved_by: string | null
          balance: number
          created_at: string
          created_by: string | null
          disbursed_at: string | null
          employee_id: string
          id: string
          installment_amount: number
          installments: number
          journal_entry_id: string | null
          organization_id: string
          reason: string | null
          status: Database["public"]["Enums"]["advance_status"]
          updated_at: string
        }
        Insert: {
          advance_type?: Database["public"]["Enums"]["advance_type"]
          amount?: number
          approved_by?: string | null
          balance?: number
          created_at?: string
          created_by?: string | null
          disbursed_at?: string | null
          employee_id: string
          id?: string
          installment_amount?: number
          installments?: number
          journal_entry_id?: string | null
          organization_id: string
          reason?: string | null
          status?: Database["public"]["Enums"]["advance_status"]
          updated_at?: string
        }
        Update: {
          advance_type?: Database["public"]["Enums"]["advance_type"]
          amount?: number
          approved_by?: string | null
          balance?: number
          created_at?: string
          created_by?: string | null
          disbursed_at?: string | null
          employee_id?: string
          id?: string
          installment_amount?: number
          installments?: number
          journal_entry_id?: string | null
          organization_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["advance_status"]
          updated_at?: string
        }
        Relationships: []
      }
      advance_repayments: {
        Row: {
          advance_id: string
          amount: number
          created_at: string
          id: string
          organization_id: string
          payslip_id: string | null
        }
        Insert: {
          advance_id: string
          amount?: number
          created_at?: string
          id?: string
          organization_id: string
          payslip_id?: string | null
        }
        Update: {
          advance_id?: string
          amount?: number
          created_at?: string
          id?: string
          organization_id?: string
          payslip_id?: string | null
        }
        Relationships: []
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
      product_stock_v: {
        Row: {
          brand_name: string | null
          category_name: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          min_stock: number | null
          name: string | null
          organization_id: string | null
          qty: number | null
          retail_price: number | null
          sku: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_organization: {
        Args: { org_name: string; org_slug?: string }
        Returns: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          logo_url: string | null
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
      seed_accounting: { Args: { p_org: string }; Returns: undefined }
      seed_hr: { Args: { p_org: string }; Returns: undefined }
      seed_payroll: { Args: { p_org: string }; Returns: undefined }
      seed_expenses: { Args: { p_org: string }; Returns: undefined }
      seed_assets: { Args: { p_org: string }; Returns: undefined }
      backfill_accounting: { Args: { p_org: string }; Returns: number }
      post_journal_entry: { Args: { p_entry: string }; Returns: undefined }
      void_journal_entry: { Args: { p_entry: string }; Returns: undefined }
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      org_role: {
        Args: { org: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      seed_demo_data: { Args: { org: string }; Returns: undefined }
    }
    Enums: {
      asset_status: "active" | "fully_depreciated" | "disposed"
      expense_status: "draft" | "approved" | "paid" | "cancelled"
      recurrence: "weekly" | "monthly" | "quarterly" | "yearly"
      component_type: "earning" | "deduction"
      calc_method: "fixed" | "percent_basic"
      payrun_status: "draft" | "approved" | "paid" | "cancelled"
      payslip_status: "draft" | "approved" | "paid"
      advance_type: "advance" | "loan"
      advance_status:
        | "pending"
        | "approved"
        | "disbursed"
        | "settled"
        | "rejected"
        | "cancelled"
      employment_type: "full_time" | "part_time" | "contract" | "intern" | "temporary"
      employee_status: "active" | "on_leave" | "suspended" | "terminated"
      pay_frequency: "monthly" | "biweekly" | "weekly" | "daily"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      attendance_status:
        | "present"
        | "absent"
        | "late"
        | "half_day"
        | "on_leave"
        | "holiday"
        | "remote"
      account_type: "asset" | "liability" | "equity" | "income" | "expense"
      journal_source:
        | "manual"
        | "sale"
        | "purchase"
        | "payment"
        | "payroll"
        | "adjustment"
        | "opening"
      journal_status: "draft" | "posted" | "void"
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
export type AccountType = PublicEnums["account_type"]
export type JournalSource = PublicEnums["journal_source"]
export type JournalStatus = PublicEnums["journal_status"]
export type EmploymentType = PublicEnums["employment_type"]
export type EmployeeStatus = PublicEnums["employee_status"]
export type PayFrequency = PublicEnums["pay_frequency"]
export type LeaveStatus = PublicEnums["leave_status"]
export type AttendanceStatus = PublicEnums["attendance_status"]
export type ComponentType = PublicEnums["component_type"]
export type CalcMethod = PublicEnums["calc_method"]
export type PayrunStatus = PublicEnums["payrun_status"]
export type PayslipStatus = PublicEnums["payslip_status"]
export type AdvanceType = PublicEnums["advance_type"]
export type AdvanceStatus = PublicEnums["advance_status"]
export type ExpenseStatus = PublicEnums["expense_status"]
export type Recurrence = PublicEnums["recurrence"]
export type AssetStatus = PublicEnums["asset_status"]
