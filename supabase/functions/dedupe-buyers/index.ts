import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Normalize a domain/URL to a consistent format for matching.
 * Removes protocol, www prefix, trailing slashes, and converts to lowercase.
 */
function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  
  try {
    let domain = input.trim();
    
    // If it looks like a URL, parse it
    if (domain.includes('://') || domain.includes('/')) {
      try {
        const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        domain = url.hostname;
      } catch {
        // If URL parsing fails, continue with string manipulation
      }
    }
    
    // Remove protocol prefixes if still present
    domain = domain.replace(/^https?:\/\//i, '');
    
    // Remove www. prefix
    domain = domain.replace(/^www\./i, '');
    
    // Remove trailing slashes and paths
    domain = domain.split('/')[0];
    
    // Remove port number
    domain = domain.split(':')[0];
    
    // Convert to lowercase
    domain = domain.toLowerCase();
    
    // Validate: must have at least one dot and no spaces
    if (!domain.includes('.') || domain.includes(' ')) {
      return null;
    }
    
    return domain;
  } catch {
    return null;
  }
}

/**
 * Normalize a company name for matching.
 */
function normalizeName(input: string | null | undefined): string | null {
  if (!input) return null;
  
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric chars
    || null;
}

/**
 * Count meaningful (non-null, non-empty) fields in a buyer record.
 * Used to determine which record is "most complete".
 */
function countMeaningfulFields(buyer: any): number {
  const fieldsToCheck = [
    'business_summary',
    'services_offered',
    'thesis_summary',
    'strategic_priorities',
    'target_industries',
    'target_geographies',
    'target_services',
    'portfolio_companies',
    'recent_acquisitions',
    'geographic_footprint',
    'hq_city',
    'hq_state',
    'hq_country',
    'min_revenue',
    'max_revenue',
    'min_ebitda',
    'max_ebitda',
    'acquisition_frequency',
    'acquisition_timeline',
    'deal_breakers',
    'key_quotes',
  ];
  
  let count = 0;
  for (const field of fieldsToCheck) {
    const value = buyer[field];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    count++;
  }
  return count;
}

interface DuplicateGroup {
  key: string; // domain or normalized name
  matchType: 'domain' | 'name';
  buyers: any[];
  keeperId: string;
  duplicateIds: string[];
  mergedPeFirmName: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tracker_id, preview_only = false } = await req.json();
    
    if (!tracker_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'tracker_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[dedupe-buyers] Starting for tracker ${tracker_id}, preview_only=${preview_only}`);

    // Fetch all buyers for this tracker
    const { data: buyers, error: fetchError } = await supabase
      .from('buyers')
      .select('*')
      .eq('tracker_id', tracker_id);

    if (fetchError) {
      console.error('[dedupe-buyers] Error fetching buyers:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!buyers || buyers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, duplicateGroups: [], stats: { groupsFound: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[dedupe-buyers] Found ${buyers.length} buyers`);

    // Group buyers by normalized domain (primary) or name (fallback)
    const domainGroups = new Map<string, any[]>();
    const nameOnlyBuyers: any[] = [];

    for (const buyer of buyers) {
      const platformDomain = normalizeDomain(buyer.platform_website);
      
      if (platformDomain) {
        if (!domainGroups.has(platformDomain)) {
          domainGroups.set(platformDomain, []);
        }
        domainGroups.get(platformDomain)!.push(buyer);
      } else {
        // No domain - will group by name later
        nameOnlyBuyers.push(buyer);
      }
    }

    // Group name-only buyers by normalized name
    const nameGroups = new Map<string, any[]>();
    for (const buyer of nameOnlyBuyers) {
      const normalizedName = normalizeName(buyer.platform_company_name);
      if (normalizedName) {
        if (!nameGroups.has(normalizedName)) {
          nameGroups.set(normalizedName, []);
        }
        nameGroups.get(normalizedName)!.push(buyer);
      }
    }

    // Find duplicate groups (2+ buyers in same group)
    const duplicateGroups: DuplicateGroup[] = [];

    // Check domain groups
    for (const [domain, groupBuyers] of domainGroups) {
      if (groupBuyers.length >= 2) {
        // Sort by completeness (most complete first)
        groupBuyers.sort((a, b) => countMeaningfulFields(b) - countMeaningfulFields(a));
        
        const keeper = groupBuyers[0];
        const duplicates = groupBuyers.slice(1);
        
        // Combine PE firm names
        const peFirmNames = new Set<string>();
        for (const b of groupBuyers) {
          if (b.pe_firm_name) {
            peFirmNames.add(b.pe_firm_name.trim());
          }
        }
        const mergedPeFirmName = Array.from(peFirmNames).join(' / ');

        duplicateGroups.push({
          key: domain,
          matchType: 'domain',
          buyers: groupBuyers,
          keeperId: keeper.id,
          duplicateIds: duplicates.map(d => d.id),
          mergedPeFirmName,
        });
      }
    }

    // Check name groups
    for (const [name, groupBuyers] of nameGroups) {
      if (groupBuyers.length >= 2) {
        groupBuyers.sort((a, b) => countMeaningfulFields(b) - countMeaningfulFields(a));
        
        const keeper = groupBuyers[0];
        const duplicates = groupBuyers.slice(1);
        
        const peFirmNames = new Set<string>();
        for (const b of groupBuyers) {
          if (b.pe_firm_name) {
            peFirmNames.add(b.pe_firm_name.trim());
          }
        }
        const mergedPeFirmName = Array.from(peFirmNames).join(' / ');

        duplicateGroups.push({
          key: name,
          matchType: 'name',
          buyers: groupBuyers,
          keeperId: keeper.id,
          duplicateIds: duplicates.map(d => d.id),
          mergedPeFirmName,
        });
      }
    }

    console.log(`[dedupe-buyers] Found ${duplicateGroups.length} duplicate groups`);

    // If preview only, return the groups without modifying anything
    if (preview_only) {
      return new Response(
        JSON.stringify({
          success: true,
          duplicateGroups: duplicateGroups.map(g => ({
            key: g.key,
            matchType: g.matchType,
            count: g.buyers.length,
            platformNames: g.buyers.map(b => b.platform_company_name || b.pe_firm_name),
            peFirmNames: g.buyers.map(b => b.pe_firm_name),
            mergedPeFirmName: g.mergedPeFirmName,
            keeperId: g.keeperId,
            keeperName: g.buyers[0].platform_company_name || g.buyers[0].pe_firm_name,
          })),
          stats: {
            groupsFound: duplicateGroups.length,
            totalDuplicates: duplicateGroups.reduce((sum, g) => sum + g.duplicateIds.length, 0),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute the merge
    let merged = 0;
    let deleted = 0;
    const errors: string[] = [];

    for (const group of duplicateGroups) {
      try {
        console.log(`[dedupe-buyers] Processing group "${group.key}" - keeping ${group.keeperId}, deleting ${group.duplicateIds.length}`);

        // 1. Update keeper with merged PE firm name
        const { error: updateError } = await supabase
          .from('buyers')
          .update({ pe_firm_name: group.mergedPeFirmName })
          .eq('id', group.keeperId);

        if (updateError) {
          errors.push(`Failed to update keeper ${group.keeperId}: ${updateError.message}`);
          continue;
        }

        // 2. Migrate related data from duplicates to keeper
        for (const duplicateId of group.duplicateIds) {
          // Migrate buyer_contacts
          await supabase
            .from('buyer_contacts')
            .update({ buyer_id: group.keeperId })
            .eq('buyer_id', duplicateId);

          // Migrate buyer_deal_scores
          await supabase
            .from('buyer_deal_scores')
            .update({ buyer_id: group.keeperId })
            .eq('buyer_id', duplicateId);

          // Migrate buyer_transcripts
          await supabase
            .from('buyer_transcripts')
            .update({ buyer_id: group.keeperId })
            .eq('buyer_id', duplicateId);

          // Migrate call_intelligence
          await supabase
            .from('call_intelligence')
            .update({ buyer_id: group.keeperId })
            .eq('buyer_id', duplicateId);

          // Migrate outreach_records
          await supabase
            .from('outreach_records')
            .update({ buyer_id: group.keeperId })
            .eq('buyer_id', duplicateId);
        }

        // 3. Delete duplicates
        const { error: deleteError } = await supabase
          .from('buyers')
          .delete()
          .in('id', group.duplicateIds);

        if (deleteError) {
          errors.push(`Failed to delete duplicates for group "${group.key}": ${deleteError.message}`);
          continue;
        }

        merged++;
        deleted += group.duplicateIds.length;
        console.log(`[dedupe-buyers] Successfully merged group "${group.key}"`);

      } catch (err) {
        errors.push(`Error processing group "${group.key}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log(`[dedupe-buyers] Complete - merged ${merged} groups, deleted ${deleted} duplicates, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          groupsMerged: merged,
          duplicatesDeleted: deleted,
          errors: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[dedupe-buyers] Unexpected error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
