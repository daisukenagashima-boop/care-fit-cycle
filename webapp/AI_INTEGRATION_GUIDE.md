# AI相談窓口 統合ガイド

## 概要
ケア・フィット・サイクルにGemini AI相談窓口を統合しました。職員が入居者様に関する質問をAIに投げかけ、過去のケース記録をもとにした具体的なアドバイスを受け取ることができます。

## 機能

### ✨ 主な機能
- **質問応答**: 入居者様の好み、習慣、最近の様子について質問
- **コンテキスト理解**: 入居者情報と最近20件のケース記録を自動的にAIに提供
- **実践的アドバイス**: 経験豊富なケアマネージャーの視点でアドバイス
- **リアルタイム**: 質問すると数秒でAIが回答

### 💬 使用例
```
質問: 「岡田一輝さんの好きなコーヒーの銘柄は？」
回答: 「ケース記録によると、岡田様は朝食時にコーヒーを楽しまれており、
      特に『美味しいコーヒーだった』と感想を述べられています。
      具体的な銘柄については記録がないため、次回ご本人に直接お聞きして
      記録に残すことをお勧めします。」

質問: 「最近よく笑う時間はいつ？」
回答: 「ケース記録から、午前中の庭園散歩や他の入居者様との会話の時間に
      よく笑顔が見られます。特に10時頃の活動時間が活発です。」
```

## セットアップ手順

### 1. Gemini API Keyの取得
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 「Create API Key」をクリック
3. APIキーをコピー

### 2. ローカル開発環境の設定
`.dev.vars`ファイルにAPIキーを設定：
```bash
# .dev.vars
GEMINI_API_KEY=your-actual-api-key-here
```

### 3. 本番環境への設定
Cloudflareにシークレットとして設定：
```bash
# Cloudflare Pagesの場合
npx wrangler pages secret put GEMINI_API_KEY --project-name care-fit-cycle

# Cloudflare Workersの場合
npx wrangler secret put GEMINI_API_KEY
```

## API仕様

### エンドポイント
```
POST /api/ai-chat
```

### リクエスト
```json
{
  "question": "岡田一輝さんの好きなコーヒーの銘柄は？",
  "resident_id": 1
}
```

### レスポンス（成功時）
```json
{
  "success": true,
  "question": "岡田一輝さんの好きなコーヒーの銘柄は？",
  "answer": "ケース記録によると...",
  "model": "gemini-2.0-flash-exp"
}
```

### レスポンス（エラー時）
```json
{
  "error": "Gemini API Key is not configured",
  "message": "APIキーが設定されていません。.dev.varsファイルにGEMINI_API_KEYを設定してください。"
}
```

## 技術仕様

### 使用モデル
- **gemini-2.0-flash-exp**: Google最新の高速生成AIモデル
- **温度**: 0.7（バランスの取れた創造性）
- **最大トークン**: 1000トークン

### AIプロンプト構造
```
役割: 経験豊富なケアマネージャー

入力:
- 入居者情報（氏名、介護度、好きなもの、今日の願い）
- 現在のDay（14日サイクルのどこか）
- 最近20件のケース記録

出力要件:
- 入居者様の好みや習慣を考慮
- 最近のケース記録から傾向を読み取る
- 具体的で実践しやすいアドバイス
- 優しく、丁寧な言葉遣い
```

## フロントエンドUI

### 表示位置
- **PC**: 右側パネルの下部（AI相談窓口カード）
- **モバイル**: Insightsタブ内に今後追加予定

### UI要素
1. **質問入力欄**: テキスト入力（Enter送信対応）
2. **送信ボタン**: 紙飛行機アイコン、ローディング時はスピナー
3. **AIレスポンス**: ロボットアイコン付きの回答カード

### 状態管理
```jsx
const [aiQuery, setAiQuery] = useState('');        // 質問内容
const [aiResponse, setAiResponse] = useState('');  // AI回答
const [aiLoading, setAiLoading] = useState(false); // ローディング状態
```

## セキュリティ

### API Keyの保護
- ✅ `.dev.vars`はgitignoreに含まれている
- ✅ 本番環境ではCloudflareシークレットを使用
- ✅ APIキーはバックエンドでのみ使用（フロントエンドには露出しない）

### データプライバシー
- 入居者情報とケース記録はAIプロンプトに含まれる
- Google Gemini APIの利用規約とプライバシーポリシーを確認すること
- 機密情報の取り扱いには注意が必要

## トラブルシューティング

### 問題: APIキーが設定されていない
**エラーメッセージ**: 
```
エラー: APIキーが設定されていません。.dev.varsファイルにGEMINI_API_KEYを設定してください。
```

**解決方法**:
1. `.dev.vars`ファイルを確認
2. `GEMINI_API_KEY=your-actual-api-key-here`が正しく設定されているか確認
3. wranglerを再起動: `pm2 restart care-fit-cycle`

### 問題: AI回答が返ってこない
**確認事項**:
1. ネットワーク接続
2. Gemini APIの利用制限（無料プランの場合、1分あたりのリクエスト数に制限あり）
3. APIキーの有効性
4. ブラウザコンソールでエラーログを確認

### 問題: 回答が不正確
**改善方法**:
1. ケース記録をより詳細に記録する
2. 入居者情報（好きなもの、願い）を具体的に記入する
3. プロンプトの温度パラメータを調整（`src/index.tsx`の`temperature`値）

## 今後の拡張予定

### Phase 1（現在）✅
- Gemini APIとの基本統合
- 質問応答機能
- コンテキスト提供（入居者情報+ケース記録）

### Phase 2（予定）
- Claude APIの統合（モデル選択機能）
- 会話履歴の保存
- おすすめ質問のサジェスト
- モバイルUIの最適化

### Phase 3（予定）
- 音声入力対応
- 多言語対応
- ケア提案の自動生成
- AIが気づきを投稿する機能

## 参考資料

### Google Gemini API
- [API Documentation](https://ai.google.dev/docs)
- [Pricing](https://ai.google.dev/pricing)
- [Rate Limits](https://ai.google.dev/docs/quota)

### 関連ファイル
- **バックエンド**: `src/index.tsx` (Line 175-310)
- **フロントエンド**: `public/static/app.jsx` (Line 10-13, 193-229, 700-750)
- **型定義**: `src/types.ts`
- **環境変数**: `.dev.vars` (gitignoreに含まれる)

## まとめ
AI相談窓口により、職員は入居者様の過去のケース記録を瞬時に参照し、AIのアドバイスを受けながら、より質の高いケアを提供できるようになります。
