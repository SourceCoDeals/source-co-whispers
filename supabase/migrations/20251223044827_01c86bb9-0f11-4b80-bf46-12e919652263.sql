-- Add has_fee_agreement column to buyers table
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS has_fee_agreement boolean DEFAULT false;