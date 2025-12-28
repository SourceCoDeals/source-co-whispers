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
 * Normalize PE firm name for matching - removes common suffixes like Capital, Partners, etc.
 */
function normalizePEFirmName(input: string | null | undefined): string | null {
  if (!input) return null;
  
  return input
    .toLowerCase()
    .trim()
    // Remove common PE firm suffixes
    .replace(/\s*(capital|partners|group|investments|equity|holdings|management|advisors|private|fund|llc|lp|inc|co)\s*/gi, '')
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric chars
    || null;
}

/**
 * Calculate Levenshtein distance between two strings.
 * Used for fuzzy name matching.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Check if two names are similar enough to be considered duplicates.
 * Uses Levenshtein distance with a threshold based on string length.
 */
function areSimilarNames(name1: string | null, name2: string | null): boolean {
  if (!name1 || !name2) return false;
  
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (!n1 || !n2) return false;
  
  // Exact match after normalization
  if (n1 === n2) return true;
  
  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Levenshtein distance check - allow more distance for longer strings
  const maxLength = Math.max(n1.length, n2.length);
  const distance = levenshteinDistance(n1, n2);
  
  // Allow up to 20% difference or max 3 characters
  const threshold = Math.min(3, Math.floor(maxLength * 0.2));
  
  return distance <= threshold;
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
    'platform_website', // Prioritize records with websites
  ];
  
  let count = 0;
  for (const field of fieldsToCheck) {
    const value = buyer[field];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    count++;
    // Give extra weight to website
    if (field === 'platform_website') count += 2;
  }
  return count;
}

interface DuplicateGroup {
  key: string; // domain or normalized name
  matchType: 'domain' | 'name' | 'pe_firm' | 'fuzzy';
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

    // Track which buyers have been assigned to a group
    const assignedBuyerIds = new Set<string>();
    const duplicateGroups: DuplicateGroup[] = [];

    // Pass 1: Group by platform_website domain (strongest signal)
    const domainGroups = new Map<string, any[]>();
    for (const buyer of buyers) {
      const platformDomain = normalizeDomain(buyer.platform_website);
      if (platformDomain) {
        if (!domainGroups.has(platformDomain)) {
          domainGroups.set(platformDomain, []);
        }
        domainGroups.get(platformDomain)!.push(buyer);
      }
    }

    for (const [domain, groupBuyers] of domainGroups) {
      if (groupBuyers.length >= 2) {
        groupBuyers.sort((a, b) => countMeaningfulFields(b) - countMeaningfulFields(a));
        const keeper = groupBuyers[0];
        const duplicates = groupBuyers.slice(1);
        
        const peFirmNames = new Set<string>();
        for (const b of groupBuyers) {
          if (b.pe_firm_name) peFirmNames.add(b.pe_firm_name.trim());
        }

        duplicateGroups.push({
          key: domain,
          matchType: 'domain',
          buyers: groupBuyers,
          keeperId: keeper.id,
          duplicateIds: duplicates.map(d => d.id),
          mergedPeFirmName: Array.from(peFirmNames).join(' / '),
        });

        groupBuyers.forEach(b => assignedBuyerIds.add(b.id));
      }
    }

    // Pass 2: Group by PE firm website domain
    const peFirmDomainGroups = new Map<string, any[]>();
    for (const buyer of buyers) {
      if (assignedBuyerIds.has(buyer.id)) continue;
      
      const peFirmDomain = normalizeDomain(buyer.pe_firm_website);
      if (peFirmDomain) {
        if (!peFirmDomainGroups.has(peFirmDomain)) {
          peFirmDomainGroups.set(peFirmDomain, []);
        }
        peFirmDomainGroups.get(peFirmDomain)!.push(buyer);
      }
    }

    for (const [domain, groupBuyers] of peFirmDomainGroups) {
      if (groupBuyers.length >= 2) {
        // Additional check: platform names should be similar
        const similarGroups: any[][] = [];
        const processed = new Set<number>();
        
        for (let i = 0; i < groupBuyers.length; i++) {
          if (processed.has(i)) continue;
          
          const group = [groupBuyers[i]];
          processed.add(i);
          
          for (let j = i + 1; j < groupBuyers.length; j++) {
            if (processed.has(j)) continue;
            if (areSimilarNames(groupBuyers[i].platform_company_name, groupBuyers[j].platform_company_name)) {
              group.push(groupBuyers[j]);
              processed.add(j);
            }
          }
          
          if (group.length >= 2) {
            similarGroups.push(group);
          }
        }

        for (const group of similarGroups) {
          group.sort((a, b) => countMeaningfulFields(b) - countMeaningfulFields(a));
          const keeper = group[0];
          const duplicates = group.slice(1);
          
          const peFirmNames = new Set<string>();
          for (const b of group) {
            if (b.pe_firm_name) peFirmNames.add(b.pe_firm_name.trim());
          }

          duplicateGroups.push({
            key: domain,
            matchType: 'pe_firm',
            buyers: group,
            keeperId: keeper.id,
            duplicateIds: duplicates.map(d => d.id),
            mergedPeFirmName: Array.from(peFirmNames).join(' / '),
          });

          group.forEach(b => assignedBuyerIds.add(b.id));
        }
      }
    }

    // Pass 3: Group by normalized PE firm name + similar platform names
    const peFirmNameGroups = new Map<string, any[]>();
    for (const buyer of buyers) {
      if (assignedBuyerIds.has(buyer.id)) continue;
      
      const normalizedPE = normalizePEFirmName(buyer.pe_firm_name);
      if (normalizedPE) {
        if (!peFirmNameGroups.has(normalizedPE)) {
          peFirmNameGroups.set(normalizedPE, []);
        }
        peFirmNameGroups.get(normalizedPE)!.push(buyer);
      }
    }

    for (const [peName, groupBuyers] of peFirmNameGroups) {
      if (groupBuyers.length >= 2) {
        // Group by similar platform names within the PE firm
        const similarGroups: any[][] = [];
        const processed = new Set<number>();
        
        for (let i = 0; i < groupBuyers.length; i++) {
          if (processed.has(i)) continue;
          
          const group = [groupBuyers[i]];
          processed.add(i);
          
          for (let j = i + 1; j < groupBuyers.length; j++) {
            if (processed.has(j)) continue;
            if (areSimilarNames(groupBuyers[i].platform_company_name, groupBuyers[j].platform_company_name)) {
              group.push(groupBuyers[j]);
              processed.add(j);
            }
          }
          
          if (group.length >= 2) {
            similarGroups.push(group);
          }
        }

        for (const group of similarGroups) {
          group.sort((a, b) => countMeaningfulFields(b) - countMeaningfulFields(a));
          const keeper = group[0];
          const duplicates = group.slice(1);
          
          const peFirmNames = new Set<string>();
          for (const b of group) {
            if (b.pe_firm_name) peFirmNames.add(b.pe_firm_name.trim());
          }

          duplicateGroups.push({
            key: `${peName} (PE firm)`,
            matchType: 'fuzzy',
            buyers: group,
            keeperId: keeper.id,
            duplicateIds: duplicates.map(d => d.id),
            mergedPeFirmName: Array.from(peFirmNames).join(' / '),
          });

          group.forEach(b => assignedBuyerIds.add(b.id));
        }
      }
    }

    // Pass 4: Group remaining buyers by normalized platform name
    const nameGroups = new Map<string, any[]>();
    for (const buyer of buyers) {
      if (assignedBuyerIds.has(buyer.id)) continue;
      
      const normalizedName = normalizeName(buyer.platform_company_name);
      if (normalizedName) {
        if (!nameGroups.has(normalizedName)) {
          nameGroups.set(normalizedName, []);
        }
        nameGroups.get(normalizedName)!.push(buyer);
      }
    }

    for (const [name, groupBuyers] of nameGroups) {
      if (groupBuyers.length >= 2) {
        groupBuyers.sort((a, b) => countMeaningfulFields(b) - countMeaningfulFields(a));
        const keeper = groupBuyers[0];
        const duplicates = groupBuyers.slice(1);
        
        const peFirmNames = new Set<string>();
        for (const b of groupBuyers) {
          if (b.pe_firm_name) peFirmNames.add(b.pe_firm_name.trim());
        }

        duplicateGroups.push({
          key: name,
          matchType: 'name',
          buyers: groupBuyers,
          keeperId: keeper.id,
          duplicateIds: duplicates.map(d => d.id),
          mergedPeFirmName: Array.from(peFirmNames).join(' / '),
        });

        groupBuyers.forEach(b => assignedBuyerIds.add(b.id));
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
            platformWebsites: g.buyers.map(b => b.platform_website),
            peFirmNames: g.buyers.map(b => b.pe_firm_name),
            mergedPeFirmName: g.mergedPeFirmName,
            keeperId: g.keeperId,
            keeperName: g.buyers[0].platform_company_name || g.buyers[0].pe_firm_name,
            keeperWebsite: g.buyers[0].platform_website,
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
        console.log(`[dedupe-buyers] Processing group "${group.key}" (${group.matchType}) - keeping ${group.keeperId}, deleting ${group.duplicateIds.length}`);

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
