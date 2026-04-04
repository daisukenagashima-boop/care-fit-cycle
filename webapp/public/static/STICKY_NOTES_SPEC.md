# 付箋機能 現在の仕様書

## 📋 概要
ケア・フィット・サイクルの付箋機能は、AIやスタッフが気づいた改善提案を24時間シートに反映させるための仕組みです。

---

## 🗃️ データベース構造

### sticky_notes テーブル

| カラム名 | 型 | 説明 | 必須 | デフォルト |
|---------|-----|------|------|-----------|
| id | INTEGER | 主キー | ✅ | AUTO |
| resident_id | INTEGER | 入居者ID | ✅ | - |
| care_plan_id | INTEGER | 24時間シートの項目ID（関連する時間帯） | ❌ | NULL |
| note_type | TEXT | タイプ：`ai`（AI提案）/ `staff`（スタッフの気づき） | ✅ | - |
| fit_category | TEXT | カテゴリ：`time`（時間）/ `preference`（好み）/ `tips`（コツ） | ❌ | NULL |
| time | TEXT | 関連時刻（例：08:00） | ❌ | NULL |
| title | TEXT | タイトル | ✅ | - |
| content | TEXT | 提案内容 | ✅ | - |
| source | TEXT | ソース（例：AI分析、スタッフ：佐藤） | ❌ | NULL |
| status | TEXT | ステータス：`pending`（未対応）/ `adopted`（採用）/ `rejected`（保留） | ✅ | 'pending' |
| created_at | DATETIME | 作成日時 | ✅ | CURRENT_TIMESTAMP |
| updated_at | DATETIME | 更新日時 | ✅ | CURRENT_TIMESTAMP |

**外部キー制約:**
- `resident_id` → `residents(id)` ON DELETE CASCADE
- `care_plan_id` → `care_plans(id)` ON DELETE SET NULL

---

## 🔌 API仕様

### 1. 付箋一覧取得
**エンドポイント:** `GET /api/residents/:id/sticky-notes`

**クエリパラメータ:**
- `status` (optional): フィルター条件（デフォルト: `pending`）
  - `pending`: 未対応の付箋
  - `adopted`: 採用済みの付箋
  - `rejected`: 保留中の付箋

**レスポンス例:**
```json
[
  {
    "id": 1,
    "resident_id": 1,
    "care_plan_id": 2,
    "note_type": "ai",
    "fit_category": "time",
    "time": "08:00",
    "title": "時間のフィット提案",
    "content": "最近は8:15まで熟睡されています。ゆっくりお休みいただくのはいかがでしょうか？",
    "source": "AI分析",
    "status": "pending",
    "created_at": "2026-03-21 10:00:00",
    "updated_at": "2026-03-21 10:00:00"
  }
]
```

---

### 2. 付箋追加
**エンドポイント:** `POST /api/sticky-notes`

**リクエストボディ:**
```json
{
  "resident_id": 1,
  "care_plan_id": 5,
  "note_type": "staff",
  "fit_category": "preference",
  "time": "14:00",
  "title": "好みのフィット提案",
  "content": "午睡よりもリビングで談笑したいご様子です",
  "source": "スタッフ：佐藤",
  "status": "pending"
}
```

**必須項目:**
- `resident_id`
- `title`
- `content`

**オプション項目:**
- `care_plan_id`: 指定しない場合は `null`
- `note_type`: 指定しない場合は `'staff'`
- `fit_category`: 指定しない場合は `null`
- `time`: 指定しない場合は `null`
- `source`: 指定しない場合は `null`
- `status`: 指定しない場合は `'pending'`

**レスポンス:**
```json
{
  "success": true,
  "id": 4
}
```

---

### 3. 付箋ステータス更新
**エンドポイント:** `PUT /api/sticky-notes/:id`

**リクエストボディ:**
```json
{
  "status": "adopted"
}
```

**ステータスの種類:**
- `pending`: 未対応（初期状態）
- `adopted`: 採用（24時間シートに反映）
- `rejected`: 保留（今は採用しない）

**レスポンス:**
```json
{
  "success": true
}
```

---

## 🎨 フロントエンド実装

### State管理
```javascript
const [stickyNotes, setStickyNotes] = useState([]);
```

### 付箋の取得
```javascript
// pendingステータスの付箋のみ取得
const notesRes = await axios.get('/api/residents/' + residentId + '/sticky-notes?status=pending');
setStickyNotes(notesRes.data);
```

### 付箋のアクション処理
```javascript
const handleStickyNoteAction = async (noteId, status) => {
  try {
    await axios.put('/api/sticky-notes/' + noteId, { status: status });
    fetchAllData(); // データ再取得
  } catch (error) {
    console.error('付せん更新エラー:', error);
  }
};
```

### 気づきの投稿
```javascript
const handleAddInsight = async () => {
  const categoryTitles = {
    time: '時間のフィット提案',
    preference: '好みのフィット提案',
    tips: 'コツのフィット提案'
  };

  await axios.post('/api/sticky-notes', {
    resident_id: residentId,
    note_type: 'staff',
    fit_category: insightCategory,
    time: insightTime || null,
    title: categoryTitles[insightCategory],
    content: insightContent,
    source: 'スタッフ：' + currentStaff.name,
    status: 'pending'
  });
};
```

---

## 🖼️ UI表示パターン

### 1. 24時間シート上の表示
- **表示位置**: 関連する時間帯の下（`time`フィールドに基づく）
- **表示条件**: `status === 'pending'`
- **カード構成**:
  - ヘッダー: アイコン + タイプバッジ（AI提案 / スタッフの気づき）
  - タイトル
  - 内容
  - アクションボタン:
    - ✅ **とりいれる** (緑色、`status: 'adopted'`)
    - ⏸️ **まだそのまま** (グレー、`status: 'rejected'`)

**色分け:**
- **AI提案**: 紫色の背景（`bg-purple-50`）
- **スタッフの気づき**: 青色の背景（`bg-blue-50`）

### 2. 気づきストック（右側パネル）
- **表示内容**: 全ての付箋（status問わず）
- **表示順**: 新しい順（`created_at DESC`）
- **カード構成**:
  - ソースバッジ（AI / スタッフ名）
  - タイトル
  - 内容
  - 詳細ボタン（実装予定）

---

## 📊 データフロー

### 1. 付箋作成フロー
```
スタッフが気づきを投稿
   ↓
POST /api/sticky-notes (status: 'pending')
   ↓
データベースに保存
   ↓
フロントエンドで付箋一覧を再取得
   ↓
24時間シート上に表示
```

### 2. 付箋採用フロー
```
「とりいれる」ボタンをクリック
   ↓
PUT /api/sticky-notes/:id (status: 'adopted')
   ↓
ステータスを更新
   ↓
フロントエンドで付箋一覧を再取得
   ↓
24時間シートから非表示（pendingのみ表示）
   ↓
（今後）24時間シートの該当項目を自動更新
```

### 3. 付箋保留フロー
```
「まだそのまま」ボタンをクリック
   ↓
PUT /api/sticky-notes/:id (status: 'rejected')
   ↓
ステータスを更新
   ↓
フロントエンドで付箋一覧を再取得
   ↓
24時間シートから非表示
```

---

## 🎯 現在の課題と制約

### ✅ 実装済み
- 付箋の作成（スタッフによる気づき投稿）
- 付箋の表示（24時間シート上、気づきストック）
- 付箋のステータス更新（採用/保留）
- AI提案とスタッフ気づきの区別
- カテゴリ分類（time/preference/tips）

### ⚠️ 未実装・制約
1. **付箋採用時の自動反映**
   - `status: 'adopted'`にしても24時間シートは手動更新が必要
   - `care_plans`テーブルの自動更新機能なし

2. **AI自動生成機能**
   - 現在はサンプルデータのみ
   - ケース記録を分析してAI提案を自動生成する機能なし

3. **付箋の編集機能**
   - 一度作成した付箋は編集不可
   - 削除機能もなし

4. **付箋の履歴管理**
   - `adopted`や`rejected`の付箋は画面から消えるのみ
   - 履歴を確認する機能なし

5. **複数時間帯への関連付け**
   - 1つの付箋は1つの時間帯にのみ関連付け可能

6. **通知機能**
   - 新しい付箋が追加されても通知なし

---

## 📈 使用例

### 例1: AI提案（時間のフィット）
```
時刻: 08:00（朝食）
タイプ: AI提案
カテゴリ: 時間
タイトル: 起床時刻の調整提案
内容: 最近3日間、7:45に自然覚醒されています。起床時刻を7:45に早めることをご検討ください。
ソース: AI分析
```

### 例2: スタッフの気づき（好み）
```
時刻: 15:00（おやつ）
タイプ: スタッフの気づき
カテゴリ: 好み
タイトル: コーヒーの嗜好
内容: お茶よりもコーヒーを好まれる様子。毎日コーヒーを提供しています。
ソース: スタッフ：田中
```

### 例3: スタッフの気づき（コツ）
```
時刻: 10:00（排泄介助）
タイプ: スタッフの気づき
カテゴリ: コツ
タイトル: 立位保持のコツ
内容: 右側から声をかけて、手すりをしっかり握っていただくと安定します。
ソース: スタッフ：佐藤（リーダー）
```

---

## 🔧 改善提案（検討中）

### Priority 1: 重要度高
1. **付箋採用時の24時間シート自動更新**
2. **AI自動提案生成機能**
3. **付箋の編集・削除機能**

### Priority 2: 重要度中
4. **付箋履歴の表示**
5. **付箋へのコメント機能**
6. **付箋の検索・フィルター機能**

### Priority 3: 重要度低
7. **付箋の優先度設定**
8. **付箋の期限設定**
9. **付箋の共有・通知機能**

---

## 📝 まとめ

### 現在の仕様の強み
- ✅ シンプルで直感的なUI
- ✅ AIとスタッフの気づきを統合管理
- ✅ 24時間シートとの連携
- ✅ カテゴリ分類による整理

### 現在の仕様の課題
- ⚠️ 付箋採用後の自動反映なし
- ⚠️ AI自動生成機能なし
- ⚠️ 履歴管理が不十分
- ⚠️ 編集・削除機能なし

---

**最終更新日**: 2026-03-21  
**作成者**: ケア・フィット・サイクル開発チーム
