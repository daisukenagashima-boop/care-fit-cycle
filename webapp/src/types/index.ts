// Cloudflare Workers環境の型定義
export type Bindings = {
  DB: D1Database;
}

// 入居者型
export type Resident = {
  id: number;
  name: string;
  care_level: string;
  favorite_things: string | null;
  today_wish: string | null;
  profile_image_url: string | null;
  maturation_day: number;
  phase: 'initial' | 'logging' | 'fitting' | 'confirmed';
  created_at: string;
  updated_at: string;
}

// スタッフ型
export type Staff = {
  id: number;
  name: string;
  years_experience: number;
  position: string | null;
  created_at: string;
}

// 24時間シート（ケアプラン）型
export type CarePlan = {
  id: number;
  resident_id: number;
  time: string;
  activity: string;
  details: string | null;
  status: 'plan' | 'fit';
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ケース記録型
export type CaseRecord = {
  id: number;
  resident_id: number;
  staff_id: number;
  record_time: string;
  content: string;
  tag: string | null;
  record_type: 'manual' | 'quick' | 'voice';
  has_alert: number;
  recorded_date: string;
  created_at: string;
}

// 付せん型
export type StickyNote = {
  id: number;
  resident_id: number;
  care_plan_id: number | null;
  note_type: 'ai' | 'staff';
  fit_category: 'time' | 'preference' | 'tips' | null;
  time: string | null;
  title: string;
  content: string;
  source: string | null;
  status: 'pending' | 'adopted' | 'rejected';
  created_at: string;
  updated_at: string;
}
