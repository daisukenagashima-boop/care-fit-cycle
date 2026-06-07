import { useState, useEffect } from 'react'
import axios from 'axios'

const primaryColor = '#01C1AF'
const residentId = 1

interface Plan {
  id: number
  time: string
  activity: string
  wishes: string
  can_do: string
  support_needed: string
  status: string
  care_goal_id: number | null
}

interface Goal {
  id: number
  sort_order: number
  needs: string
  short_term_goal: string
  short_term_to: string
  services: any[]
}

interface ConferencePageProps {
  onBack: () => void
  onComplete: () => void
}

const ConferencePage = ({ onBack, onComplete }: ConferencePageProps) => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [plansRes, goalsRes] = await Promise.all([
        axios.get(`/api/residents/${residentId}/care-plans`),
        axios.get(`/api/care-plan/goals/${residentId}`),
      ])
      setPlans(plansRes.data)
      setGoals(goalsRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const linkedCount = plans.filter(p => p.care_goal_id).length
  const fitCount = plans.filter(p => p.status === 'fit').length

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await axios.post(`/api/conference/generate/${residentId}`)
      setDone(true)
    } catch (e) { console.error(e) }
    finally { setGenerating(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: primaryColor }}></div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-[#FDFCF9] font-sans">
      <header className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 shrink-0 shadow-sm">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center gap-1.5">
          <i className="fas fa-arrow-left"></i>
          <span className="hidden lg:inline">ホーム</span>
        </button>
        <div className="w-px h-5 bg-slate-200"></div>
        <h1 className="font-black text-slate-800 text-base">🎉 Day14 カンファレンス準備</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 max-w-2xl mx-auto w-full">
        {!done ? (
          <>
            {/* サマリー */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                <p className="text-2xl font-black" style={{ color: primaryColor }}>{fitCount}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">フィット済み</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                <p className="text-2xl font-black text-amber-400">{linkedCount}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">課題結びつき</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                <p className="text-2xl font-black text-slate-600">{goals.length}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">課題数</p>
              </div>
            </div>

            {/* マッピングプレビュー */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">🔄 自動マッピングの内容</p>
              <div className="space-y-2">
                <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs shrink-0 mt-0.5">意</div>
                  <div>
                    <p className="text-xs font-black text-slate-700">意向・好み → 課題（ニーズ）</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">24Hシートの「意向・好み」を第2表の課題に追加</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-xs shrink-0 mt-0.5">能</div>
                  <div>
                    <p className="text-xs font-black text-slate-700">自分のできること → 短期目標</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">24Hシートの「自分のできること」を短期目標に反映</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs shrink-0 mt-0.5">援</div>
                  <div>
                    <p className="text-xs font-black text-slate-700">サポートの必要なこと → 援助内容</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">24Hシートの「サポート」を第2表援助内容に生成</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs shrink-0 mt-0.5">週</div>
                  <div>
                    <p className="text-xs font-black text-slate-700">時間帯パターン → 第3表（週間サービス計画）</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">24Hシートの全項目に対して週間スケジュールを自動生成</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 課題結びつき状況 */}
            {goals.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">🎯 課題ごとの結びつき状況</p>
                <div className="space-y-2">
                  {goals.map((g, i) => {
                    const linked = plans.filter(p => p.care_goal_id === g.id)
                    return (
                      <div key={g.id} className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center" style={{ backgroundColor: primaryColor }}>{i+1}</span>
                          <p className="text-sm font-black text-slate-700 flex-1 truncate">{g.needs || '（課題未入力）'}</p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${linked.length > 0 ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                            {linked.length}件結びつき
                          </span>
                        </div>
                        {linked.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {linked.map(p => (
                              <span key={p.id} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{p.time} {p.activity}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {linkedCount === 0 && (
              <div className="bg-amber-50 rounded-2xl px-4 py-3 border border-amber-200">
                <p className="text-xs font-bold text-amber-700">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  24Hシート項目が課題に結びついていません。
                  24Hシート管理から各項目に課題を設定すると、より正確に自動生成できます。そのまま生成することもできます。
                </p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full text-white font-black py-5 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 text-sm"
              style={{ background: `linear-gradient(135deg, #0d9488, ${primaryColor})` }}
            >
              {generating ? (
                <span><i className="fas fa-spinner fa-spin mr-2"></i>生成中...</span>
              ) : (
                <span><i className="fas fa-magic mr-2"></i>ケアプランを生成する</span>
              )}
            </button>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg" style={{ backgroundColor: `${primaryColor}20` }}>
              🎉
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">ケアプランを生成しました</h2>
            <p className="text-sm text-slate-500 mb-8">
              第2表・第3表が自動入力されました。内容を確認・編集してください。
            </p>
            <div className="space-y-3">
              <button
                onClick={onComplete}
                className="w-full text-white font-black py-4 rounded-2xl shadow-lg text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                施設サービス計画書を確認する →
              </button>
              <button onClick={onBack} className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl text-sm">
                ホームに戺る
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConferencePage
