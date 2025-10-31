# スポンサーお題配信フロー

## 概要

スポンサーお題とAI生成お題の競合を管理し、適切に配信するための実装ガイド。

---

## データベース制約

```sql
-- 1日1カテゴリーにつき1つのお題のみ
create unique index uq_themes_category_date on themes(category, date);
```

**重要**: 同じ日・カテゴリーではスポンサーお題とAIお題は**競合**します。

---

## 実装が必要な機能

### 1. お題承認時の自動登録 ⭐ 優先度: 高

管理者が承認したスポンサーお題を`themes`テーブルに自動登録する。

#### 実装場所
`app/routes/admin.py` の `approve_theme()` エンドポイント

#### 実装内容

```python
@router.post("/review/themes/{theme_id}/approve")
def approve_theme(
    theme_id: str,
    session: Session = Depends(get_db_session),
    current_admin: User = Depends(get_current_admin),
) -> ThemeReviewResponse:
    """Approve a sponsor theme and register it to themes table."""

    # スポンサーお題を取得
    sponsor_theme = session.get(SponsorTheme, theme_id)
    if not sponsor_theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    if sponsor_theme.status != "pending":
        raise HTTPException(status_code=400, detail="Theme is not pending")

    # キャンペーン情報を取得
    campaign = session.get(SponsorCampaign, sponsor_theme.campaign_id)
    sponsor = session.get(Sponsor, campaign.sponsor_id)

    now = datetime.now(timezone.utc)

    # ステータスを承認に変更
    sponsor_theme.status = "approved"
    sponsor_theme.approved_at = now
    sponsor_theme.approved_by = current_admin.id

    # 既存のお題をチェック
    existing_theme = session.execute(
        select(Theme).where(
            Theme.date == sponsor_theme.date,
            Theme.category == sponsor_theme.category
        )
    ).scalar_one_or_none()

    if existing_theme:
        # 既存のお題を上書き（AIお題の場合）
        if not existing_theme.sponsored:
            logger.info(f"Replacing AI theme with sponsor theme: {existing_theme.id}")
            existing_theme.text = sponsor_theme.text_575
            existing_theme.sponsored = True
            existing_theme.sponsor_theme_id = sponsor_theme.id
            existing_theme.sponsor_company_name = sponsor.company_name
        else:
            # 既にスポンサーお題が存在する場合はエラー
            raise HTTPException(
                status_code=409,
                detail=f"Sponsor theme already exists for {sponsor_theme.date} {sponsor_theme.category}"
            )
    else:
        # 新規にお題を作成
        theme = Theme(
            id=str(uuid4()),
            text=sponsor_theme.text_575,
            category=sponsor_theme.category,
            date=sponsor_theme.date,
            sponsored=True,
            sponsor_theme_id=sponsor_theme.id,
            sponsor_company_name=sponsor.company_name,
            created_at=now
        )
        session.add(theme)

    session.commit()

    return ThemeReviewResponse(
        id=sponsor_theme.id,
        status="approved",
        message="Theme approved and registered for distribution"
    )
```

---

### 2. AIお題生成時のスポンサーお題チェック ⭐ 優先度: 高

AIお題生成ジョブで、スポンサーお題が既に存在する場合はスキップする。

#### 実装場所
`scripts/generate_themes.py`（既存のお題生成スクリプト）

#### 実装内容

```python
def generate_daily_themes(session: Session, target_date: date):
    """Generate themes for the target date, skipping sponsored slots."""

    categories = ["恋愛", "季節", "日常", "ユーモア"]

    for category in categories:
        # スポンサーお題が既に存在するかチェック
        existing_theme = session.execute(
            select(Theme).where(
                Theme.date == target_date,
                Theme.category == category
            )
        ).scalar_one_or_none()

        if existing_theme:
            if existing_theme.sponsored:
                logger.info(f"✓ Skipping {category}: Sponsor theme exists")
                continue
            else:
                logger.info(f"✓ Theme already exists for {category}, skipping")
                continue

        # AIでお題を生成
        logger.info(f"Generating AI theme for {category}...")
        ai_theme_text = generate_theme_with_ai(category, target_date)

        # データベースに保存
        theme = Theme(
            id=str(uuid4()),
            text=ai_theme_text,
            category=category,
            date=target_date,
            sponsored=False,
            created_at=datetime.now(timezone.utc)
        )
        session.add(theme)

    session.commit()
    logger.info(f"Theme generation completed for {target_date}")
```

---

### 3. お題配信スケジュールの管理 ⭐ 優先度: 中

スポンサーお題の配信スケジュールを管理し、配信前に`published`ステータスに変更する。

#### 実装場所
新規ファイル: `scripts/publish_sponsor_themes.py`

#### 実装内容

```python
"""Publish approved sponsor themes for today."""

from datetime import date, datetime, timezone
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models import SponsorTheme

def publish_themes_for_today():
    """Mark approved sponsor themes as published for today."""
    session = SessionLocal()

    today = date.today()  # JST考慮が必要

    # 今日配信すべき承認済みお題を取得
    stmt = select(SponsorTheme).where(
        SponsorTheme.date == today,
        SponsorTheme.status == "approved"
    )

    themes = session.execute(stmt).scalars().all()

    for theme in themes:
        theme.status = "published"
        print(f"Published: {theme.category} - {theme.text_575}")

    session.commit()
    session.close()

    print(f"Published {len(themes)} sponsor themes for {today}")

if __name__ == "__main__":
    publish_themes_for_today()
```

#### Cronジョブ設定

GitHub Actions (`.github/workflows/publish_sponsor_themes.yml`):

```yaml
name: Publish Sponsor Themes

on:
  schedule:
    - cron: '0 21 * * *'  # JST 06:00 (UTC 21:00前日)
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - name: Publish sponsor themes
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: python scripts/publish_sponsor_themes.py
```

---

## 運用フロー

### 正常なフロー

```
Day -2 (例: 11/13)
  └─ スポンサーが11/15のお題を投稿
  └─ 管理者が審査・承認
  └─ themes テーブルに登録される (sponsored=true)

Day -1 (11/14 22:00 JST)
  └─ AIお題生成ジョブ実行
  └─ 11/15「恋愛」にスポンサーお題が存在
  └─ → スキップ
  └─ 11/15の他カテゴリーは通常通りAI生成

Day 0 (11/15 06:00 JST)
  └─ お題配信
  └─ スポンサーお題とAIお題が混在して配信される
```

### 競合が発生する場合

```
Case 1: AIお題生成後にスポンサーお題が承認された場合
  1. AIお題が先に生成される
  2. 後からスポンサーお題が承認される
  3. 承認時に既存のAIお題を上書き
  4. → スポンサーお題が配信される

Case 2: 同じ日・カテゴリーに複数のスポンサーお題が承認された場合
  1. 最初の承認でthemesに登録
  2. 2つ目の承認時にエラー (409 Conflict)
  3. 管理者が手動で優先度を判断
  4. 必要に応じて既存のお題を削除してから再承認
```

---

## テスト手順

### 1. スポンサーお題の投稿と承認

```bash
# 1. スポンサーユーザーを作成
railway run --service yomibiyori python scripts/set_user_role.py sample1@yomibiyori.app sponsor

# 2. スポンサーとしてログイン → キャンペーン作成 → お題投稿

# 3. 管理者として承認
POST /api/v1/admin/review/themes/{theme_id}/approve

# 4. themes テーブルを確認
SELECT * FROM themes WHERE sponsored = true;
```

### 2. AIお題生成との競合テスト

```bash
# 1. AIでお題を生成
python scripts/generate_themes.py --date 2025-11-20

# 2. 同じ日・カテゴリーのスポンサーお題を承認
# → 既存のAIお題が上書きされることを確認

# 3. themes テーブルを確認
SELECT date, category, text, sponsored, sponsor_company_name
FROM themes
WHERE date = '2025-11-20'
ORDER BY category;
```

---

## 今後の拡張

### より高度な配信制御

1. **複数スポンサーお題の順次配信**
   - 同じカテゴリーに複数のスポンサーお題を時間差で配信

2. **A/Bテスト**
   - 同じ日・カテゴリーで複数のお題をユーザーごとに出し分け

3. **地域別配信**
   - targeting情報に基づいて地域別にお題を出し分け

---

## まとめ

✅ **Phase 1-2 完了**: データ構造・API実装
🚧 **Phase 3 必要**: お題配信の自動化
📅 **Phase 4 将来**: 高度な配信制御

現時点では、管理者が手動で以下を実行する必要があります：
1. スポンサーお題の承認
2. 必要に応じてthemesテーブルへの手動登録
3. AIお題生成前のスポンサーお題確認
