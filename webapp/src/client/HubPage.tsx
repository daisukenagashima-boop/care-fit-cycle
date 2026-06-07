import { useState, useEffect } from 'react'
import axios from 'axios'

const primaryColor = '#01C1AF'
const residentId = 1

type AppPhase = 'recording' | 'fitting' | 'conference' | 'completed'

interface HubData {
  resident: { id: number; name: string; care_level: string; maturation_day: number; phase: string; favorite_things: string; today_wish: string }
  fitCount: number
  totalPlans: number
  pendingNotes: number
  todayRecords: number
}

interface HubPageProps {
  onGoTo: (view: 'main' | 'sheet' | 'care-plan') => void
}

const getAppPhase = (day: number, fitRatio: number): AppPhase => {
  if (day >= 14) return 'conference'
  if (day >= 6 || fitRatio > 0.3) return 'fitting'
  return 'recording'
}

const HubPage = ({ onGoTo }: HubPageProps) => {
  const [data, setData] = useState<HubData | null>(null)
  const [loading, setLoading] = useState(true)

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
      const plans = plansRes.data
      const fitCount = plans.filter((p: any) => p.status === 'fit').length
      setData({
        resident: residentRes.data,
        fitCount,
        totalPlans: plans.length,
        pendingNotes: notesRes.data.length,
        todayRecords: recordsRes.data.length,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: primaryColor }}></div>
    </div>
  )

  const { resident, fitCount, totalPlans, pendingNotes, todayRecords } = data
  const fitRatio = totalPlans > 0 ? fitCount / totalPlans : 0
  const phase = getAppPhase(resident.maturation_day, fitRatio)
  const phaseIndex = { recording: 0, fitting: 1, conference: 2, completed: 3 }[phase]
  const PHASES = ['記録', 'フィット', '計画', '完成']

  const TodayAction = () => {
    if (phase === 'recording') return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ backgroundColor: primaryColor }}>📝</div>
          <div>
            <p className="font-black text-sm">まずは記録を積み上げましょう</p>
            <p className="text-[11px] text-slate-400">今日の記録: <span className="text-white font-bold">{todayRecords}件</span></p>
          </div>
        </div>
        <button onClick={() => onGoTo('main')} className="w-full text-white font-black py-3 rounded-xl transition-all active:scale-95" style={{ backgroundColor: primaryColor }}>
          記録を追加する →
        </button>
      </div>
    )
    if (phase === 'fitting') return (
      <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-base">📛</div>
          <div>
            <p className="font-black text-sm">付せんが{pendingNotes}件届いています</p>
            <p className="text-[11px] text-amber-100">24Hシートに反映しましょう</p>
          </div>
        </div>
        <button onClick={() => onGoTo('sheet')} className="w-full bg-white text-amber-600 font-black py-3 rounded-xl transition-all active:scale-95">
          24Hシートを確認 →
        </button>
      </div>
    )
    if (phase === 'conference') return (
      <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, #0d9488, ${primaryColor})` }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-base">🎉</div>
          <div>
            <p className="font-black text-sm">Day14 カンファレンスの日です</p>
            <p className="text-[11px] text-teal-100">24Hシート→ケアプランの準備ができています</p>
          </div>
        </div>
        <button onClick={() => onGoTo('care-plan')} className="w-full bg-white text-teal-600 font-black py-3 rounded-xl transition-all active:scale-95">
          ケアプランを生成する →
        </button>
      </div>
    )
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-[#FDFCF9] font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-100 overflow-hidden border-2 border-white shadow-md shrink-0">
            <img src="/static/okada-profile.jpg" alt={resident.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-slate-800 text-base">{resident.name} 様</h1>
            <p className="text-[11px] text-slate-400 truncate">{resident.care_level} / Day {resident.maturation_day}/14</p>
          </div>
        </div>
      </div>

      {/* Phase progress */}
      <div className="bg-white border-b border-slate-100 px-5 pb-4 pt-3 shrink-0">
        <div className="relative flex items-start justify-between">
          {/* connector line */}
          <div className="absolute top-3 left-[12%] right-[12%] h-0.5 bg-slate-100">
            <div className="h-full transition-all duration-700 rounded-full" style={{ width: `${(phaseIndex / 3) * 100}%`, backgroundColor: primaryColor }} />
          </div>
          {PHASES.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 z-10 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all border-2 ${i <= phaseIndex ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-300'}`}
                style={i <= phaseIndex ? { backgroundColor: primaryColor } : {}}
              >
                {i < phaseIndex ? '✓' : i + 1}
              </div>
              <span className={`text-[9px] font-bold ${i === phaseIndex ? 'font-black' : 'text-slate-300'}`} style={i === phaseIndex ? { color: primaryColor } : {}}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* 今やること */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">🎯 今やること</p>
          <TodayAction />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm text-center">
            <p className="text-xl font-black text-slate-800">{todayRecords}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">今日の記録</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm text-center">
            <p className="text-xl font-black" style={{ color: primaryColor }}>{fitCount}<span className="text-sm text-slate-300 font-bold">/{totalPlans}</span></p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">フィット済み</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm text-center">
            <p className="text-xl font-black text-amber-400">{pendingNotes}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">付せん</p>
          </div>
        </div>

        {/* 今日のねがい */}
        <div className="bg-orange-50/60 rounded-2xl px-4 py-3 border border-orange-100">
          <div className="flex items-center gap-1.5 text-orange-500 mb-1">
            <i className="fas fa-sun text-xs"></i>
            <span className="text-[9px] font-black uppercase tracking-widest">今日のねがい</span>
          </div>
          <p className="text-xs font-bold text-slate-600">「{resident.today_wish}」</p>
        </div>

        {/* Menu */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">📂 メニュー</p>
          <div className="space-y-2">
            <button
              onClick={() => onGoTo('main')}
              className="w-full bg-white rounded-2xl px-4 py-3.5 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-[#01C1AF]/30 transition-all active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
                <i className="fas fa-clipboard-list" style={{ color: primaryColor }}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-800">ケース記録</p>
                <p className="text-[11px] text-slate-400">今日の様子を記録する</p>
              </div>
              <i className="fas fa-chevron-right text-slate-200 text-xs"></i>
            </button>

            <button
              onClick={() => onGoTo('sheet')}
              className="w-full bg-white rounded-2xl px-4 py-3.5 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-[#01C1AF]/30 transition-all active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
                <i className="fas fa-clock" style={{ color: primaryColor }}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-800">24時間シート</p>
                <p className="text-[11px] text-slate-400">
                  {fitCount}/{totalPlans}件フィット済み
                  {pendingNotes > 0 && <span className="ml-1 text-amber-400 font-bold">・付せん{pendingNotes}件</span>}
                </p>
              </div>
              <i className="fas fa-chevron-right text-slate-200 text-xs"></i>
            </button>

            <button
              onClick={() => onGoTo('care-plan')}
              className="w-full bg-white rounded-2xl px-4 py-3.5 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-slate-200 transition-all active:scale-[0.98] text-left opacity-60"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                <i className="fas fa-file-alt text-slate-400"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-800">施設サービス計画書</p>
                <p className="text-[11px] text-slate-400">第1表・第2表・第3表 <span className="text-slate-300">(準備中)</span></p>
              </div>
              <i className="fas fa-chevron-right text-slate-200 text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HubPage
