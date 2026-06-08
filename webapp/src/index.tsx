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
        care_goal_id=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?`)
    .bind(
      body.time, body.activity, body.details ?? '',
      body.wishes ?? '', body.can_do ?? '', body.support_needed ?? '',
      body.medical_notes ?? '', body.remarks ?? '', body.status,
      body.care_goal_id ?? null, id
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

// ============================================
// サイクル管理
// ============================================

// アクティブサイクル取得
app.get('/api/residents/:id/cycle', async (c) => {
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    "SELECT * FROM care_cycles WHERE resident_id=? AND status='active' ORDER BY created_at DESC LIMIT 1"
  ).bind(id).first()
  return c.json(result || null)
})

// サイクル一覧取得（履歴）
app.get('/api/residents/:id/cycles', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM care_cycles WHERE resident_id=? ORDER BY created_at DESC'
  ).bind(id).all()
  return c.json(results)
})

// 新サイクル開始
app.post('/api/residents/:id/cycle/start', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  // 既存のアクティブサイクルを完了にする
  const today = new Date().toISOString().split('T')[0]
  await c.env.DB.prepare(
    "UPDATE care_cycles SET status='completed', end_date=? WHERE resident_id=? AND status='active'"
  ).bind(today, id).run()
  // 新サイクル作成
  const nextReview = new Date()
  nextReview.setMonth(nextReview.getMonth() + 6)
  const result = await c.env.DB.prepare(`
    INSERT INTO care_cycles (resident_id, start_date, status, trigger_reason, next_review_date, notes)
    VALUES (?, ?, 'active', ?, ?, ?)`)
    .bind(id, today, body.trigger_reason || '定期改定', nextReview.toISOString().split('T')[0], body.notes || '')
    .run()
  // residents.maturation_day をリセット
  await c.env.DB.prepare(
    "UPDATE residents SET maturation_day=1, phase='recording', updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).bind(id).run()
  return c.json({ success: true, id: result.meta.last_row_id })
})

// サイクルにケアプラン生成日を記録
app.post('/api/residents/:id/cycle/plan-generated', async (c) => {
  const id = c.req.param('id')
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    "UPDATE care_cycles SET plan_generated_at=? WHERE resident_id=? AND status='active'"
  ).bind(now, id).run()
  return c.json({ success: true })
})

// ============================================
// モニタリング記録
// ============================================

// モニタリング記録一覧
app.get('/api/residents/:id/monitoring', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare(`
    SELECT mr.*, cg.needs as goal_needs
    FROM monitoring_records mr
    LEFT JOIN care_goals cg ON mr.goal_id = cg.id
    WHERE mr.resident_id=?
    ORDER BY mr.recorded_at DESC
  `).bind(id).all()
  return c.json(results)
})

// モニタリング記録追加
app.post('/api/residents/:id/monitoring', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const cycle = await c.env.DB.prepare(
    "SELECT id FROM care_cycles WHERE resident_id=? AND status='active' LIMIT 1"
  ).bind(id).first() as any
  const result = await c.env.DB.prepare(`
    INSERT INTO monitoring_records (resident_id, cycle_id, goal_id, recorded_at, achievement, comment, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, cycle?.id || null, body.goal_id || null,
      new Date().toISOString(), body.achievement, body.comment || '', body.recorded_by || '')
    .run()
  return c.json({ success: true, id: result.meta.last_row_id })
})

// スタッフ一覧
app.get('/api/staff', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM staff ORDER BY name ASC').all()
  return c.json(results)
})

// ============================================
// 施設サービス計画書 第1表
// ============================================

app.get('/api/care-plan/table1/:residentId', async (c) => {
  const id = c.req.param('residentId')
  const result = await c.env.DB.prepare(
    'SELECT * FROM care_plan_table1 WHERE resident_id = ?'
  ).bind(id).first()
  if (!result) return c.json(null, 404)
  return c.json(result)
})

app.post('/api/care-plan/table1/:residentId', async (c) => {
  const id = c.req.param('residentId')
  const body = await c.req.json()
  const existing = await c.env.DB.prepare(
    'SELECT id FROM care_plan_table1 WHERE resident_id = ?'
  ).bind(id).first()
  if (existing) {
    await c.env.DB.prepare(`
      UPDATE care_plan_table1
      SET cm_name=?, facility_name=?, created_date=?, revised_date=?,
          certification_status=?, valid_period_from=?, valid_period_to=?,
          entry_background=?, resident_wishes=?, family_wishes=?,
          comprehensive_policy=?, updated_at=CURRENT_TIMESTAMP
      WHERE resident_id=?`)
      .bind(body.cm_name, body.facility_name, body.created_date, body.revised_date,
        body.certification_status, body.valid_period_from, body.valid_period_to,
        body.entry_background, body.resident_wishes, body.family_wishes,
        body.comprehensive_policy, id).run()
  } else {
    await c.env.DB.prepare(`
      INSERT INTO care_plan_table1
        (resident_id, cm_name, facility_name, created_date, revised_date,
         certification_status, valid_period_from, valid_period_to,
         entry_background, resident_wishes, family_wishes, comprehensive_policy)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, body.cm_name, body.facility_name, body.created_date, body.revised_date,
        body.certification_status, body.valid_period_from, body.valid_period_to,
        body.entry_background, body.resident_wishes, body.family_wishes,
        body.comprehensive_policy).run()
  }
  return c.json({ success: true })
})

// ============================================
// Day14 カンファレンス: 24Hシート→ケアプラン自動生成
// ============================================

app.post('/api/conference/generate/:residentId', async (c) => {
  const id = c.req.param('residentId')
  const { results: plans } = await c.env.DB.prepare(
    'SELECT * FROM care_plans WHERE resident_id=? ORDER BY display_order ASC'
  ).bind(id).all()
  const { results: goals } = await c.env.DB.prepare(
    'SELECT * FROM care_goals WHERE resident_id=? ORDER BY sort_order ASC'
  ).bind(id).all()

  // 課題ごとに24Hシートの内容を集約してケアプランに反映
  for (const goal of goals as any[]) {
    const linked = (plans as any[]).filter(p => p.care_goal_id === goal.id)
    if (!linked.length) continue
    const wishes = linked.map((p: any) => p.wishes).filter(Boolean).join('\n')
    const canDo = linked.map((p: any) => p.can_do).filter(Boolean).join('。')
    // 空欄のみ補完（手入力を上書きしない）
    await c.env.DB.prepare(`
      UPDATE care_goals SET
        needs = CASE WHEN needs='' AND ? != '' THEN ? ELSE needs END,
        short_term_goal = CASE WHEN short_term_goal='' AND ? != '' THEN ? ELSE short_term_goal END,
        updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(wishes, wishes, canDo, canDo, goal.id).run()
    // 援助内容が未作成なら support_needed から生成
    const existing = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM care_goal_services WHERE care_goal_id=?'
    ).bind(goal.id).first() as any
    if ((existing?.cnt ?? 0) === 0) {
      for (const p of linked.filter((x: any) => x.support_needed)) {
        await c.env.DB.prepare(`
          INSERT INTO care_goal_services (care_goal_id, service_content, service_type, person, frequency, sort_order)
          VALUES (?,?,?,?,?,?)`)
          .bind(goal.id, `${p.time} ${p.activity}：${p.support_needed}`, '介護', '介護スタッフ', '毎日', p.display_order).run()
      }
    }
  }

  // 第3表（週間サービス計画）を24Hシートから自動生成
  await c.env.DB.prepare('DELETE FROM care_plan_weekly WHERE resident_id=?').bind(id).run()
  const DAYS = ['月', '火', '水', '木', '金', '土', '日']
  const BATH_DAYS = ['月', '水', '金']
  for (const plan of plans as any[]) {
    for (const day of DAYS) {
      const act: string = plan.activity ?? ''
      let content = act
      if (act.includes('入浴') || act.includes('清拭')) {
        content = BATH_DAYS.includes(day) ? '入浴' : '清拭'
      }
      await c.env.DB.prepare(`
        INSERT INTO care_plan_weekly (resident_id, time_slot, day_of_week, service_content, sort_order)
        VALUES (?,?,?,?,?)`)
        .bind(id, plan.time, day, content, plan.display_order).run()
    }
  }
  return c.json({ success: true })
})

// 第3表取得
app.get('/api/care-plan/table3/:residentId', async (c) => {
  const id = c.req.param('residentId')
  const { results } = await c.env.DB.prepare(
    'SELECT time_slot, day_of_week, service_content, sort_order FROM care_plan_weekly WHERE resident_id=? ORDER BY sort_order ASC, time_slot ASC'
  ).bind(id).all()
  return c.json(results)
})

// 計画書印刷用HTML出力（第1〜3表）
app.get('/api/care-plan/export/:residentId', async (c) => {
  const id = c.req.param('residentId')
  const resident = await c.env.DB.prepare('SELECT * FROM residents WHERE id=?').bind(id).first() as any
  const t1 = await c.env.DB.prepare('SELECT * FROM care_plan_table1 WHERE resident_id=?').bind(id).first() as any
  const { results: goals } = await c.env.DB.prepare('SELECT * FROM care_goals WHERE resident_id=? ORDER BY sort_order').bind(id).all()
  const { results: services } = await c.env.DB.prepare('SELECT * FROM care_goal_services WHERE care_goal_id IN (SELECT id FROM care_goals WHERE resident_id=?) ORDER BY care_goal_id, sort_order').bind(id).all()
  const { results: weekly } = await c.env.DB.prepare('SELECT time_slot, day_of_week, service_content, sort_order FROM care_plan_weekly WHERE resident_id=? ORDER BY sort_order, time_slot').bind(id).all()
  const goalsWithSv = (goals as any[]).map(g => ({ ...g, services: (services as any[]).filter(s => s.care_goal_id === g.id) }))
  const DAYS = ['月', '火', '水', '木', '金', '土', '日']
  const slots = [...new Set((weekly as any[]).map(w => w.time_slot))].sort()
  const css = `body{font-family:'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:11px;color:#333;padding:16px}
    @media print{@page{margin:12mm;size:A4}.no-print{display:none}.pb{page-break-after:always}}
    h1{font-size:14px;color:#01C1AF;border-bottom:2px solid #01C1AF;padding-bottom:6px;margin:0 0 12px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}
    .cell{border:1px solid #eee;padding:5px 8px;border-radius:4px;font-size:10px}
    .cell label{color:#999;font-size:9px;display:block}
    .sec{margin-bottom:10px}.sec label{font-size:9px;font-weight:bold;color:#666;display:block;margin-bottom:2px}
    .sec p{line-height:1.6;margin:0}
    table{width:100%;border-collapse:collapse;font-size:9px}th,td{border:1px solid #ccc;padding:5px 6px;text-align:left;vertical-align:top}
    th{background:#f5f5f5;font-weight:bold}.gn{background:#01C1AF;color:white;text-align:center;width:20px}
    .btn{position:fixed;bottom:16px;right:16px;padding:10px 20px;background:#01C1AF;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold}`
  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>施設サービス計画書</title><style>${css}</style></head><body>
  <button class="no-print btn" onclick="window.print()">🖨️ 印刷</button>
  <h1>第1表　施設サービス計画書（1）　${resident?.name}　様</h1>
  <div class="grid2">
    <div class="cell"><label>計画作成者</label>${t1?.cm_name||'—'}</div>
    <div class="cell"><label>施設名</label>${t1?.facility_name||'—'}</div>
    <div class="cell"><label>要介護度</label>${resident?.care_level}</div>
    <div class="cell"><label>認定有効期間</label>${t1?.valid_period_from||''}～${t1?.valid_period_to||''}</div>
    <div class="cell"><label>計画作成日</label>${t1?.created_date||'—'}</div>
    <div class="cell"><label>計画変更日</label>${t1?.revised_date||'—'}</div>
  </div>
  ${t1?.entry_background?`<div class="sec"><label>入所の至った経緒</label><p>${t1.entry_background}</p></div>`:''}
  ${t1?.resident_wishes?`<div class="sec"><label>本人の意向</label><p>${t1.resident_wishes}</p></div>`:''}
  ${t1?.family_wishes?`<div class="sec"><label>家族の意向</label><p>${t1.family_wishes}</p></div>`:''}
  ${t1?.comprehensive_policy?`<div class="sec"><label>総合的な支援の方针</label><p>${t1.comprehensive_policy}</p></div>`:''}
  <div class="pb"></div>
  <h1>第2表　施設サービス計画書（2）</h1>
  <table><thead><tr><th style="width:18px">No</th><th style="width:22%">課題（ニーズ）</th><th style="width:25%">目標</th><th>援助内容</th></tr></thead><tbody>
  ${goalsWithSv.map((g:any,i:number)=>`<tr><td class="gn">${i+1}</td><td>${g.needs||'—'}</td><td><b>長期:</b> ${g.long_term_goal||'—'}<br><small>${g.long_term_from||''}～${g.long_term_to||''}</small><br><br><b>短期:</b> ${g.short_term_goal||'—'}<br><small>${g.short_term_from||''}～${g.short_term_to||''}</small></td><td>${g.services.length?`<table><tr><th>サービス内容</th><th style="width:35px">種別</th><th style="width:45px">担当</th><th style="width:35px">頻度</th></tr>${g.services.map((s:any)=>`<tr><td>${s.service_content}</td><td>${s.service_type}</td><td>${s.person}</td><td>${s.frequency}</td></tr>`).join('')}</table>`:'（援助内容未入力）'}</td></tr>`).join('')}
  </tbody></table>
  <div class="pb"></div>
  <h1>第3表　週間サービス計画表</h1>
  ${slots.length?`<table><thead><tr><th style="width:50px">時間帯</th>${DAYS.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${slots.map(slot=>`<tr><td style="text-align:center;font-weight:bold">${slot}</td>${DAYS.map(day=>{const w=(weekly as any[]).find(x=>x.time_slot===slot&&x.day_of_week===day);return`<td>${w?.service_content||''}</td>`}).join('')}</tr>`).join('')}</tbody></table>`:
  '<p style="color:#999">第3表はカンファレンスで自動生成されます</p>'}
  </body></html>`
  return c.html(html)
})

// ============================================
// 施設サービス計画書 第2表: 課題・目標・援助内容
// ============================================

// 課題一覧取得（援助内容含む）
app.get('/api/care-plan/goals/:residentId', async (c) => {
  const id = c.req.param('residentId')
  const { results: goals } = await c.env.DB.prepare(
    'SELECT * FROM care_goals WHERE resident_id=? ORDER BY sort_order ASC'
  ).bind(id).all()
  const { results: services } = await c.env.DB.prepare(
    'SELECT * FROM care_goal_services WHERE care_goal_id IN (SELECT id FROM care_goals WHERE resident_id=?) ORDER BY sort_order ASC'
  ).bind(id).all()
  const goalsWithServices = goals.map((g: any) => ({
    ...g,
    services: services.filter((s: any) => s.care_goal_id === g.id),
  }))
  return c.json(goalsWithServices)
})

// 課題追加
app.post('/api/care-plan/goals/:residentId', async (c) => {
  const id = c.req.param('residentId')
  const body = await c.req.json()
  const maxRow = await c.env.DB.prepare(
    'SELECT MAX(sort_order) as m FROM care_goals WHERE resident_id=?'
  ).bind(id).first() as any
  const result = await c.env.DB.prepare(`
    INSERT INTO care_goals (resident_id, sort_order, needs, long_term_goal, long_term_from, long_term_to, short_term_goal, short_term_from, short_term_to)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind(id, (maxRow?.m ?? 0) + 1, body.needs ?? '', body.long_term_goal ?? '',
      body.long_term_from ?? '', body.long_term_to ?? '', body.short_term_goal ?? '',
      body.short_term_from ?? '', body.short_term_to ?? '').run()
  return c.json({ success: true, id: result.meta.last_row_id })
})

// 課題更新
app.put('/api/care-plan/goals/:goalId', async (c) => {
  const id = c.req.param('goalId')
  const body = await c.req.json()
  await c.env.DB.prepare(`
    UPDATE care_goals SET needs=?, long_term_goal=?, long_term_from=?, long_term_to=?,
    short_term_goal=?, short_term_from=?, short_term_to=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?`)
    .bind(body.needs, body.long_term_goal, body.long_term_from, body.long_term_to,
      body.short_term_goal, body.short_term_from, body.short_term_to, id).run()
  return c.json({ success: true })
})

// 課題削除
app.delete('/api/care-plan/goals/:goalId', async (c) => {
  const id = c.req.param('goalId')
  await c.env.DB.prepare('DELETE FROM care_goal_services WHERE care_goal_id=?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM care_goals WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

// 援助内容追加
app.post('/api/care-plan/goals/:goalId/services', async (c) => {
  const goalId = c.req.param('goalId')
  const body = await c.req.json()
  const maxRow = await c.env.DB.prepare(
    'SELECT MAX(sort_order) as m FROM care_goal_services WHERE care_goal_id=?'
  ).bind(goalId).first() as any
  const result = await c.env.DB.prepare(`
    INSERT INTO care_goal_services (care_goal_id, service_content, service_type, person, frequency, period_from, period_to, sort_order)
    VALUES (?,?,?,?,?,?,?,?)`)
    .bind(goalId, body.service_content ?? '', body.service_type ?? '', body.person ?? '',
      body.frequency ?? '', body.period_from ?? '', body.period_to ?? '', (maxRow?.m ?? 0) + 1).run()
  return c.json({ success: true, id: result.meta.last_row_id })
})

// 援助内容更新
app.put('/api/care-plan/services/:serviceId', async (c) => {
  const id = c.req.param('serviceId')
  const body = await c.req.json()
  await c.env.DB.prepare(`
    UPDATE care_goal_services SET service_content=?, service_type=?, person=?, frequency=?, period_from=?, period_to=? WHERE id=?`)
    .bind(body.service_content, body.service_type, body.person, body.frequency, body.period_from, body.period_to, id).run()
  return c.json({ success: true })
})

// 援助内容削除
app.delete('/api/care-plan/services/:serviceId', async (c) => {
  const id = c.req.param('serviceId')
  await c.env.DB.prepare('DELETE FROM care_goal_services WHERE id=?').bind(id).run()
  return c.json({ success: true })
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
      c.env.DB.prepare('DELETE FROM monitoring_records'),
      c.env.DB.prepare('DELETE FROM care_cycles'),
      c.env.DB.prepare('DELETE FROM sticky_notes'),
      c.env.DB.prepare('DELETE FROM case_records'),
      c.env.DB.prepare('DELETE FROM care_plans'),
      c.env.DB.prepare('DELETE FROM staff'),
      c.env.DB.prepare('DELETE FROM residents'),
    ])
    const cycleStartDate = new Date(); cycleStartDate.setDate(cycleStartDate.getDate() - 10)
    const nextReviewDate = new Date(); nextReviewDate.setMonth(nextReviewDate.getMonth() + 6)
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO residents (id,name,care_level,favorite_things,today_wish,maturation_day,phase) VALUES (1,'岡田 一輝','要介護4','朝のコーヒーと庭の花を眺める時間が好き','天気が良いので、午後は中庭へ出てみたい',10,'fitting')`),
      c.env.DB.prepare(`INSERT INTO staff (id,name,years_experience,position) VALUES (1,'田中 健二',3,'スタッフ')`),
      c.env.DB.prepare(`INSERT INTO staff (id,name,years_experience,position) VALUES (2,'鈴木 美咏',1,'新人')`),
      c.env.DB.prepare(`INSERT INTO staff (id,name,years_experience,position) VALUES (3,'佐藤 太郎',8,'リーダー')`),
    ])
    await c.env.DB.prepare(`INSERT INTO care_cycles (id,resident_id,start_date,status,trigger_reason,next_review_date,notes) VALUES (1,1,?,?,?,?,?)`)
      .bind(
        cycleStartDate.toISOString().split('T')[0],
        'active', '入所',
        nextReviewDate.toISOString().split('T')[0],
        '入所時の初回サイクル。Day10時点で順調に記録・フィット中。'
      ).run()
    // 24時間シート（15スロット・全列リアルデータ）
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (1,1,'06:30','起床・おむつ交換','急かされずゆっくり起きたい。カーテンを開けて日光を入れてほしい','声かけに応じて目を覚ます。ベッド柵につかまって体を起こそうとする','ベッドの背上げを30度→60度と段階的に行う。夜間パッド確認・交換。端座位介助。上衣の更衣介助（袖通しは自分でできる）。','起立性低血圧の既往あり。端座位で1分ほど安静後に立位へ移行すること。','夜間パッド：コンフォートマキシ使用','ベッド背上げ・端座位・パッド交換','fit',1)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (2,1,'07:00','洗面・整容','顔は自分で拭きたい。鏡を見て髪を整えるのが好き','座位で安定している。タオルで顔を拭ける。くしで髪を整えられる','洗面台まで車椅子で誘導。お湯の温度調整。仕上げの口腔ケア（歯磨き介助）。くしと鏡を手渡す。','','洗顔後は保湿クリームを塗布（乾燥肌のため）','洗面・口腔ケア・整容介助','fit',2)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (3,1,'08:00','朝食・服薬（朝）','朝はコーヒーが好き（ミルク入り）。パンよりご飯。熱い飲み物が好き','スプーンを握って口まで運べる。コップを両手で持てる','ソフト食・一口大で提供。嚥下に注意しペースを見守る。朝の服薬確認（降圧剤・胃薬）。食後30分は座位保持。','食形態：ソフト食・一口大。水分にはとろみ（中間のとろみ）。必要エネルギー：1400kcal/日。必要水分量：1500ml/日。','食後に血圧測定（変動が大きい時間帯）','朝食提供・服薬確認・座位保持','plan',3)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (4,1,'09:30','排泄介助','尿意はある。なるべくトイレで排泄したい。プライバシーを守ってほしい','手すりにつかまり立位保持ができる（1〜2分）。排泄動作の開始（拭き取り動作の試み）','車椅子からトイレへの移乗介助（2人介助）。衣類の着脱介助。陰部洗浄。パッド交換。排便確認（3日以上なければ下剤対応）。','排便：3日以上なければラキソベロン10滴。4日以上ならば浣腸対応。','排便時は必ず記録に残すこと','排泄介助・パッド交換','fit',4)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (5,1,'10:00','午前の活動','リビングで過ごしたい。新聞を読みたい。花を見るのが好き。話しかけてもらえると嬉しい','車椅子で過ごせる。新聞を手に持って読める。会話が楽しめる','リビングへの移動介助。30分ごとに様子確認。水分補給の声かけ（午前中500ml目標）。','バイタル目安：血圧120〜145/70〜85、脈60〜80、体温36.0〜36.8℃','新聞は手元に置いておく。花の話題を振ると表情が和らぐ','午前活動・水分補給','fit',5)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (6,1,'12:00','昼食・服薬（昼）','魚が好き。肉の脂は苦手。温かいものが好き。量は少なめでよい','スプーンで食べられる。汁物はコップを両手で持てる','ソフト食・一口大で提供。食べにくそうな場合は介助。昼の服薬確認。食後30分座位保持。','昼食時の水分目標：400ml（とろみあり）。嚥下に問題ある場合は食形態を落とす。','食事中はテレビを消して集中できる環境に','昼食提供・服薬確認・座位保持','plan',6)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (7,1,'13:00','口腔ケア・排泄','口の中をすっきりさせたい','うがいができる。歯ブラシを持てる（仕上げは介助）','歯磨き介助（磨き残し確認）。うがい介助。義歯洗浄。排泄定期誘導（2人介助）。','','義歯あり（部分入れ歯・上顎左右）。毎食後に外して洗浄すること','口腔ケア・排泄誘導','plan',7)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (8,1,'14:00','午後の活動（中庭・外気浴）','天気の良い日は中庭へ出たい。花が好き。外の空気が好き','車椅子に乗って外気浴を楽しめる。景色を見て話せる','晴天日は中庭への移動介助。日差しが強い時は日陰へ誘導。体温変化に注意。30〜40分を目安に室内へ。','日光浴はビタミンD補充に有効。直射日光・熱中症に注意。体温37.5℃以上で中止。','中庭外出後は夕食の摂取量が上がる傾向あり','午後活動・外気浴','plan',8)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (9,1,'15:00','おやつ','コーヒーが好き（ミルク入り・砂糖少なめ）。甘いものが好き。和菓子も好き','カップを両手で持てる。お菓子をつまめる','コーヒー提供（ミルク・砂糖は本人の好みで）。水分補給確認。おやつの希望を聞く。','カフェインによる不眠注意。コーヒーは1日2杯まで。16時以降は控える。','おやつ時間は他入居者様との会話が増える傾向。大切な時間。','おやつ・水分補給','plan',9)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (10,1,'16:30','排泄介助・水分補給','尿意がある時は声をかける','尿意を言葉で伝えられる','定期誘導（尿意確認してから）。移乗介助（2人）。水分補給声かけ（1日計1500ml目標）。','','この時間帯に水分が不足しがち。積極的に声かけを','排泄介助・水分補給','plan',10)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (11,1,'18:00','夕食・服薬（夕）','夕食後にお茶が飲みたい。汁物は必ず欲しい。量は少なめでよい','スプーンで食べられる。夕食後に疲れを感じやすい','ソフト食・一口大で提供。夕の服薬確認（眠前薬は就寝時）。食後30分座位保持。','夕食摂取量が昼食より低下する傾向あり。無理強いしない。','食後は「ごちそうさま」の声かけで満足感につながる','夕食提供・服薬確認・座位保持','plan',11)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (12,1,'19:30','口腔ケア・清潔ケア','口の中をきれいにしてから眠りたい','うがいができる','歯磨き介助・義歯洗浄。うがい介助。入浴のない日は手浴または全身清拭・陰部洗浄。寝衣への更衣介助。','','清潔ケア後は表情が和らぐことが多い','口腔ケア・清拭・更衣介助','plan',12)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (13,1,'20:00','入浴（月・水・金）/ 清拭','お風呂は好き。ゆっくり浸かりたい。シャワーより湯船派','浴槽内で体を支えられる（短時間）。届く範囲は自分で洗える','入浴日（月・水・金）：機械浴または一般浴で全介助。入浴前後のバイタル確認。皮膚状態チェック（褥瘡・発赤）。清拭日：全身清拭・陰部洗浄。','湯温：40〜41℃。入浴時間10〜15分以内。血圧低下・呼吸苦があれば中止。','仙骨部・踵部の褥瘡予防に注意','入浴または清拭・皮膚観察','fit',13)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (14,1,'21:30','就寝準備','照明を落として静かに眠りたい。布団はしっかりかけてほしい','パジャマの袖を通す動作が一部できる','更衣介助（パジャマ）。夜間パッド装着（コンフォートマキシ）。ベッド最低床設定。眠前薬の確認。体位変換・ポジショニング（側臥位）。','眠前薬：就寝前に服薬。褥瘡予防マット使用（エアマット）。','「おやすみなさい」の声かけで安心される','就寝準備・夜間パッド・ポジショニング','plan',14)`),
      c.env.DB.prepare(`INSERT INTO care_plans (id,resident_id,time,activity,wishes,can_do,support_needed,medical_notes,remarks,details,status,display_order) VALUES (15,1,'23:00','夜間巡視（2時間ごと）','夜間は静かに眠りたい。声をかける時は小さな声で','夜間も尿意を感じた時に声を出せる','2時間ごとの定期巡視。体位変換（右→左→仰臥位を交互に）。パッド確認・交換。呼吸・顔色確認。','夜間の尿量多め。深夜2時前後にパッド交換が必要なことが多い。','巡視記録は必ずナースステーションの記録簿に','夜間巡視・体位変換・パッド確認','plan',15)`),
    ])
    // ケース記録（昨日：14件、今日：4件）
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'06:35','夜間巡視時すでに目を覚ましておられた。「おはようございます」と声かけすると静かに頷かれた。夜間パッドに尿量多め、交換実施。端座位介助後1分安静にて血圧安定確認。上衣の更衣介助。','起床','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'07:10','洗面介助。「顔は自分で拭きたい」とのことでタオルを手渡す。自分で丁寧に拭かれた。笑顔あり。鏡で髪を整えられる。義歯洗浄・口腔ケア実施。','ケア','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,2,'08:10','朝食開始。コーヒー（ミルク入り）を提供すると「いい香りだね」と表情が明るくなった。ソフト食8割摂取。服薬確認済み。食後30分座位保持。','食事','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,2,'09:40','排泄介助。尿意を訴えられトイレへ誘導（2人介助）。排尿あり。排便なし（前回から2日目）。陰部洗浄・パッド交換実施。','排泄','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,3,'10:30','リビングにて新聞を読んでおられる。「今日は天気がいいね。中庭に出たいな」と窓の外を眺めながら話される。水分（とろみ茶）200ml摂取。','活動','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,3,'12:15','昼食。魚の煮付けが気に入られた様子。「おいしい」と言いながら8割摂取。汁物は完食。服薬確認済み。食後30分座位保持実施。','食事','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'13:05','口腔ケア実施。うがいを自分で丁寧にされた。義歯外し洗浄。排泄誘導、排尿あり。排便なし（3日目に近づいているため明日要確認）。','ケア','manual',1,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,3,'14:20','天気が良いため中庭へ外出。花壇のコスモスを見て「きれいだねえ。こういう時間が好きなんだ」と長い時間眺めておられた。表情が和らぎ終始穏やかな様子。約40分外気浴。体温36.4℃で変化なし。','活動','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,2,'15:10','おやつ。コーヒー（ミルク・砂糖少なめ）と和菓子を提供。「コーヒーは外で飲むのが一番いいんだけどな」と笑いながら話される。摂取良好。水分300ml補給。','食事','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,2,'16:40','排泄誘導。「そろそろかな」と自分から声をかけてくださった。排尿あり。水分（とろみ茶）追加200ml摂取。','排泄','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'18:20','夕食。「今日は中庭に出られて良かった」と話される。ソフト食7割摂取。やや疲れた様子で食欲は昼より少なかった。服薬確認済み。食後30分座位保持。','食事','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'20:15','入浴日（月）。一般浴にて入浴。湯温41℃。「気持ちいいね、ゆっくりできる」と穏やかな表情。BP入浴前138/82→入浴後130/78。皮膚：仙骨部・踵部発赤なし。','入浴','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'21:45','就寝準備。更衣介助後夜間パッド装着。「今日はよく動いたね。疲れたけど気持ちよかった」と話され、静かに横になられた。ベッド最低床・エアマット設定済み。','就寝','manual',0,?)`).bind(yesterday),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,2,'23:00','夜間巡視。熟睡中。呼吸安定。顔色良好。体位変換実施（仰臥位→右側臥位）。パッド確認：交換不要。','巡視','manual',0,?)`).bind(yesterday),
    ])
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,1,'06:40','起床介助。「今日は少し体が重いな」とのお言葉。端座位で1分安静後BP142/84確認し車椅子へ移乗。洗面・口腔ケア介助実施。義歯装着。','起床','manual',0,?)`).bind(today),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,2,'08:05','朝食。コーヒー（ミルク入り）を提供。「いい匂いだ、今日も一日頑張れそう」と笑顔。ソフト食7割摂取。「今日は外に出られるかな」と楽しみにされている様子。服薬確認済み。','食事','manual',0,?)`).bind(today),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,3,'09:45','排泄誘導。昨日から3日目のため下剤（ラキソベロン10滴）を水分に混ぜて服用いただく。トイレにて排尿あり。排便なし。「お腹が少しゴロゴロする」とのこと、引き続き様子観察。','排泄','manual',1,?)`).bind(today),
      c.env.DB.prepare(`INSERT INTO case_records (resident_id,staff_id,record_time,content,tag,record_type,has_alert,recorded_date) VALUES (1,3,'10:40','リビングで新聞を読んでおられる。「今日も天気がいいね。昨日の中庭、気持ちよかったなあ」と話される。水分（とろみ茶）200ml摂取。午前中は落ち着いた様子。','活動','manual',0,?)`).bind(today),
    ])
    // 付せん（現場のリアルな気づき・AI提案）
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO sticky_notes (id,resident_id,care_plan_id,note_type,fit_category,time,title,content,source,status) VALUES (1,1,3,'ai','preference','08:00','好みのフィット提案','過去10日間の記録を分析すると、朝食時にコーヒーを提供した日の午前中の表情・発言数が明らかに多い傾向があります。朝食の飲み物をコーヒー（ミルク入り）に固定することを検討してはいかがでしょうか。','AI分析','pending')`),
      c.env.DB.prepare(`INSERT INTO sticky_notes (id,resident_id,care_plan_id,note_type,fit_category,time,title,content,source,status) VALUES (2,1,8,'staff','preference','14:00','リーダーからの気づき','中庭に外出した日は夕食の摂取量が約2割増加し、夜間の睡眠も良好な傾向が続いています。天気の良い日は午後の活動に中庭外出を積極的に組み込むことを提案します。','スタッフ：佐藤','pending')`),
      c.env.DB.prepare(`INSERT INTO sticky_notes (id,resident_id,care_plan_id,note_type,fit_category,time,title,content,source,status) VALUES (3,1,9,'ai','time','15:00','時間のフィット提案','おやつのコーヒーが16時以降になると夜間の目覚め回数が増える傾向があります。おやつ提供は15時台で固定し、コーヒーは1日2杯以内にとどめることを推奨します。','AI分析','pending')`),
      c.env.DB.prepare(`INSERT INTO sticky_notes (id,resident_id,care_plan_id,note_type,fit_category,time,title,content,source,status) VALUES (4,1,4,'staff','tips','09:30','コツのフィット提案','トイレへの移乗時、「いきますよ」と声をかけてから3秒待つと、ご自身でベッド柵を握ろうとされます。そのタイミングで介助に入ると移乗がスムーズです。焦らせないことが大切。','スタッフ：田中','pending')`),
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
