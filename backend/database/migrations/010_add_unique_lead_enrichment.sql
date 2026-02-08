-- Add UNIQUE constraint to lead_enrichment.lead_id
-- This allows ON CONFLICT (lead_id) to work properly

-- First, remove any duplicate entries (keep the most recent one)
DELETE FROM lead_enrichment a
USING lead_enrichment b
WHERE a.id < b.id
AND a.lead_id = b.lead_id;

-- Now add the UNIQUE constraint
ALTER TABLE lead_enrichment 
ADD CONSTRAINT lead_enrichment_lead_id_unique UNIQUE (lead_id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_lead_id ON lead_enrichment(lead_id);
