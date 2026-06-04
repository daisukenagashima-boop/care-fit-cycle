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
// AI相談窓口 API (Gemini)
// ============================================

app.post('/api/ai-chat', async (c) => {
  try {
    const body = await c.req.json()
    const { question, resident_id } = body

    if (!question) {
      return c.json({ error: 'Question is required' }, 400)
    }

    const apiKey = c.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return c.json({
        error: 'Gemini API Key is not configured',
        message: 'APIキーが設定されていません。Cloudflare PagesのEnvironment Variablesに GEMINI_API_KEY を設定してください。'
      }, 500)
    }

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
`
      }

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

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      return c.json({ error: 'Gemini API request failed', details: errorText }, 500)
    }

    const geminiData: any = await geminiResponse.json()

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      return c.json({ error: 'No response from Gemini', data: geminiData }, 500)
    }

    const answer = geminiData.candidates[0].content.parts[0].text

    return c.json({ success: true, question, answer, model: 'gemini-2.0-flash-exp' })

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

app.get('/api/residents/:id/care-plans/export', async (c) => {
  const id = c.req.param('id')
  const format = c.req.query('format') || 'html'

  try {
    const resident = await c.env.DB.prepare(
      'SELECT * FROM residents WHERE id = ?'
    ).bind(id).first()

    if (!resident) {
      return c.json({ error: 'Resident not found' }, 404)
    }

    const { results: carePlans } = await c.env.DB.prepare(
      'SELECT * FROM care_plans WHERE resident_id = ? ORDER BY display_order ASC'
    ).bind(id).all()

    const today = new Date().toISOString().split('T')[0]

    if (format === 'html') {
      const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>24時間シート - ${resident.name}様</title>
    <style>
        @media print { @page { margin: 15mm; } body { margin: 0; } .no-print { display: none; } }
        body { font-family: 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 210mm; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 3px solid #01C1AF; padding-bottom: 15px; margin-bottom: 20px; }
        h1 { color: #01C1AF; font-size: 24px; margin: 0 0 10px; }
        .info { display: flex; gap: 20px; font-size: 14px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
        th { background: #f8f9fa; font-weight: bold; }
        .time-cell { width: 80px; text-align: center; font-weight: bold; color: #01C1AF; }
        .status-fit { background: #e6fffa; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .badge-fit { background: #01C1AF; color: white; }
        .badge-plan { background: #e2e8f0; color: #64748b; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }
        .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #01C1AF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ 印刷する</button>
    <div class="header">
        <h1>24時間シート（生活リズムシート）</h1>
        <div class="info">
            <span><strong>入居者:</strong> ${resident.name} 様</span>
            <span><strong>介護度:</strong> ${resident.care_level}</span>
            <span><strong>作成日:</strong> ${today}</span>
            <span><strong>Day:</strong> ${resident.maturation_day}/14</span>
        </div>
    </div>
    <table>
        <thead><tr><th class="time-cell">時刻</th><th>活動</th><th>詳細・留意点</th><th style="width:80px;text-align:center">状態</th></tr></thead>
        <tbody>
            ${carePlans.map((plan: any) => `
            <tr class="${plan.status === 'fit' ? 'status-fit' : ''}">
                <td class="time-cell">${plan.time}</td>
                <td><strong>${plan.activity}</strong></td>
                <td style="color:#666;font-size:13px">${plan.details || '-'}</td>
                <td style="text-align:center"><span class="badge ${plan.status === 'fit' ? 'badge-fit' : 'badge-plan'}">${plan.status === 'fit' ? 'フィット済み' : '計画'}</span></td>
            </tr>`).join('')}
        </tbody>
    </table>
    <div class="footer"><p>ケア・フィット・サイクル - 24時間シート</p></div>
</body></html>`
      return c.html(html)
    }

    if (format === 'csv') {
      const csvHeader = '時刻,活動,詳細・留意点,状態\n'
      const csvRows = carePlans.map((plan: any) => {
        const details = (plan.details || '').replace(/"/g, '""').replace(/\n/g, ' ')
        return `"${plan.time}","${plan.activity}","${details}","${plan.status === 'fit' ? 'フィット済み' : '計画'}"`
      }).join('\n')
      return new Response(csvHeader + csvRows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${resident.name}_24時間シート_${today}.csv"`
        }
      })
    }

    if (format === 'json') {
      const data = {
        resident: {
          name: resident.name, care_level: resident.care_level,
          maturation_day: resident.maturation_day, phase: resident.phase,
          favorite_things: resident.favorite_things, today_wish: resident.today_wish
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
// Frontend
// ============================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ケア・フィット・サイクル</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; }</style>
    </head>
    <body class="bg-gray-50">
        <div id="root"></div>
        <script src="/static/bundle.js" type="module"></script>
    </body>
    </html>
  `)
})

export default app
