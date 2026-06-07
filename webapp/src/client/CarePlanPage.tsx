import { useState, useEffect } from 'react'
import axios from 'axios'

const primaryColor = '#01C1AF'
const residentId = 1

interface Table1Data {
  id?: number
  cm_name: string
  facility_name: string
  created_date: string
  revised_date: string
  certification_status: string
  valid_period_from: string
  valid_period_to: string
  entry_background: string
  resident_wishes: string
  family_wishes: string
  comprehensive_policy: string
}

interface GoalService {
  id?: number
  care_goal_id?: number
  service_content: string
  service_type: string
  person: string
  frequency: string
  period_from: string
  period_to: string
}

interface Goal {
  id?: number
  resident_id?: number
  sort_order?: number
  needs: string
  long_term_goal: string
  long_term_from: string
  long_term_to: string
  short_term_goal: string
  short_term_from: string
  short_term_to: string
  services: GoalService[]
}

const EMPTY_GOAL: Goal = {
  needs: '', long_term_goal: '', long_term_from: '', long_term_to: '',
  short_term_goal: '', short_term_from: '', short_term_to: '', services: [],
}

const EMPTY_SERVICE: GoalService = {
  service_content: '', service_type: '介護', person: '介護ST', frequency: '', period_from: '', period_to: '',
}

interface Resident {
  id: number
  name: string
  care_level: string
  maturation_day: number
}

const EMPTY_TABLE1: Table1Data = {
  cm_name: '', facility_name: '', created_date: '', revised_date: '',
  certification_status: '認定済', valid_period_from: '', valid_period_to: '',
  entry_background: '', resident_wishes: '', family_wishes: '', comprehensive_policy: '',
}

interface CarePlanPageProps {
  onBack: () => void
  onNavigate?: (view: 'main' | 'sheet') => void
}

const CarePlanPage = ({ onBack, onNavigate }: CarePlanPageProps) => {
  const [resident, setResident] = useState<Resident | null>(null)
  const [table1, setTable1] = useState<Table1Data>(EMPTY_TABLE1)
  const [goals, setGoals] = useState<Goal[]>([])
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'top' | 'table1' | 'table2' | 'table3'>('top')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [residentRes, table1Res] = await Promise.all([
        axios.get(`/api/residents/${residentId}`),
        axios.get(`/api/care-plan/table1/${residentId}`).catch(() => ({ data: null })),
      ])
      setResident(residentRes.data)
      if (table1Res.data) setTable1(table1Res.data)
      const goalsRes = await axios.get(`/api/care-plan/goals/${residentId}`).catch(() => ({ data: [] }))
      setGoals(goalsRes.data)
      const weeklyRes = await axios.get(`/api/care-plan/table3/${residentId}`).catch(() => ({ data: [] }))
      setWeeklyData(weeklyRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.post(`/api/care-plan/table1/${residentId}`, table1)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof Table1Data) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setTable1(p => ({ ...p, [key]: e.target.value }))

  const fetchGoals = async () => {
    const res = await axios.get(`/api/care-plan/goals/${residentId}`).catch(() => ({ data: [] }))
    setGoals(res.data)
  }

  const handleSaveGoal = async (goal: Goal) => {
    setSaving(true)
    try {
      if (goal.id) {
        await axios.put(`/api/care-plan/goals/${goal.id}`, goal)
        for (const s of goal.services) {
          if (s.id) await axios.put(`/api/care-plan/services/${s.id}`, s)
          else await axios.post(`/api/care-plan/goals/${goal.id}/services`, s)
        }
      } else {
        const res = await axios.post(`/api/care-plan/goals/${residentId}`, goal)
        for (const s of goal.services) {
          await axios.post(`/api/care-plan/goals/${res.data.id}/services`, s)
        }
      }
      await fetchGoals()
      setEditingGoal(null)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const handleDeleteGoal = async (goalId: number) => {
    if (!confirm('この課題を削除しますか？')) return
    await axios.delete(`/api/care-plan/goals/${goalId}`)
    await fetchGoals()
    setEditingGoal(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: primaryColor }}></div>
    </div>
  )

  // 第3表画面
  if (activeTab === 'table3') {
    const DAYS = ['月', '火', '水', '木', '金', '土', '日']
    const slots = [...new Set(weeklyData.map((w: any) => w.time_slot))].sort()
    return (
      <div className="flex flex-col h-screen bg-[#FDFCF9] font-sans">
        <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 shrink-0 shadow-sm">
          <button onClick={() => setActiveTab('top')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1.5 text-sm font-bold">
            <i className="fas fa-arrow-left"></i>
            <span className="hidden lg:inline">計画書</span>
          </button>
          <div className="w-px h-5 bg-slate-200"></div>
          <h1 className="font-black text-slate-800 text-base flex-1">第3表　週間サービス計画表</h1>
          <a href={`/api/care-plan/export/${residentId}`} target="_blank" rel="noreferrer"
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1 shrink-0"
            style={{ backgroundColor: primaryColor }}>
            <i className="fas fa-print"></i> 印刷
          </a>
        </header>
        <div className="flex-1 overflow-auto p-4">
          {slots.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <i className="fas fa-calendar-week text-4xl mb-4"></i>
              <p className="font-bold text-sm">まだ生成されていません</p>
              <p className="text-xs mt-1">Day14カンファレンスで自動生成されます</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs min-w-[600px] w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-3 py-2 text-left font-black text-slate-600 w-16">時間</th>
                    {DAYS.map(d => (
                      <th key={d} className="border border-slate-200 px-2 py-2 text-center font-black text-slate-600">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map(slot => (
                    <tr key={slot} className="hover:bg-slate-50">
                      <td className="border border-slate-200 px-3 py-2 font-black text-center" style={{ color: primaryColor }}>{slot}</td>
                      {DAYS.map(day => {
                        const cell = weeklyData.find((w: any) => w.time_slot === slot && w.day_of_week === day)
                        return (
                          <td key={day} className="border border-slate-200 px-2 py-2 text-slate-600 text-center">
                            {cell?.service_content || ''}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 第2表画面
  if (activeTab === 'table2') {
    const eg = editingGoal
    return (
      <div className="flex flex-col h-screen bg-[#FDFCF9] font-sans">
        <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 shrink-0 shadow-sm">
          <button onClick={() => { setActiveTab('top'); setEditingGoal(null) }} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 text-sm font-bold">
            <i className="fas fa-arrow-left"></i>
            <span className="hidden lg:inline">計画書</span>
          </button>
          <div className="w-px h-5 bg-slate-200"></div>
          <h1 className="font-black text-slate-800 text-base">第2表　課題・目標・援助内容</h1>
          {!eg && (
            <button onClick={() => setEditingGoal({ ...EMPTY_GOAL })}
              className="ml-auto text-[11px] font-black px-3 py-2 rounded-xl text-white flex items-center gap-1"
              style={{ backgroundColor: primaryColor }}>
              <i className="fas fa-plus"></i> 課題追加
            </button>
          )}
          {eg && (
            <button onClick={() => handleSaveGoal(eg)} disabled={saving}
              className="ml-auto text-[11px] font-black px-4 py-2 rounded-xl text-white disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}>
              {saving ? '保存中...' : '保存する'}
            </button>
          )}
        </header>

        {!eg ? (
          // 課題一覧
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
            {goals.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <i className="fas fa-bullseye text-4xl mb-3"></i>
                <p className="text-sm font-bold">課題がまだありません</p>
                <p className="text-xs mt-1">「課題追加」から入所時の課題を入力してください</p>
              </div>
            )}
            {goals.map((g, i) => (
              <div key={g.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: primaryColor }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-800 leading-snug">{g.needs || '（課題未入力）'}</p>
                    {g.short_term_goal && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        短期: {g.short_term_goal}
                        {g.short_term_to && <span className="text-slate-400"> 〜{g.short_term_to}</span>}
                      </p>
                    )}
                    {g.services.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1">援助内容 {g.services.length}件</p>
                    )}
                  </div>
                  <button onClick={() => setEditingGoal({ ...g })}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 shrink-0">
                    編集
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 課題編集フォーム
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 max-w-2xl mx-auto w-full">
            <section>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">生活全般の解決すべき課題（ニーズ）</p>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
                <textarea value={eg.needs} onChange={e => setEditingGoal(p => ({ ...p!, needs: e.target.value }))}
                  rows={3} placeholder="例：嚥下機能の低下により食形態の調整が必要。食欲にムラがあり栄養摂取量の維持が課題。"
                  className="w-full text-sm text-slate-800 focus:outline-none resize-none leading-relaxed" />
              </div>
            </section>

            <section>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">長期目標</p>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
                <div className="px-4 py-3">
                  <textarea value={eg.long_term_goal} onChange={e => setEditingGoal(p => ({ ...p!, long_term_goal: e.target.value }))}
                    rows={2} placeholder="例：経口摂取を維持し、低栄養状態を防ぐ"
                    className="w-full text-sm text-slate-800 focus:outline-none resize-none" />
                </div>
                <div className="px-4 py-3 flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-400 w-8 shrink-0">期間</label>
                  <input type="date" value={eg.long_term_from} onChange={e => setEditingGoal(p => ({ ...p!, long_term_from: e.target.value }))}
                    className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent" />
                  <span className="text-slate-300 text-xs">〜</span>
                  <input type="date" value={eg.long_term_to} onChange={e => setEditingGoal(p => ({ ...p!, long_term_to: e.target.value }))}
                    className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent" />
                </div>
              </div>
            </section>

            <section>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">短期目標</p>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
                <div className="px-4 py-3">
                  <textarea value={eg.short_term_goal} onChange={e => setEditingGoal(p => ({ ...p!, short_term_goal: e.target.value }))}
                    rows={2} placeholder="例：毎食ソフト食・一口大で8割以上摂取できる"
                    className="w-full text-sm text-slate-800 focus:outline-none resize-none" />
                </div>
                <div className="px-4 py-3 flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-400 w-8 shrink-0">期間</label>
                  <input type="date" value={eg.short_term_from} onChange={e => setEditingGoal(p => ({ ...p!, short_term_from: e.target.value }))}
                    className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent" />
                  <span className="text-slate-300 text-xs">〜</span>
                  <input type="date" value={eg.short_term_to} onChange={e => setEditingGoal(p => ({ ...p!, short_term_to: e.target.value }))}
                    className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent" />
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">援助内容</p>
                <button onClick={() => setEditingGoal(p => ({ ...p!, services: [...p!.services, { ...EMPTY_SERVICE }] }))}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg text-white flex items-center gap-1"
                  style={{ backgroundColor: primaryColor }}>
                  <i className="fas fa-plus"></i> 追加
                </button>
              </div>
              {eg.services.length === 0 && (
                <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
                  援助内容は24Hシートが充実した後、Day14カンファレンスで自動反映されます
                </p>
              )}
              <div className="space-y-2">
                {eg.services.map((s, si) => (
                  <div key={si} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 space-y-2">
                    <input value={s.service_content} onChange={e => setEditingGoal(p => { const sv = [...p!.services]; sv[si] = { ...sv[si], service_content: e.target.value }; return { ...p!, services: sv } })}
                      placeholder="サービス内容" className="w-full text-sm text-slate-800 focus:outline-none border-b border-slate-100 pb-1" />
                    <div className="flex gap-2">
                      <input value={s.service_type} onChange={e => setEditingGoal(p => { const sv = [...p!.services]; sv[si] = { ...sv[si], service_type: e.target.value }; return { ...p!, services: sv } })}
                        placeholder="種別" className="flex-1 text-xs text-slate-600 focus:outline-none bg-slate-50 rounded-lg px-2 py-1" />
                      <input value={s.person} onChange={e => setEditingGoal(p => { const sv = [...p!.services]; sv[si] = { ...sv[si], person: e.target.value }; return { ...p!, services: sv } })}
                        placeholder="担当者" className="flex-1 text-xs text-slate-600 focus:outline-none bg-slate-50 rounded-lg px-2 py-1" />
                      <input value={s.frequency} onChange={e => setEditingGoal(p => { const sv = [...p!.services]; sv[si] = { ...sv[si], frequency: e.target.value }; return { ...p!, services: sv } })}
                        placeholder="頻度" className="flex-1 text-xs text-slate-600 focus:outline-none bg-slate-50 rounded-lg px-2 py-1" />
                    </div>
                    <button onClick={() => setEditingGoal(p => ({ ...p!, services: p!.services.filter((_, i) => i !== si) }))}
                      className="text-[10px] text-red-400 hover:text-red-600">
                      <i className="fas fa-trash mr-1"></i>削除
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {eg.id && (
              <button onClick={() => handleDeleteGoal(eg.id!)}
                className="w-full text-xs font-bold text-red-400 hover:text-red-600 py-2">
                <i className="fas fa-trash mr-1"></i>この課題を削除
              </button>
            )}
            <div className="pb-8">
              <button onClick={() => handleSaveGoal(eg)} disabled={saving}
                className="w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 text-sm"
                style={{ backgroundColor: primaryColor }}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // トップ画面
  if (activeTab === 'top') return (
    <div className="flex flex-col h-screen bg-[#FDFCF9] font-sans">
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0">
          <i className="fas fa-home text-xs"></i>
          <span className="hidden lg:inline">ホーム</span>
        </button>
        {onNavigate && (
          <nav className="hidden lg:flex items-center gap-1 ml-1">
            <div className="w-px h-4 bg-slate-200 mr-1"></div>
            <button onClick={() => onNavigate('main')}
              className="text-xs font-bold px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              記録
            </button>
            <button onClick={() => onNavigate('sheet')}
              className="text-xs font-bold px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              24Hシート
            </button>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
              計画書
            </span>
          </nav>
        )}
        <div className="w-px h-5 bg-slate-200"></div>
        <h1 className="font-black text-slate-800 text-base flex items-center gap-2">
          <i className="fas fa-file-alt" style={{ color: primaryColor }}></i>
          施設サービス計画書
        </h1>
        <span className="text-[11px] text-slate-400 ml-1">{resident?.name} 様</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {/* 第1表 */}
        <button
          onClick={() => setActiveTab('table1')}
          className="w-full bg-white rounded-2xl px-4 py-4 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-[#01C1AF]/30 transition-all active:scale-[0.98] text-left"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
            <i className="fas fa-id-card" style={{ color: primaryColor }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-black text-sm text-slate-800">第1表</p>
              {table1.cm_name ? (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-600">入力済✓</span>
              ) : (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">未入力</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">基本情報・本人家族の意向・支援方针</p>
          </div>
          <i className="fas fa-chevron-right text-slate-200 text-xs"></i>
        </button>

        {/* 第2表 */}
        <button
          onClick={() => setActiveTab('table2')}
          className="w-full bg-white rounded-2xl px-4 py-4 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-[#01C1AF]/30 transition-all active:scale-[0.98] text-left"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
            <i className="fas fa-bullseye" style={{ color: primaryColor }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-black text-sm text-slate-800">第2表</p>
              {goals.length > 0 ? (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-600">{goals.length}件✓</span>
              ) : (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">未入力</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">課題・目標・援助内容</p>
          </div>
          <i className="fas fa-chevron-right text-slate-200 text-xs"></i>
        </button>

        {/* 第3表 */}
        <button
          onClick={() => setActiveTab('table3')}
          className="w-full bg-white rounded-2xl px-4 py-4 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-[#01C1AF]/30 transition-all active:scale-[0.98] text-left"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${weeklyData.length > 0 ? '' : 'bg-slate-100'}`}
            style={weeklyData.length > 0 ? { backgroundColor: `${primaryColor}15` } : {}}>
            <i className={`fas fa-calendar-week ${weeklyData.length > 0 ? '' : 'text-slate-300'}`}
              style={weeklyData.length > 0 ? { color: primaryColor } : {}}></i>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-black text-sm text-slate-800">第3表</p>
              {weeklyData.length > 0 ? (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-600">生成済✓</span>
              ) : (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">未生成</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">週間サービス計画表</p>
          </div>
          <i className="fas fa-chevron-right text-slate-200 text-xs"></i>
        </button>

        {/* 印刷 */}
        <a
          href={`/api/care-plan/export/${residentId}`}
          target="_blank"
          rel="noreferrer"
          className="w-full bg-gradient-to-r from-teal-500 to-[#01C1AF] rounded-2xl px-4 py-4 flex items-center gap-4 transition-all active:scale-[0.98] text-left shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
            <i className="fas fa-print text-white"></i>
          </div>
          <div className="flex-1">
            <p className="font-black text-sm text-white">計画書を印刷する</p>
            <p className="text-[11px] text-teal-100">第1〜3表をまとめてPDF・印刷</p>
          </div>
          <i className="fas fa-external-link-alt text-white/60 text-xs"></i>
        </a>

        <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <i className="fas fa-info-circle mr-1"></i>
            第3表はDay14カンファレンスで24Hシートから自動生成されます。
          </p>
        </div>
      </div>
    </div>
  )

  // 第1表入力画面
  return (
    <div className="flex flex-col h-screen bg-[#FDFCF9] font-sans">
      <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 shrink-0 shadow-sm">
        <button onClick={() => setActiveTab('top')} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 text-sm font-bold">
          <i className="fas fa-arrow-left"></i>
          <span className="hidden lg:inline">計画書</span>
        </button>
        <div className="w-px h-5 bg-slate-200"></div>
        <h1 className="font-black text-slate-800 text-base">第1表　施設サービス計画書（1）</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto text-[11px] font-black px-4 py-2 rounded-xl text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {saved ? '✓ 保存済み' : saving ? '保存中...' : '保存する'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 max-w-2xl mx-auto w-full">
        {/* 基本情報 */}
        <section>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">📋 基本情報</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-xs font-black text-slate-500 w-28 shrink-0">計画作成者</label>
              <input value={table1.cm_name} onChange={set('cm_name')} placeholder="例：佐藤 太郎" className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent" />
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-xs font-black text-slate-500 w-28 shrink-0">施設名</label>
              <input value={table1.facility_name} onChange={set('facility_name')} placeholder="例：。。。特別養護老人ホーム" className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent" />
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-xs font-black text-slate-500 w-28 shrink-0">計画作成日</label>
              <input type="date" value={table1.created_date} onChange={set('created_date')} className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent" />
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-xs font-black text-slate-500 w-28 shrink-0">計画変更日</label>
              <input type="date" value={table1.revised_date} onChange={set('revised_date')} className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent" />
            </div>
          </div>
        </section>

        {/* 認定情報 */}
        <section>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">🏥 認定情報</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-xs font-black text-slate-500 w-28 shrink-0">認定状況</label>
              <select value={table1.certification_status} onChange={set('certification_status')} className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent">
                <option>認定済</option>
                <option>申請中</option>
              </select>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <label className="text-xs font-black text-slate-500 w-28 shrink-0">要介護度</label>
              <span className="text-sm font-bold text-slate-800">{resident?.care_level}</span>
              <span className="text-[10px] text-slate-400 ml-1">(入居者情報から自動取得)</span>
            </div>
            <div className="px-4 py-3 flex items-start gap-3">
              <label className="text-xs font-black text-slate-500 w-28 shrink-0 pt-0.5">認定有効期間</label>
              <div className="flex items-center gap-2 flex-1">
                <input type="date" value={table1.valid_period_from} onChange={set('valid_period_from')} className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent" />
                <span className="text-slate-400 text-xs">〜</span>
                <input type="date" value={table1.valid_period_to} onChange={set('valid_period_to')} className="flex-1 text-sm text-slate-800 focus:outline-none bg-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* 入所の至った経緒 */}
        <section>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">📝 入所の至った経緒</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
            <textarea
              value={table1.entry_background}
              onChange={set('entry_background')}
              rows={4}
              placeholder="例：脳梗塞後遗症により左片麻痹。在宅での介護が困難となり入所。"
              className="w-full text-sm text-slate-800 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </section>

        {/* 意向 */}
        <section>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">💬 意向・希望</p>
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
              <p className="text-[10px] font-black text-slate-400 mb-2">本人の意向</p>
              <textarea
                value={table1.resident_wishes}
                onChange={set('resident_wishes')}
                rows={3}
                placeholder="例：中庭で花を見ながらコーヒーを飲む時間が好き。できる限り自分でできることはしたい。"
                className="w-full text-sm text-slate-800 focus:outline-none resize-none leading-relaxed"
              />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
              <p className="text-[10px] font-black text-slate-400 mb-2">家族の意向</p>
              <textarea
                value={table1.family_wishes}
                onChange={set('family_wishes')}
                rows={3}
                placeholder="例：安全に過ごしてほしい。転倒だけは防いでほしい。月で1回の面会を楽しみにしている。"
                className="w-full text-sm text-slate-800 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>
        </section>

        {/* 総合的な支援方针 */}
        <section>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">🎯 総合的な支援の方针</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
            <textarea
              value={table1.comprehensive_policy}
              onChange={set('comprehensive_policy')}
              rows={5}
              placeholder="例：本人の「自分でできることはしたい」という意向を尊重しながら、残存機能の維持・向上を図る。中庭外出など生きがい活動を支援しQOLの向上を目指す。"
              className="w-full text-sm text-slate-800 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </section>

        <div className="pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 text-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {saved ? '✓ 保存しました' : saving ? '保存中...' : '第1表を保存する'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CarePlanPage
