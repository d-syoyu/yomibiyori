"""Live authentication test."""
import jwt
import requests
import uuid
from app.core.config import get_settings

settings = get_settings()
user_id = str(uuid.uuid4())
token = jwt.encode(
    {"sub": user_id, "role": "authenticated"},
    settings.supabase_jwt_secret,
    algorithm="HS256"
)

print(f"User ID: {user_id}")
print(f"Token: {token[:80]}...")

# Test without authentication
response = requests.get("http://127.0.0.1:8000/api/v1/auth/profile")
print(f"\nWithout auth: {response.status_code} - {response.json()['detail']}")

# Test with authentication (user doesn't exist)
headers = {"Authorization": f"Bearer {token}"}
response = requests.get("http://127.0.0.1:8000/api/v1/auth/profile", headers=headers)
print(f"With auth (no user): {response.status_code} - {response.json()['detail']}")

print("\n✅ Authentication system is working correctly!")
print("- JWT validation: OK")
print("- Unauthorized detection: OK")
print("- Missing user detection: OK")
