"""add_support_chat_and_credits

Revision ID: 02e43a1d2075
Revises: 1e7e99b4f77e
Create Date: 2025-11-25 10:16:00.000000

"""
revision = '02e43a1d2075'
down_revision = '1e7e99b4f77e'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # Sponsor Credit Transactions
    op.execute("""
        -- Create sponsor_credit_transactions table if it doesn't exist
        CREATE TABLE IF NOT EXISTS sponsor_credit_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'admin_adjustment')),
            amount INTEGER NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_sponsor_credit_transactions_sponsor_id ON sponsor_credit_transactions(sponsor_id);
        CREATE INDEX IF NOT EXISTS idx_sponsor_credit_transactions_created_at ON sponsor_credit_transactions(created_at);

        ALTER TABLE sponsor_credit_transactions ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Sponsors can view their own transactions" ON sponsor_credit_transactions;
        CREATE POLICY "Sponsors can view their own transactions" ON sponsor_credit_transactions
            FOR SELECT
            USING (sponsor_id = auth.uid());
    """)

    # Support Chat (Tickets & Messages)
    op.execute("""
        DROP TABLE IF EXISTS support_messages;

        CREATE TABLE IF NOT EXISTS support_tickets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subject TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS support_ticket_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
            sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            is_admin BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON support_tickets;
        CREATE TRIGGER trg_support_tickets_updated_at
        BEFORE UPDATE ON support_tickets
        FOR EACH ROW EXECUTE FUNCTION app_public.set_updated_at();

        ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
        ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

        -- Policies for Tickets
        DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
        CREATE POLICY "Users can view own tickets" ON support_tickets
            FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert own tickets" ON support_tickets;
        CREATE POLICY "Users can insert own tickets" ON support_tickets
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
        CREATE POLICY "Admins can view all tickets" ON support_tickets
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
            );

        DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
        CREATE POLICY "Admins can update all tickets" ON support_tickets
            FOR UPDATE USING (
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
            );

        -- Policies for Messages
        DROP POLICY IF EXISTS "Users can view messages for own tickets" ON support_ticket_messages;
        CREATE POLICY "Users can view messages for own tickets" ON support_ticket_messages
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM support_tickets
                    WHERE support_tickets.id = ticket_id
                    AND support_tickets.user_id = auth.uid()
                )
            );

        DROP POLICY IF EXISTS "Users can insert messages for own tickets" ON support_ticket_messages;
        CREATE POLICY "Users can insert messages for own tickets" ON support_ticket_messages
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM support_tickets
                    WHERE support_tickets.id = ticket_id
                    AND support_tickets.user_id = auth.uid()
                )
            );

        DROP POLICY IF EXISTS "Admins can view all messages" ON support_ticket_messages;
        CREATE POLICY "Admins can view all messages" ON support_ticket_messages
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
            );

        DROP POLICY IF EXISTS "Admins can insert messages" ON support_ticket_messages;
        CREATE POLICY "Admins can insert messages" ON support_ticket_messages
            FOR INSERT WITH CHECK (
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
            );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sponsor_credit_transactions CASCADE;")
    op.execute("DROP TABLE IF EXISTS support_ticket_messages CASCADE;")
    op.execute("DROP TABLE IF EXISTS support_tickets CASCADE;")