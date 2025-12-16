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
      buyer_contacts: {
        Row: {
          buyer_id: string
          company_type: string | null
          created_at: string
          email: string | null
          email_confidence: string | null
          fee_agreement_status: string | null
          id: string
          last_contacted_date: string | null
          linkedin_url: string | null
          name: string
          phone: string | null
          priority_level: number | null
          salesforce_id: string | null
          title: string | null
        }
        Insert: {
          buyer_id: string
          company_type?: string | null
          created_at?: string
          email?: string | null
          email_confidence?: string | null
          fee_agreement_status?: string | null
          id?: string
          last_contacted_date?: string | null
          linkedin_url?: string | null
          name: string
          phone?: string | null
          priority_level?: number | null
          salesforce_id?: string | null
          title?: string | null
        }
        Update: {
          buyer_id?: string
          company_type?: string | null
          created_at?: string
          email?: string | null
          email_confidence?: string | null
          fee_agreement_status?: string | null
          id?: string
          last_contacted_date?: string | null
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          priority_level?: number | null
          salesforce_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_contacts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_deal_scores: {
        Row: {
          acquisition_score: number | null
          business_model_score: number | null
          buyer_id: string
          composite_score: number | null
          data_completeness: string | null
          deal_id: string
          fit_reasoning: string | null
          geography_score: number | null
          human_override_score: number | null
          id: string
          portfolio_score: number | null
          scored_at: string
          selected_for_outreach: boolean | null
          service_score: number | null
          thesis_bonus: number | null
        }
        Insert: {
          acquisition_score?: number | null
          business_model_score?: number | null
          buyer_id: string
          composite_score?: number | null
          data_completeness?: string | null
          deal_id: string
          fit_reasoning?: string | null
          geography_score?: number | null
          human_override_score?: number | null
          id?: string
          portfolio_score?: number | null
          scored_at?: string
          selected_for_outreach?: boolean | null
          service_score?: number | null
          thesis_bonus?: number | null
        }
        Update: {
          acquisition_score?: number | null
          business_model_score?: number | null
          buyer_id?: string
          composite_score?: number | null
          data_completeness?: string | null
          deal_id?: string
          fit_reasoning?: string | null
          geography_score?: number | null
          human_override_score?: number | null
          id?: string
          portfolio_score?: number | null
          scored_at?: string
          selected_for_outreach?: boolean | null
          service_score?: number | null
          thesis_bonus?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_deal_scores_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_deal_scores_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_transcripts: {
        Row: {
          buyer_id: string
          call_date: string | null
          created_at: string
          id: string
          notes: string | null
          title: string
          transcript_type: string
          url: string | null
        }
        Insert: {
          buyer_id: string
          call_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          title: string
          transcript_type?: string
          url?: string | null
        }
        Update: {
          buyer_id?: string
          call_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          title?: string
          transcript_type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_transcripts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          addon_only: boolean | null
          business_model: string | null
          business_model_prefs: string | null
          call_history: Json | null
          created_at: string
          data_last_updated: string
          deal_breakers: string[] | null
          fee_agreement_status: string | null
          geo_preferences: Json | null
          geographic_footprint: string[] | null
          hq_city: string | null
          hq_state: string | null
          id: string
          key_quotes: string[] | null
          last_call_date: string | null
          max_revenue: number | null
          min_revenue: number | null
          num_platforms: number | null
          pe_firm_name: string
          pe_firm_website: string | null
          platform_company_name: string | null
          platform_only: boolean | null
          platform_website: string | null
          portfolio_companies: string[] | null
          preferred_ebitda: number | null
          recent_acquisitions: Json | null
          service_mix_prefs: string | null
          service_regions: string[] | null
          services_offered: string | null
          thesis_confidence: string | null
          thesis_summary: string | null
          tracker_id: string
        }
        Insert: {
          addon_only?: boolean | null
          business_model?: string | null
          business_model_prefs?: string | null
          call_history?: Json | null
          created_at?: string
          data_last_updated?: string
          deal_breakers?: string[] | null
          fee_agreement_status?: string | null
          geo_preferences?: Json | null
          geographic_footprint?: string[] | null
          hq_city?: string | null
          hq_state?: string | null
          id?: string
          key_quotes?: string[] | null
          last_call_date?: string | null
          max_revenue?: number | null
          min_revenue?: number | null
          num_platforms?: number | null
          pe_firm_name: string
          pe_firm_website?: string | null
          platform_company_name?: string | null
          platform_only?: boolean | null
          platform_website?: string | null
          portfolio_companies?: string[] | null
          preferred_ebitda?: number | null
          recent_acquisitions?: Json | null
          service_mix_prefs?: string | null
          service_regions?: string[] | null
          services_offered?: string | null
          thesis_confidence?: string | null
          thesis_summary?: string | null
          tracker_id: string
        }
        Update: {
          addon_only?: boolean | null
          business_model?: string | null
          business_model_prefs?: string | null
          call_history?: Json | null
          created_at?: string
          data_last_updated?: string
          deal_breakers?: string[] | null
          fee_agreement_status?: string | null
          geo_preferences?: Json | null
          geographic_footprint?: string[] | null
          hq_city?: string | null
          hq_state?: string | null
          id?: string
          key_quotes?: string[] | null
          last_call_date?: string | null
          max_revenue?: number | null
          min_revenue?: number | null
          num_platforms?: number | null
          pe_firm_name?: string
          pe_firm_website?: string | null
          platform_company_name?: string | null
          platform_only?: boolean | null
          platform_website?: string | null
          portfolio_companies?: string[] | null
          preferred_ebitda?: number | null
          recent_acquisitions?: Json | null
          service_mix_prefs?: string | null
          service_regions?: string[] | null
          services_offered?: string | null
          thesis_confidence?: string | null
          thesis_summary?: string | null
          tracker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "industry_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          additional_info: string | null
          business_model: string | null
          company_website: string | null
          created_at: string
          deal_name: string
          ebitda_percentage: number | null
          geography: string[] | null
          id: string
          industry_type: string | null
          owner_goals: string | null
          revenue: number | null
          service_mix: string | null
          special_requirements: string | null
          status: string | null
          tracker_id: string
          transcript_link: string | null
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          business_model?: string | null
          company_website?: string | null
          created_at?: string
          deal_name: string
          ebitda_percentage?: number | null
          geography?: string[] | null
          id?: string
          industry_type?: string | null
          owner_goals?: string | null
          revenue?: number | null
          service_mix?: string | null
          special_requirements?: string | null
          status?: string | null
          tracker_id: string
          transcript_link?: string | null
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          business_model?: string | null
          company_website?: string | null
          created_at?: string
          deal_name?: string
          ebitda_percentage?: number | null
          geography?: string[] | null
          id?: string
          industry_type?: string | null
          owner_goals?: string | null
          revenue?: number | null
          service_mix?: string | null
          special_requirements?: string | null
          status?: string | null
          tracker_id?: string
          transcript_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "industry_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_trackers: {
        Row: {
          created_at: string
          geography_weight: number
          id: string
          industry_name: string
          owner_goals_weight: number
          service_mix_weight: number
          size_weight: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          geography_weight?: number
          id?: string
          industry_name: string
          owner_goals_weight?: number
          service_mix_weight?: number
          size_weight?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          geography_weight?: number
          id?: string
          industry_name?: string
          owner_goals_weight?: number
          service_mix_weight?: number
          size_weight?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_records: {
        Row: {
          buyer_id: string
          contact_id: string | null
          created_at: string
          custom_message: string | null
          deal_id: string
          deal_stage: string | null
          id: string
          last_activity_date: string | null
          meeting_date: string | null
          meeting_scheduled: boolean | null
          notes: string | null
          outcome: string | null
          outreach_channel: string | null
          outreach_date: string | null
          pass_reason: string | null
          response_date: string | null
          response_received: boolean | null
          response_sentiment: string | null
        }
        Insert: {
          buyer_id: string
          contact_id?: string | null
          created_at?: string
          custom_message?: string | null
          deal_id: string
          deal_stage?: string | null
          id?: string
          last_activity_date?: string | null
          meeting_date?: string | null
          meeting_scheduled?: boolean | null
          notes?: string | null
          outcome?: string | null
          outreach_channel?: string | null
          outreach_date?: string | null
          pass_reason?: string | null
          response_date?: string | null
          response_received?: boolean | null
          response_sentiment?: string | null
        }
        Update: {
          buyer_id?: string
          contact_id?: string | null
          created_at?: string
          custom_message?: string | null
          deal_id?: string
          deal_stage?: string | null
          id?: string
          last_activity_date?: string | null
          meeting_date?: string | null
          meeting_scheduled?: boolean | null
          notes?: string | null
          outcome?: string | null
          outreach_channel?: string | null
          outreach_date?: string | null
          pass_reason?: string | null
          response_date?: string | null
          response_received?: boolean | null
          response_sentiment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_records_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_records_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "buyer_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_records_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
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
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer"
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
      app_role: ["admin", "member", "viewer"],
    },
  },
} as const
