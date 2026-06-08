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

interface Cycle {
  id: number
  start_date: string
  status: string
  trigger_reason: string
  plan_generated_at: string | null
  next_review_date: string | null
  notes: string | null
}

interface HubPageProps {
  onGoTo: (view: 'main' | 'sheet' | 'care-plan' | 'conference' | 'monitoring') => void
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
  '排泄': 'bg-blue-100 text-blue-600',
  '起床': 'bg-yellow-100 text-yellow-700',
  '活動': 'bg-green-100 text-green-700',
  '入浴': 'bg-cyan-100 text-cyan-700',
  '就寝': 'bg-purple-100 text-purple-700',
  'ケア': 'bg-pink-100 text-pink-700',
  '巡視': 'bg-slate-100 text-slate-500',
  'その他': 'bg-slate-100 text-slate-500',
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

const daysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const HubPage = ({ onGoTo }: HubPageProps) => {
  const residentId = DEFAULT_RESIDENT_ID

  const [resident, setResident] = useState<Resident | null>(null)
  const [todayRecords, setTodayRecords] = useState<CaseRecord[]>([])
  const [fitCount, setFitCount] = useState(0)
  const [totalPlans, setTotalPlans] = useState(0)
  const [pendingNotes, setPendingNotes] = useState(0)
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [showNewCycle, setShowNewCycle] = useState(false)
  const [newCycleReason, setNewCycleReason] = useState('定期改定')
  const [startingCycle, setStartingCycle] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const [residentRes, plansRes, notesRes, recordsRes, cycleRes] = await Promise.all([
        axios.get(`/api/residents/${residentId}`),
        axios.get(`/api/residents/${residentId}/care-plans`),
        axios.get(`/api/residents/${residentId}/sticky-notes?status=pending`),
        axios.get(`/api/residents/${residentId}/case-records?date=${today}`),
        axios.get(`/api/residents/${residentId}/cycle`),
      ])
      setResident(residentRes.data)
      const plans = plansRes.data
      setFitCount(plans.filter((p: any) => p.status === 'fit').length)
      setTotalPlans(plans.length)
      setPendingNotes(notesRes.data.length)
      setTodayRecords(recordsRes.data)
      setCycle(cycleRes.data)
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

  const handleStartNewCycle = async () => {
    setStartingCycle(true)
    try {
      await axios.post(`/api/residents/${residentId}/cycle/start`, {
        trigger_reason: newCycleReason,
      })
      setShowNewCycle(false)
      await fetchData()
    } catch (e) {
      console.error(e)
      alert('サイクル開始に失敗しました')
    } finally {
      setStartingCycle(false)
    }
  }

  if (loading || !resident) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }}></div>
    </div>
  )

  const fitRatio = totalPlans > 0 ? fitCount / totalPlans : 0
  const phase = getPhase(resident.maturation_day, fitRatio)

  // 次回改定日まで何日か
  const reviewDays = cycle?.next_review_date ? daysUntil(cycle.next_review_date) : null
  const reviewSoon = reviewDays !== null && reviewDays <= 30

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

          {/* 次回改定アラート */}
          {reviewSoon && reviewDays !== null && (
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ backgroundColor: reviewDays <= 14 ? '#FEF3C7' : '#F0FDF4', borderWidth: 1, borderStyle: 'solid', borderColor: reviewDays <= 14 ? '#FCD34D' : '#86EFAC' }}
            >
              <i className={`fas fa-calendar-alt text-sm ${reviewDays <= 14 ? 'text-amber-500' : 'text-green-500'}`}></i>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black ${reviewDays <= 14 ? 'text-amber-700' : 'text-green-700'}`}>
                  次回ケアプラン改定まで {reviewDays}日
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {cycle?.next_review_date ? formatDate(cycle.next_review_date) : ''}
                </p>
              </div>
              <button
                onClick={() => setShowNewCycle(true)}
                className="text-[10px] font-black px-2.5 py-1.5 rounded-xl text-white shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                新サイクル開始
              </button>
            </div>
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
                          {!!record.has_alert && <i className="fas fa-exclamation-circle text-amber-400 text-xs"></i>}
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

          {/* サイクル情報カード */}
          {cycle && (
            <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400">🔄 ケアサイクル</p>
                <button
                  onClick={() => setShowNewCycle(true)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border text-slate-500 hover:bg-slate-50 transition-all"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  新サイクル開始
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 mb-0.5">開始日</p>
                  <p className="font-bold text-slate-700">{formatDate(cycle.start_date)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{cycle.trigger_reason}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">次回改定</p>
                  {cycle.next_review_date ? (
                    <>
                      <p className="font-bold text-slate-700">{formatDate(cycle.next_review_date)}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: reviewSoon ? '#F59E0B' : '#94a3b8' }}>
                        {reviewDays !== null ? `あと${reviewDays}日` : ''}
                      </p>
                    </>
                  ) : (
                    <p className="font-bold text-slate-400">未設定</p>
                  )}
                </div>
                {cycle.plan_generated_at && (
                  <div className="col-span-2 pt-2 border-t border-slate-50">
                    <p className="text-slate-400 mb-0.5">最終プラン生成</p>
                    <p className="font-bold text-slate-700">{formatDate(cycle.plan_generated_at)}</p>
                  </div>
                )}
              </div>

              {/* モニタリングへのリンク */}
              <button
                onClick={() => onGoTo('monitoring')}
                className="w-full mt-3 pt-3 border-t border-slate-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                style={{ color: primaryColor }}
              >
                <i className="fas fa-chart-line text-xs"></i>
                モニタリング記録を見る →
              </button>
            </div>
          )}

          {/* 将来: 複数利用者対応時の展開エリア */}
          {/* <ResidentSwitcher residents={residents} onSelect={setResidentId} /> */}
        </div>
      </div>

      {/* 新サイクル開始モーダル */}
      {showNewCycle && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center lg:justify-center">
          <div className="bg-white w-full lg:w-96 rounded-t-3xl lg:rounded-3xl px-6 py-6 shadow-2xl">
            <h3 className="font-black text-slate-800 text-base mb-1">新しいサイクルを開始</h3>
            <p className="text-xs text-slate-500 mb-5">現在のサイクルを完了し、Day1からやり直します。</p>

            <p className="text-xs font-bold text-slate-500 mb-2">開始理由</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {['定期改定', '状態変化', '入所', '担当者判断'].map(reason => (
                <button
                  key={reason}
                  onClick={() => setNewCycleReason(reason)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${newCycleReason === reason ? 'text-white border-transparent' : 'text-slate-500 border-slate-200 bg-white'}`}
                  style={newCycleReason === reason ? { backgroundColor: primaryColor } : {}}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNewCycle(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleStartNewCycle}
                disabled={startingCycle}
                className="flex-1 py-3 rounded-2xl text-white font-black text-sm disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {startingCycle ? '開始中...' : '開始する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HubPage
