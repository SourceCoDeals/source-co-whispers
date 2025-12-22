import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeDomain(input: string | null): string | null {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header to identify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting migration for user: ${user.id}`);

    // Get all deals for this user that don't have a company_id
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select(`
        id,
        deal_name,
        company_website,
        industry_type,
        geography,
        revenue,
        revenue_confidence,
        revenue_is_inferred,
        revenue_source_quote,
        ebitda_percentage,
        ebitda_amount,
        ebitda_confidence,
        ebitda_is_inferred,
        ebitda_source_quote,
        service_mix,
        business_model,
        company_overview,
        employee_count,
        location_count,
        founded_year,
        headquarters,
        contact_name,
        contact_email,
        contact_phone,
        contact_linkedin,
        owner_goals,
        ownership_structure,
        transcript_link,
        financial_notes,
        financial_followup_questions,
        additional_info,
        special_requirements,
        created_at,
        tracker_id,
        industry_trackers!inner (user_id)
      `)
      .is('company_id', null);

    if (dealsError) {
      console.error('Error fetching deals:', dealsError);
      return new Response(JSON.stringify({ error: dealsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to user's deals
    const userDeals = (deals || []).filter((d: any) => d.industry_trackers?.user_id === user.id);
    console.log(`Found ${userDeals.length} deals without company_id`);

    // Group deals by domain
    const domainGroups: Record<string, any[]> = {};
    userDeals.forEach((deal: any) => {
      const domain = normalizeDomain(deal.company_website) || `manual-${deal.id}`;
      if (!domainGroups[domain]) {
        domainGroups[domain] = [];
      }
      domainGroups[domain].push(deal);
    });

    console.log(`Grouped into ${Object.keys(domainGroups).length} unique companies`);

    let companiesCreated = 0;
    let dealsLinked = 0;

    // Process each domain group
    for (const [domain, groupDeals] of Object.entries(domainGroups)) {
      // Check if company already exists for this domain and user
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .eq('domain', domain)
        .maybeSingle();

      let companyId: string;

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        // Pick the most complete deal as the source of truth
        const sourceDeal = groupDeals.reduce((best, current) => {
          const bestScore = (best.company_overview ? 1 : 0) + (best.revenue ? 1 : 0) + (best.geography?.length ? 1 : 0);
          const currentScore = (current.company_overview ? 1 : 0) + (current.revenue ? 1 : 0) + (current.geography?.length ? 1 : 0);
          return currentScore > bestScore ? current : best;
        }, groupDeals[0]);

        // Create company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            domain: domain,
            company_name: sourceDeal.deal_name,
            company_website: sourceDeal.company_website,
            industry_type: sourceDeal.industry_type,
            geography: sourceDeal.geography,
            revenue: sourceDeal.revenue,
            revenue_confidence: sourceDeal.revenue_confidence,
            revenue_is_inferred: sourceDeal.revenue_is_inferred,
            revenue_source_quote: sourceDeal.revenue_source_quote,
            ebitda_percentage: sourceDeal.ebitda_percentage,
            ebitda_amount: sourceDeal.ebitda_amount,
            ebitda_confidence: sourceDeal.ebitda_confidence,
            ebitda_is_inferred: sourceDeal.ebitda_is_inferred,
            ebitda_source_quote: sourceDeal.ebitda_source_quote,
            service_mix: sourceDeal.service_mix,
            business_model: sourceDeal.business_model,
            company_overview: sourceDeal.company_overview,
            employee_count: sourceDeal.employee_count,
            location_count: sourceDeal.location_count,
            founded_year: sourceDeal.founded_year,
            headquarters: sourceDeal.headquarters,
            contact_name: sourceDeal.contact_name,
            contact_email: sourceDeal.contact_email,
            contact_phone: sourceDeal.contact_phone,
            contact_linkedin: sourceDeal.contact_linkedin,
            owner_goals: sourceDeal.owner_goals,
            ownership_structure: sourceDeal.ownership_structure,
            transcript_link: sourceDeal.transcript_link,
            financial_notes: sourceDeal.financial_notes,
            financial_followup_questions: sourceDeal.financial_followup_questions,
            additional_info: sourceDeal.additional_info,
            special_requirements: sourceDeal.special_requirements,
          })
          .select()
          .single();

        if (companyError) {
          console.error(`Error creating company for ${domain}:`, companyError);
          continue;
        }

        companyId = newCompany.id;
        companiesCreated++;
      }

      // Link all deals in this group to the company
      for (const deal of groupDeals) {
        const { error: updateError } = await supabase
          .from('deals')
          .update({ company_id: companyId })
          .eq('id', deal.id);

        if (updateError) {
          console.error(`Error linking deal ${deal.id}:`, updateError);
        } else {
          dealsLinked++;
        }
      }
    }

    console.log(`Migration complete: ${companiesCreated} companies created, ${dealsLinked} deals linked`);

    return new Response(
      JSON.stringify({
        success: true,
        companiesCreated,
        dealsLinked,
        totalDeals: userDeals.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
