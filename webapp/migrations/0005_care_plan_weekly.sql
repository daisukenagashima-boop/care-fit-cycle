-- 第3表: 週間サービス計画表
CREATE TABLE IF NOT EXISTS care_plan_weekly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resident_id INTEGER NOT NULL,
  time_slot TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  service_content TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_weekly_resident ON care_plan_weekly(resident_id);
