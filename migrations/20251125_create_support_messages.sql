-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'replied')),
    reply_message TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add trigger for updated_at
CREATE TRIGGER trg_support_messages_updated_at
BEFORE UPDATE ON support_messages
FOR EACH ROW EXECUTE FUNCTION app_public.set_updated_at();

-- Enable RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can insert their own messages
CREATE POLICY "Users can insert their own support messages" ON support_messages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can view their own messages
CREATE POLICY "Users can view their own support messages" ON support_messages
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all messages
CREATE POLICY "Admins can view all support messages" ON support_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all messages (for replying and changing status)
CREATE POLICY "Admins can update all support messages" ON support_messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
