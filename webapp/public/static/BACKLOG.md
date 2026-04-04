# ケア・フィット・サイクル 開発バックログ

## プロダクト概要
**プロダクト名**: ケア・フィット・サイクル (Care Fit Cycle)  
**目的**: 介護施設における入居者の24時間ケアプランを、入所後14日間で実態に即した計画へ自動的に「熟成」させるシステム  
**コアバリュー**: 個人の生活リズムの尊重 × 深刻な属人化・育成コストの解消

---

## Epic一覧

### Epic 1: 基盤機能（認証・マスタ管理）
入居者・スタッフ・施設のマスタデータ管理と認証基盤

### Epic 2: Day 1 - 初期ガイド生成
アセスメントシートから暫定24時間シートを自動生成

### Epic 3: Day 2-7 - 実態ログ蓄積
日々のケア記録を収集し、計画との乖離を分析

### Epic 4: Day 8-13 - フィット提案期
AIによるデジタル付せん生成と採用/保留の判断

### Epic 5: Day 14 - プラン確定
完成版24時間シートの承認と家族報告資料作成

### Epic 6: AI分析エンジン
3つのフィット（時間・好み・コツ）の自動検出

### Epic 7: 音声入力・AI相談窓口
ハンズフリー記録とAIアシスタント

### Epic 8: 多施設対応・権限管理
施設管理者・ケアマネージャー・介護士の権限分離

---

## Sprint計画（推奨）

### Sprint 0: 環境構築・設計（1週間）
- 開発環境セットアップ
- データベース設計
- UI/UXデザイン確定
- API設計

### Sprint 1-2: MVP Phase 1（2週間）
Epic 1, Epic 3の一部（手動記録）

### Sprint 3-4: MVP Phase 2（2週間）
Epic 2, Epic 3完全版, Epic 4の一部（手動付せん）

### Sprint 5-6: AI統合（2週間）
Epic 6, Epic 4完全版

### Sprint 7-8: 完成・多機能化（2週間）
Epic 5, Epic 7, Epic 8

---

# プロダクトバックログ

## Epic 1: 基盤機能（認証・マスタ管理）

### US-001: スタッフログイン機能
**As a** 介護施設のスタッフ  
**I want to** メールアドレスとパスワードでログインしたい  
**So that** 自分の担当業務にアクセスできる

**受け入れ基準:**
- [ ] メールアドレス・パスワード入力フォームがある
- [ ] ログイン成功時にトップページへ遷移
- [ ] ログイン失敗時にエラーメッセージ表示
- [ ] セッション管理（24時間有効）
- [ ] ログアウト機能

**優先度**: P0（必須）  
**Story Point**: 5  
**担当**: Backend + Frontend  

---

### US-002: 入居者マスタ管理（CRUD）
**As a** ケアマネージャー  
**I want to** 入居者の基本情報を登録・編集・削除したい  
**So that** システムで入居者を管理できる

**受け入れ基準:**
- [ ] 入居者一覧画面（名前・要介護度・入所日）
- [ ] 新規登録フォーム（名前・フリガナ・生年月日・性別・要介護度・入所日・好きなこと）
- [ ] 編集・削除機能
- [ ] プロフィール画像アップロード
- [ ] バリデーション（必須項目チェック）

**優先度**: P0  
**Story Point**: 8  
**担当**: Fullstack  

**テーブル**: `residents`

---

### US-003: スタッフマスタ管理（CRUD）
**As a** 施設管理者  
**I want to** スタッフ情報を登録・編集したい  
**So that** 記録者を特定し、経験年数を把握できる

**受け入れ基準:**
- [ ] スタッフ一覧画面（名前・経験年数・役職）
- [ ] 新規登録フォーム（名前・メールアドレス・経験年数・役職）
- [ ] 編集・削除機能
- [ ] 役職選択（介護士・ケアマネージャー・看護師・リーダー・管理者）

**優先度**: P0  
**Story Point**: 5  
**担当**: Fullstack  

**テーブル**: `staff`

---

### US-004: 権限管理（ロールベースアクセス制御）
**As a** システム管理者  
**I want to** 役職ごとにアクセス権限を設定したい  
**So that** 適切な情報セキュリティを保てる

**受け入れ基準:**
- [ ] 管理者: 全機能アクセス可
- [ ] ケアマネージャー: 24時間シート編集・承認可
- [ ] 介護士: ケース記録追加・気づき投稿可
- [ ] 看護師: ケース記録追加・健康記録編集可
- [ ] パート: ケース記録閲覧・気づき投稿可

**優先度**: P1（重要）  
**Story Point**: 8  
**担当**: Backend  

---

## Epic 2: Day 1 - 初期ガイド生成

### US-010: アセスメントシート入力フォーム
**As a** ケアマネージャー  
**I want to** 入所前のアセスメント情報を入力したい  
**So that** 暫定24時間シートを生成できる

**受け入れ基準:**
- [ ] 入力フォーム（起床時刻・就寝時刻・食事時間・入浴頻度・トイレ間隔・好きなこと・嫌いなこと・こだわり）
- [ ] 自由記述欄（家族からの情報）
- [ ] 一時保存機能
- [ ] 入力内容のプレビュー

**優先度**: P0  
**Story Point**: 8  
**担当**: Frontend  

**テーブル**: `assessments`

---

### US-011: 暫定24時間シート自動生成（ルールベース）
**As a** ケアマネージャー  
**I want to** アセスメント情報から暫定24時間シートを自動生成したい  
**So that** 初日から計画的にケアを開始できる

**受け入れ基準:**
- [ ] 起床時刻に基づき、起床・洗面を自動配置
- [ ] 食事時間（朝食・昼食・夕食）を自動配置
- [ ] 排泄介助を3時間おきに配置
- [ ] 入浴・清拭を夕方に配置
- [ ] 就寝時刻に基づき、就寝準備を配置
- [ ] 生成結果を24時間シートテーブルへ保存

**優先度**: P0  
**Story Point**: 13  
**担当**: Backend  

**アルゴリズム**:
- ルールベース生成（条件分岐）
- AI生成は後回し（Epic 6）

---

### US-012: 24時間シート表示・手動編集
**As a** ケアマネージャー  
**I want to** 生成された24時間シートを確認・修正したい  
**So that** 入居者のこだわりを反映できる

**受け入れ基準:**
- [ ] 時間順の一覧表示（時刻・活動・詳細）
- [ ] インライン編集機能
- [ ] 行の追加・削除
- [ ] ステータス管理（plan / fit）
- [ ] 保存ボタン

**優先度**: P0  
**Story Point**: 8  
**担当**: Frontend  

---

### US-013: 「今日のねがい」入力欄
**As a** 介護士  
**I want to** 入居者の「今日のねがい」を毎日更新したい  
**So that** その日のケアに反映できる

**受け入れ基準:**
- [ ] 入居者プロフィールカードに入力欄
- [ ] テキストエリア（最大200文字）
- [ ] 保存ボタン
- [ ] 履歴表示（過去7日分）

**優先度**: P1  
**Story Point**: 3  
**担当**: Frontend  

---

## Epic 3: Day 2-7 - 実態ログ蓄積

### US-020: ケース記録手動入力
**As a** 介護士  
**I want to** ケアの実施内容をその場で記録したい  
**So that** 後で思い出す手間を省ける

**受け入れ基準:**
- [ ] 入力フォーム（内容・タグ・記録種別）
- [ ] 現在時刻を自動セット
- [ ] スタッフ名を自動セット
- [ ] タグ選択（食事・排泄・入浴・健康・その他）
- [ ] タイムライン表示（新しい順）

**優先度**: P0  
**Story Point**: 5  
**担当**: Fullstack  

**テーブル**: `case_records`

---

### US-021: ケース記録のタイムライン表示
**As a** 介護士  
**I want to** 過去の記録を時系列で確認したい  
**So that** 入居者の状態変化を把握できる

**受け入れ基準:**
- [ ] 日付選択（デフォルト: 今日）
- [ ] 時刻降順の一覧表示
- [ ] スタッフ名・内容・タグ表示
- [ ] 無限スクロール（100件ずつ読み込み）
- [ ] フィルタ機能（タグ・スタッフ）

**優先度**: P0  
**Story Point**: 8  
**担当**: Frontend + Backend  

---

### US-022: 計画と実績の乖離検出（バックグラウンド処理）
**As a** システム  
**I want to** 24時間シートの計画時刻とケース記録の実績時刻を照合したい  
**So that** 付せん生成の材料にできる

**受け入れ基準:**
- [ ] 毎日深夜2:00にバッチ実行
- [ ] 各活動の実績時刻を抽出（キーワードマッチング）
- [ ] 計画との時間差を計算
- [ ] 差が30分以上かつ3日以上継続した場合、フラグを立てる
- [ ] 結果を `deviation_logs` テーブルへ保存

**優先度**: P1  
**Story Point**: 13  
**担当**: Backend  

**テーブル**: `deviation_logs`

---

### US-023: 気づき投稿機能
**As a** 介護士  
**I want to** ケア中に気づいたことをすぐに投稿したい  
**So that** ベテランの知見を共有できる

**受け入れ基準:**
- [ ] 「気づきを書く」ボタン（右カラム上部）
- [ ] カテゴリ選択（時間のフィット・好みのフィット・コツのフィット）
- [ ] 関連時刻選択（24時間シートの時刻 or 指定なし）
- [ ] 内容入力（テキストエリア4行）
- [ ] 投稿後、デジタル付せんとして表示

**優先度**: P0  
**Story Point**: 8  
**担当**: Fullstack  

**テーブル**: `sticky_notes`

---

### US-024: 「気づきのストック」表示
**As a** ケアマネージャー  
**I want to** 全スタッフの気づきを一覧で確認したい  
**So that** 計画への反映を検討できる

**受け入れ基準:**
- [ ] 右カラムに「気づきのストック」セクション
- [ ] 付せん形式で表示（投稿者・日時・内容）
- [ ] ステータス管理（pending / approved / rejected）
- [ ] 「とりいれる」「まだそのまま」ボタン

**優先度**: P0  
**Story Point**: 5  
**担当**: Frontend  

---

## Epic 4: Day 8-13 - フィット提案期

### US-030: デジタル付せん表示（24時間シートに配置）
**As a** ケアマネージャー  
**I want to** 該当時刻の24時間シートに付せんを表示したい  
**So that** どの活動に関する提案かすぐわかる

**受け入れ基準:**
- [ ] 24時間シートの各行に付せんアイコン表示
- [ ] クリックで詳細ポップアップ
- [ ] カテゴリ別の色分け（時間=青・好み=オレンジ・コツ=緑）
- [ ] 投稿者名・日時・内容表示

**優先度**: P0  
**Story Point**: 8  
**担当**: Frontend  

---

### US-031: 付せんの採用/保留（ステータス更新）
**As a** ケアマネージャー  
**I want to** 付せんを「とりいれる」または「まだそのまま」で判断したい  
**So that** 計画への反映を管理できる

**受け入れ基準:**
- [ ] 「とりいれる」ボタン → ステータスを `approved` へ更新
- [ ] 「まだそのまま」ボタン → ステータスを `rejected` へ更新
- [ ] 採用後、付せんが気づきのストックから消える
- [ ] 24時間シートの該当行が自動更新される（内容反映）

**優先度**: P0  
**Story Point**: 8  
**担当**: Backend + Frontend  

---

### US-032: 付せん採用時の24時間シート自動更新
**As a** システム  
**I want to** 採用された付せんの内容を24時間シートへ反映したい  
**So that** 手動編集の手間を省ける

**受け入れ基準:**
- [ ] 「時間のフィット」採用時 → 該当行の時刻を更新
- [ ] 「好みのフィット」採用時 → 詳細欄に内容を追記
- [ ] 「コツのフィット」採用時 → 詳細欄に内容を追記
- [ ] ステータスを `fit` へ更新

**優先度**: P1  
**Story Point**: 8  
**担当**: Backend  

---

### US-033: フィット進捗ゲージ表示
**As a** ケアマネージャー  
**I want to** 現在のフィット進捗を視覚的に確認したい  
**So that** Day14までの進捗を把握できる

**受け入れ基準:**
- [ ] 右カラムに進捗カード表示
- [ ] Day X / 14 表示
- [ ] プログレスバー（0-100%）
- [ ] フェーズ表示（初期 / 実態ログ蓄積 / フィット提案 / 確定）
- [ ] 次のアクション提案（例: 「あと3件の付せんを確認してください」）

**優先度**: P1  
**Story Point**: 5  
**担当**: Frontend  

---

## Epic 5: Day 14 - プラン確定

### US-040: 完成版24時間シートのプレビュー
**As a** ケアマネージャー  
**I want to** Day14の完成版24時間シートをプレビューしたい  
**So that** 最終確認できる

**受け入れ基準:**
- [ ] 「プレビュー」ボタン
- [ ] 印刷レイアウトで表示
- [ ] 入居者プロフィール・24時間シート・採用された付せんを含む
- [ ] PDF出力ボタン

**優先度**: P1  
**Story Point**: 8  
**担当**: Frontend  

---

### US-041: 完成版シートの承認機能
**As a** ケアマネージャー  
**I want to** 完成版シートを承認したい  
**So that** Day14のプロセスを完了できる

**受け入れ基準:**
- [ ] 「承認する」ボタン
- [ ] 承認後、入居者のフェーズを `completed` へ更新
- [ ] 承認日時を記録
- [ ] 承認後は24時間シートを編集不可（ロック）

**優先度**: P1  
**Story Point**: 5  
**担当**: Backend  

---

### US-042: 家族報告資料の自動生成
**As a** ケアマネージャー  
**I want to** 家族報告用の資料を自動生成したい  
**So that** 面談準備を効率化できる

**受け入れ基準:**
- [ ] 「家族報告資料を作成」ボタン
- [ ] 入居者プロフィール・24時間シート・主な気づき（採用された付せん）を含む
- [ ] PDF形式でダウンロード
- [ ] 印刷用レイアウト

**優先度**: P2（できれば）  
**Story Point**: 13  
**担当**: Backend + Frontend  

---

## Epic 6: AI分析エンジン

### US-050: 時間のフィット自動検出
**As a** システム  
**I want to** 計画と実績の時間差を自動検出して付せんを生成したい  
**So that** スタッフの気づきを支援できる

**受け入れ基準:**
- [ ] `deviation_logs` から30分以上・3日以上継続のデータを取得
- [ ] 付せんタイトル・内容を自動生成（例: 「起床時刻を8:15に変更しませんか？」）
- [ ] `sticky_notes` テーブルへ自動挿入（type: `ai`, category: `time`）
- [ ] 毎日深夜3:00にバッチ実行

**優先度**: P1  
**Story Point**: 13  
**担当**: Backend + AI  

**技術**:
- ルールベース（閾値判定）
- 将来的にGemini API統合

---

### US-051: 好みのフィット自動検出
**As a** システム  
**I want to** ケース記録から感情キーワードを抽出して付せんを生成したい  
**So that** 入居者の好みを提案できる

**受け入れ基準:**
- [ ] ケース記録の自由記述から感情キーワードを抽出（例: 「喜ぶ」「嬉しそう」「拒否」）
- [ ] 3回以上出現したキーワードで付せんを生成
- [ ] 内容例: 「お茶よりコーヒーを好むようです」
- [ ] `sticky_notes` テーブルへ自動挿入（type: `ai`, category: `preference`）

**優先度**: P1  
**Story Point**: 21  
**担当**: Backend + AI  

**技術**:
- 自然言語処理（キーワード抽出）
- 感情分析（ポジティブ/ネガティブ）

---

### US-052: コツのフィット自動検出
**As a** システム  
**I want to** ベテランのケース記録から具体的な手順・声掛けを抽出したい  
**So that** 新人へコツを共有できる

**受け入れ基準:**
- [ ] 経験年数5年以上のスタッフの記録を優先抽出
- [ ] 「〜すると」「〜のように」などの手順表現を検出
- [ ] 付せん内容例: 「肩を軽く叩きながら声をかけると、起きやすいです」
- [ ] `sticky_notes` テーブルへ自動挿入（type: `ai`, category: `tip`）

**優先度**: P2  
**Story Point**: 21  
**担当**: Backend + AI  

**技術**:
- テキストマイニング
- パターンマッチング

---

### US-053: Gemini API統合（AI分析基盤）
**As a** 開発者  
**I want to** Gemini APIを統合したい  
**So that** より高度なAI分析を実現できる

**受け入れ基準:**
- [ ] Gemini API認証設定（Cloudflare Secrets）
- [ ] プロンプトテンプレート作成（時間・好み・コツの各検出用）
- [ ] API呼び出しモジュール実装
- [ ] レート制限対応（1日1000リクエスト想定）
- [ ] エラーハンドリング

**優先度**: P1  
**Story Point**: 13  
**担当**: Backend  

---

## Epic 7: 音声入力・AI相談窓口

### US-060: 音声入力機能（Web Speech API）
**As a** 介護士  
**I want to** 音声でケース記録を入力したい  
**So that** 手が離せない状況でも記録できる

**受け入れ基準:**
- [ ] 音声入力ボタン（マイクアイコン）
- [ ] 音声認識開始・停止
- [ ] 認識結果をテキストエリアへ自動挿入
- [ ] 日本語対応
- [ ] エラーハンドリング（マイク未接続・権限なし）

**優先度**: P2  
**Story Point**: 13  
**担当**: Frontend  

**技術**:
- Web Speech API（ブラウザ標準）

---

### US-061: AI相談窓口（チャット機能）
**As a** 介護士  
**I want to** AIに相談してアドバイスをもらいたい  
**So that** 夜勤中の不安を解消できる

**受け入れ基準:**
- [ ] 右カラムにチャットウィンドウ
- [ ] 質問入力欄
- [ ] AIからの回答表示
- [ ] 過去の記録を読み込んで回答（RAG）
- [ ] 例: 「夜中に不穏になった時の対応方法は？」

**優先度**: P2  
**Story Point**: 21  
**担当**: Fullstack + AI  

**技術**:
- Gemini API
- RAG（Retrieval-Augmented Generation）

---

## Epic 8: 多施設対応・権限管理

### US-070: 施設マスタ管理
**As a** システム管理者  
**I want to** 複数施設を管理したい  
**So that** 多施設展開に対応できる

**受け入れ基準:**
- [ ] 施設一覧画面
- [ ] 施設登録フォーム（施設名・住所・電話番号・定員）
- [ ] スタッフ・入居者を施設に紐付け
- [ ] 施設ごとのダッシュボード

**優先度**: P3（将来）  
**Story Point**: 13  
**担当**: Fullstack  

**テーブル**: `facilities`

---

### US-071: 施設管理者権限
**As a** 施設管理者  
**I want to** 自施設のデータのみ閲覧・編集したい  
**So that** 他施設のデータを見られないようにする

**受け入れ基準:**
- [ ] 施設IDによるデータフィルタ
- [ ] API実装（施設IDチェック）
- [ ] 管理者画面（スタッフ管理・入居者管理）

**優先度**: P3  
**Story Point**: 13  
**担当**: Backend  

---

## 非機能要件

### NFR-001: パフォーマンス
- ページ読み込み: 3秒以内
- API応答時間: 500ms以内
- 同時接続ユーザー: 100人

### NFR-002: セキュリティ
- HTTPS通信必須
- パスワードハッシュ化（bcrypt）
- CSRF対策
- XSS対策
- SQL Injection対策

### NFR-003: データバックアップ
- 日次自動バックアップ
- 保存期間: 30日間

### NFR-004: 可用性
- 稼働率: 99.9%
- ダウンタイム: 月間43分以内

---

## 技術スタック

### フロントエンド
- React 18
- TailwindCSS
- Axios
- Font Awesome

### バックエンド
- Hono（Cloudflare Workers）
- TypeScript

### データベース
- Cloudflare D1（SQLite）

### AI/ML
- Gemini 2.5 Flash（軽量処理）
- Gemini 2.5 Pro（高度な分析）

### インフラ
- Cloudflare Pages
- Cloudflare Workers
- GitHub Actions（CI/CD）

---

## データベーススキーマ（主要テーブル）

### residents（入居者）
```sql
CREATE TABLE residents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_kana TEXT,
  birth_date DATE,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  care_level TEXT NOT NULL, -- 要介護度
  admission_date DATE, -- 入所日
  favorite_things TEXT, -- 好きなこと
  today_wish TEXT, -- 今日のねがい
  profile_image_url TEXT,
  maturation_day INTEGER DEFAULT 1, -- Day 1-14
  phase TEXT DEFAULT 'initial', -- initial/logging/fitting/completed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### staff（スタッフ）
```sql
CREATE TABLE staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  role TEXT NOT NULL, -- admin/care_manager/caregiver/nurse/leader
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### care_plans（24時間シート）
```sql
CREATE TABLE care_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  time TEXT NOT NULL, -- HH:MM
  activity TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'plan', -- plan/fit
  display_order INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id)
);
```

### case_records（ケース記録）
```sql
CREATE TABLE case_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  recorded_date DATE NOT NULL,
  record_time TIME NOT NULL,
  content TEXT NOT NULL,
  tag TEXT, -- 食事/排泄/入浴/健康/その他
  record_type TEXT DEFAULT 'manual', -- manual/voice/sensor
  alert_flag BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);
```

### sticky_notes（デジタル付せん）
```sql
CREATE TABLE sticky_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- ai/staff
  category TEXT NOT NULL, -- time/preference/tip
  related_time TEXT, -- HH:MM
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT, -- AI分析 or スタッフ名
  status TEXT DEFAULT 'pending', -- pending/approved/rejected
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id)
);
```

### deviation_logs（乖離ログ）
```sql
CREATE TABLE deviation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  care_plan_id INTEGER NOT NULL,
  planned_time TIME NOT NULL,
  actual_time TIME NOT NULL,
  deviation_minutes INTEGER NOT NULL, -- 差分（分）
  occurrence_count INTEGER DEFAULT 1, -- 連続発生回数
  logged_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (care_plan_id) REFERENCES care_plans(id)
);
```

---

## 定義完了（Definition of Done）

各ユーザーストーリーが「完了」とみなされる基準:

- [ ] 受け入れ基準をすべて満たしている
- [ ] コードレビュー完了
- [ ] 単体テスト実装・パス
- [ ] 統合テスト実装・パス
- [ ] UIデザインレビュー完了
- [ ] ドキュメント更新（必要に応じて）
- [ ] デプロイ完了（Staging環境）
- [ ] PO（プロダクトオーナー）承認

---

## リスク管理

### 技術的リスク
- **AI分析の精度不足**: ルールベース → AI移行を段階的に
- **Cloudflare Workers制約**: CPU時間10ms制限 → バッチ処理で対応
- **D1パフォーマンス**: 大量データ対応 → インデックス最適化

### 運用リスク
- **スタッフの抵抗感**: 段階的導入・研修実施
- **データ移行**: 既存システムからのデータ移行計画
- **サポート体制**: ヘルプデスク・マニュアル整備

---

## KPI（成功指標）

### 開発KPI
- Sprint velocity: 50 Story Points/Sprint
- バグ発生率: 10件/Sprint以下
- コードカバレッジ: 80%以上

### ビジネスKPI
- 記録時間削減: 80%（30分 → 6分）
- 24時間シート作成時間: 83%削減（3時間 → 30分）
- ベテラン不在時のケア品質偏差: 30%縮小
- 新人育成期間: 50%短縮（6ヶ月 → 3ヶ月）
- ユーザー満足度: 4.5/5.0以上

---

## ロードマップ

### Phase 1: MVP（3ヶ月）
- Epic 1, 2, 3の一部（手動記録）
- 基本的な24時間シート管理
- ケース記録・気づき投稿

### Phase 2: AI統合（2ヶ月）
- Epic 4, 6
- デジタル付せん自動生成
- 3つのフィット検出

### Phase 3: 完成・拡張（2ヶ月）
- Epic 5, 7
- 音声入力・AI相談窓口
- 家族報告資料自動生成

### Phase 4: スケール（継続）
- Epic 8
- 多施設対応
- エンタープライズ機能

---

**作成日**: 2026-02-12  
**作成者**: 開発チーム  
**バージョン**: 1.0

