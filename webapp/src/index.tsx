import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// 入居者情報取得
app.get('/api/residents/:id', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare('SELECT * FROM residents WHERE id = ?').bind(id).first()
  if (!result) return c.json({ error: 'Resident not found' }, 404)
  return c.json(result)
})

// 入居者情報更新
app.put('/api/residents/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  await c.env.DB.prepare(`
    UPDATE residents
    SET name=?, care_level=?, favorite_things=?, today_wish=?,
        maturation_day=?, phase=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?`)
    .bind(body.name, body.care_level, body.favorite_things, body.today_wish, body.maturation_day, body.phase, id).run()
  return c.json({ success: true })
})

// 24時間シート一覧取得
app.get('/api/residents/:id/care-plans', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM care_plans WHERE resident_id=? ORDER BY display_order ASC'
  ).bind(id).all()
  return c.json(results)
})

// 24時間シート項目作成
app.post('/api/care-plans', async (c) => {
  const body = await c.req.json()
  const maxRow = await c.env.DB.prepare(
    'SELECT MAX(display_order) as m FROM care_plans WHERE resident_id=?'
  ).bind(body.resident_id).first() as any
  const result = await c.env.DB.prepare(`
    INSERT INTO care_plans
      (resident_id, time, activity, details, wishes, can_do, support_needed, medical_notes, remarks, status, display_order)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(
      body.resident_id, body.time ?? '00:00', body.activity ?? '',
      body.details ?? '', body.wishes ?? '', body.can_do ?? '',
      body.support_needed ?? '', body.medical_notes ?? '', body.remarks ?? '',
      'plan', (maxRow?.m ?? 0) + 1
    ).run()
  return c.json({ success: true, id: result.meta.last_row_id })
})

// 24時間シート項目更新
app.put('/api/care-plans/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  await c.env.DB.prepare(`
    UPDATE care_plans
    SET time=?, activity=?, details=?, wishes=?, can_do=?,
        support_needed=?, medical_notes=?, remarks=?, status=?,
        updated_at=CURRENT_TIMESTAMP
    WHERE id=?`)
    .bind(
      body.time, body.activity, body.details ?? '',
      body.wishes ?? '', body.can_do ?? '', body.support_needed ?? '',
      body.medical_notes ?? '', body.remarks ?? '', body.status, id
    ).run()
  return c.json({ success: true })
})

// 24時間シート項目削除
app.delete('/api/care-plans/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM care_plans WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

// エクスポート
app.get('/api/residents/:id/care-plans/export', async (c) => {
  const id = c.req.param('id')
  const format = c.req.query('format') || 'html'
  const resident = await c.env.DB.prepare('SELECT * FROM residents WHERE id=?').bind(id).first()
  if (!resident) return c.json({ error: 'Resident not found' }, 404)
  const { results: carePlans } = await c.env.DB.prepare(
    'SELECT * FROM care_plans WHERE resident_id=? ORDER BY display_order ASC'
  ).bind(id).all()
  const today = new Date().toISOString().split('T')[0]
  if (format === 'html') {
    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>24時間シート - ${resident.name}様</title>
    <style>body{font-family:'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;padding:20px;max-width:210mm;margin:0 auto}
    h1{color:#01C1AF}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
    th{background:#f8f9fa}@media print{.no-print{display:none}}</style></head><body>
    <button class="no-print" onclick="window.print()" style="padding:8px 16px;background:#01C1AF;color:white;border:none;border-radius:6px;cursor:pointer;margin-bottom:16px">印刷</button>
    <h1>24時間シート - ${resident.name}様</h1>
    <p>介護度: ${resident.care_level} / 作成日: ${today}</p>
    <table><thead><tr><th>時刻</th><th>生活リズム</th><th>意向・好み</th><th>自分のできること</th><th>サポートの必要なこと</th><th>状態</th></tr></thead><tbody>
    ${carePlans.map((p: any) => `<tr><td>${p.time}</td><td>${p.activity}</td><td>${p.wishes||p.details||'-'}</td><td>${p.can_do||'-'}</td><td>${p.support_needed||p.details||'-'}</td><td>${p.status==='fit'?'✅フィット':'計画'}</td></tr>`).join('')}
    </tbody></table></body></html>`
    return c.html(html)
  }
  if (format === 'csv') {
    const rows = carePlans.map((p: any) => `"${p.time}","${p.activity}","${(p.wishes||p.details||'').replace(/"/g,'""')}","${(p.can_do||'').replace(/"/g,'""')}","${(p.support_needed||p.details||'').replace(/"/g,'""')}","${p.status==='fit'?'フィット':'計画'}"`).join('\n')
    return new Response(`時刻,生活リズム,意向・好み,自分のできること,サポートの必要なこと,状態\n${rows}`, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${resident.name}_24h_${today}.csv"` }
    })
  }
  return c.json({ error: 'Invalid format' }, 400)
})

// ケース記録取得
app.get('/api/residents/:id/case-records', async (c) => {
  const id = c.req.param('id')
  const date = c.req.query('date') || new Date().toISOString().split('T')[0]
  const { results } = await c.env.DB.prepare(`
    SELECT cr.*, s.name as staff_name FROM case_records cr
    JOIN staff s ON cr.staff_id=s.id
    WHERE cr.resident_id=? AND cr.recorded_date=?
    ORDER BY cr.record_time ASC`).bind(id, date).all()
  return c.json(results)
})

// ケース記録追加
app.post('/api/case-records', async (c) => {
  const body = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO case_records (resident_id, staff_id, record_time, content, tag, record_type, has_alert, recorded_date)
    VALUES (?,?,?,?,?,?,?,?)`)
    .bind(body.resident_id, body.staff_id, body.record_time, body.content,
      body.tag, body.record_type || 'manual', body.has_alert || 0,
      body.recorded_date || new Date().toISOString().split('T')[0]).run()
  return c.json({ success: true, id: result.meta.last_row_id })
})

// 付せん取得
app.get('/api/residents/:id/sticky-notes', async (c) => {
  const id = c.req.param('id')
  const status = c.req.query('status') || 'pending'
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM sticky_notes WHERE resident_id=? AND status=? ORDER BY created_at DESC'
  ).bind(id, status).all()
  return c.json(results)
})

// 付せん追加
app.post('/api/sticky-notes', async (c) => {
  const body = await c.req.json()
  const result = await c.env.DB.prepare(`
    INSERT INTO sticky_notes (resident_id, care_plan_id, note_type, fit_category, time, title, content, source, status)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind(body.resident_id, body.care_plan_id || null, body.note_type || 'staff',
      body.fit_category || null, body.time || null, body.title, body.content,
      body.source, body.status || 'pending').run()
  return c.json({ success: true, id: result.meta.last_row_id })
})

// 付せんステータス更新
app.put('/api/sticky-notes/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  await c.env.DB.prepare(
    'UPDATE sticky_notes SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).bind(body.status, id).run()
  return c.json({ success: true })
})

// スタッフ一覧
app.get('/api/staff', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM staff ORDER BY name ASC').all()
  return c.json(results)
})

// AI相談窓口
app.post('/api/ai-chat', async (c) => {
  try {
    const body = await c.req.json()
    const { question, resident_id } = body
    if (!question) return c.json({ error: 'Question is required' }, 400)
    const apiKey = c.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return c.json({ error: 'Gemini API Key is not configured', message: 'GEMINI_API_KEYをCloudflare Pagesの環境変数に設定してください。' }, 500)
    }
    let context = ''
    if (resident_id) {
      const resident = await c.env.DB.prepare('SELECT * FROM residents WHERE id=?').bind(resident_id).first()
      if (resident) context = `入居者: ${resident.name} (要介護${resident.care_level}) Day${resident.maturation_day}\n好き: ${resident.favorite_things}\n今日の願い: ${resident.today_wish}\n`
      const { results: records } = await c.env.DB.prepare(
        'SELECT cr.*, s.name as staff_name FROM case_records cr JOIN staff s ON cr.staff_id=s.id WHERE cr.resident_id=? ORDER BY cr.recorded_date DESC, cr.record_time DESC LIMIT 20'
      ).bind(resident_id).all()
      if (records.length > 0) {
        context += '最近のケース記録:\n'
        records.forEach((r: any) => { context += `- ${r.recorded_date} ${r.record_time}: ${r.content}\n` })
      }
    }
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `あなたは介護施設の経験豊富なケアマネージャーです。\n\n${context}\n\n質問: ${question}\n\n具体的で実践しやすいアドバイスを丁寧に回答してください。` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
      })
    })
    if (!geminiRes.ok) return c.json({ error: 'Gemini API error' }, 500)
    const data: any = await geminiRes.json()
    if (!data.candidates?.length) return c.json({ error: 'No response' }, 500)
    return c.json({ success: true, question, answer: data.candidates[0].content.parts[0].text, model: 'gemini-2.0-flash-exp' })
  } catch (error) {
    return c.json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

// デモリセット
app.post('/api/demo/reset', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const d = new Date(); d.setDate(d.getDate() - 1)
    const yesterday = d.toISOString().split('T')[0]
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM sticky_notes'),
      c.env.DB.prepare('DELETE FROM case_records'),
      c.env.DB.prepare('DELETE FROM care_plans'),
      c.env.DB.prepare('DELETE FROM staff'),
      c.env.DB.prepare('DELETE FROM residents'),
    ])
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO residents (id,name,care_level,favorite_things,today_wish,maturation_day,phase) VALUES (1,'岡田 一輝','要介護4','朝のコーヒーと庭の花を眺める時間が好き','天気が良いので、午後は中庭へ出てみたい',10,'fitting')`),
      c.env.DB.prepare(`INSERT INTO staff (id,name,years_experience,position) VALUES (1,'田中 健二',3,'スタッフ')`),
      c.env.DB.prepare(`INSERT INTO staff (id,name,years_experience,position) VALUES (2,'鈴木 美咏',1,'新人')`),
      c.env.DB.prepare(`INSERT INTO staff (id,name,years_experience,position) VALUES (3,'佐藤 太郎',8,'リーダー')`),
    ])
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,details,status,display_order) VALUES (1,1,'07:00','起床・洗面','右側から声をかけてほしい','歯ブラシを持てる・自分で磨ける','カーテンを開け日光を入れる。右側から声かけ。','カーテンを開け日光を入れる。右側から声かけ。','fit',1)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,details,status,display_order) VALUES (2,1,'08:00','朝食','熱いお茶が好き。コーヒーを希望することが多い','自分でスプーンを使い食べることができる','扇に深く座るよう促す。刻み食提供。','扇に深く座るよう促す。','plan',2)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,details,status,display_order) VALUES (3,1,'10:00','排泤介助','尿意のある時にトイレに行きたい','伝い歩きで移動できる','トイレ誤導。立位保持を介助。','トイレ誤導。立位保持を介助。','fit',3)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,details,status,display_order) VALUES (4,1,'12:00','昼食','主食は一口大。副食は刷み。','自分でスプーンを使い食べる','主食は一口大。副食は刷み。よく呡むよう声かけ。','主食は一口大。副食は刷み。','plan',4)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,details,status,display_order) VALUES (5,1,'14:00','午睡・休桯','静かな環境で休んでいたい','自分でベッドに横になれる','静かな環境で休んでいただく。','静かな環境で休んでいただく。','plan',5)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,details,status,display_order) VALUES (6,1,'15:00','おやつ','季節の果物やお茶が好き','自分で選んで食べる','希望のおやつを聞く。','希望のおやつを聞く。','plan',6)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,details,status,display_order) VALUES (7,1,'18:00','夕食','温かい汁物が好き','自分でスプーンを使い食べる','主食は一口大。副食は刷み。温かい汁物を添える。','主食は一口大。副食は刷み。温かい汁物を添える。','plan',7)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,details,status,display_order) VALUES (8,1,'20:00','入浴・清拭','お風呂は気持ちいい。週3回入浴したい','手の届くところは洗える','週3回入浴。それ以外は清拭で対応。','週3回入浴。それ以外は清拭で対応。','fit',8)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,details,status,display_order) VALUES (9,1,'21:00','就寡準備','照明を落とし静かな音楽をかけてほしい','パジャマに自分で着替えられる','照明を落とし静かな音楽をかける。','照明を落とし静かな音楽をかける。','plan',9)`),
    ])
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'06:30','巡視時、すでに目を覚ましておられる様子。「おはよう」と声をかけると笑顔で応えられました。','起床','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'08:15','「コーヒーが飲みたい」とのリクエスト。コーヒーを提供。香りを楽しまれている様子。','食事','manual',1,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,2,'10:00','トイレ誤導。「ありがとう」と言いながらンくり立ち上がられる。','排泤','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,3,'14:00','「今日は眠くない」と午睡を断られる。リビングで過ごされることに。','活動','manual',1,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,3,'14:30','中庭へ外出。「気持ちいい風だね」と喜ばれる。花壇の花を眺めて笑顔。','活動','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'18:45','夕食9割摂取。「ごちそうさま」と満足そう。','食事','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'07:00','起床。「よく眠れた」との言葉。今日は朝から笑顔。','起床','manual',0,?)`).bind(today),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,2,'08:10','朝食開始。炼り魚。「魚が美味しい」と喜ばれる。','食事','manual',0,?)`).bind(today),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,2,'08:30','コーヒーを提供。「このコーヒーの香りが好き」と満足そう。','食事','manual',0,?)`).bind(today),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,3,'10:15','トイレ誤導。「ありがとう」と感謝の言葉。排泤スムーズ。','排泤','manual',0,?)`).bind(today),
    ])
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO sticky_notes (id,resident_id,care_plan_id,note_type,fit_category,time,title,content,source,status) VALUES (1,1,2,'ai','time','08:00','時間のフィット提案','最近は8:15まで熟睡されています。起床時刻を少し遅らせるのはいかがでしょうか？','AI分析','pending')`),
      c.env.DB.prepare(`INSERT INTO sticky_notes (id,resident_id,care_plan_id,note_type,fit_category,time,title,content,source,status) VALUES (2,1,5,'staff','preference','14:00','リーダーの気づき','最近、寀るよりもリビングで誰かとお話ししたいご様子です','スタッフ：佐藤','pending')`),
      c.env.DB.prepare(`INSERT INTO sticky_notes (id,resident_id,care_plan_id,note_type,fit_category,time,title,content,source,status) VALUES (3,1,2,'ai','preference','08:00','好みのフィット提案','お茶よりもコーヒーの香りで笑顔が増えています。朝食の飲み物をコーヒーに変更しますか？','AI分析','pending')`),
    ])
    return c.json({ success: true, message: 'デモデータをリセットしました' })
  } catch (error) {
    console.error('Demo reset error:', error)
    return c.json({ error: 'Reset failed', message: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

// Frontend
const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ケア・フィット・サイクル</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>body{font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif;}</style>
</head>
<body class="bg-gray-50">
    <div id="root"></div>
    <script src="/static/bundle.js" type="module"><\/script>
</body>
</html>`

app.get('/', (c) => c.html(html))
app.get('/sheet', (c) => c.html(html))
app.get('/sheet/:id', (c) => c.html(html))

export default app
