import { useState, useEffect } from 'react'
import axios from 'axios'

interface Resident {
  id: number
  name: string
  care_level: string
}

interface CarePlanDetail {
  id: number
  resident_id: number
  time: string
  activity: string
  details: string
  wishes: string
  can_do: string
  support_needed: string
  medical_notes: string
  remarks: string
  status: string
  display_order: number
  updated_at: string
  care_goal_id: number | null
}

interface GoalOption {
  id: number
  sort_order: number
  needs: string
}

interface StickyNote {
  id: number
  care_plan_id: number | null
  note_type: string
  fit_category: string
  time: string | null
  title: string
  content: string
  source: string
  status: string
}

const primaryColor = '#01C1AF'

const FIELD_OPTIONS = [
  { value: 'wishes', label: '意向・好み' },
  { value: 'can_do', label: '自分のできること' },
  { value: 'support_needed', label: 'サポートの必要なこと' },
]

interface SheetPageProps {
  residentId: number
  onBack: () => void
  onNavigate?: (view: 'main' | 'care-plan') => void
}

const SheetPage = ({ residentId, onBack, onNavigate }: SheetPageProps) => {
  const [resident, setResident] = useState<Resident | null>(null)
  const [carePlans, setCarePlans] = useState<CarePlanDetail[]>([])
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])
  const [editingPlan, setEditingPlan] = useState<CarePlanDetail | null>(null)
  const [formData, setFormData] = useState<Partial<CarePlanDetail>>({})
  const [noteTargets, setNoteTargets] = useState<Record<number, string>>({})
  const [showMedical, setShowMedical] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [goals, setGoals] = useState<GoalOption[]>([])

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [residentRes, plansRes, notesRes, goalsRes] = await Promise.all([
        axios.get(`/api/residents/${residentId}`),
        axios.get(`/api/residents/${residentId}/care-plans`),
        axios.get(`/api/residents/${residentId}/sticky-notes?status=pending`),
        axios.get(`/api/care-plan/goals/${residentId}`).catch(() => ({ data: [] })),
      ])
      setGoals(goalsRes.data)
      setResident(residentRes.data)
      setCarePlans(plansRes.data)
      setStickyNotes(notesRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const openPanel = (plan: CarePlanDetail) => {
    setEditingPlan(plan)
    setFormData({ ...plan })
    const targets: Record<number, string> = {}
    getRelatedNotes(plan).forEach(n => { targets[n.id] = 'wishes' })
    setNoteTargets(targets)
  }

  const closePanel = () => { setEditingPlan(null); setFormData({}) }

  const handleSave = async () => {
    if (!editingPlan) return
    setSaving(true)
    try {
      await axios.put(`/api/care-plans/${editingPlan.id}`, formData)
      await fetchData()
      closePanel()
    } finally {
      setSaving(false)
    }
  }

  const handleAdoptNote = async (noteId: number) => {
    const field = noteTargets[noteId] || 'wishes'
    const note = stickyNotes.find(n => n.id === noteId)
    if (!note) return
    const cur = (formData[field as keyof CarePlanDetail] as string) || ''
    setFormData(p => ({ ...p, [field]: cur ? `${cur}\n${note.content}` : note.content, status: 'fit' }))
    await axios.put(`/api/sticky-notes/${noteId}`, { status: 'adopted' })
    setStickyNotes(p => p.filter(n => n.id !== noteId))
  }

  const handleAddRow = async () => {
    await axios.post('/api/care-plans', { resident_id: residentId, time: '00:00', activity: '（新しい項目）', status: 'plan' })
    await fetchData()
  }

  const handleDeletePlan = async (planId: number) => {
    if (!confirm('この行を削除しますか？')) return
    await axios.delete(`/api/care-plans/${planId}`)
    await fetchData()
    closePanel()
  }

  const getRelatedNotes = (plan: CarePlanDetail) =>
    stickyNotes.filter(n => n.care_plan_id === plan.id || n.time === plan.time)

  const fitCount = carePlans.filter(p => p.status === 'fit').length

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: primaryColor }}></div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-[#FDFCF9]">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 lg:px-6 py-3 flex items-center gap-3 shrink-0 shadow-sm">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors shrink-0">
          <i className="fas fa-home text-xs"></i>
          <span className="hidden lg:inline text-xs">ホーム</span>
        </button>
        {/* PC横断リンク */}
        {onNavigate && (
          <nav className="hidden lg:flex items-center gap-1 ml-1">
            <div className="w-px h-4 bg-slate-200 mr-1"></div>
            <button onClick={() => onNavigate('main')}
              className="text-xs font-bold px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              記録
            </button>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
              24Hシート
            </span>
            <button onClick={() => onNavigate('care-plan')}
              className="text-xs font-bold px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              計画書
            </button>
          </nav>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-400 hidden lg:block">{fitCount}/{carePlans.length} フィット済み ・ 付せん {stickyNotes.length} 件</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/residents/${residentId}/care-plans/export?format=html`}
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-[#01C1AF] text-white hover:from-teal-600 hover:to-[#00A89D] transition-all shadow-sm"
          >
            <i className="fas fa-print"></i> 印刷
          </a>
          <a
            href={`/api/residents/${residentId}/care-plans/export?format=csv`}
            download
            className="hidden lg:flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            <i className="fas fa-file-csv"></i> CSV
          </a>
          <button
            onClick={() => setShowMedical(!showMedical)}
            className={`text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all hidden lg:flex items-center gap-1 ${showMedical ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            <i className="fas fa-stethoscope"></i> 医療欄
          </button>
          <button
            onClick={handleAddRow}
            className="text-[11px] font-black px-3 py-2 rounded-xl text-white transition-all flex items-center gap-1 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <i className="fas fa-plus"></i>
            <span className="hidden lg:inline">行を追加</span>
          </button>
        </div>
      </header>

      {/* Desktop Table */}
      <div className="hidden lg:block flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              {['時間', '生活リズム', '意向・好み', '自分のできること', 'サポートの必要なこと'].map(h => (
                <th key={h} className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
              {showMedical && <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wide px-4 py-3">医療・栄養面</th>}
              <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wide px-4 py-3 w-28">状態</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {carePlans.map(plan => {
              const related = getRelatedNotes(plan)
              const isFit = plan.status === 'fit'
              return (
                <tr
                  key={plan.id}
                  onClick={() => openPanel(plan)}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group ${isFit ? 'bg-teal-50/30' : ''}`}
                >
                  <td className="px-4 py-3 w-20">
                    <span className="font-black text-sm" style={{ color: isFit ? primaryColor : '#94A3B8' }}>{plan.time}</span>
                  </td>
                  <td className="px-4 py-3 w-36">
                    <span className="font-bold text-sm text-slate-700">{plan.activity}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="text-xs text-slate-500 line-clamp-2">{plan.wishes || '—'}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="text-xs text-slate-500 line-clamp-2">{plan.can_do || '—'}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="text-xs text-slate-500 line-clamp-2">{plan.support_needed || plan.details || '—'}</span>
                  </td>
                  {showMedical && (
                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="text-xs text-slate-400 line-clamp-2">{plan.medical_notes || '—'}</span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isFit ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                        {isFit ? '✅ フィット' : '📋 計画中'}
                      </span>
                      {related.length > 0 && (
                        <span className="w-5 h-5 bg-amber-400 text-white text-[9px] font-black rounded-full flex items-center justify-center">{related.length}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <i className="fas fa-chevron-right text-slate-300 group-hover:text-slate-500 transition-colors text-xs"></i>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden flex-1 overflow-y-auto p-4 space-y-3">
        {carePlans.map(plan => {
          const related = getRelatedNotes(plan)
          const isFit = plan.status === 'fit'
          return (
            <div
              key={plan.id}
              onClick={() => openPanel(plan)}
              className={`bg-white rounded-2xl p-4 shadow-sm border cursor-pointer active:scale-[0.98] transition-all ${isFit ? 'border-teal-200 bg-teal-50/20' : 'border-slate-100'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-base" style={{ color: isFit ? primaryColor : '#94A3B8' }}>{plan.time}</span>
                  <span className="font-bold text-sm text-slate-700">{plan.activity}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isFit ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                    {isFit ? '✅' : '📋'}
                  </span>
                  {related.length > 0 && (
                    <span className="w-4 h-4 bg-amber-400 text-white text-[9px] font-black rounded-full flex items-center justify-center">{related.length}</span>
                  )}
                </div>
              </div>
              {plan.wishes && <p className="text-[11px] text-slate-500 mb-0.5"><span className="font-bold text-slate-400">意向：</span>{plan.wishes}</p>}
              {plan.can_do && <p className="text-[11px] text-slate-500"><span className="font-bold text-slate-400">できること：</span>{plan.can_do}</p>}
            </div>
          )
        })}
      </div>

      {/* Edit Panel */}
      {editingPlan && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closePanel} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="font-black text-slate-800">
                <span className="font-black mr-2" style={{ color: primaryColor }}>{formData.time}</span>
                {formData.activity}
              </h2>
              <button onClick={closePanel} className="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Time & Activity */}
              <div className="flex gap-3">
                <div className="w-28 shrink-0">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">時間</label>
                  <input type="time" value={formData.time || ''} onChange={e => setFormData(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01C1AF]/30" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">生活リズム</label>
                  <input type="text" value={formData.activity || ''} onChange={e => setFormData(p => ({ ...p, activity: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01C1AF]/30" />
                </div>
              </div>

              {/* Goal Link */}
              {goals.length > 0 && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">🎯 ケアプランの課題に紐づける</label>
                  <select
                    value={formData.care_goal_id ?? ''}
                    onChange={e => setFormData(p => ({ ...p, care_goal_id: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01C1AF]/30"
                  >
                    <option value="">紐づけなし</option>
                    {goals.map((g, i) => (
                      <option key={g.id} value={g.id}>課題{i + 1}: {g.needs ? g.needs.slice(0, 25) + '...' : '（未入力）'}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">ステータス</label>
                <div className="flex gap-2">
                  {[{ v: 'plan', label: '📋 計画中', active: 'bg-slate-200 text-slate-700' }, { v: 'fit', label: '✅ フィット済み', active: 'bg-teal-500 text-white' }].map(opt => (
                    <button key={opt.v} onClick={() => setFormData(p => ({ ...p, status: opt.v }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${formData.status === opt.v ? opt.active : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wishes */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">💬 意向・好み</label>
                <textarea value={formData.wishes || ''} onChange={e => setFormData(p => ({ ...p, wishes: e.target.value }))}
                  rows={3} placeholder="本人の望み・好き嫌い・家族の要望"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01C1AF]/30 resize-none" />
              </div>

              {/* Can Do */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">🙌 自分のできること</label>
                <textarea value={formData.can_do || ''} onChange={e => setFormData(p => ({ ...p, can_do: e.target.value }))}
                  rows={3} placeholder="本人が自力でできること・残存能力"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01C1AF]/30 resize-none" />
              </div>

              {/* Support Needed */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">🤝 サポートの必要なこと</label>
                <textarea value={formData.support_needed || ''} onChange={e => setFormData(p => ({ ...p, support_needed: e.target.value }))}
                  rows={3} placeholder="スタッフが行うサポート・介護手順"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01C1AF]/30 resize-none" />
              </div>

              {/* Medical (collapsible) */}
              <details>
                <summary className="text-[10px] font-black text-slate-400 uppercase cursor-pointer flex items-center gap-1 select-none">
                  <i className="fas fa-chevron-right text-[8px]"></i>
                  🏥 医療・栄養面・PT（折りたたみ）
                </summary>
                <textarea value={formData.medical_notes || ''} onChange={e => setFormData(p => ({ ...p, medical_notes: e.target.value }))}
                  rows={3} placeholder="バイタル基準値・栄養情報・PTからの指示など"
                  className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01C1AF]/30 resize-none" />
              </details>

              {/* Remarks */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">📝 備考</label>
                <textarea value={formData.remarks || ''} onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                  rows={2} placeholder="その他の注意事項"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01C1AF]/30 resize-none" />
              </div>

              {/* Related Sticky Notes */}
              {(() => {
                const related = getRelatedNotes(editingPlan)
                if (related.length === 0) return null
                return (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3">💛 関連する付せん（{related.length}件）</p>
                    <div className="space-y-3">
                      {related.map(note => (
                        <div key={note.id} className={`rounded-2xl p-4 border-2 ${note.note_type === 'ai' ? 'bg-cyan-50 border-cyan-200' : 'bg-amber-50 border-amber-200'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${note.note_type === 'ai' ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'}`}>
                              <i className={`${note.note_type === 'ai' ? 'fas fa-brain' : 'fas fa-user'} mr-1`}></i>{note.source}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mb-3 leading-relaxed">{note.content}</p>
                          <div className="flex gap-2 items-center">
                            <select value={noteTargets[note.id] || 'wishes'}
                              onChange={e => setNoteTargets(p => ({ ...p, [note.id]: e.target.value }))}
                              className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none bg-white">
                              {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <button onClick={() => handleAdoptNote(note.id)}
                              className="text-xs font-black px-3 py-1.5 text-white rounded-lg transition-all active:scale-95"
                              style={{ backgroundColor: primaryColor }}>
                              とりいれる
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Delete */}
              <button onClick={() => handleDeletePlan(editingPlan.id)}
                className="w-full text-xs font-bold text-red-400 hover:text-red-600 py-2 transition-colors">
                <i className="fas fa-trash mr-1"></i>この行を削除
              </button>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 shrink-0">
              <button onClick={handleSave} disabled={saving}
                className="w-full text-white font-black py-3 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SheetPage
