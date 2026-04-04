# ケア・フィット・サイクル - コードダウンロード

## 📦 ダウンロード

**コードアーカイブ（tar.gz形式）**: 647KB

👉 **[care-fit-cycle-code.tar.gz をダウンロード](/static/care-fit-cycle-code.tar.gz)**

---

## 📋 含まれるファイル

### ソースコード
- `src/index.tsx` - バックエンドAPI（Hono）
- `src/types.ts` - TypeScript型定義
- `public/static/app.jsx` - フロントエンドReactコード
- `public/static/style.css` - カスタムスタイル

### 設定ファイル
- `package.json` - 依存関係とスクリプト
- `wrangler.jsonc` - Cloudflare設定
- `tsconfig.json` - TypeScript設定
- `vite.config.ts` - Viteビルド設定
- `.gitignore` - Git除外設定
- `ecosystem.config.cjs` - PM2設定

### データベース
- `migrations/0001_initial_schema.sql` - スキーマ定義
- `seed.sql` - サンプルデータ
- `seed_5days_corrected.sql` - 5日分のケース記録

### ドキュメント
- `README.md` - プロジェクト概要
- `BACKLOG.md` - 開発バックログ
- `STORY_LIST.md` - ユーザーストーリー一覧
- `USER_STORY_MAPPING.md` - ペルソナ別マッピング
- `STICKY_NOTES_SPEC.md` - 付箋機能仕様
- `CARE_PLAN_24H_SPEC.md` - 24時間シート仕様
- `EXPORT_GUIDE.md` - エクスポート機能ガイド
- `AI_INTEGRATION_GUIDE.md` - AI統合ガイド
- `DEPLOYMENT_GUIDE.md` - デプロイガイド

### その他
- `create_excel.py` - Excel生成スクリプト
- `load_data.py` - データ投入スクリプト

---

## 🚫 除外されているファイル

以下は含まれていません（開発時に自動生成されます）:
- `node_modules/` - 依存パッケージ（`npm install`で復元）
- `dist/` - ビルド成果物（`npm run build`で生成）
- `.wrangler/` - Wrangler作業ディレクトリ
- `.git/` - Gitリポジトリ履歴

---

## 🛠️ セットアップ手順

### 1. アーカイブを展開
```bash
tar -xzf care-fit-cycle-code.tar.gz
cd webapp
```

### 2. 依存パッケージをインストール
```bash
npm install
```

### 3. データベースをセットアップ
```bash
# ローカルD1データベースのマイグレーション
npm run db:migrate:local

# サンプルデータ投入
npm run db:seed
```

### 4. 開発サーバー起動
```bash
# ビルド
npm run build

# PM2で起動
pm2 start ecosystem.config.cjs

# または直接起動
npm run dev:sandbox
```

### 5. アプリにアクセス
```
http://localhost:3000
```

---

## 📝 主要スクリプト

```bash
# ビルド
npm run build

# 開発サーバー（Vite）
npm run dev

# 開発サーバー（Wrangler Pages + D1）
npm run dev:sandbox
npm run dev:d1

# デプロイ
npm run deploy
npm run deploy:prod

# データベース
npm run db:migrate:local      # ローカルマイグレーション
npm run db:migrate:prod       # 本番マイグレーション
npm run db:seed               # サンプルデータ投入
npm run db:reset              # データベースリセット

# Git
npm run git:init              # Git初期化
npm run git:status            # ステータス確認
npm run git:commit            # コミット
```

---

## 🗂️ ディレクトリ構造

```
webapp/
├── src/
│   ├── index.tsx           # メインAPI
│   ├── types.ts            # 型定義
│   └── renderer.tsx        # （将来拡張用）
├── public/
│   └── static/
│       ├── app.jsx         # フロントエンドReact
│       ├── style.css       # スタイル
│       ├── okada-profile.jpg
│       └── *.md            # ドキュメント
├── migrations/
│   └── 0001_initial_schema.sql
├── seed.sql                # サンプルデータ
├── seed_5days_corrected.sql
├── package.json
├── wrangler.jsonc
├── tsconfig.json
├── vite.config.ts
├── ecosystem.config.cjs    # PM2設定
└── README.md
```

---

## 🎯 主要機能

### 実装済み
- ✅ 24時間シート表示・管理
- ✅ ケース記録（日付選択対応）
- ✅ 付箋機能（AI提案・スタッフ気づき）
- ✅ 気づき投稿
- ✅ AI相談窓口（Gemini API統合）
- ✅ エクスポート機能（HTML、CSV、JSON）
- ✅ レスポンシブUI（PC・モバイル対応）

### 未実装（今後の拡張）
- ⏳ 24時間シートの編集機能
- ⏳ 付箋採用時の自動反映
- ⏳ AI提案の自動生成
- ⏳ 音声入力
- ⏳ 多施設対応

---

## 🔧 技術スタック

### フロントエンド
- React 18（CDN経由）
- TailwindCSS（CDN経由）
- Axios
- Babel Standalone

### バックエンド
- Hono（軽量フレームワーク）
- TypeScript
- Cloudflare Workers/Pages

### データベース
- Cloudflare D1（SQLite互換）

### 開発ツール
- Vite（ビルドツール）
- Wrangler（Cloudflare CLI）
- PM2（プロセス管理）
- Git

---

## 📚 参考ドキュメント

### プロジェクト内
- [README.md](README.md) - プロジェクト概要
- [BACKLOG.md](BACKLOG.md) - 開発バックログ（71 User Stories）
- [STICKY_NOTES_SPEC.md](STICKY_NOTES_SPEC.md) - 付箋機能仕様
- [CARE_PLAN_24H_SPEC.md](CARE_PLAN_24H_SPEC.md) - 24時間シート仕様
- [EXPORT_GUIDE.md](EXPORT_GUIDE.md) - エクスポート機能ガイド
- [AI_INTEGRATION_GUIDE.md](AI_INTEGRATION_GUIDE.md) - AI統合ガイド
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - デプロイガイド

### 外部リンク
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

## 🔐 環境変数設定

### ローカル開発（`.dev.vars`）
```bash
# Google Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here
```

### 本番環境（Cloudflare Pages）
```bash
# Secretとして設定
npx wrangler pages secret put GEMINI_API_KEY --project-name care-fit-cycle
```

---

## 🐛 トラブルシューティング

### npm installでエラー
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### ビルドエラー
```bash
# distを削除して再ビルド
rm -rf dist
npm run build
```

### データベースエラー
```bash
# データベースをリセット
npm run db:reset
```

### PM2が起動しない
```bash
# PM2をグローバルインストール
npm install -g pm2

# または、ローカルで直接起動
npm run dev:sandbox
```

---

## 📞 サポート

### GitHub
- リポジトリ: （設定してください）
- Issue: （設定してください）

### ドキュメント
- 全てのドキュメントは`public/static/`にあります
- ブラウザで`/static/DOCUMENT_NAME.md`にアクセス可能

---

## 📄 ライセンス

このプロジェクトは開発中です。ライセンスは未設定。

---

## 🙏 謝辞

- **Hono**: 軽量で高速なWebフレームワーク
- **Cloudflare**: エッジコンピューティングプラットフォーム
- **TailwindCSS**: ユーティリティファーストCSS
- **React**: UIライブラリ

---

**最終更新日**: 2026-03-29  
**バージョン**: v0.1.0  
**作成者**: ケア・フィット・サイクル開発チーム
