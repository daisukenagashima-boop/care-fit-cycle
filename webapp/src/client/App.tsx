import { useState, useEffect } from 'react'
import axios from 'axios'
import SheetPage from './SheetPage'
import HubPage from './HubPage'
import CarePlanPage from './CarePlanPage'
import ConferencePage from './ConferencePage'

// ============================================
// Types
// ============================================

interface Resident {
  id: number
  name: string
  care_level: string
  favorite_things: string
  today_wish: string
  maturation_day: number
  phase: string
}

interface CarePlan {
  id: number
  time: string
  activity: string
  details: string
  status: string
}

interface CaseRecord {
  id: number
  record_time: string
  content: string
  tag: string
  has_alert: number | boolean
  recorded_date: string
  staff_name: string
}

interface StickyNote {
  id: number
  note_type: string
  fit_category: string
  time: string | null
  title: string
  content: string
  source: string
  status: string
}

interface Staff {
  id: number
  name: string
  years_experience: number
  position: string
}

// ============================================
// Constants
// ============================================

const primaryColor = '#01C1AF'
const residentId = 1

// ============================================
// App Component
// ============================================

const App = () => {
  const [resident, setResident] = useState<Resident | null>(null)
  const [carePlans, setCarePlans] = useState<CarePlan[]>([])
  const [caseRecords, setCaseRecords] = useState<CaseRecord[]>([])
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null)
  const [newRecord, setNewRecord] = useState('')
  const [aiQuery, setAiQuery] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  // ハブが常にホーム。全画面の戻るはハブに戻る。
  const [currentView, setCurrentView] = useState<'hub' | 'main' | 'sheet' | 'care-plan' | 'conference'>('hub')

  const [showInsightForm, setShowInsightForm] = useState(false)
  const [insightContent, setInsightContent] = useState('')
  const [insightCategory, setInsightCategory] = useState('preference')
  const [insightTime, setInsightTime] = useState('')
  const [insightType, setInsightType] = useState<'staff' | 'ai'>('staff')

  const [recordTag, setRecordTag] = useState('その他')

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [mobileTab, setMobileTab] = useState('case-record')

  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [touchEndY, setTouchEndY] = useState<number | null>(null)

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    if (!loading) {
      fetchCaseRecords()
    }
  }, [selectedDate])

  const fetchCaseRecords = async () => {
    try {
      const res = await axios.get(`/api/residents/${residentId}/case-records?date=${selectedDate}`)
      setCaseRecords(res.data)
    } catch (error) {
      console.error('ケース記録取得エラー:', error)
    }
  }

  const fetchAllData = async () => {
    try {
      const [residentRes, carePlansRes, recordsRes, notesRes, staffRes] = await Promise.all([
        axios.get(`/api/residents/${residentId}`),
        axios.get(`/api/residents/${residentId}/care-plans`),
        axios.get(`/api/residents/${residentId}/case-records?date=${selectedDate}`),
        axios.get(`/api/residents/${residentId}/sticky-notes?status=pending`),
        axios.get('/api/staff'),
      ])
      setResident(residentRes.data)
      setCarePlans(carePlansRes.data)
      setCaseRecords(recordsRes.data)
      setStickyNotes(notesRes.data)
      setStaff(staffRes.data)
      if (staffRes.data.length > 0) setCurrentStaff(staffRes.data[0])
      setLoading(false)
    } catch (error) {
      console.error('データ取得エラー:', error)
      setLoading(false)
    }
  }

  const handleDemoReset = async () => {
    if (!window.confirm('デモ用データを作成しますか？現在のデータは全て消えます。')) return
    setResetting(true)
    try {
      await axios.post('/api/demo/reset')
      setSelectedDate(new Date().toISOString().split('T')[0])
      await fetchAllData()
    } catch (error) {
      console.error('リセットエラー:', error)
    } finally {
      setResetting(false)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
    setTouchStartY(e.targetTouches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
    setTouchEndY(e.targetTouches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !touchStartY || !touchEndY) return
    const distanceX = touchStart - touchEnd
    const distanceY = touchStartY - touchEndY
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > 80
    if (isHorizontalSwipe) {
      if (distanceX > 80) {
        if (mobileTab === 'care-plan') setMobileTab('case-record')
        else if (mobileTab === 'case-record') setMobileTab('insights')
      }
      if (distanceX < -80) {
        if (mobileTab === 'insights') setMobileTab('case-record')
        else if (mobileTab === 'case-record') setMobileTab('care-plan')
      }
    }
    setTouchStart(null)
    setTouchEnd(null)
    setTouchStartY(null)
    setTouchEndY(null)
  }

  const handleAddRecord = async () => {
    if (!newRecord.trim() || !currentStaff) return
    const now = new Date()
    const recordTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    try {
      await axios.post('/api/case-records', {
        resident_id: residentId,
        staff_id: currentStaff.id,
        record_time: recordTime,
        content: newRecord,
        tag: recordTag,
        record_type: 'manual',
      })
      setNewRecord('')
      fetchAllData()
    } catch (error) {
      console.error('記録追加エラー:', error)
    }
  }

  const handleStickyNoteAction = async (noteId: number, status: string) => {
    try {
      await axios.put(`/api/sticky-notes/${noteId}`, { status })
      fetchAllData()
    } catch (error) {
      console.error('付せん更新エラー:', error)
    }
  }

  const handleAddInsight = async () => {
    if (!insightContent.trim() || !currentStaff) return
    const categoryTitles: Record<string, string> = {
      time: '時間のフィット提案',
      preference: '好みのフィット提案',
      tips: 'コツのフィット提案',
    }
    try {
      await axios.post('/api/sticky-notes', {
        resident_id: residentId,
        note_type: insightType,
        fit_category: insightCategory,
        time: insightTime || null,
        title: categoryTitles[insightCategory],
        content: insightContent,
        source: insightType === 'ai' ? 'AI分析' : `スタッフ：${currentStaff.name}`,
        status: 'pending',
      })
      setInsightContent('')
      setInsightCategory('preference')
      setInsightTime('')
      setInsightType('staff')
      setShowInsightForm(false)
      fetchAllData()
    } catch (error) {
      console.error('気づき投稿エラー:', error)
    }
  }

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setAiResponse('')
    try {
      const response = await axios.post('/api/ai-chat', { question: aiQuery, resident_id: residentId })
      if (response.data.success) {
        setAiResponse(response.data.answer)
      } else {
        setAiResponse('エラー: ' + (response.data.message || response.data.error))
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string; error?: string } } }
      if (axiosError.response?.data) {
        setAiResponse('エラー: ' + (axiosError.response.data.message || axiosError.response.data.error))
      } else {
        setAiResponse('エラー: サーバーとの通信に失敗しました')
      }
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!resident) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-red-500">入居者データが見つかりません</p>
      </div>
    )
  }

  // モバイル用ボトムタブバー（conference以外で表示）
  const BottomTabBar = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex z-50">
      {[
        { id: 'hub', icon: 'fa-home', label: 'ホーム' },
        { id: 'main', icon: 'fa-clipboard-list', label: '記録' },
        { id: 'sheet', icon: 'fa-clock', label: '24Hシート' },
        { id: 'care-plan', icon: 'fa-file-alt', label: '計画書' },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setCurrentView(tab.id as any)}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${currentView === tab.id ? 'text-[#01C1AF]' : 'text-slate-400'}`}
        >
          <i className={`fas ${tab.icon} text-lg`}></i>
          <span className="text-[9px] font-bold">{tab.label}</span>
        </button>
      ))}
    </div>
  )

  if (currentView === 'conference') return <ConferencePage onBack={() => setCurrentView('hub')} onComplete={() => setCurrentView('care-plan')} />

  if (currentView === 'hub') return (
    <>
      <div className="pb-16 lg:pb-0"><HubPage onGoTo={(v) => setCurrentView(v as any)} /></div>
      <BottomTabBar />
    </>
  )
  if (currentView === 'sheet') return (
    <>
      <SheetPage residentId={residentId} onBack={() => setCurrentView('hub')} />
      <BottomTabBar />
    </>
  )
  if (currentView === 'care-plan') return (
    <>
      <CarePlanPage onBack={() => setCurrentView('hub')} />
      <BottomTabBar />
    </>
  )

  const stickyNotesByTime: Record<string, StickyNote[]> = {}
  stickyNotes.forEach(note => {
    if (note.time) {
      if (!stickyNotesByTime[note.time]) stickyNotesByTime[note.time] = []
      stickyNotesByTime[note.time].push(note)
    }
  })

  return (
    <>
    <BottomTabBar />
    <div className="flex flex-col lg:flex-row bg-[#FDFCF9] font-sans text-slate-800 overflow-hidden" style={{ height: 'calc(100dvh - 0px)' }}
      // モバイルではボトムタブ(60px)分を差し引く
    >

      {/* モバイル用ヘッダー */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentView('hub')} className="text-slate-400 hover:text-slate-600 transition-colors mr-1">
            <i className="fas fa-arrow-left text-sm"></i>
          </button>
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-orange-100 border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
              <img src="/static/okada-profile.jpg" alt={resident.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 bg-red-400 text-white p-1 rounded-full shadow-lg">
              <i className="fas fa-heart text-[8px]"></i>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800">{resident.name} 様</h2>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-500">{resident.care_level}</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Day {resident.maturation_day}/14</p>
          </div>
          <button
            onClick={() => setCurrentView('sheet')}
            className="text-[10px] font-black px-3 py-2 rounded-xl text-white flex items-center gap-1 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <i className="fas fa-table"></i> シート
          </button>
        </div>
      </div>

      {/* モバイル用タブナビゲーション */}
      <div className="lg:hidden bg-white border-b border-slate-200 shrink-0">
        <div className="flex">
          <button onClick={() => setMobileTab('care-plan')} className={'flex-1 py-3 text-sm font-medium border-b-2 transition-colors ' + (mobileTab === 'care-plan' ? 'border-[#01C1AF] text-[#01C1AF]' : 'border-transparent text-slate-400')}>
            <i className="fas fa-clock mr-1"></i> プラン
          </button>
          <button onClick={() => setMobileTab('case-record')} className={'flex-1 py-4 text-base font-black border-b-4 transition-colors ' + (mobileTab === 'case-record' ? 'border-[#01C1AF] text-[#01C1AF] bg-[#01C1AF]/5' : 'border-transparent text-slate-400')}>
            <i className="fas fa-clipboard-list mr-1"></i> 記録
          </button>
          <button onClick={() => setMobileTab('insights')} className={'flex-1 py-3 text-sm font-medium border-b-2 transition-colors ' + (mobileTab === 'insights' ? 'border-[#01C1AF] text-[#01C1AF]' : 'border-transparent text-slate-400')}>
            <i className="fas fa-lightbulb mr-1"></i> 気づき
          </button>
        </div>
      </div>

      {/* 左カラム：24時間シート */}
      <div
        className={'flex flex-col z-30 bg-white lg:shadow-xl lg:rounded-r-[40px] lg:border-r border-orange-50 ' + (mobileTab === 'care-plan' ? 'flex-1 overflow-y-auto lg:overflow-hidden lg:w-[22%]' : 'hidden lg:flex lg:w-[22%]')}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="hidden lg:block px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full bg-orange-100 border-2 border-white shadow-md overflow-hidden">
                <img src="/static/okada-profile.jpg" alt={resident.name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 bg-red-400 text-white p-1 rounded-full shadow-lg">
                <i className="fas fa-heart text-[8px]"></i>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-black text-slate-800">{resident.name} 様</h2>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500">{resident.care_level}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium truncate">「{resident.favorite_things}」</p>
            </div>
          </div>
          <div className="bg-orange-50/50 rounded-xl px-3 py-2 border border-orange-100/50 mb-3">
            <div className="flex items-center gap-1.5 text-orange-600 mb-0.5">
              <i className="fas fa-sun text-[11px]"></i>
              <span className="text-[9px] font-black uppercase tracking-widest">今日のねがい</span>
            </div>
            <p className="text-[11px] font-bold text-slate-600 leading-snug">「{resident.today_wish}」</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView('sheet')}
                className="flex-1 text-[10px] font-bold py-2 px-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1 border"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <i className="fas fa-clock"></i>24Hシート
              </button>
              <button
                onClick={() => setCurrentView('care-plan')}
                className="flex-1 text-[10px] font-bold py-2 px-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1 bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <i className="fas fa-file-alt"></i>計画書
              </button>
            </div>
          </div>
        </div>
        <div className="px-4 lg:px-6 py-2">
          <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
            <i className="fas fa-clock text-sm"></i> 24時間の暮らしプラン
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-8 space-y-4 lg:space-y-6 relative">
          <div className="absolute left-8 lg:left-11 top-0 bottom-0 w-px bg-slate-100 -z-0"></div>
          {carePlans.map((item) => (
            <div key={item.id} className="relative z-10">
              <div className="flex items-start gap-4 lg:gap-6">
                <div className="bg-white border-2 rounded-2xl p-1 text-[10px] font-bold w-10 h-10 flex items-center justify-center shrink-0 shadow-sm transition-all" style={{ borderColor: item.status === 'fit' ? primaryColor : '#E2E8F0', color: item.status === 'fit' ? primaryColor : '#94A3B8', transform: item.status === 'fit' ? 'scale(1.1)' : 'scale(1)' }}>
                  {item.time}
                </div>
                <div className={'flex-1 p-3 lg:p-4 rounded-3xl border transition-all relative ' + (item.status === 'fit' ? 'border-teal-50 bg-teal-50/20 shadow-sm' : 'border-slate-100 bg-white')}>
                  <div className="flex justify-between items-start">
                    <span className="font-black text-sm text-slate-700">{item.activity}</span>
                    {item.status === 'fit' && <div className="bg-teal-500 text-white p-1 rounded-full"><i className="fas fa-check text-[8px]"></i></div>}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-medium">{item.details}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 中央カラム：ケース記録 */}
      <div
        className={'flex flex-col bg-gradient-to-b from-white to-slate-50/30 overflow-hidden ' + (mobileTab === 'case-record' ? 'flex-1' : 'hidden lg:flex lg:flex-1')}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="p-4 lg:p-8 lg:pb-4 flex flex-col lg:flex-row justify-between items-start lg:items-end shrink-0 gap-3 bg-white/80 backdrop-blur-sm border-b border-slate-100">
          <div>
            <h3 className="text-2xl lg:text-3xl font-black text-slate-800 flex items-center gap-3">
              <i className="fas fa-clipboard-list" style={{ color: primaryColor }}></i>ケース記録
            </h3>
            <p className="text-xs lg:text-sm text-slate-500 mt-1">{resident.name}様の1日の記録</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-[#01C1AF]/10 flex items-center justify-center text-[#01C1AF]"><i className="fas fa-calendar"></i></div>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="text-xs font-bold text-slate-700 border-none focus:outline-none cursor-pointer pr-2" />
            </div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-[#01C1AF]/10 flex items-center justify-center text-[#01C1AF]"><i className="fas fa-user"></i></div>
              <div className="pr-2">
                <p className="text-[9px] font-black text-slate-400 leading-none mb-1">担当スタッフ</p>
                <select value={currentStaff?.id || ''} onChange={(e) => setCurrentStaff(staff.find(s => s.id === Number(e.target.value)) || null)} className="text-xs font-bold text-slate-700 border-none focus:outline-none bg-transparent cursor-pointer">
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 lg:pt-4 space-y-6 lg:space-y-8 min-h-0">
          {caseRecords.map((record) => (
            <div key={record.id} className="relative group">
              <div className="flex gap-4 lg:gap-6 items-start">
                <div className="shrink-0 text-right pt-2">
                  <p className="text-sm font-black text-slate-800">{record.record_time}</p>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">{record.tag}</p>
                </div>
                <div className={'flex-1 bg-white p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] shadow-sm border border-slate-100 transition-all hover:shadow-xl group-hover:border-[#01C1AF]/20 relative overflow-hidden ' + (record.has_alert ? 'border-amber-200 bg-amber-50/10' : '')}>
                  {record.has_alert ? <div className="absolute top-0 right-0 p-2 bg-amber-400 text-white rounded-bl-xl"><i className="fas fa-exclamation-circle text-sm"></i></div> : null}
                  <p className="text-sm lg:text-[15px] text-slate-700 leading-relaxed font-medium">{record.content}</p>
                  <div className="mt-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wide">記録者：{record.staff_name}</span>
                    {record.has_alert && (
                      <span className="flex items-center gap-1.5 text-amber-600 font-black text-[10px] bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                        <i className="fas fa-brain text-xs"></i> 生活リズムに変化のきざし
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {caseRecords.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <i className="fas fa-clipboard text-4xl mb-4"></i>
              <p className="font-bold">まだ今日の記録がありません</p>
            </div>
          )}
        </div>

        <div className="p-4 lg:p-8 lg:pt-0 pb-20 lg:pb-8">
          <div className="mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">📌 タグを選んで記録</p>
            <div className="flex gap-2 flex-wrap">
            {['食事', '排泤', '起床', '活動', '入浴', '就寝', 'ケア', '巡視', 'その他'].map(tag => (
              <button key={tag} onClick={() => setRecordTag(tag)} className={`text-[10px] font-bold px-2 py-1 rounded-full transition-all ${recordTag === tag ? 'bg-[#01C1AF] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {tag}
              </button>
            ))}
            </div>
          </div>
          <div className="bg-white rounded-[24px] lg:rounded-[32px] shadow-2xl p-2 flex items-center gap-2 lg:gap-3 border border-slate-100 focus-within:ring-4 focus-within:ring-[#01C1AF]/10 transition-all">
            <button className="w-12 h-12 lg:w-14 lg:h-14 bg-[#01C1AF] text-white rounded-[20px] lg:rounded-[24px] flex items-center justify-center shadow-lg hover:shadow-[#01C1AF]/40 transition-all active:scale-90">
              <i className="fas fa-microphone text-lg lg:text-xl"></i>
            </button>
            <input type="text" value={newRecord} onChange={(e) => setNewRecord(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddRecord()} placeholder={`${resident.name}様との様子を記録`} className="flex-1 px-3 lg:px-4 py-2 text-sm lg:text-base font-medium focus:outline-none placeholder:text-slate-300" />
            <button onClick={handleAddRecord} disabled={!newRecord.trim()} className="w-12 h-12 lg:w-14 lg:h-14 bg-slate-50 text-slate-300 rounded-[20px] lg:rounded-[24px] flex items-center justify-center hover:text-[#01C1AF] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <i className="fas fa-paper-plane text-lg lg:text-xl"></i>
            </button>
          </div>
        </div>
      </div>

      {/* 右カラム：気づき・AIアシスタント */}
      <div
        className={'flex flex-col bg-slate-50/50 border-l border-slate-100 ' + (mobileTab === 'insights' ? 'flex-1' : 'hidden lg:flex lg:w-[22%]')}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="p-4 lg:p-8 lg:pb-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
            <i className="fas fa-chart-line" style={{ color: primaryColor }}></i> Care Fit Cycle
            <button
              onClick={handleDemoReset}
              disabled={resetting}
              className="ml-auto text-[9px] font-black px-2 py-1 rounded-lg bg-[#01C1AF]/10 hover:bg-[#01C1AF]/20 text-[#01C1AF] transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <i className={`fas fa-database text-[9px] ${resetting ? 'animate-pulse' : ''}`}></i>
              {resetting ? '作成中...' : 'デモ用データ作成'}
            </button>
          </h3>
          <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-baseline gap-2">
                <p className="text-base font-black text-slate-800">Day {resident.maturation_day}</p>
                <p className="text-[10px] text-slate-400 font-bold">/ 14</p>
              </div>
              <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase">
                {resident.phase === 'initial' ? 'Initial' : resident.phase === 'logging' ? 'Logging' : resident.phase === 'fitting' ? 'Adjustment' : 'Confirmed'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="h-full transition-all duration-1000 ease-out rounded-full" style={{ width: ((resident.maturation_day / 14) * 100) + '%', backgroundColor: primaryColor }}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-bold">
              提案が{stickyNotes.length}件届いています。
            </p>
          </div>
        </div>

        <div className="px-4 lg:px-8 pb-4">
          {!showInsightForm ? (
            <button onClick={() => setShowInsightForm(true)} className="w-full bg-amber-400 hover:bg-amber-500 text-white font-black py-3 lg:py-4 rounded-[20px] lg:rounded-[24px] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              <i className="fas fa-lightbulb text-base lg:text-lg"></i>気づきを書く
            </button>
          ) : (
            <div className="bg-white rounded-[20px] lg:rounded-[28px] p-4 lg:p-6 shadow-xl border-2 border-amber-400">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <i className="fas fa-lightbulb text-amber-500"></i>気づきを投稿
                </h4>
                <button onClick={() => setShowInsightForm(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">種別</label>
                  <div className="flex gap-2">
                    <button onClick={() => setInsightType('staff')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${insightType === 'staff' ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <i className="fas fa-user mr-1"></i>スタッフの気づき
                    </button>
                    <button onClick={() => setInsightType('ai')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${insightType === 'ai' ? 'bg-cyan-400 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <i className="fas fa-brain mr-1"></i>AI提案
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">カテゴリ</label>
                  <select value={insightCategory} onChange={(e) => setInsightCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="time">時間のフィット</option>
                    <option value="preference">好みのフィット</option>
                    <option value="tips">コツのフィット</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">関連時刻（任意）</label>
                  <select value={insightTime} onChange={(e) => setInsightTime(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">指定なし</option>
                    {carePlans.map(plan => <option key={plan.id} value={plan.time}>{plan.time} {plan.activity}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">気づきの内容</label>
                  <textarea value={insightContent} onChange={(e) => setInsightContent(e.target.value)} placeholder="例：最近は8:15まで熟睡されています。" rows={4} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"></textarea>
                </div>
                <button onClick={handleAddInsight} disabled={!insightContent.trim()} className="w-full bg-amber-400 hover:bg-amber-500 text-white font-black py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                  投稿する
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-4 space-y-4 lg:space-y-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <i className="fas fa-sticky-note text-amber-400"></i>気づきのストック
              </h4>
              <span className="bg-amber-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-md">{stickyNotes.length}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              スタッフの気づきとAIの提案をストックしています。<br />
              <span className="font-bold text-amber-600">「とりいれる」</span>ボタンの24時間シートに反映できます。
            </p>
          </div>
          {stickyNotes.map((note) => (
            <div key={note.id} className="bg-gradient-to-br from-amber-50 to-white p-5 lg:p-6 rounded-[24px] lg:rounded-[32px] border-2 border-amber-200 shadow-lg text-[11px] group hover:shadow-2xl hover:border-amber-300 transition-all transform hover:scale-[1.02] relative">
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full"></div>
              <div className="flex justify-between items-start mb-3">
                <div className={'px-3 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm ' + (note.note_type === 'ai' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' : 'bg-amber-100 text-amber-700 border border-amber-200')}>
                  <i className={(note.note_type === 'ai' ? 'fas fa-brain' : 'fas fa-user') + ' mr-1'}></i>{note.source}
                </div>
                <span className="text-[10px] text-slate-400 font-bold">{note.time || '時刻未指定'}</span>
              </div>
              <p className="font-black text-slate-800 mb-2 text-sm">{note.title}</p>
              <p className="text-slate-600 leading-relaxed font-medium mb-4">{note.content}</p>
              <div className="flex gap-2">
                <button onClick={() => handleStickyNoteAction(note.id, 'adopted')} className="flex-1 bg-gradient-to-r from-teal-500 to-[#01C1AF] hover:from-teal-600 hover:to-[#00A89D] text-white font-black py-3 px-4 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm">
                  <i className="fas fa-check-circle text-base"></i>とりいれる
                </button>
                <button onClick={() => handleStickyNoteAction(note.id, 'rejected')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 text-sm">
                  <i className="fas fa-times-circle text-base"></i>まだそのまま
                </button>
              </div>
            </div>
          ))}
          {stickyNotes.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <i className="fas fa-sticky-note text-3xl mb-3"></i>
              <p className="text-xs font-bold">新しい気づきはまだありません</p>
            </div>
          )}
        </div>

        <div className="hidden lg:block p-8 pt-0 mt-auto">
          <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#01C1AF] rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-[#01C1AF] flex items-center justify-center text-white shadow-lg">
                <i className="fas fa-question-circle text-lg"></i>
              </div>
              <h4 className="text-sm font-black tracking-wide">AI相談窓口</h4>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4 relative z-10 font-bold italic">
              「{resident.name}さんの好きなコーヒーの銘柄は？」<br />
              「最近よく笑う時間はいつ？」
            </p>
            <div className="relative z-10 mb-4">
              <input type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !aiLoading && handleAiQuery()} placeholder="質問してみる..." className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:bg-white/20 transition-all" disabled={aiLoading} />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#01C1AF] disabled:text-slate-600 hover:text-[#00a89a] transition-colors" disabled={!aiQuery || aiLoading} onClick={handleAiQuery}>
                {aiLoading ? <i className="fas fa-spinner fa-spin text-sm"></i> : <i className="fas fa-paper-plane text-sm"></i>}
              </button>
            </div>
            {aiResponse && (
              <div className="relative z-10 bg-white/10 rounded-2xl p-4 border border-white/20">
                <div className="flex items-start gap-2 mb-2">
                  <i className="fas fa-robot text-[#01C1AF] text-sm mt-0.5"></i>
                  <p className="text-[10px] font-bold text-[#01C1AF]">AIアシスタント</p>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap">{aiResponse}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default App
