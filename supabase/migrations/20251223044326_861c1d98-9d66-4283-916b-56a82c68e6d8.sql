-- Add fee agreement boolean to pe_firms (defaults to false)
ALTER TABLE pe_firms 
ADD COLUMN has_fee_agreement boolean DEFAULT false;

-- Add fee agreement boolean to platforms (defaults to false)  
ALTER TABLE platforms 
ADD COLUMN has_fee_agreement boolean DEFAULT false;