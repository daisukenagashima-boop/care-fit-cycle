import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定
app.use('/api/*', cors())

// ============================================
// API Routes
// ============================================

// 入居者情報取得
app.get('/api/residents/:id', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    'SELECT * FROM residents WHERE id = ?'
  ).bind(id).first()
  
  if (!result) {
    return c.json({ error: 'Resident not found' }, 404)
  }
  
  return c.json(result)
})

// 入居者情報更新
app.put('/api/residents/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE residents 
    SET name = ?, care_level = ?, favorite_things = ?, today_wish = ?, 
        maturation_day = ?, phase = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.name,
    body.care_level,
    body.favorite_things,
    body.today_wish,
    body.maturation_day,
    body.phase,
    id
  ).run()
  
  return c.json({ success: true })
})

// 24時間シート取得
app.get('/api/residents/:id/care-plans', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM care_plans WHERE resident_id = ? ORDER BY display_order ASC'
  ).bind(id).all()
  
  return c.json(results)
})

// 24時間シート項目更新
app.put('/api/care-plans/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE care_plans 
    SET time = ?, activity = ?, details = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.time,
    body.activity,
    body.details,
    body.status,
    id
  ).run()
  
  return c.json({ success: true })
})

// ケース記録取得
app.get('/api/residents/:id/case-records', async (c) => {
  const id = c.req.param('id')
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  
  const { results } = await c.env.DB.prepare(`
    SELECT cr.*, s.name as staff_name 
    FROM case_records cr
    JOIN staff s ON cr.staff_id = s.id
    WHERE cr.resident_id = ? AND cr.recorded_date = ?
    ORDER BY cr.record_time ASC
  `).bind(id, date).all()
  
  return c.json(results)
})

// ケース記録追加
app.post('/api/case-records', async (c) => {
  const body = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO case_records (resident_id, staff_id, record_time, content, tag, record_type, has_alert, recorded_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.resident_id,
    body.staff_id,
    body.record_time,
    body.content,
    body.tag,
    body.record_type || 'manual',
    body.has_alert || 0,
    body.recorded_date || new Date().toISOString().split('T')[0]
  ).run()
  
  return c.json({ success: true, id: result.meta.last_row_id })
})

// 付せん取得
app.get('/api/residents/:id/sticky-notes', async (c) => {
  const id = c.req.param('id')
  const status = c.req.query('status') || 'pending'
  
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM sticky_notes WHERE resident_id = ? AND status = ? ORDER BY created_at DESC'
  ).bind(id, status).all()
  
  return c.json(results)
})

// 付せん追加
app.post('/api/sticky-notes', async (c) => {
  const body = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO sticky_notes (resident_id, care_plan_id, note_type, fit_category, time, title, content, source, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.resident_id,
    body.care_plan_id || null,
    body.note_type || 'staff',
    body.fit_category || null,
    body.time || null,
    body.title,
    body.content,
    body.source,
    body.status || 'pending'
  ).run()
  
  return c.json({ success: true, id: result.meta.last_row_id })
})

// 付せんステータス更新
app.put('/api/sticky-notes/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  await c.env.DB.prepare(`
    UPDATE sticky_notes 
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(body.status, id).run()
  
  return c.json({ success: true })
})

// スタッフ一覧取得
app.get('/api/staff', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM staff ORDER BY name ASC'
  ).all()
  
  return c.json(results)
})

// ============================================
// AI相談窓口 API
// ============================================

// AI相談窓口 - Gemini APIを使用
app.post('/api/ai-chat', async (c) => {
  try {
    const body = await c.req.json()
    const { question, resident_id } = body

    if (!question) {
      return c.json({ error: 'Question is required' }, 400)
    }

    // Gemini API Keyのチェック
    const apiKey = c.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return c.json({ 
        error: 'Gemini API Key is not configured',
        message: 'APIキーが設定されていません。.dev.varsファイルにGEMINI_API_KEYを設定してください。'
      }, 500)
    }

    // 入居者情報とケース記録を取得してコンテキストに含める
    let context = ''
    if (resident_id) {
      const resident = await c.env.DB.prepare(
        'SELECT * FROM residents WHERE id = ?'
      ).bind(resident_id).first()

      if (resident) {
        context = `
【入居者情報】
- 氏名: ${resident.name}
- 介護度: ${resident.care_level}
- 好きなもの: ${resident.favorite_things}
- 今日の願い: ${resident.today_wish}

【現在の状況】
- Day ${resident.maturation_day}（フェーズ: ${resident.phase}）

入居者様のケア記録を参考に、質問に丁寧に答えてください。
`
      }

      // 最近のケース記録を取得（直近3日分）
      const today = new Date().toISOString().split('T')[0]
      const { results: records } = await c.env.DB.prepare(`
        SELECT cr.*, s.name as staff_name
        FROM case_records cr
        JOIN staff s ON cr.staff_id = s.id
        WHERE cr.resident_id = ? 
        ORDER BY cr.recorded_date DESC, cr.record_time DESC
        LIMIT 20
      `).bind(resident_id).all()

      if (records && records.length > 0) {
        context += '\n【最近のケース記録】\n'
        records.forEach((record: any) => {
          context += `- ${record.recorded_date} ${record.record_time}: ${record.content}\n`
        })
      }
    }

    // Gemini API呼び出し
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `あなたは介護施設の経験豊富なケアマネージャーです。職員からの質問に対して、入居者様の情報とケース記録をもとに、具体的で実践的なアドバイスを提供してください。

${context}

【職員からの質問】
${question}

【回答のポイント】
- 入居者様の好みや習慣を考慮する
- 最近のケース記録から傾向を読み取る
- 具体的で実践しやすいアドバイスを提供する
- 優しく、丁寧な言葉遣いで回答する
`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API Error:', errorText)
      return c.json({ 
        error: 'Gemini API request failed',
        details: errorText
      }, 500)
    }

    const geminiData = await geminiResponse.json()
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      return c.json({ 
        error: 'No response from Gemini',
        data: geminiData
      }, 500)
    }

    const answer = geminiData.candidates[0].content.parts[0].text

    return c.json({
      success: true,
      question,
      answer,
      model: 'gemini-2.0-flash-exp'
    })

  } catch (error) {
    console.error('AI Chat Error:', error)
    return c.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// ============================================
// エクスポート機能
// ============================================

// 24時間シートのエクスポート（印刷用HTML、CSV、JSON対応）
app.get('/api/residents/:id/care-plans/export', async (c) => {
  const id = c.req.param('id')
  const format = c.req.query('format') || 'html' // html, csv, json

  try {
    // 入居者情報取得
    const resident = await c.env.DB.prepare(
      'SELECT * FROM residents WHERE id = ?'
    ).bind(id).first()

    if (!resident) {
      return c.json({ error: 'Resident not found' }, 404)
    }

    // 24時間シート取得
    const { results: carePlans } = await c.env.DB.prepare(
      'SELECT * FROM care_plans WHERE resident_id = ? ORDER BY display_order ASC'
    ).bind(id).all()

    const today = new Date().toISOString().split('T')[0]

    // HTML形式（印刷用）
    if (format === 'html') {
      const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>24時間シート - ${resident.name}様</title>
    <style>
        @media print {
            @page { margin: 15mm; }
            body { margin: 0; }
            .no-print { display: none; }
        }
        body {
            font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 3px solid #01C1AF;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        h1 {
            color: #01C1AF;
            font-size: 24px;
            margin: 0 0 10px 0;
        }
        .info {
            display: flex;
            gap: 20px;
            font-size: 14px;
            color: #666;
        }
        .info-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px 8px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #333;
        }
        .time-cell {
            width: 80px;
            text-align: center;
            font-weight: bold;
            color: #01C1AF;
        }
        .activity-cell {
            width: 150px;
            font-weight: bold;
        }
        .details-cell {
            color: #666;
            font-size: 13px;
        }
        .status-fit {
            background-color: #e6fffa;
        }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
        }
        .badge-fit {
            background-color: #01C1AF;
            color: white;
        }
        .badge-plan {
            background-color: #e2e8f0;
            color: #64748b;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #999;
            text-align: center;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background-color: #01C1AF;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .print-button:hover {
            background-color: #00a89a;
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">
        🖨️ 印刷する
    </button>

    <div class="header">
        <h1>24時間シート（生活リズムシート）</h1>
        <div class="info">
            <div class="info-item">
                <strong>入居者:</strong> ${resident.name} 様
            </div>
            <div class="info-item">
                <strong>介護度:</strong> ${resident.care_level}
            </div>
            <div class="info-item">
                <strong>作成日:</strong> ${today}
            </div>
            <div class="info-item">
                <strong>Day:</strong> ${resident.maturation_day}/14
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th class="time-cell">時刻</th>
                <th class="activity-cell">活動</th>
                <th class="details-cell">詳細・留意点</th>
                <th style="width: 80px; text-align: center;">状態</th>
            </tr>
        </thead>
        <tbody>
            ${carePlans.map((plan: any) => `
                <tr class="${plan.status === 'fit' ? 'status-fit' : ''}">
                    <td class="time-cell">${plan.time}</td>
                    <td class="activity-cell">${plan.activity}</td>
                    <td class="details-cell">${plan.details || '-'}</td>
                    <td style="text-align: center;">
                        <span class="status-badge ${plan.status === 'fit' ? 'badge-fit' : 'badge-plan'}">
                            ${plan.status === 'fit' ? 'フィット済み' : '計画'}
                        </span>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>ケア・フィット・サイクル - 24時間シート</p>
        <p>印刷日時: ${new Date().toLocaleString('ja-JP')}</p>
    </div>
</body>
</html>
      `
      return c.html(html)
    }

    // CSV形式
    if (format === 'csv') {
      const csvHeader = '時刻,活動,詳細・留意点,状態\n'
      const csvRows = carePlans.map((plan: any) => {
        const details = (plan.details || '').replace(/"/g, '""').replace(/\n/g, ' ')
        const status = plan.status === 'fit' ? 'フィット済み' : '計画'
        return `"${plan.time}","${plan.activity}","${details}","${status}"`
      }).join('\n')
      
      const csv = csvHeader + csvRows
      
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${resident.name}_24時間シート_${today}.csv"`
        }
      })
    }

    // JSON形式
    if (format === 'json') {
      const data = {
        resident: {
          name: resident.name,
          care_level: resident.care_level,
          maturation_day: resident.maturation_day,
          phase: resident.phase,
          favorite_things: resident.favorite_things,
          today_wish: resident.today_wish
        },
        care_plans: carePlans,
        exported_at: new Date().toISOString(),
        export_date: today
      }

      return new Response(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${resident.name}_24時間シート_${today}.json"`
        }
      })
    }

    return c.json({ error: 'Invalid format. Use html, csv, or json.' }, 400)

  } catch (error) {
    console.error('Export error:', error)
    return c.json({ error: 'Export failed' }, 500)
  }
})

// ============================================
// Frontend Route
// ============================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ケア・フィット・サイクル (Care Fit Cycle)</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; }
        </style>
    </head>
    <body class="bg-gray-50">
        <div id="root"></div>
        
        <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.jsx" type="text/babel"></script>
    </body>
    </html>
  `)
})

export default app
