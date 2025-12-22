import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize domain to get unique identifier
function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  
  try {
    let domain = input.trim();
    
    if (domain.includes('://') || domain.includes('/')) {
      try {
        const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        domain = url.hostname;
      } catch {
        // Continue with string manipulation
      }
    }
    
    domain = domain.replace(/^https?:\/\//i, '');
    domain = domain.replace(/^www\./i, '');
    domain = domain.split('/')[0];
    domain = domain.split(':')[0];
    domain = domain.toLowerCase();
    
    if (!domain.includes('.') || domain.includes(' ')) {
      return null;
    }
    
    return domain;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all buyers for this user (via trackers)
    const { data: trackers } = await supabase
      .from('industry_trackers')
      .select('id')
      .eq('user_id', user.id);

    if (!trackers || trackers.length === 0) {
      return new Response(JSON.stringify({ message: 'No trackers found', migrated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trackerIds = trackers.map(t => t.id);

    const { data: buyers, error: buyersError } = await supabase
      .from('buyers')
      .select('*')
      .in('tracker_id', trackerIds);

    if (buyersError) throw buyersError;
    if (!buyers || buyers.length === 0) {
      return new Response(JSON.stringify({ message: 'No buyers to migrate', migrated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group buyers by PE firm domain
    const peFirmMap = new Map<string, any>();
    const buyerToPeFirm = new Map<string, string>();

    for (const buyer of buyers) {
      // Get PE firm domain - use website or generate from name
      let peDomain = normalizeDomain(buyer.pe_firm_website);
      if (!peDomain) {
        // Generate domain from name
        peDomain = buyer.pe_firm_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      }

      if (!peFirmMap.has(peDomain)) {
        peFirmMap.set(peDomain, {
          user_id: user.id,
          domain: peDomain,
          name: buyer.pe_firm_name,
          website: buyer.pe_firm_website,
          linkedin: buyer.pe_firm_linkedin,
          hq_city: buyer.hq_city,
          hq_state: buyer.hq_state,
          hq_country: buyer.hq_country,
          hq_region: buyer.hq_region,
          num_platforms: buyer.num_platforms,
          portfolio_companies: buyer.portfolio_companies,
        });
      }
      buyerToPeFirm.set(buyer.id, peDomain);
    }

    // Insert PE firms and get IDs
    const peFirmDomainToId = new Map<string, string>();
    
    for (const [domain, peFirmData] of peFirmMap) {
      // Check if already exists
      const { data: existing } = await supabase
        .from('pe_firms')
        .select('id')
        .eq('user_id', user.id)
        .eq('domain', domain)
        .single();

      if (existing) {
        peFirmDomainToId.set(domain, existing.id);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('pe_firms')
          .insert(peFirmData)
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting PE firm:', insertError);
          continue;
        }
        peFirmDomainToId.set(domain, inserted.id);
      }
    }

    // Now create platforms grouped by PE firm + platform domain
    const platformMap = new Map<string, any>();
    const buyerToPlatform = new Map<string, string>();

    for (const buyer of buyers) {
      const peDomain = buyerToPeFirm.get(buyer.id);
      const peFirmId = peFirmDomainToId.get(peDomain!);
      if (!peFirmId) continue;

      // Get platform domain
      let platformDomain = normalizeDomain(buyer.platform_website);
      if (!platformDomain && buyer.platform_company_name) {
        platformDomain = buyer.platform_company_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      }
      if (!platformDomain) {
        platformDomain = 'no-platform-' + buyer.id.slice(0, 8);
      }

      const platformKey = `${peFirmId}:${platformDomain}`;

      if (!platformMap.has(platformKey)) {
        platformMap.set(platformKey, {
          pe_firm_id: peFirmId,
          domain: platformDomain,
          name: buyer.platform_company_name || buyer.pe_firm_name,
          website: buyer.platform_website,
          linkedin: buyer.buyer_linkedin,
          industry_vertical: buyer.industry_vertical,
          business_summary: buyer.business_summary,
          services_offered: buyer.services_offered,
          business_model: buyer.business_model,
          specialized_focus: buyer.specialized_focus,
          geographic_footprint: buyer.geographic_footprint,
          service_regions: buyer.service_regions,
          other_office_locations: buyer.other_office_locations,
          hq_city: buyer.hq_city,
          hq_state: buyer.hq_state,
          hq_country: buyer.hq_country,
          min_revenue: buyer.min_revenue,
          max_revenue: buyer.max_revenue,
          revenue_sweet_spot: buyer.revenue_sweet_spot,
          min_ebitda: buyer.min_ebitda,
          max_ebitda: buyer.max_ebitda,
          ebitda_sweet_spot: buyer.ebitda_sweet_spot,
          preferred_ebitda: buyer.preferred_ebitda,
          acquisition_appetite: buyer.acquisition_appetite,
          acquisition_frequency: buyer.acquisition_frequency,
          acquisition_timeline: buyer.acquisition_timeline,
          acquisition_geography: buyer.acquisition_geography,
          target_geographies: buyer.target_geographies,
          geographic_exclusions: buyer.geographic_exclusions,
          total_acquisitions: buyer.total_acquisitions,
          last_acquisition_date: buyer.last_acquisition_date,
          recent_acquisitions: buyer.recent_acquisitions,
          thesis_summary: buyer.thesis_summary,
          thesis_confidence: buyer.thesis_confidence,
          service_mix_prefs: buyer.service_mix_prefs,
          business_model_prefs: buyer.business_model_prefs,
          target_services: buyer.target_services,
          target_industries: buyer.target_industries,
          industry_exclusions: buyer.industry_exclusions,
          business_model_exclusions: buyer.business_model_exclusions,
          required_capabilities: buyer.required_capabilities,
          deal_breakers: buyer.deal_breakers,
          key_quotes: buyer.key_quotes,
          primary_customer_size: buyer.primary_customer_size,
          customer_industries: buyer.customer_industries,
          customer_geographic_reach: buyer.customer_geographic_reach,
          target_customer_profile: buyer.target_customer_profile,
          target_customer_size: buyer.target_customer_size,
          target_customer_industries: buyer.target_customer_industries,
          target_customer_geography: buyer.target_customer_geography,
          target_business_model: buyer.target_business_model,
          go_to_market_strategy: buyer.go_to_market_strategy,
          revenue_model: buyer.revenue_model,
          employee_owner: buyer.employee_owner,
          owner_transition_goals: buyer.owner_transition_goals,
          owner_roll_requirement: buyer.owner_roll_requirement,
          strategic_priorities: buyer.strategic_priorities,
          addon_only: buyer.addon_only,
          platform_only: buyer.platform_only,
          extraction_evidence: buyer.extraction_evidence,
          extraction_sources: buyer.extraction_sources,
          geo_preferences: buyer.geo_preferences,
          operating_locations: buyer.operating_locations,
          last_call_date: buyer.last_call_date,
          call_history: buyer.call_history,
          data_last_updated: buyer.data_last_updated,
        });
      }
      buyerToPlatform.set(buyer.id, platformKey);
    }

    // Insert platforms
    const platformKeyToId = new Map<string, string>();
    
    for (const [key, platformData] of platformMap) {
      const [peFirmId, domain] = key.split(':');
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('platforms')
        .select('id')
        .eq('pe_firm_id', peFirmId)
        .eq('domain', domain)
        .single();

      if (existing) {
        platformKeyToId.set(key, existing.id);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('platforms')
          .insert(platformData)
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting platform:', insertError);
          continue;
        }
        platformKeyToId.set(key, inserted.id);
      }
    }

    // Create tracker_buyers junction records
    let junctionCreated = 0;
    
    for (const buyer of buyers) {
      const peDomain = buyerToPeFirm.get(buyer.id);
      const peFirmId = peFirmDomainToId.get(peDomain!);
      const platformKey = buyerToPlatform.get(buyer.id);
      const platformId = platformKey ? platformKeyToId.get(platformKey) : null;

      if (!peFirmId) continue;

      // Check if junction already exists
      let query = supabase
        .from('tracker_buyers')
        .select('id')
        .eq('tracker_id', buyer.tracker_id)
        .eq('pe_firm_id', peFirmId);

      if (platformId) {
        query = query.eq('platform_id', platformId);
      } else {
        query = query.is('platform_id', null);
      }

      const { data: existingJunction } = await query.single();

      if (!existingJunction) {
        const { error: junctionError } = await supabase
          .from('tracker_buyers')
          .insert({
            tracker_id: buyer.tracker_id,
            pe_firm_id: peFirmId,
            platform_id: platformId,
            fee_agreement_status: buyer.fee_agreement_status,
          });

        if (junctionError) {
          console.error('Error creating junction:', junctionError);
        } else {
          junctionCreated++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Migrated ${peFirmMap.size} PE firms, ${platformMap.size} platforms, ${junctionCreated} tracker links`,
      stats: {
        peFirms: peFirmMap.size,
        platforms: platformMap.size,
        junctions: junctionCreated,
        originalBuyers: buyers.length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
