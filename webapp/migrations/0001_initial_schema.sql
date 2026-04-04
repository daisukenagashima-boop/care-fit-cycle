-- ケア・フィット・サイクル データベーススキーマ

-- 入居者テーブル
CREATE TABLE IF NOT EXISTS residents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  care_level TEXT NOT NULL,  -- 要介護度（例：要介護4）
  favorite_things TEXT,       -- 好きなこと
  today_wish TEXT,            -- 今日のねがい
  profile_image_url TEXT,
  maturation_day INTEGER DEFAULT 1,  -- 入所後の経過日数（1-14）
  phase TEXT DEFAULT 'initial',  -- フェーズ: initial, logging, fitting, confirmed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- スタッフテーブル
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  years_experience INTEGER DEFAULT 0,  -- 経験年数
  position TEXT,  -- 役職（リーダー、新人など）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 24時間シート（ケアプラン）テーブル
CREATE TABLE IF NOT EXISTS care_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  time TEXT NOT NULL,  -- 時刻（例：07:00）
  activity TEXT NOT NULL,  -- 活動名（例：起床・洗面）
  details TEXT,  -- 詳細（例：カーテンを開け日光を入れる）
  status TEXT DEFAULT 'plan',  -- ステータス: plan（計画）, fit（フィット済み）
  display_order INTEGER DEFAULT 0,  -- 表示順
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

-- ケース記録テーブル
CREATE TABLE IF NOT EXISTS case_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  record_time TEXT NOT NULL,  -- 記録時刻（例：08:15）
  content TEXT NOT NULL,  -- 記録内容
  tag TEXT,  -- タグ（例：起床、食事、排泄）
  record_type TEXT DEFAULT 'manual',  -- 記録タイプ: manual, quick, voice
  has_alert BOOLEAN DEFAULT 0,  -- アラートフラグ（生活リズムの変化など）
  recorded_date DATE DEFAULT (DATE('now', 'localtime')),  -- 記録日
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- 付せん（Sticky Notes）テーブル
CREATE TABLE IF NOT EXISTS sticky_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  care_plan_id INTEGER,  -- 関連する24時間シートの項目（任意）
  note_type TEXT NOT NULL,  -- タイプ: ai（AI提案）, staff（スタッフの気づき）
  fit_category TEXT,  -- フィットカテゴリ: time（時間）, preference（好み）, tips（コツ）
  time TEXT,  -- 関連時刻
  title TEXT NOT NULL,  -- タイトル
  content TEXT NOT NULL,  -- 内容
  source TEXT,  -- ソース（例：AI分析、スタッフ：佐藤）
  status TEXT DEFAULT 'pending',  -- ステータス: pending（未対応）, adopted（採用）, rejected（保留）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  FOREIGN KEY (care_plan_id) REFERENCES care_plans(id) ON DELETE SET NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_care_plans_resident_id ON care_plans(resident_id);
CREATE INDEX IF NOT EXISTS idx_case_records_resident_id ON case_records(resident_id);
CREATE INDEX IF NOT EXISTS idx_case_records_date ON case_records(recorded_date);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_resident_id ON sticky_notes(resident_id);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_status ON sticky_notes(status);
