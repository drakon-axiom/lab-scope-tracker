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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_login_audit: {
        Row: {
          created_at: string
          email: string
          error_message: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_history: {
        Row: {
          body: string
          bounce_reason: string | null
          bounced_at: string | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_status: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          lab_id: string
          opened_at: string | null
          quote_id: string
          recipient_email: string
          sent_at: string
          status: string
          subject: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          bounce_reason?: string | null
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          lab_id: string
          opened_at?: string | null
          quote_id: string
          recipient_email: string
          sent_at?: string
          status?: string
          subject: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          bounce_reason?: string | null
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          lab_id?: string
          opened_at?: string | null
          quote_id?: string
          recipient_email?: string
          sent_at?: string
          status?: string
          subject?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_history_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_template_versions: {
        Row: {
          body: string
          change_description: string | null
          created_at: string
          created_by: string
          id: string
          is_default: boolean
          lab_id: string | null
          name: string
          subject: string
          template_id: string
          version_number: number
        }
        Insert: {
          body: string
          change_description?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_default?: boolean
          lab_id?: string | null
          name: string
          subject: string
          template_id: string
          version_number: number
        }
        Update: {
          body?: string
          change_description?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_default?: boolean
          lab_id?: string | null
          name?: string
          subject?: string
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_template_versions_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_default: boolean
          lab_id: string | null
          name: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_default?: boolean
          lab_id?: string | null
          name: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_default?: boolean
          lab_id?: string | null
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          lab_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          lab_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          lab_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_users_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          accreditations: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accreditations?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accreditations?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          details: Json
          id: string
          is_default: boolean
          is_validated: boolean | null
          method_name: string
          method_type: string
          updated_at: string
          user_id: string
          validated_at: string | null
          validation_details: Json | null
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          is_default?: boolean
          is_validated?: boolean | null
          method_name: string
          method_type: string
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validation_details?: Json | null
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          is_default?: boolean
          is_validated?: boolean | null
          method_name?: string
          method_type?: string
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validation_details?: Json | null
        }
        Relationships: []
      }
      pricing_audit_log: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string
          id: string
          lab_id: string
          new_price: number
          old_price: number | null
          product_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          id?: string
          lab_id: string
          new_price: number
          old_price?: number | null
          product_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          id?: string
          lab_id?: string
          new_price?: number
          old_price?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_audit_log_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_audit_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_audit_log_product_id_lab_id_fkey"
            columns: ["product_id", "lab_id"]
            isOneToOne: false
            referencedRelation: "product_vendor_pricing"
            referencedColumns: ["product_id", "lab_id"]
          },
        ]
      }
      product_vendor_pricing: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          lab_id: string
          notes: string | null
          price: number
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          lab_id: string
          notes?: string | null
          price: number
          product_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          lab_id?: string
          notes?: string | null
          price?: number
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_vendor_pricing_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_vendor_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          aliases: string[] | null
          category: string | null
          created_at: string
          description: string | null
          duration_days: number | null
          id: string
          name: string
          standard: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aliases?: string[] | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          name: string
          standard?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aliases?: string[] | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          id?: string
          name?: string
          standard?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          quote_id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          quote_id: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          quote_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_activity_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          additional_headers_data: Json | null
          additional_report_headers: number | null
          additional_samples: number | null
          batch: string | null
          client: string | null
          created_at: string | null
          date_completed: string | null
          date_submitted: string | null
          id: string
          manufacturer: string | null
          price: number | null
          product_id: string
          quote_id: string
          report_file: string | null
          report_url: string | null
          sample: string | null
          status: string | null
          test_results: string | null
          testing_notes: string | null
          updated_at: string | null
        }
        Insert: {
          additional_headers_data?: Json | null
          additional_report_headers?: number | null
          additional_samples?: number | null
          batch?: string | null
          client?: string | null
          created_at?: string | null
          date_completed?: string | null
          date_submitted?: string | null
          id?: string
          manufacturer?: string | null
          price?: number | null
          product_id: string
          quote_id: string
          report_file?: string | null
          report_url?: string | null
          sample?: string | null
          status?: string | null
          test_results?: string | null
          testing_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_headers_data?: Json | null
          additional_report_headers?: number | null
          additional_samples?: number | null
          batch?: string | null
          client?: string | null
          created_at?: string | null
          date_completed?: string | null
          date_submitted?: string | null
          id?: string
          manufacturer?: string | null
          price?: number | null
          product_id?: string
          quote_id?: string
          report_file?: string | null
          report_url?: string | null
          sample?: string | null
          status?: string | null
          test_results?: string | null
          testing_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_testing_type_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          items: Json
          lab_id: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          lab_id?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          lab_id?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          discount_type: string | null
          estimated_delivery: string | null
          id: string
          lab_id: string
          lab_quote_number: string | null
          lab_response: string | null
          notes: string | null
          payment_amount_crypto: string | null
          payment_amount_usd: number | null
          payment_date: string | null
          payment_status: string | null
          quote_number: string | null
          shipped_date: string | null
          status: string
          tracking_number: string | null
          tracking_updated_at: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          estimated_delivery?: string | null
          id?: string
          lab_id: string
          lab_quote_number?: string | null
          lab_response?: string | null
          notes?: string | null
          payment_amount_crypto?: string | null
          payment_amount_usd?: number | null
          payment_date?: string | null
          payment_status?: string | null
          quote_number?: string | null
          shipped_date?: string | null
          status?: string
          tracking_number?: string | null
          tracking_updated_at?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          estimated_delivery?: string | null
          id?: string
          lab_id?: string
          lab_quote_number?: string | null
          lab_response?: string | null
          notes?: string | null
          payment_amount_crypto?: string | null
          payment_amount_usd?: number | null
          payment_date?: string | null
          payment_status?: string | null
          quote_number?: string | null
          shipped_date?: string | null
          status?: string
          tracking_number?: string | null
          tracking_updated_at?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      security_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          is_active: boolean
          monthly_item_limit: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          is_active?: boolean
          monthly_item_limit?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          is_active?: boolean
          monthly_item_limit?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_history: {
        Row: {
          changed_at: string
          created_at: string
          details: Json | null
          id: string
          quote_id: string
          source: string
          status: string
          tracking_number: string
        }
        Insert: {
          changed_at?: string
          created_at?: string
          details?: Json | null
          id?: string
          quote_id: string
          source?: string
          status: string
          tracking_number: string
        }
        Update: {
          changed_at?: string
          created_at?: string
          details?: Json | null
          id?: string
          quote_id?: string
          source?: string
          status?: string
          tracking_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          created_at: string
          id: string
          items_sent_this_month: number
          period_end: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items_sent_this_month?: number
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items_sent_this_month?: number
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          approved_by: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          invited_at: string | null
          reason: string | null
          status: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          invited_at?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invited_at?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_lab_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_lab_user: { Args: { _user_id: string }; Returns: boolean }
      reset_monthly_usage: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "subscriber" | "lab"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "subscriber", "lab"],
    },
  },
} as const
