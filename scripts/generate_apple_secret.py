#!/usr/bin/env python3
"""
Generate Apple OAuth Client Secret (JWT)
Run: python scripts/generate_apple_secret.py
"""

import jwt
import time
from pathlib import Path

# ========================================
# 設定: 以下の値を更新してください
# ========================================

TEAM_ID = "JL2PMATF9X"  # 例: "A1B2C3D4E5"
SERVICES_ID = "com.yomibiyori.auth"  # Services ID
KEY_ID = "JNUCT4WA4L"  # 例: "ABC123DEF4"
P8_FILE_PATH = r"C:\Users\dsyoy\Downloads\AuthKey_JNUCT4WA4L.p8"  # .p8 ファイルのパス

# ========================================
# JWT 生成
# ========================================

def generate_client_secret():
    """Generate Apple OAuth client secret (JWT)"""

    # .p8 ファイルから秘密鍵を読み込み
    with open(P8_FILE_PATH, 'r') as f:
        private_key = f.read()

    # 現在時刻と有効期限を設定
    now = int(time.time())
    expiration = now + (6 * 30 * 24 * 60 * 60)  # 6ヶ月後

    # JWT ペイロード
    payload = {
        'iss': TEAM_ID,
        'iat': now,
        'exp': expiration,
        'aud': 'https://appleid.apple.com',
        'sub': SERVICES_ID,
    }

    # JWT ヘッダー
    headers = {
        'kid': KEY_ID,
        'alg': 'ES256',
    }

    # JWT を生成
    client_secret = jwt.encode(
        payload,
        private_key,
        algorithm='ES256',
        headers=headers
    )

    return client_secret


if __name__ == '__main__':
    print("=" * 60)
    print("Apple OAuth Client Secret Generator")
    print("=" * 60)
    print()
    print(f"Team ID:     {TEAM_ID}")
    print(f"Services ID: {SERVICES_ID}")
    print(f"Key ID:      {KEY_ID}")
    print()

    try:
        secret = generate_client_secret()
        print("Generated Client Secret (JWT):")
        print("-" * 60)
        print(secret)
        print("-" * 60)
        print()
        print("✓ Copy this JWT and paste it into Supabase Dashboard")
        print("  as 'Secret Key (for OAuth)'")
        print()
    except FileNotFoundError:
        print(f"ERROR: .p8 file not found at: {P8_FILE_PATH}")
        print("Please update P8_FILE_PATH in this script.")
    except Exception as e:
        print(f"ERROR: {e}")
