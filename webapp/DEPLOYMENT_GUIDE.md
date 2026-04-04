# ケア・フィット・サイクル デプロイガイド

**最終更新**: 2026-02-12  
**バージョン**: 1.0

---

## 📋 目次

1. [ローカル開発環境](#ローカル開発環境)
2. [Cloudflare Pagesへのデプロイ](#cloudflare-pagesへのデプロイ)
3. [GitHubへのプッシュ](#githubへのプッシュ)
4. [トラブルシューティング](#トラブルシューティング)

---

## 🖥️ ローカル開発環境

### **現在の動作URL**
```
https://3000-ijob28wtyr70pn2awiqwk-02b9cc79.sandbox.novita.ai
```

### **ローカルで起動する方法**

```bash
# プロジェクトディレクトリへ移動
cd /home/user/webapp

# 依存関係のインストール（初回のみ）
npm install

# ビルド
npm run build

# PM2で起動
pm2 start ecosystem.config.cjs

# 動作確認
curl http://localhost:3000
```

### **ポート3000をクリーンアップ**

```bash
# ポート3000を使用中のプロセスを終了
fuser -k 3000/tcp 2>/dev/null || true

# または
pm2 delete care-fit-cycle
```

### **データベースのリセット**

```bash
# D1データベースをリセットして再構築
npm run db:reset

# 内訳:
# 1. .wrangler/state/v3/d1 を削除
# 2. マイグレーション適用（テーブル作成）
# 3. サンプルデータ投入
```

---

## ☁️ Cloudflare Pagesへのデプロイ

### **前提条件**

1. **Cloudflare API Token**が必要
   - Deployタブで設定
   - 権限: `Edit Cloudflare Workers`

2. **プロジェクト名**を確認
   ```bash
   # meta_infoから取得
   meta_info(action="read", key="cloudflare_project_name")
   # 結果: care-fit-cycle
   ```

---

### **Step 1: API Key設定**

```bash
# DeployタブでCloudflare API Keyを設定
# その後、以下のコマンドで環境変数を確認
echo $CLOUDFLARE_API_TOKEN
```

---

### **Step 2: プロジェクト作成（初回のみ）**

```bash
cd /home/user/webapp

# Cloudflare Pagesプロジェクトを作成
npx wrangler pages project create care-fit-cycle \
  --production-branch main \
  --compatibility-date 2024-01-01
```

---

### **Step 3: D1データベース作成（初回のみ）**

```bash
# 本番用D1データベースを作成
npx wrangler d1 create care-fit-cycle-db

# 出力例:
# ✅ Successfully created DB 'care-fit-cycle-db'
# database_id = "abc123-def456-ghi789"
```

**重要**: `database_id` をコピーして `wrangler.jsonc` に設定してください。

---

### **Step 4: wrangler.jsonc を更新**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "care-fit-cycle",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "care-fit-cycle-db",
      "database_id": "ここに本番のdatabase_idを貼り付け"
    }
  ]
}
```

---

### **Step 5: マイグレーション実行（本番）**

```bash
# 本番D1データベースにマイグレーション適用
npm run db:migrate:prod

# 内訳: wrangler d1 migrations apply care-fit-cycle-db
```

---

### **Step 6: サンプルデータ投入（任意）**

```bash
# 本番環境にもサンプルデータを投入する場合
npx wrangler d1 execute care-fit-cycle-db --file=./seed.sql

# 注意: 本番環境では通常サンプルデータは不要
```

---

### **Step 7: デプロイ実行**

```bash
# ビルド + デプロイ
npm run deploy:prod

# 内訳:
# 1. npm run build
# 2. wrangler pages deploy dist --project-name care-fit-cycle
```

---

### **Step 8: デプロイ確認**

デプロイ成功後、以下のURLにアクセスできます：

```
https://care-fit-cycle.pages.dev
```

または

```
https://main.care-fit-cycle.pages.dev
```

---

### **Step 9: meta_info更新（重要）**

```bash
# デプロイ成功後、プロジェクト名を保存
meta_info(action="write", key="cloudflare_project_name", value="care-fit-cycle")
```

---

## 🐙 GitHubへのプッシュ

### **前提条件**

1. **GitHub認証**が必要
   - #githubタブで設定
   - GitHub AppまたはOAuth認証

---

### **Step 1: GitHub認証**

```bash
# setup_github_environmentを実行
setup_github_environment

# 成功すると、gitとghコマンドが使えるようになります
```

---

### **Step 2: リモートリポジトリ設定**

```bash
cd /home/user/webapp

# 既存のリポジトリを使う場合
git remote add origin https://github.com/YOUR_USERNAME/care-fit-cycle.git

# 新規リポジトリの場合（GitHubで作成後）
git remote add origin https://github.com/YOUR_USERNAME/care-fit-cycle.git
```

---

### **Step 3: プッシュ**

```bash
# 初回プッシュ（新規リポジトリ）
git push -f origin main

# 通常のプッシュ（既存リポジトリ）
git push origin main
```

---

### **Step 4: 確認**

```
https://github.com/YOUR_USERNAME/care-fit-cycle
```

---

## 🔧 トラブルシューティング

### **1. ビルドエラー**

```bash
# distディレクトリを削除して再ビルド
rm -rf dist
npm run build
```

---

### **2. PM2が起動しない**

```bash
# PM2を再起動
pm2 delete care-fit-cycle
pm2 start ecosystem.config.cjs

# PM2のログを確認
pm2 logs care-fit-cycle --nostream
```

---

### **3. ポート3000が使用中**

```bash
# ポートをクリーンアップ
fuser -k 3000/tcp 2>/dev/null || true

# 再起動
pm2 restart care-fit-cycle
```

---

### **4. データベースが空**

```bash
# データベースをリセット
npm run db:reset

# サンプルデータを確認
npx wrangler d1 execute care-fit-cycle-db --local --command="SELECT * FROM residents"
```

---

### **5. Cloudflareデプロイが失敗**

```bash
# Cloudflare認証を確認
npx wrangler whoami

# API Tokenが正しいか確認
echo $CLOUDFLARE_API_TOKEN

# プロジェクト名を確認
npx wrangler pages project list
```

---

### **6. GitHubプッシュが失敗**

```bash
# GitHub認証を確認
gh auth status

# 認証を再設定
setup_github_environment
```

---

## 📊 現在の状態

### **サンドボックス環境**
- **URL**: https://3000-ijob28wtyr70pn2awiqwk-02b9cc79.sandbox.novita.ai
- **状態**: ✅ 動作中
- **PM2 PID**: 643
- **データベース**: ローカルD1（.wrangler/state/v3/d1）

### **実装済み機能**
- ✅ 入居者プロフィール表示
- ✅ 24時間シート（ケアプラン）
- ✅ ケース記録（日付選択機能付き）
- ✅ デジタル付せん（改善版UI）
- ✅ 気づき投稿機能
- ✅ フィット進捗ゲージ
- ✅ レスポンシブデザイン

### **未実装機能**
- ❌ AI分析エンジン（Gemini API統合）
- ❌ 音声入力（Web Speech API）
- ❌ AI相談窓口（RAG）
- ❌ 認証機能（スタッフログイン）
- ❌ 多施設対応

---

## 📝 デプロイチェックリスト

### **初回デプロイ**
- [ ] Cloudflare API Token設定
- [ ] wrangler.jsonc確認
- [ ] D1データベース作成
- [ ] database_id設定
- [ ] マイグレーション実行（本番）
- [ ] プロジェクト作成
- [ ] デプロイ実行
- [ ] 動作確認
- [ ] meta_info更新

### **2回目以降のデプロイ**
- [ ] ローカルでビルド確認
- [ ] Gitコミット
- [ ] マイグレーション（必要な場合）
- [ ] デプロイ実行
- [ ] 動作確認

---

## 🚀 クイックデプロイコマンド

```bash
# ローカル確認
cd /home/user/webapp
npm run build
pm2 restart care-fit-cycle
curl http://localhost:3000

# Gitコミット
git add .
git commit -m "feat: 新機能追加"

# Cloudflareデプロイ
npm run deploy:prod

# GitHubプッシュ
git push origin main
```

---

## 📞 サポート

問題が発生した場合:

1. **ログを確認**
   ```bash
   pm2 logs care-fit-cycle --nostream
   ```

2. **ビルドログを確認**
   ```bash
   npm run build
   ```

3. **Cloudflareログを確認**
   ```bash
   npx wrangler tail care-fit-cycle
   ```

---

**作成日**: 2026-02-12  
**最終更新**: 2026-02-12
