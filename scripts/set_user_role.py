#!/usr/bin/env python3
"""Set user role (admin/sponsor/user) in the database."""

import sys
from sqlalchemy import create_engine, text
from app.core.config import get_settings

def list_users(engine):
    """List all users."""
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT id, email, name, role, created_at
                FROM users
                ORDER BY created_at DESC
                LIMIT 20
            """)
        )
        users = result.fetchall()

        if not users:
            print("No users found in database.")
            return

        print("\n=== Current Users ===")
        print(f"{'#':<3} {'Email':<40} {'Name':<20} {'Role':<10} {'Created'}")
        print("-" * 100)

        for idx, user in enumerate(users, 1):
            user_id, email, name, role, created_at = user
            created_str = created_at.strftime("%Y-%m-%d %H:%M") if created_at else "N/A"
            print(f"{idx:<3} {email:<40} {name:<20} {role:<10} {created_str}")

def set_role(engine, email: str, role: str):
    """Set role for a user by email."""
    valid_roles = ["user", "sponsor", "admin"]

    if role not in valid_roles:
        print(f"[ERROR] Invalid role: {role}")
        print(f"        Valid roles: {', '.join(valid_roles)}")
        return False

    with engine.connect() as conn:
        # Check if user exists
        result = conn.execute(
            text("SELECT id, email, name, role FROM users WHERE email = :email"),
            {"email": email}
        )
        user = result.fetchone()

        if not user:
            print(f"[ERROR] User not found: {email}")
            return False

        user_id, user_email, user_name, old_role = user

        if old_role == role:
            print(f"[INFO] User already has role '{role}': {user_email}")
            return True

        # Update role
        conn.execute(
            text("UPDATE users SET role = :role WHERE email = :email"),
            {"role": role, "email": email}
        )
        conn.commit()

        print(f"[SUCCESS] Updated user role:")
        print(f"          Email: {user_email}")
        print(f"          Name: {user_name}")
        print(f"          Role: {old_role} -> {role}")
        return True

def main():
    settings = get_settings()
    engine = create_engine(settings.database_url)

    print(f"[DB] Connected to database: {settings.database_url.split('@')[-1]}")

    # List all users first
    list_users(engine)

    if len(sys.argv) < 3:
        print("\n=== Usage ===")
        print("Set user role:")
        print("  python scripts/set_user_role.py <email> <role>")
        print("\nExample:")
        print("  python scripts/set_user_role.py admin@example.com admin")
        print("  python scripts/set_user_role.py sponsor@example.com sponsor")
        print("\nValid roles: user, sponsor, admin")
        return

    email = sys.argv[1]
    role = sys.argv[2]

    print(f"\n=== Setting Role ===")
    set_role(engine, email, role)

if __name__ == "__main__":
    main()
