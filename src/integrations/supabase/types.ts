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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          telegram_id: number
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          telegram_id: number
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          telegram_id?: number
          used?: boolean
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          telegram_id: number
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          telegram_id: number
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          telegram_id?: number
          token?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          note: string | null
          telegram_id: number
        }
        Insert: {
          created_at?: string
          note?: string | null
          telegram_id: number
        }
        Update: {
          created_at?: string
          note?: string | null
          telegram_id?: number
        }
        Relationships: []
      }
      cards: {
        Row: {
          box: number
          created_at: string
          due_at: string
          example: string | null
          id: string
          learned: boolean
          reviews: number
          source_lang: string
          streak: number
          target_lang: string
          telegram_id: number
          translation: string
          word: string
        }
        Insert: {
          box?: number
          created_at?: string
          due_at?: string
          example?: string | null
          id?: string
          learned?: boolean
          reviews?: number
          source_lang?: string
          streak?: number
          target_lang?: string
          telegram_id: number
          translation: string
          word: string
        }
        Update: {
          box?: number
          created_at?: string
          due_at?: string
          example?: string | null
          id?: string
          learned?: boolean
          reviews?: number
          source_lang?: string
          streak?: number
          target_lang?: string
          telegram_id?: number
          translation?: string
          word?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          active: boolean
          created_at: string
          id: string
          sort: number
          title: string
          url: string
          username: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          sort?: number
          title: string
          url: string
          username: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          sort?: number
          title?: string
          url?: string
          username?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          id: string
          meta: Json | null
          target: string | null
          telegram_id: number
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json | null
          target?: string | null
          telegram_id: number
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json | null
          target?: string | null
          telegram_id?: number
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bonus_scans: number
          created_at: string
          credits: number
          credits_date: string | null
          first_name: string | null
          lang: string
          last_active: string | null
          ref_code: string | null
          referred_by: number | null
          scan_day: string | null
          scans_today: number
          streak_days: number
          subscribed: boolean
          subscribed_at: string | null
          telegram_id: number
          tier: string
          username: string | null
        }
        Insert: {
          bonus_scans?: number
          created_at?: string
          credits?: number
          credits_date?: string | null
          first_name?: string | null
          lang?: string
          last_active?: string | null
          ref_code?: string | null
          referred_by?: number | null
          scan_day?: string | null
          scans_today?: number
          streak_days?: number
          subscribed?: boolean
          subscribed_at?: string | null
          telegram_id: number
          tier?: string
          username?: string | null
        }
        Update: {
          bonus_scans?: number
          created_at?: string
          credits?: number
          credits_date?: string | null
          first_name?: string | null
          lang?: string
          last_active?: string | null
          ref_code?: string | null
          referred_by?: number | null
          scan_day?: string | null
          scans_today?: number
          streak_days?: number
          subscribed?: boolean
          subscribed_at?: string | null
          telegram_id?: number
          tier?: string
          username?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          invitee_id: number
          referrer_id: number
          rewarded: boolean
          rewarded_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id: number
          referrer_id: number
          rewarded?: boolean
          rewarded_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: number
          referrer_id?: number
          rewarded?: boolean
          rewarded_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
