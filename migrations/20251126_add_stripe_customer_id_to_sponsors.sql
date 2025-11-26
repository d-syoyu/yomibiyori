-- Add stripe_customer_id column to sponsors table for bank transfer payments
-- Run this migration on Supabase

ALTER TABLE sponsors
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Optional: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sponsors_stripe_customer_id ON sponsors(stripe_customer_id);
