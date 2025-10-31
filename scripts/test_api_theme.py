"""Test theme API endpoint."""

import requests
import json

# Set UTF-8 encoding for Windows
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

def test_theme_api():
    """Test theme API endpoint."""

    # Test恋愛 category
    url = "https://yomibiyori-production.up.railway.app/api/v1/themes/today"
    params = {"category": "恋愛"}

    print(f"📡 Calling API: {url}")
    print(f"   Parameters: {params}")

    response = requests.get(url, params=params)

    print(f"\n📊 Status Code: {response.status_code}")

    if response.status_code == 200:
        theme = response.json()
        print(f"\n✅ Theme received:")
        print(f"   ID: {theme['id']}")
        print(f"   Category: {theme['category']}")
        print(f"   Date: {theme['date']}")
        print(f"   Sponsored: {theme['sponsored']}")
        print(f"   Sponsor Company: {theme.get('sponsor_company_name', 'None')}")
        print(f"   Text: {theme['text']}")
        print(f"\n📄 Full JSON:")
        print(json.dumps(theme, indent=2, ensure_ascii=False))
    else:
        print(f"\n❌ Error: {response.text}")

if __name__ == "__main__":
    test_theme_api()
