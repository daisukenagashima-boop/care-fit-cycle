import { useState, useEffect } from 'react'
import axios from 'axios'

const primaryColor = '#01C1AF'
const DEFAULT_RESIDENT_ID = 1

type AppPhase = 'recording' | 'fitting' | 'conference'

interface Resident {
  id: number
  name: string
  care_level: string
  maturation_day: number
  today_wish: string
  favorite_things: string
  phase: string
}

interface CaseRecord {
  id: number
  record_time: string
  content: string
  tag: string
  has_alert: number | boolean
}

interface HubPageProps {
  onGoTo: (view: 'main' | 'sheet' | 'care-plan' | 'conference') => void
}

const getPhase = (day: number, fitRatio: number): AppPhase => {
  if (day >= 14) return 'conference'
  if (day >= 6 || fitRatio > 0.3) return 'fitting'
  return 'recording'
}

const PHASE_LABEL: Record<AppPhase, string> = {
  recording: '記録フェーズ',
  fitting: 'フィットフェーズ',
  conference: 'Day14 カンファレンス',
}

const TAG_COLOR: Record<string, string> = {
  '食事': 'bg-orange-100 text-orange-600',
  '排泤': 'bg-blue-100 text-blue-600',
  '起床': 'bg-yellow-100 text-yellow-700',
  '活動': 'bg-green-100 text-green-700',
  '入浴': 'bg-cyan-100 text-cyan-700',
  '就寞': 'bg-purple-100 text-purple-700',
  'ケア': 'bg-pink-100 text-pink-700',
  '巡視': 'bg-slate-100 text-slate-500',
  'その他': 'bg-slate-100 text-slate-500',
}

const HubPage = ({ onGoTo }: HubPageProps) => {
  const residentId = DEFAULT_RESIDENT_ID

  const [resident, setResident] = useState<Resident | null>(null)
  const [todayRecords, setTodayRecords] = useState<CaseRecord[]>([])
  const [fitCount, setFitCount] = useState(0)
  const [totalPlans, setTotalPlans] = useState(0)
  const [pendingNotes, setPendingNotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const [residentRes, plansRes, notesRes, recordsRes] = await Promise.all([
        axios.get(`/api/residents/${residentId}`),
        axios.get(`/api/residents/${residentId}/care-plans`),
        axios.get(`/api/residents/${residentId}/sticky-notes?status=pending`),
        axios.get(`/api/residents/${residentId}/case-records?date=${today}`),
      ])
      setResident(residentRes.data)
      const plans = plansRes.data
      setFitCount(plans.filter((p: any) => p.status === 'fit').length)
      setTotalPlans(plans.length)
      setPendingNotes(notesRes.data.length)
      setTodayRecords(recordsRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoReset = async () => {
    if (!confirm('デモ用データを作成しますか？現在のデータは全て消えます。')) return
    setResetting(true)
    try {
      await axios.post('/api/demo/reset')
      await fetchData()
    } finally {
      setResetting(false)
    }
  }

  if (loading || !resident) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }}></div>
    </div>
  )

  const fitRatio = totalPlans > 0 ? fitCount / totalPlans : 0
  const phase = getPhase(resident.maturation_day, fitRatio)

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <div className="flex-1 overflow-y-auto">

        {/* 利用者カード */}
        <div className="bg-white px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-orange-100 overflow-hidden shadow-sm shrink-0">
              <img src="/static/okada-profile.jpg" alt={resident.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-lg font-black text-slate-900 leading-tight">
                    {resident.name}
                    <span className="text-sm font-bold text-slate-400 ml-1">様</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{resident.care_level}</span>
                    <span className="text-slate-200">·</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    >
                      Day {resident.maturation_day} · {PHASE_LABEL[phase]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">「{resident.today_wish}」</p>
                </div>
                <button
                  onClick={handleDemoReset}
                  disabled={resetting}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all disabled:opacity-40 shrink-0 ml-3"
                >
                  <i className={`fas fa-database mr-0.5 ${resetting ? 'animate-pulse' : ''}`}></i>
                  {resetting ? '...' : 'デモ'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-3">

          {/* カンファレンスCTA（Day14のみ） */}
          {phase === 'conference' && (
            <button
              onClick={() => onGoTo('conference')}
              className="w-full text-white font-black py-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-all"
              style={{ background: `linear-gradient(135deg, #0d9488, ${primaryColor})` }}
            >
              <i className="fas fa-magic"></i>
              Day14 カンファレンス — ケアプランを生成する
              <i className="fas fa-arrow-right text-xs"></i>
            </button>
          )}

          {/* 今日の記録 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-800">今日の記録</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{todayRecords.length}件</span>
              </div>
              <button
                onClick={() => onGoTo('main')}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl text-white active:scale-95 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <i className="fas fa-plus text-[10px]"></i>
                記録を追加
              </button>
            </div>

            {todayRecords.length === 0 ? (
              <div className="px-4 pb-6 text-center">
                <i className="fas fa-clipboard-list text-3xl text-slate-200 mb-2"></i>
                <p className="text-sm font-bold text-slate-400">まだ今日の記録がありません</p>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-slate-50">
                  {todayRecords.slice(0, 4).map((record) => (
                    <button
                      key={record.id}
                      onClick={() => onGoTo('main')}
                      className="w-full px-4 py-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <span className="text-xs font-black text-slate-400 w-10 shrink-0 pt-0.5 tabular-nums">{record.record_time}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_COLOR[record.tag] || 'bg-slate-100 text-slate-500'}`}>
                            {record.tag}
                          </span>
                          {record.has_alert ? <i className="fas fa-exclamation-circle text-amber-400 text-xs"></i> : null}
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{record.content}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {todayRecords.length > 4 && (
                  <button
                    onClick={() => onGoTo('main')}
                    className="w-full py-3 text-xs font-bold border-t border-slate-50 transition-colors"
                    style={{ color: primaryColor }}
                  >
                    すべて見る ({todayRecords.length}件) →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ステータスカード */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onGoTo('sheet')}
              className="bg-white rounded-2xl shadow-sm px-4 py-4 text-left active:scale-[0.97] transition-all"
            >
              <p className="text-xs font-bold text-slate-400 mb-3">📛 気づき・付せん</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-black text-amber-400 leading-none">{pendingNotes}</span>
                <span className="text-sm font-bold text-slate-400">件</span>
              </div>
              <p className="text-xs text-slate-400">
                {pendingNotes > 0 ? 'ケアプランに反映できます' : '新しい気づきはなし'}
              </p>
            </button>

            <button
              onClick={() => onGoTo('sheet')}
              className="bg-white rounded-2xl shadow-sm px-4 py-4 text-left active:scale-[0.97] transition-all"
            >
              <p className="text-xs font-bold text-slate-400 mb-3">⏰ 24Hシート</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-black leading-none" style={{ color: primaryColor }}>{fitCount}</span>
                <span className="text-sm font-bold text-slate-300">/{totalPlans}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${totalPlans > 0 ? (fitCount / totalPlans) * 100 : 0}%`, backgroundColor: primaryColor }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">フィット済み</p>
            </button>
          </div>

          {/* 将来: 複数利用者対応時の展開エリア */}
          {/* <ResidentSwitcher residents={residents} onSelect={setResidentId} /> */}
        </div>
      </div>
    </div>
  )
}

export default HubPage
