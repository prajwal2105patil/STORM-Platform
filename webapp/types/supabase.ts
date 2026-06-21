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
      audit_log: {
        Row: {
          actor: string | null
          claim_id: string | null
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
        }
        Insert: {
          actor?: string | null
          claim_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
        }
        Update: {
          actor?: string | null
          claim_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claim_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          adjudicated_at: string | null
          adjudication_json: Json | null
          adjudication_label: string | null
          asset_capacity_mw: number | null
          asset_lat: number
          asset_lon: number
          asset_name: string
          asset_type: string | null
          claimed_cause: string
          claimed_loss_inr: number | null
          created_at: string | null
          customer_id: string | null
          end_date: string
          exceedance_hours: number | null
          id: string
          idw_confidence: number | null
          nearest_station_id: string | null
          nearest_station_km: number | null
          peak_wind_ms: number | null
          petitioner: string
          processing_ms: number | null
          respondent: string | null
          start_date: string
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          adjudicated_at?: string | null
          adjudication_json?: Json | null
          adjudication_label?: string | null
          asset_capacity_mw?: number | null
          asset_lat: number
          asset_lon: number
          asset_name: string
          asset_type?: string | null
          claimed_cause: string
          claimed_loss_inr?: number | null
          created_at?: string | null
          customer_id?: string | null
          end_date: string
          exceedance_hours?: number | null
          id?: string
          idw_confidence?: number | null
          nearest_station_id?: string | null
          nearest_station_km?: number | null
          peak_wind_ms?: number | null
          petitioner: string
          processing_ms?: number | null
          respondent?: string | null
          start_date: string
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          adjudicated_at?: string | null
          adjudication_json?: Json | null
          adjudication_label?: string | null
          asset_capacity_mw?: number | null
          asset_lat?: number
          asset_lon?: number
          asset_name?: string
          asset_type?: string | null
          claimed_cause?: string
          claimed_loss_inr?: number | null
          created_at?: string | null
          customer_id?: string | null
          end_date?: string
          exceedance_hours?: number | null
          id?: string
          idw_confidence?: number | null
          nearest_station_id?: string | null
          nearest_station_km?: number | null
          peak_wind_ms?: number | null
          petitioner?: string
          processing_ms?: number | null
          respondent?: string | null
          start_date?: string
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_nearest_station_id_fkey"
            columns: ["nearest_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_status: string | null
          approved_claims: number | null
          company_name: string
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
          sector: string | null
          total_claims: number | null
          updated_at: string | null
        }
        Insert: {
          account_status?: string | null
          approved_claims?: number | null
          company_name: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          sector?: string | null
          total_claims?: number | null
          updated_at?: string | null
        }
        Update: {
          account_status?: string | null
          approved_claims?: number | null
          company_name?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          sector?: string | null
          total_claims?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stations: {
        Row: {
          created_at: string | null
          id: string
          lat: number
          lon: number
          name: string
          state: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          lat: number
          lon: number
          name: string
          state?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lat?: number
          lon?: number
          name?: string
          state?: string | null
        }
        Relationships: []
      }
      weather_monthly_stats: {
        Row: {
          avg_wind_ms: number | null
          created_at: string | null
          exceedance_hours: number | null
          gale_confirmed: boolean | null
          id: string
          median_wind_ms: number | null
          min_wind_ms: number | null
          month: number
          n_observations: number | null
          p95_wind_ms: number | null
          peak_wind_ms: number | null
          period_end: string | null
          period_start: string | null
          station_id: string | null
          std_wind_ms: number | null
          year: number
        }
        Insert: {
          avg_wind_ms?: number | null
          created_at?: string | null
          exceedance_hours?: number | null
          gale_confirmed?: boolean | null
          id?: string
          median_wind_ms?: number | null
          min_wind_ms?: number | null
          month: number
          n_observations?: number | null
          p95_wind_ms?: number | null
          peak_wind_ms?: number | null
          period_end?: string | null
          period_start?: string | null
          station_id?: string | null
          std_wind_ms?: number | null
          year: number
        }
        Update: {
          avg_wind_ms?: number | null
          created_at?: string | null
          exceedance_hours?: number | null
          gale_confirmed?: boolean | null
          id?: string
          median_wind_ms?: number | null
          min_wind_ms?: number | null
          month?: number
          n_observations?: number | null
          p95_wind_ms?: number | null
          peak_wind_ms?: number | null
          period_end?: string | null
          period_start?: string | null
          station_id?: string | null
          std_wind_ms?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weather_monthly_stats_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      claim_summary: {
        Row: {
          adjudication_label: string | null
          asset_name: string | null
          end_date: string | null
          exceedance_hours: number | null
          id: string | null
          nearest_station_km: number | null
          peak_wind_ms: number | null
          petitioner: string | null
          processing_ms: number | null
          start_date: string | null
          station_name: string | null
          status: string | null
          submitted_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
