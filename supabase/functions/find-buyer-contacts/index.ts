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

const PE_ROLE_PRIORITIES: Record<string, { priority: number; category: Contact['role_category'] }> = {
  // Deal team keywords
  'managing director': { priority: 1, category: 'deal_team' },
  'managing partner': { priority: 1, category: 'deal_team' },
  'partner': { priority: 1, category: 'deal_team' },
  'senior partner': { priority: 1, category: 'deal_team' },
  
  // Business development
  'business development': { priority: 2, category: 'business_dev' },
  'bd director': { priority: 2, category: 'business_dev' },
  'deal sourcing': { priority: 2, category: 'business_dev' },
  'origination': { priority: 2, category: 'business_dev' },
  
  // Junior investment team
  'associate': { priority: 3, category: 'junior_investment' },
  'senior associate': { priority: 3, category: 'junior_investment' },
  'principal': { priority: 3, category: 'junior_investment' },
  'vice president': { priority: 3, category: 'junior_investment' },
  'vp': { priority: 3, category: 'junior_investment' },
  'director': { priority: 3, category: 'junior_investment' },
};

const PLATFORM_ROLE_PRIORITIES: Record<string, { priority: number; category: Contact['role_category'] }> = {
  // CFO priority
  'cfo': { priority: 1, category: 'executive' },
  'chief financial officer': { priority: 1, category: 'executive' },
  
  // Corporate development
  'corporate development': { priority: 2, category: 'corp_dev' },
  'corp dev': { priority: 2, category: 'corp_dev' },
  'm&a': { priority: 2, category: 'corp_dev' },
  'mergers and acquisitions': { priority: 2, category: 'corp_dev' },
  'strategic acquisitions': { priority: 2, category: 'corp_dev' },
  'strategy': { priority: 2, category: 'corp_dev' },
  'business development': { priority: 2, category: 'corp_dev' },
};

async function scrapeUrl(url: string, apiKey: string): Promise<string | null> {
  try {
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
    return data.data?.markdown || data.markdown || null;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

async function findBestUrl(baseUrl: string, paths: string[], apiKey: string): Promise<{ url: string; content: string } | null> {
  // Normalize base URL
  let normalizedBase = baseUrl.trim();
  if (!normalizedBase.startsWith('http://') && !normalizedBase.startsWith('https://')) {
    normalizedBase = `https://${normalizedBase}`;
  }
  normalizedBase = normalizedBase.replace(/\/$/, '');

  for (const path of paths) {
    const fullUrl = `${normalizedBase}${path}`;
    console.log(`Trying URL: ${fullUrl}`);
    const content = await scrapeUrl(fullUrl, apiKey);
    if (content && content.length > 200) {
      console.log(`Found content at ${fullUrl} (${content.length} chars)`);
      return { url: fullUrl, content };
    }
  }
  
  return null;
}

async function extractContactsWithAI(
  content: string,
  companyName: string,
  platformCompanyName: string | null,
  isPEFirm: boolean
): Promise<ExtractionResult> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return { contacts: [], deal_team_found: false, source_url: '' };
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
    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
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
      return { contacts: [], deal_team_found: false, source_url: '' };
    }

    const data = await response.json();
    const content2 = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content2.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        contacts: parsed.contacts || [],
        deal_team_found: parsed.deal_team_found || false,
        source_url: '',
      };
    }
  } catch (error) {
    console.error('Error in AI extraction:', error);
  }

  return { contacts: [], deal_team_found: false, source_url: '' };
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

    const { buyerId, platformCompanyName, dealId } = await req.json();

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

    // Fetch buyer data
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

    const allContacts: Array<Contact & { company_type: string; source_url: string }> = [];
    let dealTeamFound = false;

    // PE Firm contact discovery
    if (buyer.pe_firm_website) {
      // Prioritize team/people pages for contact discovery
      const pePaths = [
        '/people',
        '/team',
        '/our-team',
        '/leadership',
        '/about',
        '/about-us',
        '/portfolio',
        '/investments',
        '/companies',
      ];

      const peResult = await findBestUrl(buyer.pe_firm_website, pePaths, firecrawlKey);
      
      if (peResult) {
        console.log(`Extracting PE contacts from: ${peResult.url}`);
        const extraction = await extractContactsWithAI(
          peResult.content,
          buyer.pe_firm_name,
          buyer.platform_company_name || platformCompanyName,
          true
        );

        dealTeamFound = extraction.deal_team_found;
        
        for (const contact of extraction.contacts) {
          allContacts.push({
            ...contact,
            company_type: 'PE Firm',
            source_url: peResult.url,
          });
        }
      }
    }

    // Platform company contact discovery
    if (buyer.platform_website) {
      const platformPaths = [
        '/team',
        '/leadership',
        '/about',
        '/about-us',
        '/our-team',
        '/management',
        '/executives',
      ];

      const platformResult = await findBestUrl(buyer.platform_website, platformPaths, firecrawlKey);
      
      if (platformResult) {
        console.log(`Extracting platform contacts from: ${platformResult.url}`);
        const extraction = await extractContactsWithAI(
          platformResult.content,
          buyer.platform_company_name || buyer.pe_firm_name,
          null,
          false
        );

        for (const contact of extraction.contacts) {
          allContacts.push({
            ...contact,
            company_type: 'Platform',
            source_url: platformResult.url,
          });
        }
      }
    }

    console.log(`Found ${allContacts.length} contacts total. Deal team found: ${dealTeamFound}`);

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
