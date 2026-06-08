# ケア・フィット・サイクル (Care Fit Cycle)

## プロジェクト概要

**ケア・フィット・サイクル**は、介護現場の「個人の生活リズムの尊重」と「深刻な属人化・育成コスト」の課題を解決する、次世代型ケアプラン管理システムです。

入所後14日間で、計画（24時間シート）と実績（ケース記録）のズレを「改善のタネ」としてポジティブに捉え、AIが付せん（Sticky Note）形式で改善提案を行います。

## 本番URL

**https://main.care-fit-cycle.pages.dev**

## 実装済み機能

| 機能 | 状態 |
|------|------|
| 24時間シート表示・印刷・CSV出力 | ✅ |
| ケース記録タイムライン（タグ付き） | ✅ |
| 担当スタッフ切替 | ✅ |
| 付せん（スタッフ気づき / AI提案）の作成・採用・保留 | ✅ |
| ケア・フィット・サイクル進捗（14日フェーズ管理） | ✅ |
| AI相談窓口（Gemini API） | ✅ |
| デモ用データ作成ボタン（ワンクリックリセット） | ✅ |

## 技術スタック

| レイヤー | 技術 |
|------|------|
| Frontend | React 18 + TailwindCSS (CDN) + Font Awesome |
| Backend | Hono (Cloudflare Pages Functions) |
| Database | Cloudflare D1 (SQLite) |
| Build | Vite + TypeScript |
| Deploy | Cloudflare Pages |

## ディレクトリ構成

```
webapp/
├── src/
│   ├── index.tsx          # Hono API サーバー（全エンドポイント）
│   ├── types.ts           # Cloudflare Bindings 型定義
│   ├── types/             # ドメイン型定義
│   └── client/
│       ├── main.tsx       # React エントリポイント
│       └── App.tsx        # メインUIコンポーネント
├── public/static/
│   ├── bundle.js          # ビルド済みReactバンドル（自動生成）
│   ├── okada-profile.jpg  # デモ用プロフィール画像
│   └── style.css
├── migrations/
│   └── 0001_initial_schema.sql
├── seed.sql               # デモ用サンプルデータ
├── vite.config.ts         # Hono worker ビルド設定
├── vite.client.config.ts  # React クライアントビルド設定
├── wrangler.jsonc         # Cloudflare設定
└── package.json
```

## APIエンドポイント

| メソッド | パス | 説明 |
|------|------|------|
| GET | `/api/residents/:id` | 入居者情報取得 |
| PUT | `/api/residents/:id` | 入居者情報更新 |
| GET | `/api/residents/:id/care-plans` | 24時間シート取得 |
| PUT | `/api/care-plans/:id` | 24時間シート項目更新 |
| GET | `/api/residents/:id/care-plans/export` | エクスポート（html/csv/json） |
| GET | `/api/residents/:id/case-records` | ケース記録取得（?date=YYYY-MM-DD） |
| POST | `/api/case-records` | ケース記録追加 |
| GET | `/api/residents/:id/sticky-notes` | 付せん取得（?status=pending） |
| POST | `/api/sticky-notes` | 付せん追加 |
| PUT | `/api/sticky-notes/:id` | 付せんステータス更新 |
| GET | `/api/staff` | スタッフ一覧取得 |
| POST | `/api/ai-chat` | AI相談（Gemini API） |
| POST | `/api/demo/reset` | デモ用データリセット |

## ローカル開発

```bash
# 依存関係インストール
npm install

# ローカル開発サーバー起動
npm run dev

# ローカルD1でのサンドボックス起動
npm run db:migrate:local
npm run db:seed:local
npm run dev:sandbox
```

## デプロイ手順

### 初回セットアップ

```bash
# 1. Cloudflare にログイン
npx wrangler login

# 2. D1 データベース作成
npx wrangler d1 create care-fit-cycle-db
# → 出力された database_id を wrangler.jsonc に記入

# 3. 本番DBにマイグレーション＆シードデータ投入
npx wrangler d1 migrations apply care-fit-cycle-db --remote
npx wrangler d1 execute care-fit-cycle-db --remote --file=./seed.sql

# 4. デプロイ
npm run deploy:prod
```

### 以降のデプロイ

```bash
npm run deploy:prod
```

### 環境変数（Cloudflare Pages ダッシュボードで設定）

| 変数名 | 説明 |
|------|------|
| `GEMINI_API_KEY` | AI相談機能用（https://aistudio.google.com/apikey） |

## サンプルデータ

**入居者**: 岡田一輝様（要介護4）
- 好きなこと: 朝のコーヒーと庭の花を眺める時間
- 入所後 Day 10（フィット提案期）
- 24時間シート 9項目、ケース記録 2日分、付せん 3件

## 今後の開発予定

- [ ] 音声入力（Web Speech API）
- [ ] 複数入居者対応
- [ ] スタッフ認証（Cloudflare Access）
- [ ] AI提案の自動生成（定期バッチ）

---

**「入居者を主役に、計画と実績のズレを改善のタネに。」**
