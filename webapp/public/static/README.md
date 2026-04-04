# ケア・フィット・サイクル (Care Fit Cycle)

## プロジェクト概要

**ケア・フィット・サイクル**は、介護現場の「個人の生活リズムの尊重」と「深刻な属人化・育成コスト」の課題を解決する、次世代型ケアプラン管理システムです。

入所後14日間で、計画（24時間シート）と実績（ケース記録）のズレを「改善のタネ」としてポジティブに捉え、AIが付せん（Sticky Note）形式で改善提案を行います。

### 主な機能

- ✅ **24時間シート管理**: 入居者の生活リズムを視覚化
- ✅ **ケース記録タイムライン**: 日々のケア記録をリアルタイムで入力
- ✅ **デジタル付せん**: 計画と実績のズレから改善提案を生成（準備中）
- ✅ **ケア・フィット・サイクル進捗**: 14日間のフェーズ管理
- ✅ **スタッフ管理**: 担当スタッフの経験値を活かした記録

### 現在実装済みの機能

#### ✅ 完全動作
1. **入居者プロフィール表示・編集**
   - 名前、要介護度、好きなこと、今日のねがい
   
2. **24時間シート（ケアプラン）**
   - 時間ごとの活動計画の表示
   - 計画のステータス管理（plan / fit）
   
3. **ケース記録**
   - タイムライン形式での記録表示
   - リアルタイム記録追加
   - スタッフ情報の紐付け
   
4. **デジタル付せん**
   - 付せんの表示
   - ステータス更新（とりいれる / まだそのまま）
   
5. **進捗トラッキング**
   - Day 1-14のカウント
   - フェーズ表示（initial / logging / fitting / confirmed）

#### 🔄 UI配置済み（機能は後で追加）
- 音声入力ボタン
- AI相談窓口
- 付せんの自動生成（AI分析エンジン）

### データベース構造

#### テーブル一覧
- **residents**: 入居者情報
- **staff**: スタッフ情報
- **care_plans**: 24時間シート（ケアプラン）
- **case_records**: ケース記録
- **sticky_notes**: 付せん（改善提案）

### 技術スタック

- **Frontend**: React 18 + TailwindCSS + Font Awesome
- **Backend**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**: Cloudflare Pages
- **Development**: Vite + TypeScript

### URLs

#### 開発環境（サンドボックス）
- **アプリケーション**: https://3000-ijob28wtyr70pn2awiqwk-02b9cc79.sandbox.novita.ai
- **API エンドポイント**: 
  - `GET /api/residents/:id` - 入居者情報取得
  - `GET /api/residents/:id/care-plans` - 24時間シート取得
  - `GET /api/residents/:id/case-records` - ケース記録取得
  - `POST /api/case-records` - ケース記録追加
  - `GET /api/residents/:id/sticky-notes` - 付せん取得
  - `PUT /api/sticky-notes/:id` - 付せんステータス更新

#### 本番環境（Cloudflare Pages）
- **プロジェクト名**: care-fit-cycle
- **本番URL**: （デプロイ後に更新）

### サンプルデータ

**入居者**: 岡田一輝様
- 要介護度: 要介護4
- 好きなこと: 朝のコーヒーと庭の花を眺める時間が好き
- 今日のねがい: 天気が良いので、午後は中庭へ出てみたい
- 入所後経過日数: Day 10（フィット提案期）

### 開発コマンド

```bash
# 依存関係インストール
npm install

# ローカル開発（Vite）
npm run dev

# サンドボックス開発（D1付き）
npm run dev:sandbox

# ビルド
npm run build

# プレビュー
npm run preview

# デプロイ
npm run deploy

# D1データベース操作
npm run db:migrate:local   # ローカルマイグレーション
npm run db:seed            # サンプルデータ投入
npm run db:reset           # データベースリセット

# ポートクリーンアップ
npm run clean-port

# 動作確認
npm test
```

### デプロイ手順

#### Cloudflare Pagesへのデプロイ

1. **Cloudflare API Key設定**
   - Deploy タブで API key を設定

2. **D1データベース作成（本番環境）**
```bash
npx wrangler d1 create care-fit-cycle-db
```

3. **wrangler.jsoncにdatabase_idを設定**

4. **本番マイグレーション実行**
```bash
npm run db:migrate:prod
```

5. **デプロイ**
```bash
npm run deploy:prod
```

### 今後の開発予定

#### Phase 2: AI分析エンジン統合
- [ ] Gemini API統合
- [ ] 時間のフィット提案（起床時刻の最適化など）
- [ ] 好みのフィット提案（嗜好品の抽出など）
- [ ] コツのフィット提案（ベテランの暗黙知の継承）

#### Phase 3: 高度な機能
- [ ] 音声入力（Web Speech API）
- [ ] AI相談窓口（RAG）
- [ ] 多施設対応
- [ ] スタッフ認証

### ライセンス

MIT License

### 開発者

作成日: 2026-02-11

---

**「入居者を主役に、計画と実績のズレを改善のタネに。」**
