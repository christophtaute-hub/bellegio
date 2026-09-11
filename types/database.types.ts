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
      booking_time_bands: {
        Row: {
          factor: number
          id: string
          label: string
          max_hours: number | null
          min_hours: number
          sort_order: number
        }
        Insert: {
          factor: number
          id?: string
          label: string
          max_hours?: number | null
          min_hours: number
          sort_order?: number
        }
        Update: {
          factor?: number
          id?: string
          label?: string
          max_hours?: number | null
          min_hours?: number
          sort_order?: number
        }
        Relationships: []
      }
      einrichtungen: {
        Row: {
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          archived_at: string | null
          created_at: string
          id: string
          kita_year_start_month: number
          name: string
          trager_id: string
          updated_at: string
          vollzeit_wochenstunden: number
        }
        Insert: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          kita_year_start_month?: number
          name: string
          trager_id: string
          updated_at?: string
          vollzeit_wochenstunden?: number
        }
        Update: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          archived_at?: string | null
          created_at?: string
          id?: string
          kita_year_start_month?: number
          name?: string
          trager_id?: string
          updated_at?: string
          vollzeit_wochenstunden?: number
        }
        Relationships: [
          {
            foreignKeyName: "einrichtungen_trager_id_fkey"
            columns: ["trager_id"]
            isOneToOne: false
            referencedRelation: "trager"
            referencedColumns: ["id"]
          },
        ]
      }
      gruppen: {
        Row: {
          archived_at: string | null
          created_at: string
          einrichtung_id: string
          gruppenart: string
          id: string
          name: string
          sollplatze: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          einrichtung_id: string
          gruppenart: string
          id?: string
          name: string
          sollplatze?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          einrichtung_id?: string
          gruppenart?: string
          id?: string
          name?: string
          sollplatze?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gruppen_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
        ]
      }
      kind_weighting_factors: {
        Row: {
          id: string
          kind_id: string
          weighting_factor_id: string
        }
        Insert: {
          id?: string
          kind_id: string
          weighting_factor_id: string
        }
        Update: {
          id?: string
          kind_id?: string
          weighting_factor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kind_weighting_factors_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "children_place_calculation_view"
            referencedColumns: ["kind_id"]
          },
          {
            foreignKeyName: "kind_weighting_factors_kind_id_fkey"
            columns: ["kind_id"]
            isOneToOne: false
            referencedRelation: "kinder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kind_weighting_factors_weighting_factor_id_fkey"
            columns: ["weighting_factor_id"]
            isOneToOne: false
            referencedRelation: "weighting_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      kinder: {
        Row: {
          archived_at: string | null
          austritt: string | null
          buchungszeit_band_id: string | null
          created_at: string
          einrichtung_id: string
          eintritt: string | null
          geburtsdatum: string
          geschlecht: string
          gruppe_id: string | null
          id: string
          nachname: string
          notizen: string | null
          platznummer: string | null
          status: string
          updated_at: string
          vorname: string
        }
        Insert: {
          archived_at?: string | null
          austritt?: string | null
          buchungszeit_band_id?: string | null
          created_at?: string
          einrichtung_id: string
          eintritt?: string | null
          geburtsdatum: string
          geschlecht?: string
          gruppe_id?: string | null
          id?: string
          nachname: string
          notizen?: string | null
          platznummer?: string | null
          status: string
          updated_at?: string
          vorname: string
        }
        Update: {
          archived_at?: string | null
          austritt?: string | null
          buchungszeit_band_id?: string | null
          created_at?: string
          einrichtung_id?: string
          eintritt?: string | null
          geburtsdatum?: string
          geschlecht?: string
          gruppe_id?: string | null
          id?: string
          nachname?: string
          notizen?: string | null
          platznummer?: string | null
          status?: string
          updated_at?: string
          vorname?: string
        }
        Relationships: [
          {
            foreignKeyName: "kinder_buchungszeit_band_id_fkey"
            columns: ["buchungszeit_band_id"]
            isOneToOne: false
            referencedRelation: "booking_time_bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kinder_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kinder_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "gruppen"
            referencedColumns: ["id"]
          },
        ]
      }
      platzwert_rules: {
        Row: {
          age_matches_expected: boolean
          gruppenart: string
          id: string
          platzwert: number
        }
        Insert: {
          age_matches_expected: boolean
          gruppenart: string
          id?: string
          platzwert: number
        }
        Update: {
          age_matches_expected?: boolean
          gruppenart?: string
          id?: string
          platzwert?: number
        }
        Relationships: []
      }
      team: {
        Row: {
          archived_at: string | null
          austritt: string | null
          created_at: string
          einrichtung_id: string
          eintritt: string | null
          fachkraft: boolean
          gruppe_id: string | null
          id: string
          nachname: string | null
          rolle: string | null
          status: string
          updated_at: string
          vorname: string | null
          wochenstunden: number | null
        }
        Insert: {
          archived_at?: string | null
          austritt?: string | null
          created_at?: string
          einrichtung_id: string
          eintritt?: string | null
          fachkraft?: boolean
          gruppe_id?: string | null
          id?: string
          nachname?: string | null
          rolle?: string | null
          status: string
          updated_at?: string
          vorname?: string | null
          wochenstunden?: number | null
        }
        Update: {
          archived_at?: string | null
          austritt?: string | null
          created_at?: string
          einrichtung_id?: string
          eintritt?: string | null
          fachkraft?: boolean
          gruppe_id?: string | null
          id?: string
          nachname?: string | null
          rolle?: string | null
          status?: string
          updated_at?: string
          vorname?: string | null
          wochenstunden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "gruppen"
            referencedColumns: ["id"]
          },
        ]
      }
      trager: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_einrichtungen: {
        Row: {
          created_at: string
          einrichtung_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          einrichtung_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          einrichtung_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_einrichtungen_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_einrichtungen_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
          trager_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role: string
          trager_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          trager_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_trager_id_fkey"
            columns: ["trager_id"]
            isOneToOne: false
            referencedRelation: "trager"
            referencedColumns: ["id"]
          },
        ]
      }
      weighting_factors: {
        Row: {
          code: string
          factor: number
          id: string
          label: string
        }
        Insert: {
          code: string
          factor: number
          id?: string
          label: string
        }
        Update: {
          code?: string
          factor?: number
          id?: string
          label?: string
        }
        Relationships: []
      }
    }
    Views: {
      children_place_calculation_view: {
        Row: {
          einrichtung_id: string | null
          gruppe_id: string | null
          gruppenart: string | null
          kind_id: string | null
          platzwert: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kinder_einrichtung_id_fkey"
            columns: ["einrichtung_id"]
            isOneToOne: false
            referencedRelation: "einrichtungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kinder_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "gruppen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      kind_max_weighting_factor: {
        Args: { p_kind_id: string }
        Returns: {
          code: string
          factor: number
          label: string
          weighting_factor_id: string
        }[]
      }
      kinder_presence_at_date: {
        Args: { p_einrichtung_id: string; p_stichtag: string }
        Returns: {
          buchungszeit_band_id: string
          buchungszeit_factor: number
          buchungszeit_label: string
          gruppe_id: string
          kind_id: string
          weighting_factor_code: string
          weighting_factor_id: string
          weighting_factor_label: string
          weighting_factor_value: number
        }[]
      }
      team_presence_at_date: {
        Args: { p_einrichtung_id: string; p_stichtag: string }
        Returns: {
          fachkraft: boolean
          nachname: string
          rolle: string
          team_id: string
          vorname: string
          wochenstunden: number
        }[]
      }
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
    Enums: {},
  },
} as const
