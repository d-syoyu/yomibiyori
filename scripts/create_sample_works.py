#!/usr/bin/env python3
"""サンプル作品を投稿するスクリプト"""
import os
import requests
from datetime import datetime

API_BASE = "https://yomibiyori-production.up.railway.app/api/v1"

# サンプル作品データ（各カテゴリに対応する下の句）
SAMPLE_WORKS = [
    {
        "category": "恋愛",
        "lower_verse": "手を繋ぐ勇気が\n今日は足りなくて",
        "email": "sample1@yomibiyori.app",
        "password": "Sample123!",
        "username": "恋する詩人"
    },
    {
        "category": "恋愛",
        "lower_verse": "時が止まれば\nいいのにと願う夜",
        "email": "sample2@yomibiyori.app",
        "password": "Sample123!",
        "username": "月夜の詠み人"
    },
    {
        "category": "季節",
        "lower_verse": "涙か花びら\nかもうわからない",
        "email": "sample3@yomibiyori.app",
        "password": "Sample123!",
        "username": "春待つ人"
    },
    {
        "category": "季節",
        "lower_verse": "別れの季節が\n今年もやってくる",
        "email": "sample4@yomibiyori.app",
        "password": "Sample123!",
        "username": "桜の下で"
    },
    {
        "category": "日常",
        "lower_verse": "コーヒー片手に\n今日も急ぐ朝",
        "email": "sample5@yomibiyori.app",
        "password": "Sample123!",
        "username": "朝活詩人"
    },
    {
        "category": "日常",
        "lower_verse": "昨日と同じ\n今日がまた始まる",
        "email": "sample6@yomibiyori.app",
        "password": "Sample123!",
        "username": "日々を詠む"
    },
    {
        "category": "ユーモア",
        "lower_verse": "電柱とごめん\nなさいを言い合った",
        "email": "sample7@yomibiyori.app",
        "password": "Sample123!",
        "username": "笑う門には"
    },
    {
        "category": "ユーモア",
        "lower_verse": "人の肩に\n頭突きかます失態よ",
        "email": "sample8@yomibiyori.app",
        "password": "Sample123!",
        "username": "おっちょこちょい"
    },
]


def create_user(email: str, password: str, username: str):
    """ユーザーを作成"""
    try:
        response = requests.post(
            f"{API_BASE}/auth/signup",
            json={
                "email": email,
                "password": password,
                "display_name": username
            }
        )
        if response.status_code == 200:
            print(f"✓ ユーザー作成成功: {username}")
            data = response.json()
            # sessionオブジェクトから認証情報を取得
            if 'session' in data:
                return data['session']
            return data
        else:
            # エラーレスポンスを確認
            try:
                error_data = response.json()
                if 'error' in error_data and 'already registered' in error_data['error'].get('detail', ''):
                    print(f"- ユーザー既存: {username}、ログイン試行中...")
                    return login(email, password)
            except:
                pass
            print(f"✗ ユーザー作成失敗: {username} (status={response.status_code}) - {response.text}")
            return None
    except Exception as e:
        print(f"✗ エラー: {e}")
        return None


def login(email: str, password: str):
    """ログイン"""
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={
                "email": email,
                "password": password
            }
        )
        if response.status_code == 200:
            data = response.json()
            # sessionオブジェクトから認証情報を取得
            if 'session' in data:
                return data['session']
            return data
        else:
            print(f"✗ ログイン失敗: {email}")
            return None
    except Exception as e:
        print(f"✗ エラー: {e}")
        return None


def get_theme(category: str, access_token: str):
    """今日のテーマを取得"""
    try:
        response = requests.get(
            f"{API_BASE}/themes/today",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"category": category}
        )
        if response.status_code == 200:
            return response.json()
        else:
            print(f"✗ テーマ取得失敗: {category}")
            return None
    except Exception as e:
        print(f"✗ エラー: {e}")
        return None


def post_work(theme_id: str, text: str, access_token: str):
    """作品を投稿"""
    try:
        response = requests.post(
            f"{API_BASE}/works",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "theme_id": theme_id,
                "text": text
            }
        )
        if response.status_code in [200, 201]:
            return response.json()
        else:
            print(f"✗ 投稿失敗: {response.text}")
            return None
    except Exception as e:
        print(f"✗ エラー: {e}")
        return None


def main():
    print("=" * 60)
    print("サンプル作品投稿スクリプト")
    print("=" * 60)
    print()

    success_count = 0

    for work_data in SAMPLE_WORKS:
        print(f"\n--- {work_data['username']} ({work_data['category']}) ---")

        # ユーザー作成またはログイン
        auth_data = create_user(
            work_data['email'],
            work_data['password'],
            work_data['username']
        )

        if not auth_data or 'access_token' not in auth_data:
            print("✗ 認証失敗")
            continue

        access_token = auth_data['access_token']

        # テーマ取得
        theme = get_theme(work_data['category'], access_token)
        if not theme:
            print("✗ テーマ取得失敗")
            continue

        print(f"上の句: {theme['text'].replace(chr(10), ' / ')}")
        print(f"下の句: {work_data['lower_verse']}")

        # 作品投稿
        work = post_work(theme['id'], work_data['lower_verse'], access_token)
        if work:
            print(f"✓ 投稿成功: ID={work.get('id', 'unknown')}")
            success_count += 1
        else:
            print("✗ 投稿失敗")

    print("\n" + "=" * 60)
    print(f"完了: {success_count}/{len(SAMPLE_WORKS)} 件の作品を投稿しました")
    print("=" * 60)


if __name__ == "__main__":
    main()
