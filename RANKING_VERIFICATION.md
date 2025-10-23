# ランキングシステム動作確認ガイド

## デプロイ完了
✅ コミット: `eb46b82` - Bayesian-Wilson hybrid ranking
✅ GitHubへのpush完了
✅ Railway自動デプロイ完了

## 実装されたランキングアルゴリズム

### 4段階公平性アルゴリズム

#### 第1段階: 有効サンプルサイズ算出
```python
effective_sample = max(unique_viewers, capped_impressions ÷ 2)
# インプレッション数 = min(impressions, unique_viewers × 5)
```

#### 第2段階: スコアリング方法の選択

**サンプル < 100: ベイズ平均**
- 事前分布: 5% like rate, 100 confidence
- 式: (100 × 0.05 + n × observed_rate) / (100 + n)
- **効果**: 遅い時間帯の投稿でも公平に評価

**サンプル ≥ 100: Wilson下限信頼区間**
- 95%信頼区間
- 統計的信頼性を重視

#### 第3段階: 時間正規化
```python
normalization = min(2.0, 16hours / actual_exposure_hours)
final_score = base_score × normalization
```

#### 第4段階: 異常値ペナルティ
```python
if impression_ratio > 10:1:
    penalty = max(0.1, 1.0 - ((ratio - 10) / 10) × 0.2)
```

## 動作確認手順

### 1. APIエンドポイント確認

```bash
# お題取得
curl "https://yomibiyori-production.up.railway.app/api/v1/themes/today?category=%E6%81%8B%E6%84%9B"

# 作品一覧
curl "https://yomibiyori-production.up.railway.app/api/v1/works?theme_id=<THEME_ID>&limit=10"

# ランキング取得
curl "https://yomibiyori-production.up.railway.app/api/v1/ranking?theme_id=<THEME_ID>&limit=10"
```

### 2. ランキング生成フロー

```
作品投稿 (06:00-22:00)
    ↓
いいねボタンクリック
    ↓
likes_service.like_work()
    ├─ PostgreSQL: likesテーブルに保存
    └─ Redis ZSET: ranking:<theme_id>にスコア追加
    └─ Redis Hash: metrics:<work_id>に指標保存
        ├─ likes: いいね数
        ├─ impressions: インプレッション数
        └─ unique_viewers: ユニークビューア数
    ↓
ランキングAPI呼び出し
    ↓
ranking_service.get_ranking()
    ├─ Redis ZSETからwork_idリスト取得
    ├─ Redis Hashからmetrics取得
    ├─ 有効サンプルサイズ算出
    ├─ ベイズ平均 or Wilsonスコア計算
    ├─ 時間正規化適用
    ├─ 異常値ペナルティ適用
    └─ スコア順にソート
```

### 3. Redisデータ構造

```python
# ランキングZSET
ranking:<theme_id> = ZSET {
    <work_id_1>: <raw_like_score>,
    <work_id_2>: <raw_like_score>,
    ...
}

# メトリクスHash
metrics:<work_id> = HASH {
    "likes": <like_count>,
    "impressions": <impression_count>,
    "unique_viewers": <unique_viewer_count>
}

# インプレッション重複排除 HyperLogLog
impressions:<work_id>:<date_bucket> = HyperLogLog {
    <viewer_hash_1>,
    <viewer_hash_2>,
    ...
}

# レート制限キー
impression_rate:<work_id>:<viewer_hash> = 1  # 10秒TTL
```

### 4. ランキングが表示されない場合

**原因1: いいねがまだない**
- 解決: モバイルアプリでいいねを付ける
- または: curlで直接 `/api/v1/works/<work_id>/like` を呼び出す

**原因2: Redisに接続できていない**
- 確認: Railway環境変数 `REDIS_URL` が設定されているか
- 確認: Upstash Redisサービスが起動しているか

**原因3: 作品自体がない**
- 確認: `/api/v1/works?theme_id=<THEME_ID>` で作品が返ってくるか

### 5. ベイズ平均の動作確認

#### テストケース1: 早い投稿 vs 遅い投稿（同じ品質）

```python
# 早い投稿（06:00） - 16時間露出
# 100インプレッション, 10いいね (10%)
bayesian_average(10, 100) = 0.0750 (7.50%)

# 遅い投稿（21:00） - 1時間露出
# 10インプレッション, 1いいね (10%)
bayesian_average(1, 10) = 0.0545 (5.45%)

# 時間正規化後
早い: 0.0750 × 1.0 = 0.0750
遅い: 0.0545 × 2.0 = 0.109

# 結果: 遅い投稿が逆転！公平性が確保された
```

#### テストケース2: 少数サンプルの極端値補正

```python
# 2インプレッション, 2いいね (100%!)
bayesian_average(2, 2) = 0.0588 (5.88%)
# → 100%でなく5.88%に補正（極端値を防ぐ）

# 10インプレッション, 0いいね (0%)
bayesian_average(0, 10) = 0.0455 (4.55%)
# → 0%でなく4.55%に補正（全体平均で補完）
```

### 6. 実際の動作確認コマンド

```bash
# 1. お題IDを取得
THEME_ID=$(curl -s "https://yomibiyori-production.up.railway.app/api/v1/themes/today?category=%E6%81%8B%E6%84%9B" | python -c "import sys,json; print(json.load(sys.stdin)['id'])")

# 2. 作品一覧を確認
curl -s "https://yomibiyori-production.up.railway.app/api/v1/works?theme_id=$THEME_ID" | python -m json.tool

# 3. ランキングを確認
curl -s "https://yomibiyori-production.up.railway.app/api/v1/ranking?theme_id=$THEME_ID&limit=10" | python -m json.tool
```

## トラブルシューティング

### ランキングが "Ranking not available" エラー

**原因**: RedisにもPostgreSQLにもランキングデータがない

**解決策**:
1. いいねを付けてRedisランキングを生成
2. または、22:00のランキング確定ジョブ実行を待つ

### 時間正規化が効いているか確認

Railwayログで確認:
```bash
railway logs --service yomibiyori | grep "Suspicious impression pattern"
```

異常なインプレッションパターンが検出されるとログに記録されます。

## まとめ

✅ **公平性**: 早い投稿と遅い投稿が統計的に公平に評価される
✅ **安定性**: 少ないサンプルでもベイズ平均で極端値を防ぐ
✅ **信頼性**: 十分なサンプルではWilson信頼区間で正確に評価
✅ **不正対策**: レート制限、異常値検出、ペナルティで操作を防ぐ

このシステムにより、投稿時刻に関わらず作品の品質が正当に評価されます！
