-- Add is_primary_contact column to buyer_contacts
ALTER TABLE public.buyer_contacts 
ADD COLUMN is_primary_contact boolean DEFAULT false;

-- Create index for quick lookup of primary contact
CREATE INDEX idx_buyer_contacts_primary ON public.buyer_contacts (buyer_id, is_primary_contact) 
WHERE is_primary_contact = true;