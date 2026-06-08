-- サイクル管理テーブル
CREATE TABLE IF NOT EXISTS care_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed'
  trigger_reason TEXT NOT NULL DEFAULT '入所', -- '入所' | '定期改定' | '状態変化' | '担当者判断'
  plan_generated_at TEXT,
  next_review_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id)
);

-- モニタリング記録テーブル
CREATE TABLE IF NOT EXISTS monitoring_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  cycle_id INTEGER,
  goal_id INTEGER,
  recorded_at TEXT NOT NULL,
  achievement TEXT NOT NULL DEFAULT 'partial', -- 'achieved' | 'partial' | 'not_achieved'
  comment TEXT,
  recorded_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (cycle_id) REFERENCES care_cycles(id),
  FOREIGN KEY (goal_id) REFERENCES care_goals(id)
);

