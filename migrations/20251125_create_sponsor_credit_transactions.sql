-- Create sponsor_credit_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sponsor_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'admin_adjustment')),
    amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sponsor_credit_transactions_sponsor_id ON sponsor_credit_transactions(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_credit_transactions_created_at ON sponsor_credit_transactions(created_at);

-- Enable RLS
ALTER TABLE sponsor_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Sponsors can view their own transactions
CREATE POLICY "Sponsors can view their own transactions" ON sponsor_credit_transactions
    FOR SELECT
    USING (sponsor_id = auth.uid());

-- Policy: Only system/admin can insert/update/delete (handled via service role or admin functions)
-- No public write policies
