import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Contact {
  name: string;
  title: string;
  linkedin_url?: string;
  bio_url?: string;
  is_deal_team: boolean;
  role_category: 'deal_team' | 'business_dev' | 'junior_investment' | 'corp_dev' | 'executive' | 'other';
}

interface ExtractionResult {
  contacts: Contact[];
  deal_team_found: boolean;
  source_url: string;
}

// Keywords for scoring team page URLs
const POSITIVE_KEYWORDS = ['team', 'leadership', 'executive', 'management', 'people', 'board', 'officers', 'directors', 'staff', 'who-we-are', 'about-us'];
const NEGATIVE_KEYWORDS = ['careers', 'jobs', 'job', 'hiring', 'news', 'blog', 'press', 'contact', 'locations', 'services', 'products', 'case-study', 'testimonial', 'faq', 'privacy', 'terms', 'login', 'signin', 'cart', 'checkout'];

function scoreUrl(url: string): number {
  const path = url.toLowerCase();
  let score = 0;
  
  // Check for positive keywords
  for (const kw of POSITIVE_KEYWORDS) {
    if (path.includes(kw)) score += 10;
  }
  
  // Check for negative keywords
  for (const kw of NEGATIVE_KEYWORDS) {
    if (path.includes(kw)) score -= 20;
  }
  
  // CRITICAL: Heavily penalize individual profile pages
  // These match patterns like /team-members/john-doe, /people/jane-smith, /staff/member-name
  try {
    const urlPath = new URL(url).pathname;
    const pathParts = urlPath.split('/').filter(Boolean);
    
    // Check if this looks like an individual profile page (has a person's name slug at the end)
    if (pathParts.length >= 2) {
      const lastSegment = pathParts[pathParts.length - 1];
      const parentSegment = pathParts[pathParts.length - 2];
      
      // If parent is a team-related keyword and last segment looks like a name (contains hyphen or is long)
      const teamParentKeywords = ['team', 'team-members', 'people', 'staff', 'leadership', 'executives', 'management', 'board', 'directors', 'members'];
      if (teamParentKeywords.some(kw => parentSegment.includes(kw))) {
        // This is likely an individual profile page - heavy penalty
        console.log(`Penalizing individual profile page: ${url}`);
        score -= 30;
      }
    }
    
    // Bonus for root team pages (not individual profiles)
    // e.g., /team, /leadership, /people (single path segment)
    if (pathParts.length === 1) {
      const segment = pathParts[0];
      if (['team', 'leadership', 'people', 'executives', 'management', 'about', 'staff', 'board'].includes(segment)) {
        console.log(`Bonus for root team page: ${url}`);
        score += 20;
      }
    }
    
    // Bonus for shorter paths (more likely to be main team pages)
    if (pathParts.length <= 2) score += 5;
    
  } catch (e) {
    // If URL parsing fails, just continue with basic scoring
  }
  
  return score;
}

async function scrapeUrl(url: string, apiKey: string): Promise<string | null> {
  try {
    console.log(`Scraping: ${url}`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      console.log(`Failed to scrape ${url}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.data?.markdown || data.markdown || null;
    if (content) {
      console.log(`Scraped ${url}: ${content.length} chars`);
    }
    return content;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

async function discoverTeamPages(baseUrl: string, apiKey: string): Promise<string[]> {
  // Normalize base URL
  let normalizedBase = baseUrl.trim();
  if (!normalizedBase.startsWith('http://') && !normalizedBase.startsWith('https://')) {
    normalizedBase = `https://${normalizedBase}`;
  }
  normalizedBase = normalizedBase.replace(/\/$/, '');

  try {
    console.log(`Mapping site: ${normalizedBase}`);
    
    // Use Firecrawl Map to discover all URLs with team-related search
    const response = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: normalizedBase,
        search: 'team leadership executive management board directors people staff officers cfo ceo',
        limit: 50,
        includeSubdomains: false,
      }),
    });

    if (!response.ok) {
      console.log(`Map API failed for ${normalizedBase}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const links = data.links || [];
    
    console.log(`Map found ${links.length} URLs for ${normalizedBase}`);
    
    if (links.length === 0) {
      return [];
    }

    // Score and sort URLs by relevance
    const scoredUrls = links
      .map((url: string) => ({ url, score: scoreUrl(url) }))
      .filter((item: { url: string; score: number }) => item.score > -10) // Filter out clearly irrelevant pages
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    console.log(`Top 5 scored URLs:`, scoredUrls.slice(0, 5).map((u: { url: string; score: number }) => `${u.url} (${u.score})`));

    // Return top 5 URLs for scraping (increased from 3)
    return scoredUrls.slice(0, 5).map((item: { url: string }) => item.url);
  } catch (error) {
    console.error(`Error mapping ${normalizedBase}:`, error);
    return [];
  }
}

async function scrapeMultiplePages(urls: string[], apiKey: string): Promise<Array<{ url: string; content: string }>> {
  const results: Array<{ url: string; content: string }> = [];
  
  // Scrape up to 3 pages in parallel
  const scrapePromises = urls.slice(0, 3).map(async (url) => {
    const content = await scrapeUrl(url, apiKey);
    if (content && content.length > 300) {
      return { url, content };
    }
    return null;
  });
  
  const scrapeResults = await Promise.all(scrapePromises);
  
  for (const result of scrapeResults) {
    if (result) {
      results.push(result);
    }
  }
  
  console.log(`Successfully scraped ${results.length} pages with content`);
  return results;
}

async function findTeamPages(baseUrl: string, apiKey: string): Promise<Array<{ url: string; content: string }>> {
  // First try the smart discovery approach
  const discoveredUrls = await discoverTeamPages(baseUrl, apiKey);
  
  if (discoveredUrls.length > 0) {
    const results = await scrapeMultiplePages(discoveredUrls, apiKey);
    if (results.length > 0) {
      return results;
    }
  }
  
  // Fallback: try common paths if map didn't find good results
  console.log(`Map returned no usable results for ${baseUrl}, trying fallback paths`);
  
  let normalizedBase = baseUrl.trim();
  if (!normalizedBase.startsWith('http://') && !normalizedBase.startsWith('https://')) {
    normalizedBase = `https://${normalizedBase}`;
  }
  normalizedBase = normalizedBase.replace(/\/$/, '');
  
  const fallbackPaths = [
    '/team', '/leadership', '/about', '/about-us', '/our-team',
    '/executive-team', '/our-executive-team', '/leadership-team',
    '/management', '/executives', '/people', '/who-we-are'
  ];
  
  const fallbackUrls = fallbackPaths.map(path => `${normalizedBase}${path}`);
  const results = await scrapeMultiplePages(fallbackUrls, apiKey);
  
  return results;
}

async function extractContactsWithAI(
  content: string,
  companyName: string,
  platformCompanyName: string | null,
  isPEFirm: boolean,
  sourceUrl: string
): Promise<ExtractionResult> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return { contacts: [], deal_team_found: false, source_url: sourceUrl };
  }

  const roleContext = isPEFirm
    ? `Focus on finding:
1. Deal team members specifically assigned to ${platformCompanyName || 'portfolio companies'} (highest priority)
2. Business Development team members
3. Junior investment professionals (Associates, Senior Associates, Principals, Vice Presidents)

For each contact, determine if they are specifically on the deal team for ${platformCompanyName || 'this company'} based on context.`
    : `Focus on finding:
1. CFO or Chief Financial Officer (highest priority)
2. Anyone with Corporate Development in their title
3. Anyone with M&A or Mergers & Acquisitions responsibilities
4. VP/Director of Strategy or Business Development`;

  const prompt = `Extract contact information from this ${isPEFirm ? 'PE firm' : 'company'} website content for ${companyName}.

${roleContext}

Extract ONLY real contacts mentioned in the content. DO NOT make up any information.
For each contact found, extract:
- Full name
- Title/Role
- LinkedIn URL (ONLY if explicitly shown on the page)
- Bio/profile URL on the company site (if available)
- Whether they appear to be specifically assigned to work with ${platformCompanyName || 'relevant deals'} (is_deal_team flag)

Return a JSON object with this structure:
{
  "contacts": [
    {
      "name": "Full Name",
      "title": "Job Title",
      "linkedin_url": "https://linkedin.com/in/..." or null,
      "bio_url": "https://company.com/team/name" or null,
      "is_deal_team": true/false,
      "role_category": "deal_team" | "business_dev" | "junior_investment" | "corp_dev" | "executive" | "other"
    }
  ],
  "deal_team_found": true/false
}

Website content:
${content.slice(0, 15000)}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI extraction failed (${response.status}):`, errorText);
      return { contacts: [], deal_team_found: false, source_url: sourceUrl };
    }

    const data = await response.json();
    const content2 = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content2.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`AI extracted ${parsed.contacts?.length || 0} contacts from ${sourceUrl}`);
      return {
        contacts: parsed.contacts || [],
        deal_team_found: parsed.deal_team_found || false,
        source_url: sourceUrl,
      };
    }
  } catch (error) {
    console.error('Error in AI extraction:', error);
  }

  return { contacts: [], deal_team_found: false, source_url: sourceUrl };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { buyerId, platformCompanyName, dealId, useFallbackPaths } = await req.json();

    if (!buyerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'buyerId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to this buyer via RLS
    const { data: userBuyer, error: accessError } = await supabase
      .from('buyers')
      .select('id, tracker_id')
      .eq('id', buyerId)
      .single();

    if (accessError || !userBuyer) {
      console.error('Access denied for buyer:', buyerId, accessError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Buyer not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch buyer data (already verified ownership)
    const { data: buyer, error: buyerError } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', buyerId)
      .single();

    if (buyerError || !buyer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Buyer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Finding contacts for buyer: ${buyer.pe_firm_name} / ${buyer.platform_company_name}`);
    console.log(`PE website: ${buyer.pe_firm_website}, Platform website: ${buyer.platform_website}`);
    if (useFallbackPaths) {
      console.log(`Using fallback paths mode`);
    }

    const allContacts: Array<Contact & { company_type: string; source_url: string }> = [];
    let dealTeamFound = false;
    const scrapedPages: string[] = [];

    // PE Firm contact discovery - scrape multiple pages
    if (buyer.pe_firm_website) {
      console.log(`=== PE FIRM: ${buyer.pe_firm_name} ===`);
      const pePages = await findTeamPages(buyer.pe_firm_website, firecrawlKey);
      
      for (const page of pePages) {
        scrapedPages.push(page.url);
        console.log(`Extracting PE contacts from: ${page.url}`);
        const extraction = await extractContactsWithAI(
          page.content,
          buyer.pe_firm_name,
          buyer.platform_company_name || platformCompanyName,
          true,
          page.url
        );

        if (extraction.deal_team_found) {
          dealTeamFound = true;
        }
        
        for (const contact of extraction.contacts) {
          // Check for duplicate by name (case-insensitive)
          const exists = allContacts.some(c => c.name.toLowerCase() === contact.name.toLowerCase());
          if (!exists) {
            allContacts.push({
              ...contact,
              company_type: 'PE Firm',
              source_url: page.url,
            });
          }
        }
      }
      console.log(`PE Firm: Found ${allContacts.length} unique contacts from ${pePages.length} pages`);
    }

    // Platform company contact discovery - scrape multiple pages
    if (buyer.platform_website) {
      console.log(`=== PLATFORM: ${buyer.platform_company_name} ===`);
      const platformPages = await findTeamPages(buyer.platform_website, firecrawlKey);
      
      const platformContactsCount = allContacts.length;
      for (const page of platformPages) {
        scrapedPages.push(page.url);
        console.log(`Extracting platform contacts from: ${page.url}`);
        const extraction = await extractContactsWithAI(
          page.content,
          buyer.platform_company_name || buyer.pe_firm_name,
          null,
          false,
          page.url
        );

        for (const contact of extraction.contacts) {
          // Check for duplicate by name (case-insensitive)
          const exists = allContacts.some(c => c.name.toLowerCase() === contact.name.toLowerCase());
          if (!exists) {
            allContacts.push({
              ...contact,
              company_type: 'Platform',
              source_url: page.url,
            });
          }
        }
      }
      console.log(`Platform: Found ${allContacts.length - platformContactsCount} unique contacts from ${platformPages.length} pages`);
    }

    console.log(`=== TOTAL: ${allContacts.length} contacts found. Deal team: ${dealTeamFound} ===`);
    console.log(`Pages scraped: ${scrapedPages.join(', ')}`);

    // Insert contacts into database
    const insertedContacts = [];
    for (const contact of allContacts) {
      // Check if contact already exists (by name and buyer_id)
      const { data: existing } = await supabase
        .from('buyer_contacts')
        .select('id')
        .eq('buyer_id', buyerId)
        .eq('name', contact.name)
        .single();

      if (existing) {
        console.log(`Contact ${contact.name} already exists, skipping`);
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('buyer_contacts')
        .insert({
          buyer_id: buyerId,
          name: contact.name,
          title: contact.title,
          linkedin_url: contact.linkedin_url || null,
          company_type: contact.company_type,
          source: 'website',
          source_url: contact.source_url,
          is_deal_team: contact.is_deal_team,
          role_category: contact.role_category,
          priority_level: contact.is_deal_team ? 1 : 
            contact.role_category === 'executive' ? 2 :
            contact.role_category === 'corp_dev' ? 3 :
            contact.role_category === 'business_dev' ? 4 :
            contact.role_category === 'junior_investment' ? 5 : 10,
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error inserting contact ${contact.name}:`, insertError);
      } else if (inserted) {
        insertedContacts.push(inserted);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contacts_found: allContacts.length,
        contacts_inserted: insertedContacts.length,
        deal_team_found: dealTeamFound,
        contacts: insertedContacts,
        pages_scraped: scrapedPages,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error finding contacts:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to find contacts' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
