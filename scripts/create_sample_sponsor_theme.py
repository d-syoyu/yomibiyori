"""Create a sample sponsor theme for testing."""

import asyncio
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import uuid4

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models.sponsor import Sponsor, SponsorCampaign, SponsorTheme
from app.models.theme import Theme
from app.models.user import User


async def create_sample_sponsor_theme():
    """Create a sample sponsor theme for testing."""
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        sys.exit(1)

    # Convert postgres:// to postgresql+asyncpg://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Create async engine
    engine = create_async_engine(database_url, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # 1. Create or get admin user
            print("\n=== Step 1: Check for admin user ===")
            result = await session.execute(
                select(User).where(User.role == "admin").limit(1)
            )
            admin_user = result.scalar_one_or_none()

            if not admin_user:
                print("❌ No admin user found. Please create an admin user first.")
                print("Run: python scripts/set_user_role.py <user_id> admin")
                return

            print(f"✅ Found admin user: {admin_user.email} (ID: {admin_user.id})")

            # 2. Create sponsor
            print("\n=== Step 2: Create sponsor ===")
            sponsor_id = str(uuid4())
            sponsor = Sponsor(
                id=sponsor_id,
                company_name="サンプル企業株式会社",
                contact_email="sponsor@example.com",
                official_url="https://example.com",
                plan_tier="premium",
                verified=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(sponsor)
            print(f"✅ Created sponsor: {sponsor.company_name} (ID: {sponsor_id})")

            # 3. Create campaign
            print("\n=== Step 3: Create campaign ===")
            campaign_id = str(uuid4())
            campaign = SponsorCampaign(
                id=campaign_id,
                sponsor_id=sponsor_id,
                name="テストキャンペーン2025",
                status="active",
                start_date=date(2025, 1, 1),
                end_date=date(2025, 12, 31),
                targeting={},
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(campaign)
            print(f"✅ Created campaign: {campaign.name} (ID: {campaign_id})")

            # 4. Create sponsor theme
            print("\n=== Step 4: Create sponsor theme ===")
            sponsor_theme_id = str(uuid4())
            today = date.today()
            sponsor_theme = SponsorTheme(
                id=sponsor_theme_id,
                campaign_id=campaign_id,
                date=today,
                category="恋愛",
                text_575="春の風\nそよぐ恋路に\n花が舞う",
                priority=100,
                status="approved",
                approved_at=datetime.now(timezone.utc),
                approved_by=admin_user.id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(sponsor_theme)
            print(f"✅ Created sponsor theme: {sponsor_theme.text_575}")
            print(f"   Category: {sponsor_theme.category}")
            print(f"   Date: {sponsor_theme.date}")
            print(f"   Status: {sponsor_theme.status}")

            # 5. Create theme in themes table
            print("\n=== Step 5: Create theme in themes table ===")
            theme_id = str(uuid4())
            theme = Theme(
                id=theme_id,
                text=sponsor_theme.text_575,
                category=sponsor_theme.category,
                date=sponsor_theme.date,
                sponsored=True,
                sponsor_theme_id=sponsor_theme_id,
                sponsor_company_name=f"提供：{sponsor.company_name}",
                created_at=datetime.now(timezone.utc),
            )
            session.add(theme)
            print(f"✅ Created theme: {theme.text}")
            print(f"   Sponsored: {theme.sponsored}")
            print(f"   Sponsor: {theme.sponsor_company_name}")
            print(f"   Category: {theme.category}")
            print(f"   Date: {theme.date}")

            # Commit all changes
            await session.commit()
            print("\n✅ All data committed successfully!")

            # Print summary
            print("\n" + "=" * 60)
            print("📋 SUMMARY")
            print("=" * 60)
            print(f"Sponsor ID:       {sponsor_id}")
            print(f"Campaign ID:      {campaign_id}")
            print(f"Sponsor Theme ID: {sponsor_theme_id}")
            print(f"Theme ID:         {theme_id}")
            print(f"\n🎯 You can now test the sponsored theme in the mobile app!")
            print(f"   Category: {theme.category}")
            print(f"   Date: {theme.date}")
            print(f"   Theme text: {theme.text}")
            print(f"   Sponsor: {theme.sponsor_company_name}")

        except Exception as e:
            print(f"\n❌ Error: {e}")
            await session.rollback()
            raise

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_sample_sponsor_theme())
