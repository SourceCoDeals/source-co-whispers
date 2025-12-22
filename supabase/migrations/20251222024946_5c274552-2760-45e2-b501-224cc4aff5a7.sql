-- 1. Universal call data points (applies to every industry)
CREATE TABLE call_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES buyers(id) ON DELETE CASCADE,
  call_type text NOT NULL DEFAULT 'discovery',
  transcript_url text,
  call_date date,
  
  -- Universal extracted fields (structured JSON)
  extracted_data jsonb DEFAULT '{}',
  
  -- AI-generated summary
  call_summary text,
  key_takeaways text[],
  follow_up_questions text[],
  
  -- Metadata
  extraction_version text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Ensure at least one of deal_id or buyer_id is set
  CONSTRAINT call_intelligence_entity_check CHECK (deal_id IS NOT NULL OR buyer_id IS NOT NULL)
);

-- 2. Industry templates - define what to extract per industry
CREATE TABLE industry_intelligence_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id uuid REFERENCES industry_trackers(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text DEFAULT 'text',
  extraction_hint text,
  example_values text[],
  applies_to text DEFAULT 'both',
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Unique constraint per tracker/category/field
  CONSTRAINT unique_tracker_field UNIQUE (tracker_id, category, field_name)
);

-- 3. Extracted intelligence values (normalized, queryable)
CREATE TABLE intelligence_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_intelligence_id uuid REFERENCES call_intelligence(id) ON DELETE CASCADE NOT NULL,
  template_field_id uuid REFERENCES industry_intelligence_templates(id) ON DELETE SET NULL,
  category text NOT NULL,
  field_name text NOT NULL,
  
  -- Flexible value storage
  text_value text,
  numeric_value numeric,
  array_value text[],
  boolean_value boolean,
  
  -- Source tracking
  confidence text,
  source_quote text,
  is_inferred boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE call_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_intelligence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_values ENABLE ROW LEVEL SECURITY;

-- RLS for call_intelligence (access through deal or buyer -> tracker -> user)
CREATE POLICY "Users can view call intelligence in their trackers"
ON call_intelligence FOR SELECT
USING (
  (deal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM deals
    JOIN industry_trackers ON industry_trackers.id = deals.tracker_id
    WHERE deals.id = call_intelligence.deal_id AND industry_trackers.user_id = auth.uid()
  ))
  OR
  (buyer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM buyers
    JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
    WHERE buyers.id = call_intelligence.buyer_id AND industry_trackers.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create call intelligence in their trackers"
ON call_intelligence FOR INSERT
WITH CHECK (
  (deal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM deals
    JOIN industry_trackers ON industry_trackers.id = deals.tracker_id
    WHERE deals.id = call_intelligence.deal_id AND industry_trackers.user_id = auth.uid()
  ))
  OR
  (buyer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM buyers
    JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
    WHERE buyers.id = call_intelligence.buyer_id AND industry_trackers.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can update call intelligence in their trackers"
ON call_intelligence FOR UPDATE
USING (
  (deal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM deals
    JOIN industry_trackers ON industry_trackers.id = deals.tracker_id
    WHERE deals.id = call_intelligence.deal_id AND industry_trackers.user_id = auth.uid()
  ))
  OR
  (buyer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM buyers
    JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
    WHERE buyers.id = call_intelligence.buyer_id AND industry_trackers.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can delete call intelligence in their trackers"
ON call_intelligence FOR DELETE
USING (
  (deal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM deals
    JOIN industry_trackers ON industry_trackers.id = deals.tracker_id
    WHERE deals.id = call_intelligence.deal_id AND industry_trackers.user_id = auth.uid()
  ))
  OR
  (buyer_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM buyers
    JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
    WHERE buyers.id = call_intelligence.buyer_id AND industry_trackers.user_id = auth.uid()
  ))
);

-- RLS for industry_intelligence_templates (access through tracker -> user)
CREATE POLICY "Users can view templates in their trackers"
ON industry_intelligence_templates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = industry_intelligence_templates.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can create templates in their trackers"
ON industry_intelligence_templates FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = industry_intelligence_templates.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can update templates in their trackers"
ON industry_intelligence_templates FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = industry_intelligence_templates.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can delete templates in their trackers"
ON industry_intelligence_templates FOR DELETE
USING (EXISTS (
  SELECT 1 FROM industry_trackers
  WHERE industry_trackers.id = industry_intelligence_templates.tracker_id
  AND industry_trackers.user_id = auth.uid()
));

-- RLS for intelligence_values (access through call_intelligence)
CREATE POLICY "Users can view intelligence values in their trackers"
ON intelligence_values FOR SELECT
USING (EXISTS (
  SELECT 1 FROM call_intelligence ci
  LEFT JOIN deals d ON d.id = ci.deal_id
  LEFT JOIN buyers b ON b.id = ci.buyer_id
  LEFT JOIN industry_trackers it_d ON it_d.id = d.tracker_id
  LEFT JOIN industry_trackers it_b ON it_b.id = b.tracker_id
  WHERE ci.id = intelligence_values.call_intelligence_id
  AND (it_d.user_id = auth.uid() OR it_b.user_id = auth.uid())
));

CREATE POLICY "Users can create intelligence values in their trackers"
ON intelligence_values FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM call_intelligence ci
  LEFT JOIN deals d ON d.id = ci.deal_id
  LEFT JOIN buyers b ON b.id = ci.buyer_id
  LEFT JOIN industry_trackers it_d ON it_d.id = d.tracker_id
  LEFT JOIN industry_trackers it_b ON it_b.id = b.tracker_id
  WHERE ci.id = intelligence_values.call_intelligence_id
  AND (it_d.user_id = auth.uid() OR it_b.user_id = auth.uid())
));

CREATE POLICY "Users can update intelligence values in their trackers"
ON intelligence_values FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM call_intelligence ci
  LEFT JOIN deals d ON d.id = ci.deal_id
  LEFT JOIN buyers b ON b.id = ci.buyer_id
  LEFT JOIN industry_trackers it_d ON it_d.id = d.tracker_id
  LEFT JOIN industry_trackers it_b ON it_b.id = b.tracker_id
  WHERE ci.id = intelligence_values.call_intelligence_id
  AND (it_d.user_id = auth.uid() OR it_b.user_id = auth.uid())
));

CREATE POLICY "Users can delete intelligence values in their trackers"
ON intelligence_values FOR DELETE
USING (EXISTS (
  SELECT 1 FROM call_intelligence ci
  LEFT JOIN deals d ON d.id = ci.deal_id
  LEFT JOIN buyers b ON b.id = ci.buyer_id
  LEFT JOIN industry_trackers it_d ON it_d.id = d.tracker_id
  LEFT JOIN industry_trackers it_b ON it_b.id = b.tracker_id
  WHERE ci.id = intelligence_values.call_intelligence_id
  AND (it_d.user_id = auth.uid() OR it_b.user_id = auth.uid())
));

-- Add update trigger for call_intelligence
CREATE TRIGGER update_call_intelligence_updated_at
BEFORE UPDATE ON call_intelligence
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_call_intelligence_deal_id ON call_intelligence(deal_id);
CREATE INDEX idx_call_intelligence_buyer_id ON call_intelligence(buyer_id);
CREATE INDEX idx_industry_intelligence_templates_tracker ON industry_intelligence_templates(tracker_id);
CREATE INDEX idx_intelligence_values_call ON intelligence_values(call_intelligence_id);
CREATE INDEX idx_intelligence_values_category ON intelligence_values(category, field_name);