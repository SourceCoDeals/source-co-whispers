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
          is_deal_team: boolean | null
          is_primary_contact: boolean | null
          last_contacted_date: string | null
          linkedin_url: string | null
          name: string
          phone: string | null
          priority_level: number | null
          role_category: string | null
          salesforce_id: string | null
          source: string | null
          source_url: string | null
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
          is_deal_team?: boolean | null
          is_primary_contact?: boolean | null
          last_contacted_date?: string | null
          linkedin_url?: string | null
          name: string
          phone?: string | null
          priority_level?: number | null
          role_category?: string | null
          salesforce_id?: string | null
          source?: string | null
          source_url?: string | null
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
          is_deal_team?: boolean | null
          is_primary_contact?: boolean | null
          last_contacted_date?: string | null
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          priority_level?: number | null
          role_category?: string | null
          salesforce_id?: string | null
          source?: string | null
          source_url?: string | null
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
          interested: boolean | null
          interested_at: string | null
          pass_category: string | null
          pass_notes: string | null
          pass_reason: string | null
          passed_at: string | null
          passed_on_deal: boolean | null
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
          interested?: boolean | null
          interested_at?: string | null
          pass_category?: string | null
          pass_notes?: string | null
          pass_reason?: string | null
          passed_at?: string | null
          passed_on_deal?: boolean | null
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
          interested?: boolean | null
          interested_at?: string | null
          pass_category?: string | null
          pass_notes?: string | null
          pass_reason?: string | null
          passed_at?: string | null
          passed_on_deal?: boolean | null
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
          extracted_data: Json | null
          extraction_evidence: Json | null
          id: string
          notes: string | null
          processed_at: string | null
          title: string
          transcript_type: string
          url: string | null
        }
        Insert: {
          buyer_id: string
          call_date?: string | null
          created_at?: string
          extracted_data?: Json | null
          extraction_evidence?: Json | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          title: string
          transcript_type?: string
          url?: string | null
        }
        Update: {
          buyer_id?: string
          call_date?: string | null
          created_at?: string
          extracted_data?: Json | null
          extraction_evidence?: Json | null
          id?: string
          notes?: string | null
          processed_at?: string | null
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
          acquisition_appetite: string | null
          acquisition_frequency: string | null
          acquisition_geography: string[] | null
          acquisition_timeline: string | null
          addon_only: boolean | null
          business_model: string | null
          business_model_exclusions: string[] | null
          business_model_prefs: string | null
          business_summary: string | null
          business_type: string | null
          buyer_linkedin: string | null
          call_history: Json | null
          created_at: string
          customer_geographic_reach: string | null
          customer_industries: string[] | null
          data_last_updated: string
          deal_breakers: string[] | null
          ebitda_sweet_spot: number | null
          employee_owner: string | null
          extraction_evidence: Json | null
          extraction_sources: Json | null
          fee_agreement_status: string | null
          geo_preferences: Json | null
          geographic_exclusions: string[] | null
          geographic_footprint: string[] | null
          go_to_market_strategy: string | null
          has_fee_agreement: boolean | null
          hq_city: string | null
          hq_country: string | null
          hq_region: string | null
          hq_state: string | null
          id: string
          industry_exclusions: string[] | null
          industry_vertical: string | null
          key_quotes: string[] | null
          last_acquisition_date: string | null
          last_call_date: string | null
          max_ebitda: number | null
          max_revenue: number | null
          min_ebitda: number | null
          min_revenue: number | null
          num_platforms: number | null
          operating_locations: Json | null
          other_office_locations: string[] | null
          owner_roll_requirement: string | null
          owner_transition_goals: string | null
          pe_firm_linkedin: string | null
          pe_firm_name: string
          pe_firm_website: string | null
          platform_company_name: string | null
          platform_only: boolean | null
          platform_website: string | null
          portfolio_companies: string[] | null
          preferred_ebitda: number | null
          primary_customer_size: string | null
          recent_acquisitions: Json | null
          required_capabilities: string[] | null
          revenue_model: string | null
          revenue_sweet_spot: number | null
          service_mix_prefs: string | null
          service_regions: string[] | null
          services_offered: string | null
          specialized_focus: string | null
          strategic_priorities: string | null
          target_business_model: string | null
          target_customer_geography: string | null
          target_customer_industries: string[] | null
          target_customer_profile: string | null
          target_customer_size: string | null
          target_geographies: string[] | null
          target_industries: string[] | null
          target_services: string[] | null
          thesis_confidence: string | null
          thesis_summary: string | null
          total_acquisitions: number | null
          tracker_id: string
        }
        Insert: {
          acquisition_appetite?: string | null
          acquisition_frequency?: string | null
          acquisition_geography?: string[] | null
          acquisition_timeline?: string | null
          addon_only?: boolean | null
          business_model?: string | null
          business_model_exclusions?: string[] | null
          business_model_prefs?: string | null
          business_summary?: string | null
          business_type?: string | null
          buyer_linkedin?: string | null
          call_history?: Json | null
          created_at?: string
          customer_geographic_reach?: string | null
          customer_industries?: string[] | null
          data_last_updated?: string
          deal_breakers?: string[] | null
          ebitda_sweet_spot?: number | null
          employee_owner?: string | null
          extraction_evidence?: Json | null
          extraction_sources?: Json | null
          fee_agreement_status?: string | null
          geo_preferences?: Json | null
          geographic_exclusions?: string[] | null
          geographic_footprint?: string[] | null
          go_to_market_strategy?: string | null
          has_fee_agreement?: boolean | null
          hq_city?: string | null
          hq_country?: string | null
          hq_region?: string | null
          hq_state?: string | null
          id?: string
          industry_exclusions?: string[] | null
          industry_vertical?: string | null
          key_quotes?: string[] | null
          last_acquisition_date?: string | null
          last_call_date?: string | null
          max_ebitda?: number | null
          max_revenue?: number | null
          min_ebitda?: number | null
          min_revenue?: number | null
          num_platforms?: number | null
          operating_locations?: Json | null
          other_office_locations?: string[] | null
          owner_roll_requirement?: string | null
          owner_transition_goals?: string | null
          pe_firm_linkedin?: string | null
          pe_firm_name: string
          pe_firm_website?: string | null
          platform_company_name?: string | null
          platform_only?: boolean | null
          platform_website?: string | null
          portfolio_companies?: string[] | null
          preferred_ebitda?: number | null
          primary_customer_size?: string | null
          recent_acquisitions?: Json | null
          required_capabilities?: string[] | null
          revenue_model?: string | null
          revenue_sweet_spot?: number | null
          service_mix_prefs?: string | null
          service_regions?: string[] | null
          services_offered?: string | null
          specialized_focus?: string | null
          strategic_priorities?: string | null
          target_business_model?: string | null
          target_customer_geography?: string | null
          target_customer_industries?: string[] | null
          target_customer_profile?: string | null
          target_customer_size?: string | null
          target_geographies?: string[] | null
          target_industries?: string[] | null
          target_services?: string[] | null
          thesis_confidence?: string | null
          thesis_summary?: string | null
          total_acquisitions?: number | null
          tracker_id: string
        }
        Update: {
          acquisition_appetite?: string | null
          acquisition_frequency?: string | null
          acquisition_geography?: string[] | null
          acquisition_timeline?: string | null
          addon_only?: boolean | null
          business_model?: string | null
          business_model_exclusions?: string[] | null
          business_model_prefs?: string | null
          business_summary?: string | null
          business_type?: string | null
          buyer_linkedin?: string | null
          call_history?: Json | null
          created_at?: string
          customer_geographic_reach?: string | null
          customer_industries?: string[] | null
          data_last_updated?: string
          deal_breakers?: string[] | null
          ebitda_sweet_spot?: number | null
          employee_owner?: string | null
          extraction_evidence?: Json | null
          extraction_sources?: Json | null
          fee_agreement_status?: string | null
          geo_preferences?: Json | null
          geographic_exclusions?: string[] | null
          geographic_footprint?: string[] | null
          go_to_market_strategy?: string | null
          has_fee_agreement?: boolean | null
          hq_city?: string | null
          hq_country?: string | null
          hq_region?: string | null
          hq_state?: string | null
          id?: string
          industry_exclusions?: string[] | null
          industry_vertical?: string | null
          key_quotes?: string[] | null
          last_acquisition_date?: string | null
          last_call_date?: string | null
          max_ebitda?: number | null
          max_revenue?: number | null
          min_ebitda?: number | null
          min_revenue?: number | null
          num_platforms?: number | null
          operating_locations?: Json | null
          other_office_locations?: string[] | null
          owner_roll_requirement?: string | null
          owner_transition_goals?: string | null
          pe_firm_linkedin?: string | null
          pe_firm_name?: string
          pe_firm_website?: string | null
          platform_company_name?: string | null
          platform_only?: boolean | null
          platform_website?: string | null
          portfolio_companies?: string[] | null
          preferred_ebitda?: number | null
          primary_customer_size?: string | null
          recent_acquisitions?: Json | null
          required_capabilities?: string[] | null
          revenue_model?: string | null
          revenue_sweet_spot?: number | null
          service_mix_prefs?: string | null
          service_regions?: string[] | null
          services_offered?: string | null
          specialized_focus?: string | null
          strategic_priorities?: string | null
          target_business_model?: string | null
          target_customer_geography?: string | null
          target_customer_industries?: string[] | null
          target_customer_profile?: string | null
          target_customer_size?: string | null
          target_geographies?: string[] | null
          target_industries?: string[] | null
          target_services?: string[] | null
          thesis_confidence?: string | null
          thesis_summary?: string | null
          total_acquisitions?: number | null
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
      call_intelligence: {
        Row: {
          buyer_id: string | null
          call_date: string | null
          call_summary: string | null
          call_type: string
          created_at: string | null
          deal_id: string | null
          extracted_data: Json | null
          extraction_version: string | null
          follow_up_questions: string[] | null
          id: string
          key_takeaways: string[] | null
          processed_at: string | null
          transcript_url: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          call_date?: string | null
          call_summary?: string | null
          call_type?: string
          created_at?: string | null
          deal_id?: string | null
          extracted_data?: Json | null
          extraction_version?: string | null
          follow_up_questions?: string[] | null
          id?: string
          key_takeaways?: string[] | null
          processed_at?: string | null
          transcript_url?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          call_date?: string | null
          call_summary?: string | null
          call_type?: string
          created_at?: string | null
          deal_id?: string | null
          extracted_data?: Json | null
          extraction_version?: string | null
          follow_up_questions?: string[] | null
          id?: string
          key_takeaways?: string[] | null
          processed_at?: string | null
          transcript_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_intelligence_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_intelligence_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          additional_info: string | null
          business_model: string | null
          company_name: string
          company_overview: string | null
          company_website: string | null
          contact_email: string | null
          contact_linkedin: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          domain: string
          ebitda_amount: number | null
          ebitda_confidence: string | null
          ebitda_is_inferred: boolean | null
          ebitda_percentage: number | null
          ebitda_source_quote: string | null
          employee_count: number | null
          financial_followup_questions: string[] | null
          financial_notes: string | null
          founded_year: number | null
          geography: string[] | null
          headquarters: string | null
          id: string
          industry_type: string | null
          location_count: number | null
          owner_goals: string | null
          ownership_structure: string | null
          revenue: number | null
          revenue_confidence: string | null
          revenue_is_inferred: boolean | null
          revenue_source_quote: string | null
          service_mix: string | null
          special_requirements: string | null
          transcript_link: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          business_model?: string | null
          company_name: string
          company_overview?: string | null
          company_website?: string | null
          contact_email?: string | null
          contact_linkedin?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          domain: string
          ebitda_amount?: number | null
          ebitda_confidence?: string | null
          ebitda_is_inferred?: boolean | null
          ebitda_percentage?: number | null
          ebitda_source_quote?: string | null
          employee_count?: number | null
          financial_followup_questions?: string[] | null
          financial_notes?: string | null
          founded_year?: number | null
          geography?: string[] | null
          headquarters?: string | null
          id?: string
          industry_type?: string | null
          location_count?: number | null
          owner_goals?: string | null
          ownership_structure?: string | null
          revenue?: number | null
          revenue_confidence?: string | null
          revenue_is_inferred?: boolean | null
          revenue_source_quote?: string | null
          service_mix?: string | null
          special_requirements?: string | null
          transcript_link?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_info?: string | null
          business_model?: string | null
          company_name?: string
          company_overview?: string | null
          company_website?: string | null
          contact_email?: string | null
          contact_linkedin?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          domain?: string
          ebitda_amount?: number | null
          ebitda_confidence?: string | null
          ebitda_is_inferred?: boolean | null
          ebitda_percentage?: number | null
          ebitda_source_quote?: string | null
          employee_count?: number | null
          financial_followup_questions?: string[] | null
          financial_notes?: string | null
          founded_year?: number | null
          geography?: string[] | null
          headquarters?: string | null
          id?: string
          industry_type?: string | null
          location_count?: number | null
          owner_goals?: string | null
          ownership_structure?: string | null
          revenue?: number | null
          revenue_confidence?: string | null
          revenue_is_inferred?: boolean | null
          revenue_source_quote?: string | null
          service_mix?: string | null
          special_requirements?: string | null
          transcript_link?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_transcripts: {
        Row: {
          call_date: string | null
          created_at: string
          deal_id: string
          extracted_data: Json | null
          extraction_evidence: Json | null
          id: string
          notes: string | null
          processed_at: string | null
          title: string
          transcript_type: string
          url: string | null
        }
        Insert: {
          call_date?: string | null
          created_at?: string
          deal_id: string
          extracted_data?: Json | null
          extraction_evidence?: Json | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          title: string
          transcript_type?: string
          url?: string | null
        }
        Update: {
          call_date?: string | null
          created_at?: string
          deal_id?: string
          extracted_data?: Json | null
          extraction_evidence?: Json | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          title?: string
          transcript_type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_transcripts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          additional_info: string | null
          business_model: string | null
          company_id: string | null
          company_overview: string | null
          company_website: string | null
          competitive_position: string | null
          contact_email: string | null
          contact_linkedin: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_title: string | null
          created_at: string
          customer_concentration: string | null
          customer_geography: string | null
          deal_name: string
          ebitda_amount: number | null
          ebitda_confidence: string | null
          ebitda_is_inferred: boolean | null
          ebitda_percentage: number | null
          ebitda_source_quote: string | null
          employee_count: number | null
          end_market_customers: string | null
          extraction_sources: Json | null
          financial_followup_questions: string[] | null
          financial_notes: string | null
          founded_year: number | null
          geography: string[] | null
          growth_trajectory: string | null
          headquarters: string | null
          id: string
          industry_type: string | null
          key_risks: string[] | null
          location_count: number | null
          owner_goals: string | null
          ownership_structure: string | null
          real_estate: string | null
          revenue: number | null
          revenue_confidence: string | null
          revenue_is_inferred: boolean | null
          revenue_source_quote: string | null
          service_mix: string | null
          special_requirements: string | null
          status: string | null
          technology_systems: string | null
          tracker_id: string
          transcript_link: string | null
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          business_model?: string | null
          company_id?: string | null
          company_overview?: string | null
          company_website?: string | null
          competitive_position?: string | null
          contact_email?: string | null
          contact_linkedin?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string
          customer_concentration?: string | null
          customer_geography?: string | null
          deal_name: string
          ebitda_amount?: number | null
          ebitda_confidence?: string | null
          ebitda_is_inferred?: boolean | null
          ebitda_percentage?: number | null
          ebitda_source_quote?: string | null
          employee_count?: number | null
          end_market_customers?: string | null
          extraction_sources?: Json | null
          financial_followup_questions?: string[] | null
          financial_notes?: string | null
          founded_year?: number | null
          geography?: string[] | null
          growth_trajectory?: string | null
          headquarters?: string | null
          id?: string
          industry_type?: string | null
          key_risks?: string[] | null
          location_count?: number | null
          owner_goals?: string | null
          ownership_structure?: string | null
          real_estate?: string | null
          revenue?: number | null
          revenue_confidence?: string | null
          revenue_is_inferred?: boolean | null
          revenue_source_quote?: string | null
          service_mix?: string | null
          special_requirements?: string | null
          status?: string | null
          technology_systems?: string | null
          tracker_id: string
          transcript_link?: string | null
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          business_model?: string | null
          company_id?: string | null
          company_overview?: string | null
          company_website?: string | null
          competitive_position?: string | null
          contact_email?: string | null
          contact_linkedin?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string
          customer_concentration?: string | null
          customer_geography?: string | null
          deal_name?: string
          ebitda_amount?: number | null
          ebitda_confidence?: string | null
          ebitda_is_inferred?: boolean | null
          ebitda_percentage?: number | null
          ebitda_source_quote?: string | null
          employee_count?: number | null
          end_market_customers?: string | null
          extraction_sources?: Json | null
          financial_followup_questions?: string[] | null
          financial_notes?: string | null
          founded_year?: number | null
          geography?: string[] | null
          growth_trajectory?: string | null
          headquarters?: string | null
          id?: string
          industry_type?: string | null
          key_risks?: string[] | null
          location_count?: number | null
          owner_goals?: string | null
          ownership_structure?: string | null
          real_estate?: string | null
          revenue?: number | null
          revenue_confidence?: string | null
          revenue_is_inferred?: boolean | null
          revenue_source_quote?: string | null
          service_mix?: string | null
          special_requirements?: string | null
          status?: string | null
          technology_systems?: string | null
          tracker_id?: string
          transcript_link?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "industry_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_intelligence_templates: {
        Row: {
          applies_to: string | null
          category: string
          created_at: string | null
          display_order: number | null
          example_values: string[] | null
          extraction_hint: string | null
          field_label: string
          field_name: string
          field_type: string | null
          id: string
          is_required: boolean | null
          tracker_id: string
        }
        Insert: {
          applies_to?: string | null
          category: string
          created_at?: string | null
          display_order?: number | null
          example_values?: string[] | null
          extraction_hint?: string | null
          field_label: string
          field_name: string
          field_type?: string | null
          id?: string
          is_required?: boolean | null
          tracker_id: string
        }
        Update: {
          applies_to?: string | null
          category?: string
          created_at?: string | null
          display_order?: number | null
          example_values?: string[] | null
          extraction_hint?: string | null
          field_label?: string
          field_name?: string
          field_type?: string | null
          id?: string
          is_required?: boolean | null
          tracker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_intelligence_templates_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "industry_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_trackers: {
        Row: {
          archived: boolean
          buyer_types_criteria: Json | null
          created_at: string
          documents: Json | null
          documents_analyzed_at: string | null
          fit_criteria: string | null
          fit_criteria_buyer_types: string | null
          fit_criteria_geography: string | null
          fit_criteria_service: string | null
          fit_criteria_size: string | null
          geography_criteria: Json | null
          geography_weight: number
          id: string
          industry_name: string
          owner_goals_weight: number
          service_criteria: Json | null
          service_mix_weight: number
          size_criteria: Json | null
          size_weight: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          buyer_types_criteria?: Json | null
          created_at?: string
          documents?: Json | null
          documents_analyzed_at?: string | null
          fit_criteria?: string | null
          fit_criteria_buyer_types?: string | null
          fit_criteria_geography?: string | null
          fit_criteria_service?: string | null
          fit_criteria_size?: string | null
          geography_criteria?: Json | null
          geography_weight?: number
          id?: string
          industry_name: string
          owner_goals_weight?: number
          service_criteria?: Json | null
          service_mix_weight?: number
          size_criteria?: Json | null
          size_weight?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          buyer_types_criteria?: Json | null
          created_at?: string
          documents?: Json | null
          documents_analyzed_at?: string | null
          fit_criteria?: string | null
          fit_criteria_buyer_types?: string | null
          fit_criteria_geography?: string | null
          fit_criteria_service?: string | null
          fit_criteria_size?: string | null
          geography_criteria?: Json | null
          geography_weight?: number
          id?: string
          industry_name?: string
          owner_goals_weight?: number
          service_criteria?: Json | null
          service_mix_weight?: number
          size_criteria?: Json | null
          size_weight?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intelligence_values: {
        Row: {
          array_value: string[] | null
          boolean_value: boolean | null
          call_intelligence_id: string
          category: string
          confidence: string | null
          created_at: string | null
          field_name: string
          id: string
          is_inferred: boolean | null
          numeric_value: number | null
          source_quote: string | null
          template_field_id: string | null
          text_value: string | null
        }
        Insert: {
          array_value?: string[] | null
          boolean_value?: boolean | null
          call_intelligence_id: string
          category: string
          confidence?: string | null
          created_at?: string | null
          field_name: string
          id?: string
          is_inferred?: boolean | null
          numeric_value?: number | null
          source_quote?: string | null
          template_field_id?: string | null
          text_value?: string | null
        }
        Update: {
          array_value?: string[] | null
          boolean_value?: boolean | null
          call_intelligence_id?: string
          category?: string
          confidence?: string | null
          created_at?: string | null
          field_name?: string
          id?: string
          is_inferred?: boolean | null
          numeric_value?: number | null
          source_quote?: string | null
          template_field_id?: string | null
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_values_call_intelligence_id_fkey"
            columns: ["call_intelligence_id"]
            isOneToOne: false
            referencedRelation: "call_intelligence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_values_template_field_id_fkey"
            columns: ["template_field_id"]
            isOneToOne: false
            referencedRelation: "industry_intelligence_templates"
            referencedColumns: ["id"]
          },
        ]
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
      pe_firms: {
        Row: {
          created_at: string
          domain: string
          has_fee_agreement: boolean | null
          hq_city: string | null
          hq_country: string | null
          hq_region: string | null
          hq_state: string | null
          id: string
          linkedin: string | null
          name: string
          num_platforms: number | null
          portfolio_companies: string[] | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          has_fee_agreement?: boolean | null
          hq_city?: string | null
          hq_country?: string | null
          hq_region?: string | null
          hq_state?: string | null
          id?: string
          linkedin?: string | null
          name: string
          num_platforms?: number | null
          portfolio_companies?: string[] | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          has_fee_agreement?: boolean | null
          hq_city?: string | null
          hq_country?: string | null
          hq_region?: string | null
          hq_state?: string | null
          id?: string
          linkedin?: string | null
          name?: string
          num_platforms?: number | null
          portfolio_companies?: string[] | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      platforms: {
        Row: {
          acquisition_appetite: string | null
          acquisition_frequency: string | null
          acquisition_geography: string[] | null
          acquisition_timeline: string | null
          addon_only: boolean | null
          business_model: string | null
          business_model_exclusions: string[] | null
          business_model_prefs: string | null
          business_summary: string | null
          call_history: Json | null
          created_at: string
          customer_geographic_reach: string | null
          customer_industries: string[] | null
          data_last_updated: string
          deal_breakers: string[] | null
          domain: string
          ebitda_sweet_spot: number | null
          employee_owner: string | null
          extraction_evidence: Json | null
          extraction_sources: Json | null
          geo_preferences: Json | null
          geographic_exclusions: string[] | null
          geographic_footprint: string[] | null
          go_to_market_strategy: string | null
          has_fee_agreement: boolean | null
          hq_city: string | null
          hq_country: string | null
          hq_state: string | null
          id: string
          industry_exclusions: string[] | null
          industry_vertical: string | null
          key_quotes: string[] | null
          last_acquisition_date: string | null
          last_call_date: string | null
          linkedin: string | null
          max_ebitda: number | null
          max_revenue: number | null
          min_ebitda: number | null
          min_revenue: number | null
          name: string
          operating_locations: Json | null
          other_office_locations: string[] | null
          owner_roll_requirement: string | null
          owner_transition_goals: string | null
          pe_firm_id: string
          platform_only: boolean | null
          preferred_ebitda: number | null
          primary_customer_size: string | null
          recent_acquisitions: Json | null
          required_capabilities: string[] | null
          revenue_model: string | null
          revenue_sweet_spot: number | null
          service_mix_prefs: string | null
          service_regions: string[] | null
          services_offered: string | null
          specialized_focus: string | null
          strategic_priorities: string | null
          target_business_model: string | null
          target_customer_geography: string | null
          target_customer_industries: string[] | null
          target_customer_profile: string | null
          target_customer_size: string | null
          target_geographies: string[] | null
          target_industries: string[] | null
          target_services: string[] | null
          thesis_confidence: string | null
          thesis_summary: string | null
          total_acquisitions: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          acquisition_appetite?: string | null
          acquisition_frequency?: string | null
          acquisition_geography?: string[] | null
          acquisition_timeline?: string | null
          addon_only?: boolean | null
          business_model?: string | null
          business_model_exclusions?: string[] | null
          business_model_prefs?: string | null
          business_summary?: string | null
          call_history?: Json | null
          created_at?: string
          customer_geographic_reach?: string | null
          customer_industries?: string[] | null
          data_last_updated?: string
          deal_breakers?: string[] | null
          domain: string
          ebitda_sweet_spot?: number | null
          employee_owner?: string | null
          extraction_evidence?: Json | null
          extraction_sources?: Json | null
          geo_preferences?: Json | null
          geographic_exclusions?: string[] | null
          geographic_footprint?: string[] | null
          go_to_market_strategy?: string | null
          has_fee_agreement?: boolean | null
          hq_city?: string | null
          hq_country?: string | null
          hq_state?: string | null
          id?: string
          industry_exclusions?: string[] | null
          industry_vertical?: string | null
          key_quotes?: string[] | null
          last_acquisition_date?: string | null
          last_call_date?: string | null
          linkedin?: string | null
          max_ebitda?: number | null
          max_revenue?: number | null
          min_ebitda?: number | null
          min_revenue?: number | null
          name: string
          operating_locations?: Json | null
          other_office_locations?: string[] | null
          owner_roll_requirement?: string | null
          owner_transition_goals?: string | null
          pe_firm_id: string
          platform_only?: boolean | null
          preferred_ebitda?: number | null
          primary_customer_size?: string | null
          recent_acquisitions?: Json | null
          required_capabilities?: string[] | null
          revenue_model?: string | null
          revenue_sweet_spot?: number | null
          service_mix_prefs?: string | null
          service_regions?: string[] | null
          services_offered?: string | null
          specialized_focus?: string | null
          strategic_priorities?: string | null
          target_business_model?: string | null
          target_customer_geography?: string | null
          target_customer_industries?: string[] | null
          target_customer_profile?: string | null
          target_customer_size?: string | null
          target_geographies?: string[] | null
          target_industries?: string[] | null
          target_services?: string[] | null
          thesis_confidence?: string | null
          thesis_summary?: string | null
          total_acquisitions?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          acquisition_appetite?: string | null
          acquisition_frequency?: string | null
          acquisition_geography?: string[] | null
          acquisition_timeline?: string | null
          addon_only?: boolean | null
          business_model?: string | null
          business_model_exclusions?: string[] | null
          business_model_prefs?: string | null
          business_summary?: string | null
          call_history?: Json | null
          created_at?: string
          customer_geographic_reach?: string | null
          customer_industries?: string[] | null
          data_last_updated?: string
          deal_breakers?: string[] | null
          domain?: string
          ebitda_sweet_spot?: number | null
          employee_owner?: string | null
          extraction_evidence?: Json | null
          extraction_sources?: Json | null
          geo_preferences?: Json | null
          geographic_exclusions?: string[] | null
          geographic_footprint?: string[] | null
          go_to_market_strategy?: string | null
          has_fee_agreement?: boolean | null
          hq_city?: string | null
          hq_country?: string | null
          hq_state?: string | null
          id?: string
          industry_exclusions?: string[] | null
          industry_vertical?: string | null
          key_quotes?: string[] | null
          last_acquisition_date?: string | null
          last_call_date?: string | null
          linkedin?: string | null
          max_ebitda?: number | null
          max_revenue?: number | null
          min_ebitda?: number | null
          min_revenue?: number | null
          name?: string
          operating_locations?: Json | null
          other_office_locations?: string[] | null
          owner_roll_requirement?: string | null
          owner_transition_goals?: string | null
          pe_firm_id?: string
          platform_only?: boolean | null
          preferred_ebitda?: number | null
          primary_customer_size?: string | null
          recent_acquisitions?: Json | null
          required_capabilities?: string[] | null
          revenue_model?: string | null
          revenue_sweet_spot?: number | null
          service_mix_prefs?: string | null
          service_regions?: string[] | null
          services_offered?: string | null
          specialized_focus?: string | null
          strategic_priorities?: string | null
          target_business_model?: string | null
          target_customer_geography?: string | null
          target_customer_industries?: string[] | null
          target_customer_profile?: string | null
          target_customer_size?: string | null
          target_geographies?: string[] | null
          target_industries?: string[] | null
          target_services?: string[] | null
          thesis_confidence?: string | null
          thesis_summary?: string | null
          total_acquisitions?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platforms_pe_firm_id_fkey"
            columns: ["pe_firm_id"]
            isOneToOne: false
            referencedRelation: "pe_firms"
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
      tracker_buyers: {
        Row: {
          added_at: string
          fee_agreement_status: string | null
          id: string
          pe_firm_id: string
          platform_id: string | null
          tracker_id: string
        }
        Insert: {
          added_at?: string
          fee_agreement_status?: string | null
          id?: string
          pe_firm_id: string
          platform_id?: string | null
          tracker_id: string
        }
        Update: {
          added_at?: string
          fee_agreement_status?: string | null
          id?: string
          pe_firm_id?: string
          platform_id?: string | null
          tracker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracker_buyers_pe_firm_id_fkey"
            columns: ["pe_firm_id"]
            isOneToOne: false
            referencedRelation: "pe_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracker_buyers_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracker_buyers_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "industry_trackers"
            referencedColumns: ["id"]
          },
        ]
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
