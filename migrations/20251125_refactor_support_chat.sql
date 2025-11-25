-- Drop old table if exists (since we are refactoring the data model)
DROP TABLE IF EXISTS support_messages;

-- Create Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Messages Table (for the thread)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers for updated_at
CREATE TRIGGER trg_support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION app_public.set_updated_at();

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policies for Tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets" ON support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" ON support_tickets
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update all tickets" ON support_tickets
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Policies for Messages
CREATE POLICY "Users can view messages for own tickets" ON support_ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_id
            AND support_tickets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages for own tickets" ON support_ticket_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = ticket_id
            AND support_tickets.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all messages" ON support_ticket_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can insert messages" ON support_ticket_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );
